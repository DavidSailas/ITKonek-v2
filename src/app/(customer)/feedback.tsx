import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type Category = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORIES: Category[] = [
  { key: "bug", label: "Bug", icon: "bug-outline" },
  { key: "suggestion", label: "Suggestion", icon: "bulb-outline" },
  { key: "compliment", label: "Compliment", icon: "heart-outline" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

const MAX_LENGTH = 500;

export default function FeedbackScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<string>("suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert(
        "Add a message",
        "Let us know what's on your mind before sending.",
      );
      return;
    }

    setSending(true);
    try {
      // Hook this up to your feedback endpoint/table when one exists,
      // e.g. supabase.from("feedback").insert({ category, message }).
      await new Promise((resolve) => setTimeout(resolve, 600));
      Alert.alert(
        "Thanks for the feedback!",
        "Our team reads every message and uses it to make ITKonek better.",
      );
      router.back();
    } catch (err) {
      Alert.alert("Couldn't send feedback", "Please try again in a moment.");
    } finally {
      setSending(false);
    }
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
        <Text style={styles.title}>Send Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Tell us what's working, what's not, or what you'd like to see next.
        </Text>

        <Text style={styles.label}>What's this about?</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon}
                  size={15}
                  color={active ? "#FFFFFF" : "#374151"}
                />
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Your message</Text>
        <TextInput
          style={styles.textArea}
          value={message}
          onChangeText={(text) => setMessage(text.slice(0, MAX_LENGTH))}
          placeholder="Share as much detail as you can..."
          placeholderTextColor="#B0B0B0"
          multiline
        />
        <Text style={styles.charCount}>
          {message.length}/{MAX_LENGTH}
        </Text>

        <TouchableOpacity
          style={[styles.submitButton, sending && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Send Feedback</Text>
          )}
        </TouchableOpacity>
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
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 22,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  chipText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  chipTextActive: { color: "#FFFFFF" },
  textArea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 6,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
