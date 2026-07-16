import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { supabase } from "../../config/supabase";

type TechDetails = {
  rank: string | null;
  years_experience: number | null;
  specialization: string[] | null;
  certification_level: string | null;
  exam_passing_score: number | null;
  badge_id: string | null;
  bio: string | null;
};

export default function ProfessionalDetailsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<TechDetails | null>(null);
  const [bio, setBio] = useState("");

  useEffect(() => {
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { data, error } = await supabase
        .from("technician_details")
        .select(
          "rank, years_experience, specialization, certification_level, exam_passing_score, badge_id, bio",
        )
        .eq("id", uid)
        .single();

      if (error) throw error;

      setDetails(data);
      setBio(data?.bio ?? "");
    } catch (err) {
      Alert.alert("Error", "Could not load your professional details.");
    } finally {
      setLoading(false);
    }
  };

  // Only the bio is self-editable. Rank, certification, and exam score
  // are managed by the admin/verification pipeline.
  const handleSaveBio = async () => {
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { error } = await supabase
        .from("technician_details")
        .update({ bio: bio.trim() || null })
        .eq("id", uid);

      if (error) throw error;
      Alert.alert("Saved", "Your bio has been updated.");
    } catch (err) {
      Alert.alert("Error", "Could not save your bio. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#FFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(technician)/(tabs)/settings")}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professional Details</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statRow}>
            <StatCard
              icon="ribbon-outline"
              label="Rank"
              value={details?.rank ?? "—"}
            />
            <StatCard
              icon="time-outline"
              label="Experience"
              value={
                details?.years_experience != null
                  ? `${details.years_experience} yrs`
                  : "—"
              }
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              icon="school-outline"
              label="Certification"
              value={details?.certification_level ?? "—"}
            />
            <StatCard
              icon="checkmark-done-outline"
              label="Exam Score"
              value={
                details?.exam_passing_score != null
                  ? `${details.exam_passing_score}%`
                  : "—"
              }
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Badge ID</Text>
            <Text style={styles.cardValue}>{details?.badge_id ?? "—"}</Text>
          </View>

          <Text style={styles.sectionLabel}>SPECIALIZATIONS</Text>
          <View style={styles.tagsWrap}>
            {details?.specialization && details.specialization.length > 0 ? (
              details.specialization.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No specializations on file.</Text>
            )}
          </View>

          <Text style={styles.sectionLabel}>BIO</Text>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell customers a bit about your background..."
            placeholderTextColor="#555"
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveBio}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text style={styles.saveBtnText}>Save Bio</Text>
            )}
          </TouchableOpacity>

          <View style={styles.noteBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#888"
            />
            <Text style={styles.noteText}>
              Rank, certification level, and exam score are verified by our
              team. Contact support to request a correction.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color="#3B82F6" />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 60 },

  statRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
  },
  statLabel: { color: "#888", fontSize: 11, marginTop: 8 },
  statValue: { color: "#FFF", fontSize: 15, fontWeight: "700", marginTop: 2 },

  card: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  cardLabel: { color: "#888", fontSize: 11, marginBottom: 4 },
  cardValue: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  sectionLabel: {
    color: "#666",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { color: "#CCC", fontSize: 12, fontWeight: "600" },
  emptyText: { color: "#555", fontSize: 13 },

  bioInput: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 12,
    padding: 14,
    color: "#FFF",
    fontSize: 14,
    minHeight: 110,
    marginBottom: 16,
  },

  saveBtn: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  saveBtnText: { color: "#0D0D0D", fontSize: 14, fontWeight: "700" },

  noteBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 14,
    alignItems: "flex-start",
  },
  noteText: { color: "#888", fontSize: 12, flex: 1, lineHeight: 18 },
});
