import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { StateStorage } from "zustand/middleware";

// Helper to check if we're on the web and window is undefined (e.g. Next.js SSR or Expo Web SSR)
const isServer = Platform.OS === "web" && typeof window === "undefined";

// Zustand storage adapter for AsyncStorage with SSR safety
export const zustandStorage: StateStorage = {
  getItem: async (name) => {
    if (isServer) return null;
    try {
      const value = await AsyncStorage.getItem(name);
      return value ?? null;
    } catch (e) {
      console.warn("AsyncStorage error (getItem):", e);
      return null;
    }
  },
  setItem: async (name, value) => {
    if (isServer) return;
    try {
      await AsyncStorage.setItem(name, value);
    } catch (e) {
      console.warn("AsyncStorage error (setItem):", e);
    }
  },
  removeItem: async (name) => {
    if (isServer) return;
    try {
      await AsyncStorage.removeItem(name);
    } catch (e) {
      console.warn("AsyncStorage error (removeItem):", e);
    }
  },
};
