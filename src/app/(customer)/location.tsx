import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

export default function LocationScreen() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAddress();
  }, []);

  const fetchAddress = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("address")
      .eq("id", user.uid)
      .single();
    if (data?.address) setAddress(data.address);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ address: address.trim() })
      .eq("id", user.uid);
    setSaving(false);

    if (error) {
      Alert.alert("Save failed", error.message);
    } else {
      Alert.alert("Saved", "Your default location has been updated.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Location</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Default Service Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="House/Unit no., Street, Barangay, City"
          placeholderTextColor="#B0B0B0"
          multiline
        />
        <Text style={styles.helperText}>
          This address pre-fills your booking form so technicians know where
          to go by default. You can still change it per booking.
        </Text>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Location"}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", marginLeft: 4 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
    marginBottom: 10,
  },
  helperText: { fontSize: 12, color: "#9CA3AF", lineHeight: 18, marginBottom: 24 },
  saveButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
