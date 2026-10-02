import type { ExpoConfig } from "expo/config";

// Identificadores das lojas. Troque se já tiver outros registrados na Apple/Google.
const BUNDLE_ID = "com.treinoup.app";
const GRAPHITE = "#14141A";

const config: ExpoConfig = {
  name: "TreinoUp",
  slug: "treinoup",
  scheme: "treinoup",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  backgroundColor: GRAPHITE,
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: false,
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Usamos suas fotos para você escolher a foto do perfil.",
      NSCameraUsageDescription: "Usamos a câmera para você tirar a foto do perfil.",
    },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: GRAPHITE,
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
    output: "single",
  },
  plugins: [
    "expo-router",
    "expo-status-bar",
    "expo-secure-store",
    "expo-web-browser",
    "expo-image",
    "expo-font",
    "expo-localization",
    "expo-apple-authentication",
    [
      "expo-image-picker",
      {
        photosPermission: "Usamos suas fotos para você escolher a foto do perfil.",
        cameraPermission: "Usamos a câmera para você tirar a foto do perfil.",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 120,
        resizeMode: "contain",
        backgroundColor: GRAPHITE,
      },
    ],
  ],
  extra: {
    // Preenchido por `eas init` (vincula o projeto à sua conta Expo).
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
};

export default config;
