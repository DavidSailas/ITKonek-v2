import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ONBOARDING_KEY = "hasSeenOnboarding";

export default function SplashScreen() {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const appMode = process.env.EXPO_PUBLIC_APP_MODE;
  const isTechMode = appMode === "technician";

  useEffect(() => {
    const timer = setTimeout(async () => {
      // 1. Direct routing based on EXPO_PUBLIC_APP_MODE environment variable
      if (appMode === "technician") {
        handleTechFlow();
        return;
      }

      if (appMode === "customer") {
        await handleCustomerFlow();
        return;
      }

      // 2. Fallback: If EXPO_PUBLIC_APP_MODE is not set, reveal manual portal selection
      setShowOptions(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1200);

    return () => clearTimeout(timer);
  }, [appMode]);

  const handleCustomerFlow = async () => {
    try {
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (seen === "true") {
        router.replace("/(auth)/login" as any);
      } else {
        router.replace("/(auth)/onboarding" as any);
      }
    } catch (err) {
      router.replace("/(auth)/onboarding" as any);
    }
  };

  const handleTechFlow = () => {
    // Technicians bypass onboarding and go straight to tech-login
    router.replace("/(auth)/tech-login" as any);
  };

  return (
    <View style={styles.container}>
      {/* Brand Logo Section */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBox}>
          <Image
            source={require("../assets/Logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Dynamic App Title */}
        <Text style={styles.brand}>
          {isTechMode ? "ITKonek Pro" : "ITKonek"}
        </Text>

        {/* Dynamic Tagline */}
        <Text style={styles.tagline}>
          {isTechMode ? "Technician Workstation" : "make IT happen"}
        </Text>
      </View>

      {/* Role Selection Options (Fallback if EXPO_PUBLIC_APP_MODE is undefined) */}
      {showOptions && (
        <Animated.View style={[styles.actionContainer, { opacity: fadeAnim }]}>
          <Text style={styles.selectLabel}>CHOOSE YOUR PORTAL</Text>

          <TouchableOpacity
            style={styles.customerButton}
            onPress={handleCustomerFlow}
            activeOpacity={0.85}
          >
            <Ionicons name="person-outline" size={20} color="#000000" />
            <Text style={styles.customerButtonText}>Customer Portal</Text>
            <Ionicons name="arrow-forward" size={16} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.techButton}
            onPress={handleTechFlow}
            activeOpacity={0.85}
          >
            <Ionicons name="hardware-chip-outline" size={20} color="#FFFFFF" />
            <Text style={styles.techButtonText}>Technician Portal</Text>
            <Ionicons name="arrow-forward" size={16} color="#8A8A8A" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  brandContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    padding: 16,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    tintColor: "#FFFFFF",
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 11,
    color: "#8A8A8A",
    marginTop: 6,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  actionContainer: {
    width: "100%",
    gap: 12,
  },
  selectLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#666666",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 4,
  },
  customerButton: {
    backgroundColor: "#FFFFFF",
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  customerButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
    flex: 1,
    marginLeft: 12,
  },
  techButton: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  techButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    marginLeft: 12,
  },
});
