import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Replace these with your real store listing URLs once published.
const APP_STORE_URL = "https://apps.apple.com/app/id0000000000";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.itkonek.app";

const RATING_LABELS: Record<number, string> = {
  1: "Not good",
  2: "Needs work",
  3: "It's okay",
  4: "Good",
  5: "Love it",
};

export default function RateScreen() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleOpenStore = () => {
    const url = Platform.OS === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url).catch(() =>
      Alert.alert("Couldn't open store", "Please try again later."),
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Pick a rating", "Tap a star to rate your experience.");
      return;
    }

    setSubmitting(true);
    // Hook this up to your ratings endpoint/table when one exists.
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent={false}
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)/(tabs)/settings")}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Rate ITKonek</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!submitted ? (
          <>
            <View style={styles.iconCircle}>
              <Ionicons name="star" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.heading}>How's your experience so far?</Text>
            <Text style={styles.subheading}>
              Your rating helps us prioritize what to improve next.
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={36}
                    color={star <= rating ? "#F59E0B" : "#D1D5DB"}
                    style={styles.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {rating > 0 && (
              <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
            )}

            {rating >= 4 && (
              <View style={styles.storePrompt}>
                <Text style={styles.storePromptText}>
                  That's great to hear! Mind sharing it on the app store too?
                </Text>
                <TouchableOpacity
                  style={styles.storeButton}
                  onPress={handleOpenStore}
                >
                  <Ionicons name="star" size={15} color="#111827" />
                  <Text style={styles.storeButtonText}>
                    Rate on {Platform.OS === "ios" ? "App Store" : "Play Store"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {rating > 0 && rating <= 3 && (
              <>
                <Text style={styles.label}>What could be better?</Text>
                <TextInput
                  style={styles.textArea}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Tell us what didn't work well..."
                  placeholderTextColor="#B0B0B0"
                  multiline
                />
              </>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (submitting || rating === 0) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.thankYouWrap}>
            <View style={styles.iconCircleSuccess}>
              <Ionicons name="checkmark" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.heading}>Thanks for rating ITKonek!</Text>
            <Text style={styles.subheading}>
              Your feedback goes straight to our product team.
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => router.back()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: { padding: 8 },
  title: { fontSize: 17, fontWeight: "800", color: "#111827" },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconCircleSuccess: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  subheading: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  starsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  starIcon: { marginHorizontal: 2 },
  ratingLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 20,
  },
  storePrompt: {
    width: "100%",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  storePromptText: {
    fontSize: 12,
    color: "#92400E",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 12,
  },
  storeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  storeButtonText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  label: {
    alignSelf: "flex-start",
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  textArea: {
    width: "100%",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
    marginBottom: 20,
  },
  submitButton: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  thankYouWrap: {
    alignItems: "center",
    paddingTop: 40,
  },
  doneButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
