import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useIIITKAttendanceStore } from "@/stores/iiitk-attendance-store";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export function IIITKLoginCard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const { login, isLoading, error, clearError } = useIIITKAttendanceStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    await login(email, password);
  };

  return (
    <View
      className="mx-4 my-6 rounded-2xl p-6 border shadow-sm"
      style={{
        backgroundColor: theme.backgroundSecondary,
        borderColor: theme.border,
      }}
    >
      <View className="items-center mb-6">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 mb-3">
          <Ionicons name="school-outline" size={28} color="#6366F1" />
        </View>
        <Text
          className="text-xl font-bold text-center"
          style={{ color: theme.text }}
        >
          IIITK Attendance Portal
        </Text>
        <Text
          className="text-xs text-center mt-1 px-4"
          style={{ color: theme.textSecondary }}
        >
          Sign in with your attendance.iiitkottayam.ac.in credentials to calculate your safe bunks.
        </Text>
      </View>

      {error ? (
        <View className="mb-4 flex-row items-center rounded-xl bg-red-500/10 p-3 border border-red-500/20">
          <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
          <Text className="ml-2 flex-1 text-xs font-medium text-red-500">
            {error}
          </Text>
          <Pressable onPress={clearError} hitSlop={8}>
            <Ionicons name="close" size={16} color="#EF4444" />
          </Pressable>
        </View>
      ) : null}

      <View className="space-y-4">
        <View>
          <Text
            className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: theme.textSecondary }}
          >
            Email Address
          </Text>
          <View
            className="flex-row items-center rounded-xl px-3.5 py-3 border"
            style={{
              backgroundColor: theme.background,
              borderColor: theme.border,
            }}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={theme.textSecondary}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. ramtekedivya25bcs161@iiitkottayam.ac.in"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              className="ml-2.5 flex-1 text-sm font-medium"
              style={{ color: theme.text }}
            />
          </View>
        </View>

        <View className="mt-3">
          <Text
            className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: theme.textSecondary }}
          >
            Password
          </Text>
          <View
            className="flex-row items-center rounded-xl px-3.5 py-3 border"
            style={{
              backgroundColor: theme.background,
              borderColor: theme.border,
            }}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={theme.textSecondary}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your portal password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              className="ml-2.5 flex-1 text-sm font-medium"
              style={{ color: theme.text }}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={isLoading || !email.trim() || !password}
          className="mt-6 flex-row items-center justify-center rounded-xl py-3.5 px-4 shadow-sm"
          style={{
            backgroundColor:
              isLoading || !email.trim() || !password ? "#6366F180" : "#6366F1",
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text className="text-sm font-bold text-white mr-1.5">
                Sign In to Attendance Portal
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
