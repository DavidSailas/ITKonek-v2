import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../config/supabase";

const CEBU_REGION: Region = {
  latitude: 10.3157,
  longitude: 123.8854,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [region, setRegion] = useState<Region>(CEBU_REGION);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestLocation();
    fetchTechnicians();
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setUserLocation(userCoords);
      setRegion({
        ...userCoords,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (err) {
      console.log("Location fetch non-fatal error:", err);
    }
  };

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, phone_number, role")
        .eq("role", "technician");

      if (error) {
        console.error("Error fetching techs:", error.message);
        return;
      }

      const baseLat = userLocation?.latitude || 10.3157;
      const baseLng = userLocation?.longitude || 123.8854;

      const mockTechs = (data || []).map((tech, index) => {
        const offsetLat = (index % 2 === 0 ? 1 : -1) * (0.008 + index * 0.004);
        const offsetLng = (index % 3 === 0 ? 1 : -1) * (0.006 + index * 0.003);

        return {
          ...tech,
          latitude: baseLat + offsetLat,
          longitude: baseLng + offsetLng,
          specialties: [
            "Hardware Repair",
            "Fiber & Network",
            "Laptop Maintenance",
          ],
          rating: (4.5 + (index % 5) * 0.1).toFixed(1),
          jobsDone: 24 + index * 7,
          distance: `${(1.2 + index * 0.8).toFixed(1)} km`,
          isAvailable: index % 4 !== 0,
        };
      });

      setTechnicians(mockTechs);
    } catch (err) {
      console.error("Unexpected tech fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTechnicians = useMemo(() => {
    if (!searchQuery.trim()) return technicians;
    const query = searchQuery.toLowerCase();
    return technicians.filter((tech) => {
      const fullName = `${tech.first_name} ${tech.last_name}`.toLowerCase();
      const matchName = fullName.includes(query);
      const matchSpecialty = tech.specialties?.some((s: string) =>
        s.toLowerCase().includes(query),
      );
      return matchName || matchSpecialty;
    });
  }, [searchQuery, technicians]);

  const handleCallTech = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleBookTech = () => {
    if (!selectedTech) return;
    const techToPass = selectedTech;
    setSelectedTech(null);

    router.push({
      pathname: "/(customer)/book" as any,
      params: {
        techId: techToPass.id,
        techName: `${techToPass.first_name} ${techToPass.last_name}`,
        techAvatar: techToPass.avatar_url || "",
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Map Header Search Bar */}
      <View style={[styles.searchOverlay, { top: insets.top + 10 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search technician or specialty..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map View */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {filteredTechnicians.map((tech) => (
          <Marker
            key={tech.id}
            coordinate={{
              latitude: tech.latitude,
              longitude: tech.longitude,
            }}
            onPress={() => setSelectedTech(tech)}
          >
            <View
              style={[
                styles.markerBubble,
                selectedTech?.id === tech.id && styles.markerBubbleSelected,
              ]}
            >
              <Image
                source={
                  tech.avatar_url
                    ? { uri: tech.avatar_url }
                    : require("../../../assets/images/user.png")
                }
                style={styles.markerAvatar}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Locate Me Button */}
      <TouchableOpacity
        style={[styles.locateBtn, { bottom: insets.bottom + 20 }]}
        onPress={requestLocation}
      >
        <Ionicons name="locate" size={22} color="#111827" />
      </TouchableOpacity>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#111827" />
          <Text style={styles.loadingText}>Locating technicians...</Text>
        </View>
      )}

      {/* Technician Profile Bottom Sheet Modal */}
      <Modal
        visible={!!selectedTech}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTech(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedTech(null)}
        >
          {selectedTech && (
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.modalCard,
                { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24 },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalAvatarWrap}>
                  <Image
                    source={
                      selectedTech.avatar_url
                        ? { uri: selectedTech.avatar_url }
                        : require("../../../assets/images/user.png")
                    }
                    style={styles.modalAvatar}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalName}>
                    {selectedTech.first_name} {selectedTech.last_name}
                  </Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: selectedTech.isAvailable
                            ? "#10B981"
                            : "#EF4444",
                        },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {selectedTech.isAvailable
                        ? "Available Now"
                        : "Currently Busy"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.modalStatsRow}>
                <View style={styles.metricItem}>
                  <View style={styles.ratingBox}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.metricValue}>
                      {selectedTech.rating}
                    </Text>
                  </View>
                  <Text style={styles.metricLabel}>Rating</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>
                    {selectedTech.jobsDone}
                  </Text>
                  <Text style={styles.metricLabel}>Jobs Done</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>
                    {selectedTech.distance}
                  </Text>
                  <Text style={styles.metricLabel}>Distance</Text>
                </View>
              </View>

              {/* Specialties */}
              <View style={styles.skillsSection}>
                <Text style={styles.skillsTitle}>Specialties</Text>
                <View style={styles.skillsWrapper}>
                  {selectedTech.specialties?.map((spec: string, i: number) => (
                    <View key={i} style={styles.skillChip}>
                      <Text style={styles.skillChipText}>{spec}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.iconActionButton}
                  onPress={() => handleCallTech(selectedTech.phone_number)}
                >
                  <Ionicons name="call-outline" size={20} color="#111827" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBookingBtn, { flex: 1 }]}
                  onPress={handleBookTech}
                >
                  <Text style={styles.primaryBookingBtnText}>Book Service</Text>
                  <Ionicons name="calendar" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchOverlay: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  markerBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 3,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#111827",
    elevation: 3,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  markerBubbleSelected: {
    borderColor: "#2563EB",
    transform: [{ scale: 1.15 }],
  },
  markerAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  locateBtn: {
    position: "absolute",
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  loadingBox: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  modalAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  modalAvatar: {
    width: "100%",
    height: "100%",
  },
  modalName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  metricLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: "#E5E7EB",
  },
  skillsSection: {
    marginBottom: 20,
  },
  skillsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  skillsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  skillChipText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconActionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  primaryBookingBtn: {
    height: 48,
    backgroundColor: "#111827",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBookingBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
