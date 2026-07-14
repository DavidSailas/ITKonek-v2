const IS_TECH = process.env.EXPO_PUBLIC_APP_MODE === "technician";

export default {
  expo: {
    // Dynamic App Name
    name: IS_TECH ? "ITKonek Pro" : "ITKonek",
    slug: IS_TECH ? "itkonek-pro" : "itkonek",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: IS_TECH ? "itkonek-pro" : "itkonek",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_TECH
        ? "com.itkonek.technician"
        : "com.itkonek.customer",
    },
    android: {
      // Required by Google Play Store to separate customer & tech builds
      package: IS_TECH ? "com.itkonek.technician" : "com.itkonek.customer",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      navigationBar: {
        visible: "sticky-immersive",
      },
      userInterfaceStyle: "automatic",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-web-browser",
      "@react-native-community/datetimepicker",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
