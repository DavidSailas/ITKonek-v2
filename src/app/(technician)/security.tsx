import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
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

export default function SecurityScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Too short", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Not signed in");

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      Alert.alert("Success", "Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.code === "auth/wrong-password"
          ? "Current password is incorrect."
          : "Could not update your password. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(technician)/(tabs)/settings")}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Password & Security</Text>
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
          <Text style={styles.sectionLabel}>CHANGE PASSWORD</Text>
          <View style={styles.card}>
            <Field
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <View style={styles.cardDivider} />
            <Field
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <View style={styles.cardDivider} />
            <Field
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleChangePassword}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text style={styles.saveBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
            ACCOUNT SECURITY
          </Text>
          <View style={styles.card}>
            <Row
              icon="phone-portrait-outline"
              label="Two-Factor Authentication"
              value="Not set up"
              onPress={() =>
                Alert.alert("Coming soon", "2FA setup is not yet available.")
              }
            />
            <View style={styles.cardDivider} />
            <Row
              icon="log-out-outline"
              label="Sign Out of Other Devices"
              onPress={() =>
                Alert.alert(
                  "Sign Out Everywhere",
                  "This will require reauthentication support in your Firebase setup.",
                )
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor="#444"
      />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={18} color="#CCC" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color="#555" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
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
  },
  card: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardDivider: { height: 1, backgroundColor: "#242424", marginLeft: 14 },

  fieldRow: { paddingHorizontal: 14, paddingVertical: 12 },
  fieldLabel: { color: "#888", fontSize: 12, marginBottom: 6 },
  input: { color: "#FFF", fontSize: 14, padding: 0 },

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

  saveBtn: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: { color: "#0D0D0D", fontSize: 14, fontWeight: "700" },
});
