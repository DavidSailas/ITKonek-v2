import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../../config/firebase";
// Adjust this import to wherever your Supabase (or other) client lives
import { supabase } from "../../../config/supabase";

type TechProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  is_online: boolean | null;
  location: string | null;
};

type TechDetails = {
  id: string;
  rank: string | null;
  years_experience: number | null;
  specialization: string[] | null;
  certification_level: string | null;
  is_nbi_cleared: boolean | null;
  is_police_cleared: boolean | null;
};

export default function TechSettingsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TechProfile | null>(null);
  const [details, setDetails] = useState<TechDetails | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  useEffect(() => {
    fetchTechData();
  }, []);

  const fetchTechData = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, email, phone_number, avatar_url, is_verified, is_online, location",
        )
        .eq("id", uid)
        .single();

      if (profileErr) throw profileErr;

      const { data: detailsData, error: detailsErr } = await supabase
        .from("technician_details")
        .select(
          "id, rank, years_experience, specialization, certification_level, is_nbi_cleared, is_police_cleared",
        )
        .eq("id", uid)
        .single();

      if (detailsErr) throw detailsErr;

      setProfile(profileData);
      setDetails(detailsData);
      setIsOnline(!!profileData?.is_online);
    } catch (err: any) {
      Alert.alert("Error", "Could not load your profile. Pull to refresh.");
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = async (value: boolean) => {
    setIsOnline(value);
    setTogglingOnline(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { error } = await supabase
        .from("profiles")
        .update({ is_online: value })
        .eq("id", uid);

      if (error) throw error;
    } catch (err: any) {
      setIsOnline(!value); // revert on failure
      Alert.alert("Error", "Could not update your status. Try again.");
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/tech-login" as any);
    } catch (err: any) {
      Alert.alert("Logout Error", err.message);
    }
  };

  const complianceStatus =
    details?.is_nbi_cleared && details?.is_police_cleared
      ? { label: "Cleared", color: "#22C55E" }
      : { label: "Pending", color: "#EAB308" };

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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Technician Settings</Text>

        {/* Profile header */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() =>
            router.push("/(technician)/personal-information" as any)
          }
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={22} color="#666" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile?.first_name} {profile?.last_name}
              </Text>
              {profile?.is_verified && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#3B82F6"
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {profile?.email}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#555" />
        </TouchableOpacity>

        {/* Availability toggle - always visible, not buried in a subpage */}
        <View style={styles.onlineCard}>
          <View
            style={[
              styles.onlineDot,
              { backgroundColor: isOnline ? "#22C55E" : "#555" },
            ]}
          />
          <Text style={styles.onlineLabel}>
            {isOnline ? "Online — accepting jobs" : "Offline"}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            disabled={togglingOnline}
            trackColor={{ false: "#333", true: "#16A34A" }}
            thumbColor="#FFF"
          />
        </View>

        {/* ACCOUNT */}
        <SectionLabel label="ACCOUNT" />
        <Card>
          <Row
            icon="person-outline"
            label="Personal Information"
            onPress={() =>
              router.push("/(technician)/personal-information" as any)
            }
          />
          <Divider />
          <Row
            icon="briefcase-outline"
            label="Professional Details"
            value={details?.rank ?? undefined}
            onPress={() =>
              router.push("/(technician)/professional-details" as any)
            }
          />
          <Divider />
          <Row
            icon="shield-checkmark-outline"
            label="Compliance & Clearance"
            valueColor={complianceStatus.color}
            value={complianceStatus.label}
            onPress={() => router.push("/(technician)/compliance" as any)}
          />
          <Divider />
          <Row
            icon="location-outline"
            label="Service Location"
            value={profile?.location ?? undefined}
            onPress={() => router.push("/(technician)/location" as any)}
          />
          <Divider />
          <Row
            icon="lock-closed-outline"
            label="Password & Security"
            onPress={() => router.push("/(technician)/security" as any)}
          />
        </Card>

        {/* EARNINGS */}
        <SectionLabel label="EARNINGS" />
        <Card>
          <Row
            icon="wallet-outline"
            label="Payout Method"
            onPress={() => router.push("/(technician)/payout" as any)}
          />
          <Divider />
          <Row
            icon="receipt-outline"
            label="Transaction History"
            onPress={() => router.push("/(technician)/transactions" as any)}
          />
        </Card>

        {/* PREFERENCES */}
        <SectionLabel label="PREFERENCES" />
        <Card>
          <Row
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push("/(technician)/notifications" as any)}
          />
        </Card>

        {/* LEGAL */}
        <SectionLabel label="LEGAL" />
        <Card>
          <Row
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => router.push("/(technician)/terms" as any)}
          />
          <Divider />
          <Row
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => router.push("/(technician)/privacy" as any)}
          />
        </Card>

        {/* SUPPORT & FEEDBACK */}
        <SectionLabel label="SUPPORT & FEEDBACK" />
        <Card>
          <Row
            icon="help-circle-outline"
            label="Help"
            onPress={() => router.push("/(technician)/help" as any)}
          />
          <Divider />
          <Row
            icon="chatbubble-ellipses-outline"
            label="Send Feedback"
            onPress={() => router.push("/(technician)/feedback" as any)}
          />
        </Card>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- small building blocks ---------- */

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function Row({
  icon,
  label,
  value,
  valueColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  valueColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={18} color="#CCC" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && (
        <Text
          style={[styles.rowValue, valueColor ? { color: valueColor } : null]}
        >
          {value}
        </Text>
      )}
      <Ionicons name="chevron-forward" size={18} color="#555" />
    </TouchableOpacity>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingTop: 40, paddingBottom: 60 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "800", marginBottom: 20 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#242424",
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center" },
  profileName: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  profileEmail: { color: "#888", fontSize: 12, marginTop: 2 },

  onlineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  onlineLabel: { color: "#FFF", fontSize: 13, fontWeight: "600", flex: 1 },

  sectionLabel: {
    color: "#666",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    marginBottom: 20,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: "#242424", marginLeft: 54 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
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
  rowValue: { color: "#888", fontSize: 12, marginRight: 8 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#1A1414",
    borderWidth: 1,
    borderColor: "#451A1A",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  logoutText: { color: "#EF4444", fontSize: 14, fontWeight: "700" },
});
