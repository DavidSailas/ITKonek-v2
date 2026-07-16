import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

type Clearance = {
  is_nbi_cleared: boolean | null;
  is_police_cleared: boolean | null;
};

export default function ComplianceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clearance, setClearance] = useState<Clearance | null>(null);

  useEffect(() => {
    fetchClearance();
  }, []);

  const fetchClearance = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { data, error } = await supabase
        .from("technician_details")
        .select("is_nbi_cleared, is_police_cleared")
        .eq("id", uid)
        .single();

      if (error) throw error;
      setClearance(data);
    } catch (err) {
      Alert.alert("Error", "Could not load your compliance status.");
    } finally {
      setLoading(false);
    }
  };

  // Wire up to your document upload flow (Supabase Storage) for
  // resubmission of clearance documents.
  const handleUpload = (type: string) => {
    Alert.alert(
      "Upload Document",
      `Hook this up to a document picker + Supabase Storage upload for your ${type}.`,
    );
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

  const overallCleared =
    clearance?.is_nbi_cleared && clearance?.is_police_cleared;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(technician)/(tabs)/settings")}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compliance & Clearance</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.summaryCard,
            {
              borderColor: overallCleared ? "#1E4620" : "#453A0F",
              backgroundColor: overallCleared ? "#0F1A10" : "#1A1608",
            },
          ]}
        >
          <Ionicons
            name={overallCleared ? "shield-checkmark" : "time-outline"}
            size={28}
            color={overallCleared ? "#22C55E" : "#EAB308"}
          />
          <Text style={styles.summaryTitle}>
            {overallCleared ? "You're fully cleared" : "Clearance pending"}
          </Text>
          <Text style={styles.summarySubtitle}>
            {overallCleared
              ? "Both background checks are verified."
              : "One or more background checks still need to be verified."}
          </Text>
        </View>

        <ClearanceRow
          icon="document-lock-outline"
          title="NBI Clearance"
          cleared={!!clearance?.is_nbi_cleared}
          onUpload={() => handleUpload("NBI Clearance")}
        />
        <ClearanceRow
          icon="shield-outline"
          title="Police Clearance"
          cleared={!!clearance?.is_police_cleared}
          onUpload={() => handleUpload("Police Clearance")}
        />

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color="#888" />
          <Text style={styles.noteText}>
            Clearance documents are reviewed manually. This can take up to 3
            business days after submission.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ClearanceRow({
  icon,
  title,
  cleared,
  onUpload,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  cleared: boolean;
  onUpload: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.rowIconWrap}>
          <Ionicons name={icon} size={18} color="#CCC" />
        </View>
        <Text style={styles.rowLabel}>{title}</Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: cleared ? "#0F2A14" : "#2A2308" },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              { color: cleared ? "#22C55E" : "#EAB308" },
            ]}
          >
            {cleared ? "Cleared" : "Pending"}
          </Text>
        </View>
      </View>
      {!cleared && (
        <TouchableOpacity style={styles.uploadBtn} onPress={onUpload}>
          <Ionicons name="cloud-upload-outline" size={16} color="#3B82F6" />
          <Text style={styles.uploadBtnText}>Upload document</Text>
        </TouchableOpacity>
      )}
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

  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  summaryTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  summarySubtitle: {
    color: "#999",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowLabel: { color: "#EEE", fontSize: 14, fontWeight: "600", flex: 1 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  uploadBtnText: { color: "#3B82F6", fontSize: 13, fontWeight: "600" },

  noteBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 14,
    alignItems: "flex-start",
    marginTop: 6,
  },
  noteText: { color: "#888", fontSize: 12, flex: 1, lineHeight: 18 },
});
