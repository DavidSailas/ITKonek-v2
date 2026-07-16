import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
// Adjust this import to wherever your Supabase (or other) client lives
import { supabase } from "../../config/supabase";

type Category = "bug" | "suggestion" | "job_issue" | "payout_issue" | "other";

const CATEGORIES: {
  key: Category;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "bug", label: "Bug", icon: "bug-outline" },
  { key: "suggestion", label: "Suggestion", icon: "bulb-outline" },
  { key: "job_issue", label: "Job Issue", icon: "briefcase-outline" },
  { key: "payout_issue", label: "Payout Issue", icon: "wallet-outline" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

const MAX_LENGTH = 1000;

export default function FeedbackScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!category && message.trim().length >= 10 && !submitting;

  const handleSubmit = async () => {
    if (!category) {
      Alert.alert("Choose a category", "Let us know what this is about.");
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert("Add a bit more detail", "Please describe your feedback.");
      return;
    }

    setSubmitting(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not authenticated");

      const { error } = await supabase.from("feedback").insert({
        technician_id: uid,
        category,
        message: message.trim(),
      });

      if (error) throw error;

      Alert.alert("Thank you", "Your feedback has been sent.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Couldn't send feedback",
        "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/(technician)/(tabs)/settings")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Feedback</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            Found a bug or have an idea? Let us know below.
          </Text>

          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const selected = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCategory(c.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={c.icon}
                    size={14}
                    color={selected ? "#0D0D0D" : "#CCC"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.chipLabel,
                      selected && styles.chipLabelSelected,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>MESSAGE</Text>
          <View style={styles.textAreaWrap}>
            <TextInput
              style={styles.textArea}
              placeholder="Tell us what happened, or what you'd like to see..."
              placeholderTextColor="#555"
              multiline
              maxLength={MAX_LENGTH}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
          </View>
          <Text style={styles.charCount}>
            {message.length}/{MAX_LENGTH}
          </Text>

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text style={styles.submitText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  content: { padding: 20, paddingTop: 8, paddingBottom: 60 },
  intro: { color: "#999", fontSize: 13, lineHeight: 19, marginBottom: 24 },
  sectionLabel: {
    color: "#666",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "#161616",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: "#FFF", borderColor: "#FFF" },
  chipLabel: { color: "#CCC", fontSize: 12, fontWeight: "600" },
  chipLabelSelected: { color: "#0D0D0D" },
  textAreaWrap: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 4,
  },
  textArea: {
    color: "#EEE",
    fontSize: 14,
    minHeight: 140,
    padding: 12,
  },
  charCount: {
    color: "#555",
    fontSize: 11,
    textAlign: "right",
    marginTop: 6,
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: "#0D0D0D", fontSize: 14, fontWeight: "700" },
});
