import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

// NOTE: This assumes a `notification_preferences` table keyed by
// technician id (columns below). It wasn't part of the schema you
// shared, so adjust the table/column names to match your setup —
// or swap the fetch/save calls for local device storage if you'd
// rather keep this client-side only.
type Prefs = {
  new_job_alerts: boolean;
  job_reminders: boolean;
  payout_updates: boolean;
  promotions: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
};

const DEFAULT_PREFS: Prefs = {
  new_job_alerts: true,
  job_reminders: true,
  payout_updates: true,
  promotions: false,
  push_enabled: true,
  email_enabled: true,
  sms_enabled: false,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;
      if (data) setPrefs({ ...DEFAULT_PREFS, ...data });
    } catch (err) {
      // Table may not exist yet — fall back to defaults silently.
    } finally {
      setLoading(false);
    }
  };

  const updatePref = async (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ id: uid, ...next });

      if (error) throw error;
    } catch (err) {
      setPrefs(prefs); // revert on failure
      Alert.alert("Error", "Could not save your preference. Try again.");
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>ALERTS</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="briefcase-outline"
            label="New Job Alerts"
            value={prefs.new_job_alerts}
            onValueChange={(v) => updatePref("new_job_alerts", v)}
          />
          <Divider />
          <ToggleRow
            icon="alarm-outline"
            label="Job Reminders"
            value={prefs.job_reminders}
            onValueChange={(v) => updatePref("job_reminders", v)}
          />
          <Divider />
          <ToggleRow
            icon="cash-outline"
            label="Payout Updates"
            value={prefs.payout_updates}
            onValueChange={(v) => updatePref("payout_updates", v)}
          />
          <Divider />
          <ToggleRow
            icon="megaphone-outline"
            label="Promotions & News"
            value={prefs.promotions}
            onValueChange={(v) => updatePref("promotions", v)}
          />
        </View>

        <Text style={styles.sectionLabel}>DELIVERY METHOD</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="notifications-outline"
            label="Push Notifications"
            value={prefs.push_enabled}
            onValueChange={(v) => updatePref("push_enabled", v)}
          />
          <Divider />
          <ToggleRow
            icon="mail-outline"
            label="Email"
            value={prefs.email_enabled}
            onValueChange={(v) => updatePref("email_enabled", v)}
          />
          <Divider />
          <ToggleRow
            icon="chatbox-outline"
            label="SMS"
            value={prefs.sms_enabled}
            onValueChange={(v) => updatePref("sms_enabled", v)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={18} color="#CCC" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#333", true: "#16A34A" }}
        thumbColor="#FFF"
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
});
