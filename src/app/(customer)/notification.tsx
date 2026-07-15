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
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tintBg: string;
  title: string;
  desc: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (v: boolean) => void;
};

function SettingRow({
  icon,
  tint,
  tintBg,
  title,
  desc,
  value,
  disabled,
  onValueChange,
}: RowProps) {
  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={[styles.settingIconWrap, { backgroundColor: tintBg }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.settingTextWrap}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
      <Switch
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D1D5DB", true: "#111827" }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const router = useRouter();

  // Master Toggle
  const [allowNotifications, setAllowNotifications] = useState(true);

  // Preference Toggles
  const [jobUpdates, setJobUpdates] = useState(true);
  const [chatMessages, setChatMessages] = useState(true);
  const [billingAlerts, setBillingAlerts] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);

  // Quiet Hours
  const [quietHours, setQuietHours] = useState(false);

  const [saving, setSaving] = useState(false);

  const handleSavePreferences = () => {
    setSaving(true);
    // Simulated persistence — wire this up to your preferences
    // endpoint/table when one is available.
    setTimeout(() => {
      setSaving(false);
      Alert.alert(
        "Preferences saved",
        "Your notification settings have been updated.",
      );
      router.back();
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent={false}
      />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(customer)/(tabs)/settings")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageSubtitle}>
          Choose what ITKonek keeps you posted on, and when.
        </Text>

        {/* Master Toggle Banner */}
        <View style={styles.masterCard}>
          <View style={styles.masterIconWrap}>
            <Ionicons name="notifications" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.masterTextWrap}>
            <Text style={styles.masterTitle}>Allow Notifications</Text>
            <Text style={styles.masterSubtitle}>
              Master switch for every alert below.
            </Text>
          </View>
          <Switch
            value={allowNotifications}
            onValueChange={setAllowNotifications}
            trackColor={{ false: "#D1D5DB", true: "#111827" }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#D1D5DB"
          />
        </View>

        {/* Section 1: Service & Security Alerts */}
        <Text style={styles.sectionHeader}>Service & Order Alerts</Text>
        <View style={styles.groupCard}>
          <SettingRow
            icon="construct-outline"
            tint="#2563EB"
            tintBg="#EFF6FF"
            title="Repair & Status Updates"
            desc="Real-time updates on your dispatched technician."
            value={allowNotifications && jobUpdates}
            disabled={!allowNotifications}
            onValueChange={setJobUpdates}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="chatbubble-ellipses-outline"
            tint="#7C3AED"
            tintBg="#F5F3FF"
            title="Technician Chat Messages"
            desc="Direct messages and voice calls from your tech."
            value={allowNotifications && chatMessages}
            disabled={!allowNotifications}
            onValueChange={setChatMessages}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="receipt-outline"
            tint="#059669"
            tintBg="#ECFDF5"
            title="Billing & Payment Invoices"
            desc="Get notified as soon as a bill or receipt is issued."
            value={allowNotifications && billingAlerts}
            disabled={!allowNotifications}
            onValueChange={setBillingAlerts}
          />
        </View>

        {/* Section 2: Marketing & Extras */}
        <Text style={styles.sectionHeader}>Offers & SMS</Text>
        <View style={styles.groupCard}>
          <SettingRow
            icon="pricetag-outline"
            tint="#D97706"
            tintBg="#FFFBEB"
            title="Promotions & Discounts"
            desc="Special offers and hardware repair discounts."
            value={allowNotifications && promotions}
            disabled={!allowNotifications}
            onValueChange={setPromotions}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="phone-portrait-outline"
            tint="#0D9488"
            tintBg="#F0FDFA"
            title="SMS Backup Alerts"
            desc="Receive critical status updates via text messages."
            value={allowNotifications && smsAlerts}
            disabled={!allowNotifications}
            onValueChange={setSmsAlerts}
          />
        </View>

        {/* Section 3: Quiet Hours */}
        <Text style={styles.sectionHeader}>Quiet Hours</Text>
        <View style={styles.groupCard}>
          <SettingRow
            icon="moon-outline"
            tint="#4B5563"
            tintBg="#F3F4F6"
            title="Pause Non-Urgent Alerts"
            desc="Mutes promotions and chat pings from 10 PM to 7 AM. Repair updates still come through."
            value={allowNotifications && quietHours}
            disabled={!allowNotifications}
            onValueChange={setQuietHours}
          />
        </View>

        <Text style={styles.footerNote}>
          You can change these anytime. Some service updates, like confirmation
          of a completed repair, may still be sent even with notifications
          paused.
        </Text>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSavePreferences}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  android: { elevation: 1 },
  default: {},
});

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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 18,
    lineHeight: 18,
  },
  masterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
    gap: 12,
    ...cardShadow,
  },
  masterIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  masterTextWrap: {
    flex: 1,
  },
  masterTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  masterSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
    paddingHorizontal: 16,
    ...cardShadow,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTextWrap: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  settingDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  footerNote: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    backgroundColor: "#111827",
    borderRadius: 14,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
