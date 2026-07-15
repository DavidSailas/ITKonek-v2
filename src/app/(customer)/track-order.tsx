import { Ionicons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

interface Location {
  latitude: number;
  longitude: number;
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#0A0A0F",
  surface: "#FFFFFF",
  ink: "#111827",
  inkMuted: "#6B7280",
  hairline: "#E5E7EB",
  accent: "#2F6FED",
  accentSoft: "rgba(47, 111, 237, 0.12)",
  live: "#10B981",
  liveSoft: "rgba(16, 185, 129, 0.14)",
};

// A muted "night" basemap so the route + markers read as the hero, not the roads.
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#12151c" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7c8798" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#12151c" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#242a35" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1f2430" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0f1218" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2a3140" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9aa5b8" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0b1e2b" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4b6a7a" }],
  },
];

const STEPS: { key: string; label: string }[] = [
  { key: "accepted", label: "Confirmed" },
  { key: "en_route", label: "On the way" },
  { key: "arrived", label: "Arrived" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

function getDistanceKm(a: Location, b: Location) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

// Rough, clearly-approximate city-driving estimate for a friendly ETA readout.
function estimateEtaMinutes(distanceKm: number) {
  const avgSpeedKmh = 22;
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

export default function TrackOrderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [techLocation, setTechLocation] = useState<Location | null>(null);
  const [customerLocation, setCustomerLocation] = useState<Location | null>(
    null,
  );

  const pulse = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    fetchActiveBooking();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (!techLocation || !customerLocation || !mapRef.current) return;
    mapRef.current.fitToCoordinates([techLocation, customerLocation], {
      edgePadding: { top: 120, right: 80, bottom: 340, left: 80 },
      animated: true,
    });
  }, [techLocation, customerLocation]);

  useEffect(() => {
    if (!activeJob?.technician_id) return;

    const channel = supabase
      .channel(`tech-location-${activeJob.technician_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${activeJob.technician_id}`,
        },
        (payload) => {
          if (payload.new.latitude && payload.new.longitude) {
            setTechLocation({
              latitude: Number(payload.new.latitude),
              longitude: Number(payload.new.longitude),
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeJob?.technician_id]);

  const fetchActiveBooking = async () => {
    const user = auth.currentUser;
    if (!user) return setLoading(false);

    // Fetch booking AND user profile for customer location
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

      // Fetch Tech Location
      if (booking.technician_id) {
        const { data: tech } = await supabase
          .from("profiles")
          .select("latitude, longitude")
          .eq("id", booking.technician_id)
          .maybeSingle();
        if (tech?.latitude)
          setTechLocation({
            latitude: Number(tech.latitude),
            longitude: Number(tech.longitude),
          });
      }

      // Fetch Customer Location (saved profile location first)
      const { data: cust } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", user.uid)
        .maybeSingle();

      if (cust?.latitude && cust?.longitude) {
        setCustomerLocation({
          latitude: Number(cust.latitude),
          longitude: Number(cust.longitude),
        });
      } else {
        // No saved location on the profile yet — fall back to the device's
        // live GPS position so "my location" always has something to show.
        await useDeviceLocationAsFallback();
      }
    }
    setLoading(false);
  };

  const useDeviceLocationAsFallback = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      setCustomerLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (err) {
      // Silently ignore — the map will just fall back to the default region.
      console.warn("Could not get device location:", err);
    }
  };

  const callTechnician = () => {
    const phone = activeJob?.technician?.phone_number;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const messageTechnician = () => {
    const phone = activeJob?.technician?.phone_number;
    if (phone) Linking.openURL(`sms:${phone}`);
  };

  if (loading)
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );

  if (!activeJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/(customer)/(tabs)/home")}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="location-outline" size={30} color={COLORS.accent} />
          </View>
          <Text style={styles.emptyTitle}>No active orders</Text>
          <Text style={styles.emptySubtitle}>
            Once a technician accepts a booking, you'll be able to follow their
            live location here.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push("/(customer)/(tabs)/home")}
          >
            <Text style={styles.emptyButtonText}>Book a service</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStepIndex = Math.max(
    STEPS.findIndex((s) => s.key === activeJob.status),
    0,
  );
  const bookingRef = activeJob.id
    ? `#${activeJob.id.toString().slice(0, 8)}`
    : "#--------";

  const technicianName = [
    activeJob.technician?.first_name,
    activeJob.technician?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const initials =
    (
      (activeJob.technician?.first_name?.[0] ?? "") +
      (activeJob.technician?.last_name?.[0] ?? "")
    ).toUpperCase() || "T";

  const hasBothLocations = !!techLocation && !!customerLocation;
  const distanceKm = hasBothLocations
    ? getDistanceKm(techLocation as Location, customerLocation as Location)
    : null;
  const etaMinutes =
    distanceKm !== null ? estimateEtaMinutes(distanceKm) : null;

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{
          latitude: customerLocation?.latitude || 10.3157,
          longitude: customerLocation?.longitude || 123.8854,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {hasBothLocations && (
          <Polyline
            coordinates={[
              techLocation as Location,
              customerLocation as Location,
            ]}
            strokeColor={COLORS.accent}
            strokeWidth={3}
            lineDashPattern={[10, 8]}
          />
        )}

        {/* Customer Marker (my location) */}
        {customerLocation && (
          <Marker
            coordinate={customerLocation}
            title="My Location"
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <View style={styles.customerMarkerWrap}>
              <View style={styles.customerMarkerHalo} />
              <View style={styles.customerMarkerDot} />
            </View>
          </Marker>
        )}

        {/* Technician Marker */}
        {techLocation && (
          <Marker
            coordinate={techLocation}
            title="Technician"
            tracksViewChanges={true}
          >
            <View style={styles.techMarkerWrap}>
              <Animated.View
                style={[
                  styles.techMarkerPulse,
                  { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                ]}
              />
              <View style={styles.techMarker}>
                <Ionicons name="construct" size={16} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.overlayHeader} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.roundButton}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
        </TouchableOpacity>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>LIVE TRACKING</Text>
        </View>

        {/* Spacer to balance the back button so the badge stays centered */}
        <View style={styles.headerSpacer} />
      </SafeAreaView>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <View style={styles.handle} />

        <View style={styles.cardTopRow}>
          <Text style={styles.bookingRef}>BOOKING {bookingRef}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {STEPS[currentStepIndex]?.label ?? activeJob.status}
            </Text>
          </View>
        </View>

        {/* Stepper */}
        <View style={styles.stepperRow}>
          {STEPS.map((step, i) => {
            const done = i < currentStepIndex;
            const current = i === currentStepIndex;
            return (
              <React.Fragment key={step.key}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      done && styles.stepCircleDone,
                      current && styles.stepCircleCurrent,
                    ]}
                  >
                    {done ? (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          current && styles.stepNumberCurrent,
                        ]}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      current && styles.stepLabelCurrent,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepConnector,
                      i < currentStepIndex && styles.stepConnectorDone,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* Technician */}
        <View style={styles.technicianRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.technicianInfo}>
            <Text style={styles.technicianName} numberOfLines={1}>
              {technicianName || "Technician assigned"}
            </Text>
            <Text style={styles.technicianRole}>Your technician</Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/(customer)/(tabs)/chat")}
            disabled={!activeJob.technician?.phone_number}
          >
            <Ionicons name="chatbubble-outline" size={17} color={COLORS.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, styles.iconButtonAccent]}
            onPress={callTechnician}
            disabled={!activeJob.technician?.phone_number}
          >
            <Ionicons name="call" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {etaMinutes !== null && (
          <View style={styles.etaRow}>
            <Ionicons name="navigate" size={14} color={COLORS.accent} />
            <Text style={styles.etaText}>
              ~{etaMinutes} min away · {distanceKm?.toFixed(1)} km
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.serviceLabel}>SERVICE</Text>
        <Text style={styles.serviceTitle}>{activeJob.service_title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
    color: COLORS.ink,
  },
  backButton: { padding: 8 },

  // Overlay header
  overlayHeader: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  roundButtonDisabled: { opacity: 0.4 },
  headerSpacer: { width: 40, height: 40 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10,10,15,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.live,
  },
  liveBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  // Markers
  customerMarkerWrap: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  customerMarkerHalo: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(47, 111, 237, 0.18)",
  },
  customerMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  techMarkerWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  techMarkerPulse: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
  },
  techMarker: {
    backgroundColor: COLORS.accent,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFF",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.inkMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  // Bottom card
  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.hairline,
    alignSelf: "center",
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  bookingRef: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.inkMuted,
    letterSpacing: 0.6,
  },
  statusPill: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Stepper
  stepperRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  stepItem: { alignItems: "center", width: 46 },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  stepCircleDone: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  stepCircleCurrent: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  stepNumber: { fontSize: 10, fontWeight: "700", color: COLORS.inkMuted },
  stepNumberCurrent: { color: COLORS.accent },
  stepLabel: {
    fontSize: 9,
    color: COLORS.inkMuted,
    marginTop: 4,
    textAlign: "center",
  },
  stepLabelCurrent: { color: COLORS.ink, fontWeight: "700" },
  stepConnector: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.hairline,
    marginTop: 11,
    marginHorizontal: -6,
  },
  stepConnectorDone: { backgroundColor: COLORS.ink },

  divider: { height: 1, backgroundColor: COLORS.hairline, marginVertical: 16 },

  // Technician row
  technicianRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  technicianInfo: { flex: 1 },
  technicianName: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  technicianRole: { fontSize: 12, color: COLORS.inkMuted, marginTop: 1 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  iconButtonAccent: { backgroundColor: COLORS.accent },

  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  etaText: { fontSize: 12.5, color: COLORS.ink, fontWeight: "600" },

  serviceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.inkMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  serviceTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
});
