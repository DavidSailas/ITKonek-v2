import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// 1. IMPORT FROM SAFE-AREA-CONTEXT
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ONBOARDING_DATA } from "../../../constants/onboardingData";

const { width } = Dimensions.get("window");
const ONBOARDING_KEY = "hasSeenOnboarding";

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Get exact top and bottom notch/status bar spacing

  const goToLogin = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch (err) {
      console.error("Failed to persist onboarding flag:", err);
    } finally {
      router.replace("/(auth)/login");
    }
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      goToLogin();
    }
  };

  const handleSkip = () => {
    goToLogin();
  };

  return (
    <View style={styles.container}>
      {/* Header Skip Button - Dynamic top padding using insets */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        {currentIndex < ONBOARDING_DATA.length - 1 ? (
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ height: 20 }} />
        )}
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        data={ONBOARDING_DATA}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.imageStackWrapper}>
              <View style={[styles.stackBar, styles.stackBarBack]} />
              <View style={[styles.stackBar, styles.stackBarFront]} />
              <View style={styles.imageContainer}>
                <Image
                  source={item.image}
                  style={styles.image}
                  resizeMode="cover"
                />
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      {/* Pagination Indicators */}
      <View style={styles.paginationContainer}>
        {ONBOARDING_DATA.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              currentIndex === index
                ? styles.activeIndicator
                : styles.inactiveIndicator,
            ]}
          />
        ))}
      </View>

      {/* Action Button - Dynamic bottom padding for home indicator bar */}
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}
      >
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === ONBOARDING_DATA.length - 1 ? "Start" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CARD_SIZE = Math.min(width * 0.75, 360);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 12,
    minHeight: 44,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  slide: {
    width,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  imageStackWrapper: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  stackBar: {
    position: "absolute",
    width: 26,
    height: CARD_SIZE * 0.7,
    borderRadius: 16,
    backgroundColor: "#E8E8E8",
  },
  stackBarBack: {
    right: -18,
    opacity: 0.6,
  },
  stackBarFront: {
    right: -6,
    opacity: 0.9,
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    backgroundColor: "#0D0D0D",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    lineHeight: 20,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  indicator: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  activeIndicator: {
    width: 24,
    backgroundColor: "#1A1A1A",
  },
  inactiveIndicator: {
    width: 16,
    backgroundColor: "#E0E0E0",
  },
  footer: {
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
