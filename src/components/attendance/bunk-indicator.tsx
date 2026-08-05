import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface BunkIndicatorProps {
  remainingBunks: number;
  projectedSemesterBunks?: number;
  estimatedTotalSemClasses?: number;
  isBelowThreshold: boolean;
  percentage: number;
  compact?: boolean;
}

export function BunkIndicator({
  remainingBunks,
  projectedSemesterBunks,
  estimatedTotalSemClasses,
  isBelowThreshold,
  percentage,
  compact = false,
}: BunkIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const displayProjected = typeof projectedSemesterBunks === "number";

  // Determine status color scheme
  let badgeBg = isDark ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.1)";
  let badgeBorder = isDark ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.25)";
  let textColor = "#22C55E";
  let statusText = isBelowThreshold
    ? "Below 80%"
    : `${remainingBunks} safe bunk${remainingBunks === 1 ? "" : "s"} right now`;
  let iconName: keyof typeof Ionicons.glyphMap = "checkmark-circle-outline";

  if (isBelowThreshold || percentage < 80) {
    badgeBg = isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)";
    badgeBorder = isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.25)";
    textColor = "#EF4444";
    statusText = "Status: Below 80%";
    iconName = "alert-circle-outline";
  } else if (remainingBunks <= 2) {
    badgeBg = isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)";
    badgeBorder = isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.25)";
    textColor = "#F59E0B";
    statusText = `${remainingBunks} safe bunk${remainingBunks === 1 ? "" : "s"} right now`;
    iconName = "warning-outline";
  }

  if (compact) {
    return (
      <View
        className="flex-row items-center rounded-full px-2.5 py-1 border"
        style={{
          backgroundColor: badgeBg,
          borderColor: badgeBorder,
        }}
      >
        <Ionicons name={iconName} size={14} color={textColor} />
        <Text className="ml-1 text-xs font-semibold" style={{ color: textColor }}>
          {isBelowThreshold
            ? "Below 80% (0 bunks)"
            : `${remainingBunks} Bunks Now${
                displayProjected ? ` • ${projectedSemesterBunks} Total` : ""
              }`}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="rounded-xl p-3.5 border mt-3"
      style={{
        backgroundColor: badgeBg,
        borderColor: badgeBorder,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <Ionicons name={iconName} size={22} color={textColor} />
          <View className="ml-2.5 flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Remaining Safe Bunks (Right Now)
            </Text>
            <Text className="text-sm font-extrabold mt-0.5" style={{ color: textColor }}>
              {statusText}
            </Text>
          </View>
        </View>
        <View className="items-end justify-center">
          <Text className="text-2xl font-black tabular-nums" style={{ color: textColor }}>
            {remainingBunks}
          </Text>
        </View>
      </View>

      {displayProjected ? (
        <View className="mt-2.5 pt-2.5 border-t border-neutral-200/40 dark:border-neutral-800/60 flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color={textColor} />
            <Text className="ml-1.5 text-xs font-medium text-neutral-400">
              Till Last Day of Classes ({estimatedTotalSemClasses} sem classes):
            </Text>
          </View>
          <Text className="text-sm font-bold tabular-nums ml-2" style={{ color: textColor }}>
            {projectedSemesterBunks} safe bunks left
          </Text>
        </View>
      ) : null}
    </View>
  );
}
