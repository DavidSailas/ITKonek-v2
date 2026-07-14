import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../../config/firebase";
import { supabase } from "../../../config/supabase";

export default function TechnicianHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Dynamically computes notch / status bar top spacing

  const [techProfile, setTechProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0);
  const [completedJobsCount, setCompletedJobsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [accepting, setAccepting] = useState<boolean>(false);

  useEffect(() => {
    fetchTechData();
    fetchRequests();
  }, []);

  const fetchTechData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, is_online, avatar_url")
      .eq("id", user.uid)
      .maybeSingle();

    if (data) {
      setTechProfile(data);
      setIsOnline(!!data.is_online);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);

    // Fetch pending bookings
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("*, customer:customer_id(first_name, last_name, phone_number)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (bookingsData) {
      setRequests(bookingsData);
    }

    // Metric Counts
    const user = auth.currentUser;
    if (user) {
      const { count: activeCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact" })
        .eq("technician_id", user.uid)
        .in("status", ["accepted", "in_progress"]);

      const { count: completedCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact" })
        .eq("technician_id", user.uid)
        .eq("status", "completed");

      setActiveJobsCount(activeCount || 0);
      setCompletedJobsCount(completedCount || 0);
    }
    setLoading(false);
  };

  const handleToggleOnline = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsOnline(value);
    const { error } = await supabase
      .from("profiles")
      .update({ is_online: value })
      .eq("id", user.uid);

    if (error) {
      setIsOnline(!value);
      Alert.alert("Error", "Could not update online status.");
    }
  };

  const handleCardPress = (request: any) => {
    setSelectedRequest(request);
    setModalVisible(true);
  };

  const handleAcceptRequest = async () => {
    const user = auth.currentUser;
    if (!user || !selectedRequest) return;

    setAccepting(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        technician_id: user.uid,
        status: "accepted",
      })
      .eq("id", selectedRequest.id);

    setAccepting(false);

    if (error) {
      Alert.alert("Accept Failed", "This job may have already been taken.");
    } else {
      Alert.alert(
        "Job Accepted!",
        "You have successfully claimed this request.",
      );
      setModalVisible(false);
      setSelectedRequest(null);
      fetchRequests();
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return "Just now";
    const created = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Immediate Dispatch";
    const d = new Date(dateString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Display top 3 requests for home view
  const displayedRequests = requests.slice(0, 3);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0A0A0A"
        translucent
      />

      {/* Top Header Bar with dynamic Safe Area padding */}
      <View
        style={[styles.topHeader, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitial}>
              {(techProfile?.first_name?.[0] ?? "T").toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>
                {techProfile
                  ? `${techProfile.first_name} ${techProfile.last_name}`
                  : "Technician"}
              </Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.statusLabel}>
              {isOnline ? "Online & Available" : "Offline"}
            </Text>
          </View>
        </View>

        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          trackColor={{ false: "#262626", true: "#10B981" }}
          thumbColor="#FFFFFF"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Analytics Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flash-outline" size={20} color="#EAB308" />
            <Text style={styles.statLabel}>Requests</Text>
            <Text style={styles.statValue}>{requests.length}</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="construct-outline" size={20} color="#3B82F6" />
            <Text style={styles.statLabel}>Active</Text>
            <Text style={styles.statValue}>{activeJobsCount}</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#10B981"
            />
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>{completedJobsCount}</Text>
          </View>
        </View>

        {/* Requests Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Requests</Text>
          {requests.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/(technician)/(tabs)/jobs" as any)}
            >
              <Text style={styles.viewAllText}>
                View All ({requests.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginTop: 20 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={36} color="#444444" />
            <Text style={styles.emptyTitle}>No Requests Available</Text>
            <Text style={styles.emptySub}>
              New customer bookings will appear here in real time.
            </Text>
          </View>
        ) : (
          <>
            {displayedRequests.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.requestCard}
                activeOpacity={0.8}
                onPress={() => handleCardPress(item)}
              >
                <View style={styles.requestCardHeader}>
                  <View style={styles.customerRow}>
                    <View style={styles.iconBadge}>
                      <Ionicons
                        name="person-outline"
                        size={15}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.customerName}>
                      {item.customer
                        ? `${item.customer.first_name} ${item.customer.last_name}`
                        : "Customer"}
                    </Text>
                  </View>
                  <View style={styles.timeTag}>
                    <Ionicons name="time-outline" size={12} color="#888888" />
                    <Text style={styles.timeTagText}>
                      {getTimeAgo(item.created_at)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.serviceTitle}>
                  {item.service_title || "Hardware / IT Service"}
                </Text>

                {item.location_address && (
                  <View style={styles.locationRow}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#888888"
                    />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {item.location_address}
                    </Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.costText}>
                    {item.estimated_cost
                      ? `₱${item.estimated_cost}`
                      : "Est. Payout TBD"}
                  </Text>
                  <View style={styles.tapToView}>
                    <Text style={styles.tapToViewText}>View Details</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* View All Button at bottom of list if > 3 requests */}
            {requests.length > 3 && (
              <TouchableOpacity
                style={styles.moreRequestsBtn}
                onPress={() => router.push("/(technician)/(tabs)/jobs" as any)}
              >
                <Text style={styles.moreRequestsText}>
                  See All {requests.length} Requests
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* REQUEST DETAILS MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Request Details</Text>
                    <Text style={styles.modalTimeCreated}>
                      Posted {getTimeAgo(selectedRequest?.created_at)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {selectedRequest && (
                  <ScrollView
                    style={styles.modalBody}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.infoBox}>
                      <View style={styles.infoBoxIcon}>
                        <Ionicons
                          name="person-circle-outline"
                          size={24}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Customer</Text>
                        <Text style={styles.infoValue}>
                          {selectedRequest.customer
                            ? `${selectedRequest.customer.first_name} ${selectedRequest.customer.last_name}`
                            : "Customer"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailBlock}>
                      <Text style={styles.detailTitle}>Service & Problem</Text>
                      <Text style={styles.serviceHeadline}>
                        {selectedRequest.service_title || "IT Support"}
                      </Text>
                      <Text style={styles.detailDesc}>
                        {selectedRequest.problem_description ||
                          "No specific details provided."}
                      </Text>
                    </View>

                    <View style={styles.detailBlock}>
                      <Text style={styles.detailTitle}>
                        Scheduled Date & Time
                      </Text>
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#888888"
                        />
                        <Text style={styles.metaText}>
                          {formatDate(
                            selectedRequest.scheduled_date ||
                              selectedRequest.created_at,
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailBlock}>
                      <Text style={styles.detailTitle}>Location</Text>
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color="#888888"
                        />
                        <Text style={styles.metaText}>
                          {selectedRequest.location_address ||
                            "Address not provided"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>Estimated Earnings</Text>
                      <Text style={styles.priceAmount}>
                        {selectedRequest.estimated_cost
                          ? `₱${selectedRequest.estimated_cost}`
                          : "₱0.00"}
                      </Text>
                    </View>
                  </ScrollView>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => setModalVisible(false)}
                    disabled={accepting}
                  >
                    <Text style={styles.declineBtnText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={handleAcceptRequest}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <ActivityIndicator color="#000000" />
                    ) : (
                      <>
                        <Text style={styles.acceptBtnText}>Accept Request</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color="#000000"
                        />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#0A0A0A",
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  proBadge: {
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#333333",
  },
  proBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },
  statusLabel: {
    color: "#888888",
    fontSize: 11,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#121212",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 14,
  },
  statLabel: {
    color: "#888888",
    fontSize: 11,
    marginTop: 6,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  viewAllText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 30,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySub: {
    color: "#666666",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  requestCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 16,
    marginBottom: 12,
  },
  requestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeTagText: {
    color: "#888888",
    fontSize: 11,
  },
  serviceTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  locationText: {
    color: "#888888",
    fontSize: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },
  costText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "800",
  },
  tapToView: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tapToViewText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  moreRequestsBtn: {
    backgroundColor: "#181818",
    borderRadius: 12,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    gap: 8,
    marginTop: 4,
  },
  moreRequestsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#262626",
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#333333",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  modalTimeCreated: {
    color: "#888888",
    fontSize: 11,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181818",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 12,
    marginBottom: 16,
  },
  infoBoxIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    color: "#888888",
    fontSize: 11,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  detailBlock: {
    marginBottom: 18,
  },
  detailTitle: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  serviceHeadline: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  detailDesc: {
    color: "#AAAAAA",
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    color: "#DDDDDD",
    fontSize: 13,
    flex: 1,
  },
  priceContainer: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    marginBottom: 20,
  },
  priceLabel: {
    color: "#CCCCCC",
    fontSize: 13,
    fontWeight: "600",
  },
  priceAmount: {
    color: "#10B981",
    fontSize: 20,
    fontWeight: "900",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  declineBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  acceptBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptBtnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
  },
});
