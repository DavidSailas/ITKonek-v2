import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

interface TechLocation {
  latitude: number;
  longitude: number;
}

export default function TrackOrderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [techLocation, setTechLocation] = useState<TechLocation | null>(null);

  useEffect(() => {
    fetchActiveBooking();
  }, []);

  const fetchActiveBooking = async () => {
    const user = auth.currentUser;
    if (!user) return setLoading(false);

    // Get active booking
    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "*, technician:technician_id(id, first_name, last_name, phone_number)",
      )
      .eq("customer_id", user.uid)
      .in("status", ["accepted", "en_route", "arrived", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (booking) {
      setActiveJob(booking);

      if (booking.technician_id) {
        // Fetch technician's initial live location
        fetchTechLocation(booking.technician_id);

        // Subscribe to real-time changes on technician profile coordinates
        const channel = supabase
          .channel(`tech-location-${booking.technician_id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${booking.technician_id}`,
            },
            (payload) => {
              if (payload.new.latitude && payload.new.longitude) {
                setTechLocation({
                  latitude: payload.new.latitude,
                  longitude: payload.new.longitude,
                });
              }
            },
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
    setLoading(false);
  };

  const fetchTechLocation = async (techId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("id", techId)
      .maybeSingle();

    if (data?.latitude && data?.longitude) {
      setTechLocation({
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
      });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!activeJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Active Orders</Text>
          <Text style={styles.emptySub}>
            You don't have an active repair service currently in progress.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const initialRegion = techLocation
    ? {
        latitude: techLocation.latitude,
        longitude: techLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }
    : {
        latitude: 10.3157, // Default fallbacks (e.g., Metro Cebu)
        longitude: 123.8854,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map Display */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
      >
        {techLocation && (
          <Marker
            coordinate={techLocation}
            title={`${activeJob.technician?.first_name || "Technician"}`}
            description="Live Location"
          >
            <View style={styles.markerContainer}>
              <Ionicons name="hardware-chip" size={20} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Header Bar */}
      <SafeAreaView style={styles.overlayHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButtonRound}
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom Floating Status Sheet */}
      <View style={styles.bottomCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusPulse} />
          <Text style={styles.statusText}>
            {activeJob.status.replace("_", " ").toUpperCase()}
          </Text>
        </View>

        <Text style={styles.serviceTitle}>{activeJob.service_title}</Text>

        <View style={styles.divider} />

        <View style={styles.techRow}>
          <View style={styles.techAvatarPlaceholder}>
            <Text style={styles.techInitial}>
              {(activeJob.technician?.first_name?.[0] || "T").toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.techName}>
              {activeJob.technician?.first_name}{" "}
              {activeJob.technician?.last_name}
            </Text>
            <Text style={styles.techRole}>Assigned Technician</Text>
          </View>
          {activeJob.technician?.phone_number && (
            <TouchableOpacity style={styles.callButton}>
              <Ionicons name="call" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 12 : 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginLeft: 8,
  },
  backButton: { padding: 8 },
  overlayHeader: {
    position: "absolute",
    top: Platform.OS === "android" ? StatusBar.currentHeight || 12 : 12,
    left: 16,
    zIndex: 10,
  },
  backButtonRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  markerContainer: {
    backgroundColor: "#111827",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  emptySub: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  bottomCard: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  statusPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  serviceTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },
  techRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  techAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  techInitial: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  techName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  techRole: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  callButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
});
