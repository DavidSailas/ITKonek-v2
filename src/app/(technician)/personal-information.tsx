import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function PersonalInformationScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone_number, avatar_url")
        .eq("id", uid)
        .single();

      if (error) throw error;

      setFirstName(data?.first_name ?? "");
      setLastName(data?.last_name ?? "");
      setEmail(data?.email ?? "");
      setPhoneNumber(data?.phone_number ?? "");
      setAvatarUrl(data?.avatar_url ?? null);
    } catch (err) {
      Alert.alert("Error", "Could not load your information.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Missing info", "First and last name are required.");
      return;
    }

    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || null,
        })
        .eq("id", uid);

      if (error) throw error;

      Alert.alert("Saved", "Your information has been updated.");
      router.back();
    } catch (err) {
      Alert.alert("Error", "Could not save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Placeholder avatar picker. Wire up expo-image-picker + Supabase storage
  // upload here, then call setAvatarUrl(publicUrl) and persist to profiles.
  const handleChangeAvatar = () => {
    Alert.alert(
      "Change Photo",
      "Hook this up to expo-image-picker + Supabase Storage to upload a new avatar.",
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(technician)/(tabs)/settings")}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
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
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={36} color="#666" />
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={handleChangeAvatar}
            >
              <Ionicons name="camera" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Field
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
          />
          <Field
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            editable={false}
            placeholder="Email"
          />
          <Field
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#555"
        editable={editable}
        keyboardType={keyboardType}
      />
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

  avatarWrap: {
    alignSelf: "center",
    marginBottom: 28,
    position: "relative",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#242424",
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0D0D0D",
  },

  fieldWrap: { marginBottom: 18 },
  fieldLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#FFF",
    fontSize: 14,
  },
  inputDisabled: { color: "#777" },

  saveBtn: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "#0D0D0D", fontSize: 14, fontWeight: "700" },
});
