import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

type Coords = { latitude: number; longitude: number };

export default function LocationScreen() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    fetchLocation();
  }, []);

  // NOTE: the profiles table stores this as "location" (text) plus
  // "latitude" / "longitude" (float8) — the previous version queried a
  // nonexistent "address" column, so it never actually loaded or saved.
  const fetchLocation = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("location, latitude, longitude")
      .eq("id", user.uid)
      .single();

    if (!error && data) {
      if (data.location) setAddress(data.location);
      if (data.latitude != null && data.longitude != null) {
        setCoords({ latitude: data.latitude, longitude: data.longitude });
      }
    }
    setLoading(false);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "Allow location access so ITKonek can detect your current address.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      setCoords({ latitude, longitude });

      const [place] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (place) {
        const formatted = [
          place.name,
          place.street,
          place.district,
          place.city,
          place.region,
        ]
          .filter(Boolean)
          .join(", ");
        if (formatted) setAddress(formatted);
      }
    } catch (err) {
      Alert.alert(
        "Couldn't detect location",
        "Check that location services are turned on for ITKonek and try again.",
      );
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!address.trim()) {
      Alert.alert(
        "Add an address",
        "Enter your address, or use current location, before saving.",
      );
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        location: address.trim(),
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      })
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
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent={false}
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)/(tabs)/settings")}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Default Service Address</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#111827" />
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setCoords(null);
              }}
              placeholder="House/Unit no., Street, Barangay, City"
              placeholderTextColor="#B0B0B0"
              multiline
            />

            <TouchableOpacity
              style={styles.locateButton}
              onPress={handleUseCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <Ionicons name="locate-outline" size={16} color="#111827" />
              )}
              <Text style={styles.locateButtonText}>
                {locating
                  ? "Detecting your location..."
                  : "Use My Current Location"}
              </Text>
            </TouchableOpacity>

            {coords && (
              <View style={styles.coordsPill}>
                <Ionicons name="checkmark-circle" size={13} color="#059669" />
                <Text style={styles.coordsPillText}>
                  Pinned at {coords.latitude.toFixed(4)},{" "}
                  {coords.longitude.toFixed(4)}
                </Text>
              </View>
            )}

            <Text style={styles.helperText}>
              This address pre-fills your booking form so technicians know where
              to go by default. You can still change it per booking.
            </Text>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Location</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
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
  locateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  locateButtonText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  coordsPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  coordsPillText: { fontSize: 11, fontWeight: "600", color: "#059669" },
  helperText: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 18,
    marginBottom: 24,
  },
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
