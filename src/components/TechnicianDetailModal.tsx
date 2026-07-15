import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface TechnicianDetails {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  is_online?: boolean;
  is_verified?: boolean;
  location?: string | null;
  technician_details?: {
    rank?: string | null;
    years_experience?: number | null;
    specialization?: string | null;
    certification_level?: string | null;
    exam_passing_score?: number | null;
    is_nbi_cleared?: boolean | null;
    is_police_cleared?: boolean | null;
    bio?: string | null;
  } | null;
}

interface Props {
  visible: boolean;
  technician: TechnicianDetails | null;
  onClose: () => void;
  onBook: (technician: TechnicianDetails) => void;
}

export default function TechnicianDetailModal({
  visible,
  technician,
  onClose,
  onBook,
}: Props) {
  if (!technician) return null;
  const details = technician.technician_details;
  const fullName = `${technician.first_name ?? ""} ${
    technician.last_name ?? ""
  }`.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#111827" />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.avatarWrap}>
                {technician.avatar_url ? (
                  <Image
                    source={{ uri: technician.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {(technician.first_name?.[0] || "T").toUpperCase()}
                    </Text>
                  </View>
                )}
                {technician.is_online && <View style={styles.onlineDot} />}
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.name}>{fullName || "Technician"}</Text>
                {technician.is_verified && (
                  <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
                )}
              </View>

              {!!details?.rank && (
                <View style={styles.rankChip}>
                  <Ionicons name="ribbon-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.rankChipText}>{details.rank}</Text>
                </View>
              )}

              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: technician.is_online
                        ? "#10B981"
                        : "#9CA3AF",
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {technician.is_online ? "Online now" : "Offline"}
                </Text>
                {!!technician.location && (
                  <>
                    <Text style={styles.statusDivider}>•</Text>
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color="#6B7280"
                    />
                    <Text style={styles.statusText}>{technician.location}</Text>
                  </>
                )}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {details?.years_experience ?? "—"}
                </Text>
                <Text style={styles.statLabel}>Years Exp.</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {details?.certification_level ?? "—"}
                </Text>
                <Text style={styles.statLabel}>Certification</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {details?.exam_passing_score != null
                    ? `${details.exam_passing_score}%`
                    : "—"}
                </Text>
                <Text style={styles.statLabel}>Exam Score</Text>
              </View>
            </View>

            {/* Specialization */}
            {!!details?.specialization && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Specialization</Text>
                <View style={styles.specChip}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={13}
                    color="#111827"
                  />
                  <Text style={styles.specChipText}>
                    {details.specialization}
                  </Text>
                </View>
              </View>
            )}

            {/* Clearances */}
            {(details?.is_nbi_cleared || details?.is_police_cleared) && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Background Checks</Text>
                <View style={styles.clearanceRow}>
                  {details?.is_nbi_cleared && (
                    <View style={styles.clearancePill}>
                      <Ionicons
                        name="shield-checkmark"
                        size={13}
                        color="#047857"
                      />
                      <Text style={styles.clearanceText}>NBI Cleared</Text>
                    </View>
                  )}
                  {details?.is_police_cleared && (
                    <View style={styles.clearancePill}>
                      <Ionicons
                        name="shield-checkmark"
                        size={13}
                        color="#047857"
                      />
                      <Text style={styles.clearanceText}>Police Cleared</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Bio */}
            {!!details?.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>About</Text>
                <Text style={styles.bioText}>{details.bio}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => onBook(technician)}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={styles.bookBtnText}>Book This Technician</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingBottom: 12 },
  header: { alignItems: "center", paddingTop: 12, paddingBottom: 16 },
  avatarWrap: { position: "relative", marginBottom: 10 },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 28, fontWeight: "800", color: "#111827" },
  onlineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    position: "absolute",
    bottom: 2,
    right: 2,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 19, fontWeight: "800", color: "#111827" },
  rankChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  rankChipText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  statusDivider: { fontSize: 12, color: "#D1D5DB", marginHorizontal: 2 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 18,
  },
  statBox: { flex: 1, alignItems: "center", gap: 3 },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    textTransform: "capitalize",
  },
  statLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  statDivider: { width: 1, height: 28, backgroundColor: "#E5E7EB" },
  section: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  specChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  specChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111827",
    textTransform: "capitalize",
  },
  clearanceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  clearancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  clearanceText: { fontSize: 11.5, fontWeight: "700", color: "#047857" },
  bioText: { fontSize: 13, color: "#374151", lineHeight: 19 },
  footer: {
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    height: 50,
    borderRadius: 14,
  },
  bookBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
