import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../../config/firebase";
import { supabase } from "../../../config/supabase";

const COLORS = {
  bg: "#0A0C0F",
  surface: "#131619",
  surfaceAlt: "#181C20",
  border: "#232830",
  borderSubtle: "#1B1F24",
  accent: "#F5A623",
  accentDim: "#4A3A1A",
  blue: "#4C8DFF",
  success: "#34D399",
  successDim: "#123024",
  danger: "#F87171",
  textPrimary: "#F3F4F6",
  textSecondary: "#8B929B",
  textTertiary: "#565C64",
};
const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

export default function TechnicianHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [techProfile, setTechProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0);
  const [completedJobsCount, setCompletedJobsCount] = useState<number>(0);
  const [totalTips, setTotalTips] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Session timer — tracks how long the technician has been online this session
  const [onlineSince, setOnlineSince] = useState<Date | null>(null);
  const [onlineElapsedLabel, setOnlineElapsedLabel] = useState<string>("");

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [accepting, setAccepting] = useState<boolean>(false);

  // Log Tip Modal State
  const [logTipModalVisible, setLogTipModalVisible] = useState<boolean>(false);
  const [tipAmountInput, setTipAmountInput] = useState<string>("");
  const [tipNoteInput, setTipNoteInput] = useState<string>("");
  const [submittingTip, setSubmittingTip] = useState<boolean>(false);

  // Live-status pulse, only animates while online
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchTechData();
    fetchRequests();
    fetchTips();
  }, []);

  // Tick the "online for Xh Ym" label every 30s while online
  useEffect(() => {
    if (!onlineSince) {
      setOnlineElapsedLabel("");
      return;
    }
    const updateLabel = () => {
      const diffMs = Date.now() - onlineSince.getTime();
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs / (1000 * 60)) % 60);
      setOnlineElapsedLabel(
        hrs > 0 ? `Online ${hrs}h ${mins}m` : `Online ${mins}m`,
      );
    };
    updateLabel();
    const interval = setInterval(updateLabel, 30000);
    return () => clearInterval(interval);
  }, [onlineSince]);

  useEffect(() => {
    const fetchTechProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.uid)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setTechProfile(data);
      }
      setLoading(false);
    };

    fetchTechProfile();
  }, []);

  const fetchTechData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select(
        "first_name, last_name, is_online, avatar_url, rating, completed_jobs_count",
      )
      .eq("id", user.uid)
      .maybeSingle();

    if (data) {
      setTechProfile(data);
      setIsOnline(!!data.is_online);
      if (data.is_online) setOnlineSince(new Date());
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

  const fetchTips = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const { data, error } = await supabase
      .from("tips")
      .select("amount")
      .eq("technician_id", user.uid);

    if (data) {
      const sum = data.reduce(
        (acc, curr) => acc + (Number(curr.amount) || 0),
        0,
      );
      setTotalTips(sum);
    }
  };

  const openLogTipModal = () => {
    setTipAmountInput("");
    setTipNoteInput("");
    setLogTipModalVisible(true);
  };

  const closeLogTipModal = () => {
    if (submittingTip) return;
    setLogTipModalVisible(false);
    setTipAmountInput("");
    setTipNoteInput("");
  };

  const handleLogTip = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be signed in to log a tip.");
      return;
    }

    const parsedAmount = Number(tipAmountInput);
    if (!tipAmountInput || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid tip amount.");
      return;
    }

    setSubmittingTip(true);

    const { error } = await supabase.from("tips").insert({
      technician_id: user.uid,
      amount: parsedAmount,
      note: tipNoteInput.trim() || null,
    });

    setSubmittingTip(false);

    if (error) {
      console.error("Error logging tip:", error);
      Alert.alert("Error", "Could not log this tip. Please try again.");
      return;
    }

    setLogTipModalVisible(false);
    setTipAmountInput("");
    setTipNoteInput("");
    await fetchTips();
    Alert.alert(
      "Tip Logged",
      `₱${parsedAmount.toLocaleString()} added to your tips.`,
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTechData(), fetchRequests(), fetchTips()]);
    setRefreshing(false);
  };

  const handleToggleOnline = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsOnline(value);
    setOnlineSince(value ? new Date() : null);
    const { error } = await supabase
      .from("profiles")
      .update({ is_online: value })
      .eq("id", user.uid);

    if (error) {
      setIsOnline(!value);
      setOnlineSince(value ? null : new Date());
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

  const displayedRequests = requests.slice(0, 3);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.bg}
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
            <View style={styles.statusRow}>
              <Animated.View
                style={[
                  styles.statusDot,
                  isOnline
                    ? { backgroundColor: COLORS.success }
                    : { backgroundColor: COLORS.textTertiary },
                  isOnline && { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <Text style={styles.statusLabel}>
                {isOnline
                  ? onlineElapsedLabel || "Online & Available"
                  : "Offline"}
              </Text>
            </View>
          </View>
        </View>

        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          trackColor={{ false: "#262626", true: COLORS.success }}
          thumbColor="#FFFFFF"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerBR} />

          <View style={styles.heroTopRow}>
            <Text style={styles.heroEyebrow}>MY TIPS (THIS MONTH)</Text>
          </View>

          <Text style={styles.heroAmount}>₱{totalTips.toLocaleString()}</Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroBottomRow}>
            <Text style={styles.heroSubLabel}>READY TO LOG CASH?</Text>
            <TouchableOpacity
              style={styles.logTipBtn}
              onPress={openLogTipModal}
            >
              <Ionicons name="add" size={16} color={COLORS.accent} />
              <Text style={styles.logTipBtnText}>Log Tip</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Queue snapshot readout tiles */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View
              style={[styles.statAccentBar, { backgroundColor: COLORS.accent }]}
            />
            <Ionicons name="flash-outline" size={18} color={COLORS.accent} />
            <Text style={styles.statValue}>{requests.length}</Text>
            <Text style={styles.statLabel}>REQUESTS</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[styles.statAccentBar, { backgroundColor: COLORS.blue }]}
            />
            <Ionicons name="construct-outline" size={18} color={COLORS.blue} />
            <Text style={styles.statValue}>{activeJobsCount}</Text>
            <Text style={styles.statLabel}>ACTIVE</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statAccentBar,
                { backgroundColor: COLORS.success },
              ]}
            />
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={COLORS.success}
            />
            <Text style={styles.statValue}>{completedJobsCount}</Text>
            <Text style={styles.statLabel}>COMPLETED</Text>
          </View>
        </View>

        {/* Job Queue Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Job Queue</Text>
            {requests.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{requests.length}</Text>
              </View>
            )}
          </View>
          {requests.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/(technician)/(tabs)/jobs" as any)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 20 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="file-tray-outline"
              size={32}
              color={COLORS.textTertiary}
            />
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
                        size={14}
                        color={COLORS.textPrimary}
                      />
                    </View>
                    <Text style={styles.customerName}>
                      {item.customer
                        ? `${item.customer.first_name} ${item.customer.last_name}`
                        : "Customer"}
                    </Text>
                  </View>
                  <View style={styles.timeTag}>
                    <Ionicons
                      name="time-outline"
                      size={11}
                      color={COLORS.textSecondary}
                    />
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
                      size={13}
                      color={COLORS.textSecondary}
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
                      size={13}
                      color={COLORS.accent}
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
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Technician status panel — certification + performance readout */}
        <View style={styles.statusPanel}>
          <View style={styles.statusPanelAccentBar} />
          <View style={styles.statusPanelBody}>
            <View style={styles.certBadge}>
              <Ionicons
                name="shield-checkmark"
                size={13}
                color={COLORS.success}
              />
              <Text style={styles.certBadgeText}>CERTIFIED LEVEL 2</Text>
            </View>
            <Text style={styles.statusPanelTitle}>Technician Status</Text>
            <Text style={styles.statusPanelDesc}>
              All diagnostic tools are synced and calibrated for today&apos;s
              tasks.
            </Text>

            <View style={styles.statusPanelRow}>
              <View style={styles.statusPanelStat}>
                <Text style={styles.statusPanelValue}>
                  {completedJobsCount}
                </Text>
                <Text style={styles.statusPanelLabel}>COMPLETED</Text>
              </View>
              <View style={styles.statusPanelDividerV} />
              <View style={styles.statusPanelStat}>
                <Text style={styles.statusPanelValue}>4.9</Text>
                <Text style={styles.statusPanelLabel}>RATING</Text>
              </View>
              <View style={styles.statusPanelDividerV} />
              <View style={styles.statusPanelStat}>
                <Text style={styles.statusPanelValue}>{activeJobsCount}</Text>
                <Text style={styles.statusPanelLabel}>IN PROGRESS</Text>
              </View>
            </View>
          </View>
        </View>
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
                    <Ionicons
                      name="close"
                      size={20}
                      color={COLORS.textPrimary}
                    />
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
                          color={COLORS.textPrimary}
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
                          color={COLORS.textSecondary}
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
                          color={COLORS.textSecondary}
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
                      <ActivityIndicator color="#0A0C0F" />
                    ) : (
                      <>
                        <Text style={styles.acceptBtnText}>Accept Request</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color="#0A0C0F"
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

      {/* LOG TIP MODAL */}
      <Modal
        visible={logTipModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeLogTipModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={closeLogTipModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHandle} />

                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>Log Cash Tip</Text>
                      <Text style={styles.modalTimeCreated}>
                        Add a tip you received directly from a customer
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={closeLogTipModal}
                    >
                      <Ionicons
                        name="close"
                        size={20}
                        color={COLORS.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBody}>
                    <View style={styles.detailBlock}>
                      <Text style={styles.detailTitle}>Tip Amount (₱)</Text>
                      <View style={styles.tipInputWrap}>
                        <Text style={styles.tipInputPrefix}>₱</Text>
                        <TextInput
                          style={styles.tipInput}
                          value={tipAmountInput}
                          onChangeText={(text) =>
                            setTipAmountInput(text.replace(/[^0-9.]/g, ""))
                          }
                          placeholder="0.00"
                          placeholderTextColor={COLORS.textTertiary}
                          keyboardType="decimal-pad"
                          editable={!submittingTip}
                        />
                      </View>
                    </View>

                    <View style={styles.detailBlock}>
                      <Text style={styles.detailTitle}>Note (Optional)</Text>
                      <TextInput
                        style={styles.tipNoteInput}
                        value={tipNoteInput}
                        onChangeText={setTipNoteInput}
                        placeholder="e.g. Cash tip from Juan D."
                        placeholderTextColor={COLORS.textTertiary}
                        editable={!submittingTip}
                        multiline
                      />
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={closeLogTipModal}
                      disabled={submittingTip}
                    >
                      <Text style={styles.declineBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.acceptBtn,
                        submittingTip && { opacity: 0.7 },
                      ]}
                      onPress={handleLogTip}
                      disabled={submittingTip}
                    >
                      {submittingTip ? (
                        <ActivityIndicator color="#0A0C0F" />
                      ) : (
                        <>
                          <Text style={styles.acceptBtnText}>Log Tip</Text>
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color="#0A0C0F"
                          />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* HEADER */
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "800" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "800" },
  proBadge: {
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#5C4720",
  },
  proBadgeText: {
    color: COLORS.accent,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "600" },

  /* SCROLL BODY */
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

  /* HERO TIPS CARD */
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
  },
  cornerTL: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: COLORS.accent,
    opacity: 0.5,
  },
  cornerBR: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: COLORS.accent,
    opacity: 0.5,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroEyebrow: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  heroAmount: {
    color: COLORS.textPrimary,
    fontSize: 40,
    fontWeight: "800",
    fontFamily: MONO,
    marginTop: 10,
    marginBottom: 16,
  },
  heroDivider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginBottom: 14,
  },
  heroBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroSubLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  logTipBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  logTipBtnText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },

  /* QUEUE SNAPSHOT TILES */
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    paddingTop: 16,
    overflow: "hidden",
  },
  statAccentBar: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  statLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    fontFamily: MONO,
    marginTop: 8,
  },

  /* SECTION HEADER */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  countBadge: {
    backgroundColor: COLORS.accentDim,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "800",
    fontFamily: MONO,
  },
  viewAllText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },

  /* EMPTY STATE */
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    padding: 30,
    alignItems: "center",
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySub: {
    color: COLORS.textTertiary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },

  /* REQUEST CARDS */
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeTagText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  serviceTitle: {
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  costText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: MONO,
  },
  tapToView: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tapToViewText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  moreRequestsBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    marginTop: 4,
  },
  moreRequestsText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },

  /* TECHNICIAN STATUS PANEL */
  statusPanel: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    marginBottom: 20,
    overflow: "hidden",
  },
  statusPanelAccentBar: {
    width: 4,
    backgroundColor: COLORS.success,
  },
  statusPanelBody: {
    flex: 1,
    padding: 18,
  },
  certBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 10,
    gap: 4,
  },
  certBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.success,
    letterSpacing: 0.3,
  },
  statusPanelTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  statusPanelDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  statusPanelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  statusPanelStat: {
    flex: 1,
    alignItems: "center",
  },
  statusPanelDividerV: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.borderSubtle,
  },
  statusPanelValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    fontFamily: MONO,
  },
  statusPanelLabel: {
    color: COLORS.textTertiary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 3,
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
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
    borderBottomColor: COLORS.borderSubtle,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  modalTimeCreated: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
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
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    marginBottom: 16,
  },
  infoBoxIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  detailBlock: {
    marginBottom: 18,
  },
  detailTitle: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  serviceHeadline: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  detailDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    flex: 1,
  },
  priceContainer: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  priceLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  priceAmount: {
    color: COLORS.success,
    fontSize: 20,
    fontWeight: "900",
    fontFamily: MONO,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  tipInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  tipInputPrefix: {
    color: COLORS.success,
    fontSize: 20,
    fontWeight: "800",
    fontFamily: MONO,
    marginRight: 6,
  },
  tipInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    fontFamily: MONO,
    paddingVertical: 14,
  },
  tipNoteInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    minHeight: 48,
    textAlignVertical: "top",
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  acceptBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptBtnText: {
    color: "#0A0C0F",
    fontSize: 14,
    fontWeight: "800",
  },
});
