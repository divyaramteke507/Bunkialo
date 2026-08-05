import type { ExpoConfig } from "expo/config";

type PackageJson = { version?: string };

const pkg = require("./package.json") as PackageJson;

function requirePackageVersion(): string {
  const v = pkg.version;
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error("package.json version is missing or invalid");
  }
  return v;
}

export default ({ config }: { config: ExpoConfig }): ExpoConfig => {
  const pkgVersion = requirePackageVersion();
  const isExpoGoPreview = process.env.EXPO_GO_PREVIEW === "1";

  return {
    ...config,
    name: "Bunkialo2",
    slug: "Bunkialo2",
    orientation: "portrait",
    icon: "./src/assets/images/icon.png",
    scheme: "bunkialo",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      icon: {
        light: "./src/assets/images/ios-icon-light.png",
        dark: "./src/assets/images/ios-icon-dark.png",
        tinted: "./src/assets/images/ios-icon-tinted.png",
      },
      infoPlist: {
        UIBackgroundModes: ["fetch"],
      },
    },
    // Developer-facing build numbers are managed by EAS remote versioning.
    android: {
      softwareKeyboardLayoutMode: "resize",
      permissions: ["RECEIVE_BOOT_COMPLETED"],
      adaptiveIcon: {
        backgroundColor: "#FFAB00",
        foregroundImage: "./src/assets/images/android-icon-foreground.png",
        monochromeImage: "./src/assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.codialo.Bunkialo2",
    },
    web: {
      output: "static",
      bundler: "metro",
      favicon: "./src/assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-build-properties",
      "expo-background-task",
      [
        "expo-notifications",
        {
          defaultChannel: "default",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./src/assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#000000",
          dark: { backgroundColor: "#000000" },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "f08b6c23-02ea-4ec6-ae21-62dd67f2b30e",
      },
    },
    // Expo Go needs the SDK runtime; EAS builds keep the app runtime contract.
    runtimeVersion: isExpoGoPreview ? { policy: "sdkVersion" } : "1.2.0",
    updates: {
      url: "https://u.expo.dev/f08b6c23-02ea-4ec6-ae21-62dd67f2b30e",
    },

    version: pkgVersion,
  };
};
