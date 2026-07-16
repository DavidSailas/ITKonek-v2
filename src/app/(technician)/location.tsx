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

type LocationRow = {
  location: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function LocationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{
    lat: number | null;
    lng: number | null;
  }>({
    lat: null,
    lng: null,
  });

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("location, latitude, longitude")
        .eq("id", uid)
        .single();

      if (error) throw error;

      const row = data as LocationRow;
      setLocation(row?.location ?? "");
      setCoords({ lat: row?.latitude ?? null, lng: row?.longitude ?? null });
    } catch (err) {
      Alert.alert("Error", "Could not load your service location.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { error } = await supabase
        .from("profiles")
        .update({ location: location.trim() || null })
        .eq("id", uid);

      if (error) throw error;
      Alert.alert("Saved", "Your service location has been updated.");
      router.back();
    } catch (err) {
      Alert.alert("Error", "Could not save your location. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Requires the `expo-location` package: expo install expo-location
  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const Location = await import("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Enable location access to use this.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });

      const uid = auth.currentUser?.uid;
      if (uid) {
        await supabase
          .from("profiles")
          .update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          })
          .eq("id", uid);
      }
      Alert.alert("Updated", "Your coordinates have been refreshed.");
    } catch (err) {
      Alert.alert(
        "Unavailable",
        "Make sure expo-location is installed and permissions are granted.",
      );
    } finally {
      setLocating(false);
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
        <Text style={styles.headerTitle}>Service Location</Text>
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
          <Text style={styles.fieldLabel}>Service Area</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Quezon City, Metro Manila"
            placeholderTextColor="#555"
          />

          <View style={styles.coordsCard}>
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <Text style={styles.coordValue}>
                {coords.lat != null ? coords.lat.toFixed(5) : "—"}
              </Text>
            </View>
            <View style={styles.coordDivider} />
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <Text style={styles.coordValue}>
                {coords.lng != null ? coords.lng.toFixed(5) : "—"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleUseCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <>
                <Ionicons name="locate-outline" size={16} color="#3B82F6" />
                <Text style={styles.gpsBtnText}>Use current location</Text>
              </>
            )}
          </TouchableOpacity>

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
    marginBottom: 20,
  },

  coordsCard: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  coordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  coordLabel: { color: "#888", fontSize: 13 },
  coordValue: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  coordDivider: { height: 1, backgroundColor: "#242424" },

  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
  },
  gpsBtnText: { color: "#3B82F6", fontSize: 14, fontWeight: "600" },

  saveBtn: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: { color: "#0D0D0D", fontSize: 14, fontWeight: "700" },
});
