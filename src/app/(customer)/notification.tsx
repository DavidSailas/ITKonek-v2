import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

  const handleSavePreferences = () => {
    Alert.alert(
      "Preferences Saved",
      "Your notification settings have been updated.",
    );
    router.back();
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
          onPress={() => router.back()}
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
        {/* Master Toggle Banner */}
        <View style={styles.masterCard}>
          <View style={styles.masterTextWrap}>
            <Text style={styles.masterTitle}>Allow Notifications</Text>
            <Text style={styles.masterSubtitle}>
              Turn on or off all push notifications for ITKonek.
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
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="construct-outline" size={18} color="#111827" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Repair & Status Updates</Text>
              <Text style={styles.settingDesc}>
                Real-time updates on your dispatched technician.
              </Text>
            </View>
            <Switch
              disabled={!allowNotifications}
              value={allowNotifications && jobUpdates}
              onValueChange={setJobUpdates}
              trackColor={{ false: "#D1D5DB", true: "#111827" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#111827"
              />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Technician Chat Messages</Text>
              <Text style={styles.settingDesc}>
                Direct messages and voice calls from your tech.
              </Text>
            </View>
            <Switch
              disabled={!allowNotifications}
              value={allowNotifications && chatMessages}
              onValueChange={setChatMessages}
              trackColor={{ false: "#D1D5DB", true: "#111827" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="receipt-outline" size={18} color="#111827" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>
                Billing & Payment Invoices
              </Text>
              <Text style={styles.settingDesc}>
                Get notified as soon as a bill or receipt is issued.
              </Text>
            </View>
            <Switch
              disabled={!allowNotifications}
              value={allowNotifications && billingAlerts}
              onValueChange={setBillingAlerts}
              trackColor={{ false: "#D1D5DB", true: "#111827" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 2: Marketing & Extras */}
        <Text style={styles.sectionHeader}>Offers & SMS</Text>
        <View style={styles.groupCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="pricetag-outline" size={18} color="#111827" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Promotions & Discounts</Text>
              <Text style={styles.settingDesc}>
                Special offers and hardware repair discounts.
              </Text>
            </View>
            <Switch
              disabled={!allowNotifications}
              value={allowNotifications && promotions}
              onValueChange={setPromotions}
              trackColor={{ false: "#D1D5DB", true: "#111827" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color="#111827"
              />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>SMS Backup Alerts</Text>
              <Text style={styles.settingDesc}>
                Receive critical status updates via text messages.
              </Text>
            </View>
            <Switch
              disabled={!allowNotifications}
              value={allowNotifications && smsAlerts}
              onValueChange={setSmsAlerts}
              trackColor={{ false: "#D1D5DB", true: "#111827" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSavePreferences}
        >
          <Text style={styles.saveButtonText}>Save Preferences</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  masterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
  },
  masterTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  masterTitle: {
    fontSize: 16,
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
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
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
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  saveButton: {
    height: 50,
    backgroundColor: "#111827",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
