import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  selectIIITKOverallStats,
  useIIITKAttendanceStore,
} from "@/stores/iiitk-attendance-store";
import type { IIITKCourseAttendance } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { BunkIndicator } from "./bunk-indicator";

export function IIITKAttendanceDashboard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const {
    courses,
    user,
    isLoading,
    error,
    fetchAttendance,
    logout,
    lastSyncTime,
  } = useIIITKAttendanceStore();

  const stats = selectIIITKOverallStats(courses);

  const handleRefresh = () => {
    fetchAttendance({ silent: false });
  };

  const renderHeader = () => (
    <View className="mb-4">
      {/* Student Profile & Session Card */}
      <View
        className="rounded-2xl p-5 border shadow-sm mb-4"
        style={{
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1 mr-2">
            {user?.rollNo ? (
              <Text className="text-xs font-mono font-semibold tracking-wide text-indigo-500 mb-0.5">
                {user.rollNo}
              </Text>
            ) : null}
            <Text
              className="text-lg font-bold"
              style={{ color: theme.text }}
              numberOfLines={1}
            >
              {user?.name || "Student"}
            </Text>
            {user?.branch ? (
              <Text
                className="text-xs font-medium mt-0.5"
                style={{ color: theme.textSecondary }}
              >
                {user.branch} {user.semester ? `• Semester ${user.semester}` : ""}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={logout}
            className="flex-row items-center rounded-xl px-3 py-1.5 border border-red-500/30 bg-red-500/10"
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={14} color="#EF4444" />
            <Text className="ml-1 text-xs font-semibold text-red-500">Sign Out</Text>
          </Pressable>
        </View>

        {/* Overall Attendance Summary Grid */}
        <View className="mt-2 pt-3 border-t border-neutral-200/40 dark:border-neutral-800 flex-row items-center justify-between">
          <View className="flex-1 items-center justify-center border-r border-neutral-200/40 dark:border-neutral-800 pr-2">
            <Text className="text-2xl font-black tabular-nums text-indigo-500">
              {stats.overallPercentage}%
            </Text>
            <Text
              className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
              style={{ color: theme.textSecondary }}
            >
              Overall Attendance
            </Text>
          </View>

          <View className="flex-1 items-center justify-center border-r border-neutral-200/40 dark:border-neutral-800 px-2">
            <Text
              className="text-2xl font-bold tabular-nums"
              style={{ color: theme.text }}
            >
              {stats.totalAttended} / {stats.totalSessions}
            </Text>
            <Text
              className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
              style={{ color: theme.textSecondary }}
            >
              Attended / Total
            </Text>
          </View>

          <View className="flex-1 items-center justify-center pl-2">
            <Text
              className="text-2xl font-bold tabular-nums"
              style={{
                color: stats.belowThresholdCourses > 0 ? "#EF4444" : "#22C55E",
              }}
            >
              {stats.safeCourses} / {stats.totalCourses}
            </Text>
            <Text
              className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
              style={{ color: theme.textSecondary }}
            >
              Safe Courses
            </Text>
          </View>
        </View>
      </View>

      {error ? (
        <View className="mb-4 flex-row items-center rounded-xl bg-red-500/10 p-3 border border-red-500/20">
          <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
          <Text className="ml-2 flex-1 text-xs font-medium text-red-500">
            {error}
          </Text>
        </View>
      ) : null}

      <Text
        className="text-sm font-bold uppercase tracking-wider mb-2 ml-1"
        style={{ color: theme.textSecondary }}
      >
        Course Bunk Calculator
      </Text>
    </View>
  );

  const renderCourseItem = ({ item }: { item: IIITKCourseAttendance }) => {
    const isBelow = item.isBelowThreshold || item.percentage < 80;
    const progressWidth = `${Math.min(100, Math.max(0, item.percentage))}%`;

    return (
      <View
        className="rounded-2xl p-5 mb-3.5 border shadow-sm"
        style={{
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        }}
      >
        {/* Course Header */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-2">
            {item.courseCode ? (
              <Text className="text-xs font-mono font-bold text-indigo-500 mb-0.5">
                {item.courseCode}
              </Text>
            ) : null}
            <Text
              className="text-base font-bold"
              style={{ color: theme.text }}
            >
              {item.courseName}
            </Text>
          </View>
          <View className="items-end">
            <Text
              className="text-xl font-black tabular-nums"
              style={{ color: isBelow ? "#EF4444" : "#22C55E" }}
            >
              {item.percentage}%
            </Text>
            <Text
              className="text-xs font-semibold tabular-nums mt-0.5"
              style={{ color: theme.textSecondary }}
            >
              Attended: {item.attended} / {item.totalSessions}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden my-2">
          <View
            className="h-full rounded-full"
            style={{
              width: progressWidth as `${number}%`,
              backgroundColor: isBelow ? "#EF4444" : "#22C55E",
            }}
          />
        </View>

        {/* Remaining Safe Bunks Indicator */}
        <BunkIndicator
          remainingBunks={item.remainingBunks}
          projectedSemesterBunks={item.projectedSemesterBunks}
          estimatedTotalSemClasses={item.estimatedTotalSemClasses}
          isBelowThreshold={isBelow}
          percentage={item.percentage}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text
            className="mt-3 text-xs font-medium"
            style={{ color: theme.textSecondary }}
          >
            Fetching attendance from IIITK Portal...
          </Text>
        </View>
      );
    }

    return (
      <View className="py-12 items-center justify-center">
        <Ionicons
          name="file-tray-outline"
          size={48}
          color={theme.textSecondary}
        />
        <Text className="mt-3 text-sm font-bold" style={{ color: theme.text }}>
          No Attendance Records Found
        </Text>
        <Text
          className="mt-1 text-xs text-center px-6"
          style={{ color: theme.textSecondary }}
        >
          No course attendance data was returned by the attendance portal.
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      data={courses}
      keyExtractor={(item, index) => item.courseId || `iiitk-c-${index}`}
      ListHeaderComponent={renderHeader}
      renderItem={renderCourseItem}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor="#6366F1"
          colors={["#6366F1"]}
        />
      }
    />
  );
}
