import {
  fetchIIITKAttendanceData,
  loginToIIITKPortal,
  refreshIIITKToken,
} from "@/services/iiitk-attendance";
import type { IIITKCourseAttendance, IIITKUser } from "@/types";
import axios from "axios";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "./storage";

interface IIITKAttendanceState {
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: IIITKUser | null;
  courses: IIITKCourseAttendance[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: number | null;
  hasHydrated: boolean;
}

interface IIITKAttendanceActions {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchAttendance: (options?: { silent?: boolean }) => Promise<void>;
  setHasHydrated: (hasHydrated: boolean) => void;
  clearError: () => void;
}

export const useIIITKAttendanceStore = create<
  IIITKAttendanceState & IIITKAttendanceActions
>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      accessToken: null,
      refreshToken: null,
      user: null,
      courses: [],
      isLoading: false,
      error: null,
      lastSyncTime: null,
      hasHydrated: false,

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      clearError: () => set({ error: null }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await loginToIIITKPortal(email, password);
          set({
            isLoggedIn: true,
            accessToken: res.access,
            refreshToken: res.refresh,
            user: res.user || null,
            isLoading: false,
            error: null,
          });

          // Automatically fetch attendance after successful login
          await get().fetchAttendance({ silent: false });
          return true;
        } catch (err) {
          let message = "Invalid login credentials";
          if (axios.isAxiosError(err)) {
            message =
              err.response?.data?.message ||
              err.response?.data?.error ||
              "Invalid email or password";
          } else if (err instanceof Error) {
            message = err.message;
          }
          set({ isLoading: false, error: message });
          return false;
        }
      },

      logout: async () => {
        set({
          isLoggedIn: false,
          accessToken: null,
          refreshToken: null,
          user: null,
          courses: [],
          isLoading: false,
          error: null,
          lastSyncTime: null,
        });
      },

      fetchAttendance: async (options) => {
        const silent = options?.silent ?? false;
        const state = get();

        if (!state.accessToken) {
          if (state.isLoggedIn) {
            set({ isLoggedIn: false, error: "Session expired. Please log in again." });
          }
          return;
        }

        if (!silent) set({ isLoading: true, error: null });

        try {
          let token = state.accessToken;
          try {
            const data = await fetchIIITKAttendanceData(token);
            set({
              courses: data.courses,
              user: data.student || state.user,
              lastSyncTime: Date.now(),
              isLoading: false,
              error: null,
            });
          } catch (err) {
            // Check if 401 unauthorized and attempt refresh
            if (axios.isAxiosError(err) && err.response?.status === 401 && state.refreshToken) {
              try {
                const refreshed = await refreshIIITKToken(state.refreshToken);
                token = refreshed.access;
                set({ accessToken: token });

                const data = await fetchIIITKAttendanceData(token);
                set({
                  courses: data.courses,
                  user: data.student || state.user,
                  lastSyncTime: Date.now(),
                  isLoading: false,
                  error: null,
                });
                return;
              } catch (refreshErr) {
                // Refresh failed, session expired
                set({
                  isLoggedIn: false,
                  accessToken: null,
                  refreshToken: null,
                  user: null,
                  isLoading: false,
                  error: "Session expired. Please sign in again.",
                });
                return;
              }
            }

            let message = "Failed to fetch attendance";
            if (axios.isAxiosError(err)) {
              message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                (err.code === "ERR_NETWORK" ? "Network error. Check connection." : message);
            } else if (err instanceof Error) {
              message = err.message;
            }

            set({
              isLoading: false,
              error: message,
            });
          }
        } catch (err) {
          set({
            isLoading: false,
            error: "An unexpected error occurred",
          });
        }
      },
    }),
    {
      name: "iiitk-attendance-storage",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        courses: state.courses,
        lastSyncTime: state.lastSyncTime,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export const selectIIITKOverallStats = (courses: IIITKCourseAttendance[]) => {
  const activeCourses = courses.filter((c) => c.totalSessions > 0);
  const totalSessions = activeCourses.reduce((sum, c) => sum + c.totalSessions, 0);
  const totalAttended = activeCourses.reduce((sum, c) => sum + c.attended, 0);
  const overallPercentage =
    totalSessions > 0 ? Number(((totalAttended / totalSessions) * 100).toFixed(1)) : 0;
  const safeCourses = activeCourses.filter((c) => !c.isBelowThreshold).length;

  return {
    totalCourses: activeCourses.length,
    totalSessions,
    totalAttended,
    overallPercentage,
    safeCourses,
    belowThresholdCourses: activeCourses.length - safeCourses,
  };
};
