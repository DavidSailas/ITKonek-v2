import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../../config/firebase";
import { supabase } from "../../../config/supabase";

type TabType = "available" | "accepted" | "done" | "rescheduled" | "cancelled";

const TABS: {
  id: TabType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "available", label: "Available", icon: "flash-outline" },
  { id: "accepted", label: "Active", icon: "construct-outline" },
  { id: "done", label: "Done", icon: "checkmark-circle-outline" },
  { id: "rescheduled", label: "Rescheduled", icon: "calendar-outline" },
  { id: "cancelled", label: "Cancelled", icon: "close-circle-outline" },
];

export default function TechJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("available");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal State for previewing unaccepted jobs
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  useEffect(() => {
    fetchJobs();
  }, [activeTab]);

  // Live updates: whenever any booking is created or changes (a new request
  // comes in, a customer cancels, another tech grabs a job, etc.) refresh
  // whichever tab is currently open so the list is never stale.
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const channel = supabase
      .channel(`tech-jobs-realtime-${user.uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchJobs();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const fetchJobs = async () => {
    setLoading(true);
    const user = auth.currentUser;

    try {
      let query = supabase
        .from("bookings")
        .select("*, customer:customer_id(first_name, last_name, phone_number)");

      if (activeTab === "available") {
        if (user) {
          query = query
            .eq("status", "pending")
            .or(`technician_id.is.null,technician_id.eq.${user.uid}`);
        } else {
          query = query.eq("status", "pending").is("technician_id", null);
        }
      } else if (activeTab === "accepted") {
        query = query
          .eq("technician_id", user?.uid)
          .in("status", [
            "accepted",
            "en_route",
            "arrived",
            "in_progress",
            "payment_pending",
          ]);
      } else if (activeTab === "done") {
        query = query.eq("technician_id", user?.uid).eq("status", "completed");
      } else if (activeTab === "rescheduled") {
        // Scoped to this technician only — previously this leaked every
        // technician's rescheduled jobs since it had no technician filter.
        query = query
          .eq("technician_id", user?.uid)
          .eq("status", "rescheduled");
      } else if (activeTab === "cancelled") {
        query = query.eq("technician_id", user?.uid).eq("status", "cancelled");
      }

      const { data, error } = await query;

      if (error) {
        if (
          error.code === "22P02" ||
          /invalid input value for enum/i.test(error.message)
        ) {
          // The 'rescheduled' status value hasn't been added to the
          // booking_status enum in the database yet (see SETUP.sql).
          // Fail quietly with an empty list instead of spamming the console.
          setJobs([]);
        } else {
          console.error("Fetch Error:", error.message);
          setJobs([]);
        }
      } else {
        let fetchedJobs = data || [];

        if (activeTab === "available" && user) {
          fetchedJobs.sort((a, b) => {
            const aIsAssigned = a.technician_id === user.uid ? 1 : 0;
            const bIsAssigned = b.technician_id === user.uid ? 1 : 0;
            if (aIsAssigned !== bIsAssigned) {
              return bIsAssigned - aIsAssigned;
            }
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          });
        } else if (activeTab === "accepted") {
          fetchedJobs.sort((a, b) => {
            const timeA = new Date(a.scheduled_date || a.created_at).getTime();
            const timeB = new Date(b.scheduled_date || b.created_at).getTime();
            return timeA - timeB;
          });
        } else {
          fetchedJobs.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
        }

        setJobs(fetchedJobs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs();
  }, [activeTab]);

  const handleJobPress = (job: any) => {
    // If the job is active/accepted, navigate to detailed map & tracking screen
    if (
      [
        "accepted",
        "en_route",
        "arrived",
        "in_progress",
        "payment_pending",
      ].includes(job.status)
    ) {
      router.push({
        pathname: "/(technician)/track-job",
        params: { id: job.id },
      });
    } else {
      // Otherwise open quick detail modal
      setSelectedJob(job);
      setModalVisible(true);
    }
  };

  // Creates/unlocks the chat thread for a customer+technician pair.
  // Deliberately avoids upsert()'s ON CONFLICT — that requires a unique
  // constraint on (customer_id, technician_id) that may not exist on every
  // project — and instead looks the row up first, then updates or inserts.
  // Also falls back to omitting `booking_id` if that column doesn't exist
  // yet (run SETUP.sql to add it permanently), and surfaces any failure
  // with an alert instead of only logging it, so a silent DB issue doesn't
  // look like "the accept just didn't open a chat."
  const openOrUnlockChatThread = async (
    customerId: string,
    technicianId: string,
    bookingId: string,
  ) => {
    const { data: existing, error: findError } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("customer_id", customerId)
      .eq("technician_id", technicianId)
      .maybeSingle();

    if (findError) {
      console.error("Chat thread lookup error:", findError.message);
      Alert.alert(
        "Chat setup issue",
        `Job accepted, but we couldn't open the chat thread. (${findError.message})`,
      );
      return;
    }

    const timestamp = new Date().toISOString();
    let error;

    if (existing?.id) {
      ({ error } = await supabase
        .from("chat_threads")
        .update({
          is_locked: false,
          updated_at: timestamp,
          booking_id: bookingId,
        })
        .eq("id", existing.id));
      if (error && /booking_id/i.test(error.message)) {
        ({ error } = await supabase
          .from("chat_threads")
          .update({ is_locked: false, updated_at: timestamp })
          .eq("id", existing.id));
      }
    } else {
      const insertPayload = {
        customer_id: customerId,
        technician_id: technicianId,
        is_locked: false,
        updated_at: timestamp,
      };
      ({ error } = await supabase
        .from("chat_threads")
        .insert({ ...insertPayload, booking_id: bookingId }));
      if (error && /booking_id/i.test(error.message)) {
        ({ error } = await supabase.from("chat_threads").insert(insertPayload));
      }
    }

    if (error) {
      console.error("Chat thread open error:", error.message);
      Alert.alert(
        "Chat setup issue",
        `Job accepted, but we couldn't open the chat thread. (${error.message})`,
      );
    }
  };

  // Confirms a rescheduled job's new time and moves it back into the
  // technician's active queue.
  const confirmResume = async (job: any) => {
    if (!job) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "accepted" })
      .eq("id", job.id);
    setUpdatingStatus(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setModalVisible(false);
    setSelectedJob(null);
    fetchJobs();
  };

  const acceptAndNavigate = async (job: any) => {
    const user = auth.currentUser;
    if (!user || !job) return;

    setUpdatingStatus(true);

    const { error } = await supabase
      .from("bookings")
      .update({ status: "accepted", technician_id: user.uid })
      .eq("id", job.id);

    if (error) {
      setUpdatingStatus(false);
      Alert.alert("Error", error.message);
      return;
    }

    // Open (or reopen) the chat thread for this customer/technician pair.
    // If they've worked together before, this reuses the same thread —
    // history stays intact — and simply unlocks it and re-points it at
    // the new booking. Otherwise a fresh thread is created.
    await openOrUnlockChatThread(job.customer_id, user.uid, job.id);

    setUpdatingStatus(false);
    setModalVisible(false);
    setSelectedJob(null);
    // Navigate to full map tracking view right away
    router.push({
      pathname: "/(technician)/track-job",
      params: { id: job.id },
    });
  };

  const formatScheduleDateTime = (dateString: string) => {
    if (!dateString) return "Flexible Schedule";
    const d = new Date(dateString);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#EAB308";
      case "accepted":
      case "en_route":
      case "arrived":
      case "in_progress":
        return "#3B82F6";
      case "payment_pending":
        return "#F97316";
      case "completed":
        return "#10B981";
      case "rescheduled":
        return "#8B5CF6";
      case "cancelled":
        return "#EF4444";
      default:
        return "#888888";
    }
  };

  const currentUserId = auth.currentUser?.uid;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0A0A0A"
        translucent
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View>
          <Text style={styles.headerTitle}>Jobs Center</Text>
          <Text style={styles.headerSub}>
            Manage & track dispatches & appointments
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={fetchJobs}>
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? "#000000" : "#888888"}
                />
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Job Cards */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginTop: 40 }} />
        ) : jobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="briefcase-outline" size={40} color="#333333" />
            <Text style={styles.emptyTitle}>No {activeTab} jobs found</Text>
            <Text style={styles.emptySub}>
              There are currently no items under this tab category.
            </Text>
          </View>
        ) : (
          jobs.map((item) => {
            const isAssignedToMe =
              activeTab === "available" &&
              item.technician_id &&
              item.technician_id === currentUserId;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.jobCard, isAssignedToMe && styles.jobCardDirect]}
                activeOpacity={0.8}
                onPress={() => handleJobPress(item)}
              >
                {isAssignedToMe && (
                  <View style={styles.directTag}>
                    <Ionicons
                      name="person-circle-outline"
                      size={12}
                      color="#000000"
                    />
                    <Text style={styles.directTagText}>ASSIGNED TO YOU</Text>
                  </View>
                )}

                <View style={styles.jobCardHeader}>
                  <View style={styles.custRow}>
                    <View style={styles.custAvatar}>
                      <Text style={styles.custAvatarText}>
                        {(item.customer?.first_name?.[0] || "C").toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.custName}>
                        {item.customer
                          ? `${item.customer.first_name} ${item.customer.last_name}`
                          : "Customer Request"}
                      </Text>
                      <Text style={styles.timeScheduleText}>
                        {formatScheduleDateTime(
                          item.scheduled_date || item.created_at,
                        )}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { borderColor: getBadgeColor(item.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: getBadgeColor(item.status) },
                      ]}
                    >
                      {item.status.replace("_", " ").toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.serviceTitle}>
                  {item.service_title || "General Service Request"}
                </Text>

                {item.location_address && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color="#888888"
                    />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.location_address}
                    </Text>
                  </View>
                )}

                <View style={styles.jobCardFooter}>
                  <Text style={styles.priceText}>
                    {item.estimated_cost
                      ? `₱${item.estimated_cost}`
                      : "Est. Payout TBD"}
                  </Text>

                  <View style={styles.actionLink}>
                    <Text style={styles.actionLinkText}>
                      {[
                        "accepted",
                        "en_route",
                        "arrived",
                        "in_progress",
                      ].includes(item.status)
                        ? "Track & Navigate"
                        : "View Details"}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* MODAL FOR PREVIEWING UNACCEPTED JOBS */}
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
                    <Text style={styles.modalTitle}>
                      {selectedJob?.status === "completed"
                        ? "Job Summary"
                        : "Available Job Details"}
                    </Text>
                    <Text style={styles.modalSubTitle}>
                      {selectedJob?.status === "completed"
                        ? `Completed: ${formatScheduleDateTime(selectedJob?.updated_at)}`
                        : `Scheduled: ${formatScheduleDateTime(
                            selectedJob?.scheduled_date ||
                              selectedJob?.created_at,
                          )}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {selectedJob && selectedJob.status === "completed" ? (
                  <>
                    <ScrollView
                      style={styles.modalBody}
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.completedBadgeRow}>
                        <View style={styles.completedBadge}>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#10B981"
                          />
                          <Text style={styles.completedBadgeText}>
                            Job Completed
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.paymentBadge,
                            selectedJob.payment_status === "paid"
                              ? styles.paymentBadgePaid
                              : styles.paymentBadgeUnpaid,
                          ]}
                        >
                          <Ionicons
                            name={
                              selectedJob.payment_status === "paid"
                                ? "card"
                                : "time-outline"
                            }
                            size={12}
                            color={
                              selectedJob.payment_status === "paid"
                                ? "#10B981"
                                : "#F59E0B"
                            }
                          />
                          <Text
                            style={[
                              styles.paymentBadgeText,
                              {
                                color:
                                  selectedJob.payment_status === "paid"
                                    ? "#10B981"
                                    : "#F59E0B",
                              },
                            ]}
                          >
                            {selectedJob.payment_status === "paid"
                              ? "Paid"
                              : "Payment Pending"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoBox}>
                        <Ionicons
                          name="person-circle-outline"
                          size={26}
                          color="#FFFFFF"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.infoLabel}>Customer</Text>
                          <Text style={styles.infoValue}>
                            {selectedJob.customer
                              ? `${selectedJob.customer.first_name} ${selectedJob.customer.last_name}`
                              : "Customer Request"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailBlock}>
                        <Text style={styles.detailLabel}>Service Provided</Text>
                        <Text style={styles.serviceHeadline}>
                          {selectedJob.service_title ||
                            "Hardware / Software Service"}
                        </Text>
                        <Text style={styles.detailBody}>
                          {selectedJob.problem_description ||
                            "No specific problem notes."}
                        </Text>
                      </View>

                      <View style={styles.detailBlock}>
                        <Text style={styles.detailLabel}>Location Address</Text>
                        <View style={styles.metaRow}>
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color="#888888"
                          />
                          <Text style={styles.metaText}>
                            {selectedJob.location_address ||
                              "No address provided"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.invoiceCard}>
                        <View style={styles.invoiceRow}>
                          <Text style={styles.invoiceRowLabel}>
                            Total Billed
                          </Text>
                          <Text style={styles.invoiceRowValue}>
                            ₱
                            {Number(selectedJob.estimated_cost || 0).toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.invoiceDivider} />
                        <View style={styles.invoiceRow}>
                          <Text style={styles.invoiceTotalLabel}>
                            Your Earnings
                          </Text>
                          <Text style={styles.invoiceTotalValue}>
                            ₱
                            {Number(selectedJob.estimated_cost || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => setModalVisible(false)}
                      >
                        <Text style={styles.secondaryBtnText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {selectedJob && (
                      <ScrollView
                        style={styles.modalBody}
                        showsVerticalScrollIndicator={false}
                      >
                        <View style={styles.infoBox}>
                          <Ionicons
                            name="person-circle-outline"
                            size={26}
                            color="#FFFFFF"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>Customer</Text>
                            <Text style={styles.infoValue}>
                              {selectedJob.customer
                                ? `${selectedJob.customer.first_name} ${selectedJob.customer.last_name}`
                                : "Customer Request"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>
                            Service Required
                          </Text>
                          <Text style={styles.serviceHeadline}>
                            {selectedJob.service_title ||
                              "Hardware / Software Service"}
                          </Text>
                          <Text style={styles.detailBody}>
                            {selectedJob.problem_description ||
                              "No specific problem notes."}
                          </Text>
                        </View>

                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>
                            Location Address
                          </Text>
                          <View style={styles.metaRow}>
                            <Ionicons
                              name="location-outline"
                              size={16}
                              color="#888888"
                            />
                            <Text style={styles.metaText}>
                              {selectedJob.location_address ||
                                "No address provided"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.priceCard}>
                          <Text style={styles.priceCardLabel}>
                            Estimated Earnings
                          </Text>
                          <Text style={styles.priceCardValue}>
                            {selectedJob.estimated_cost
                              ? `₱${selectedJob.estimated_cost}`
                              : "₱0.00"}
                          </Text>
                        </View>
                      </ScrollView>
                    )}

                    {selectedJob?.status === "pending" && (
                      <View style={styles.modalActions}>
                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={() => acceptAndNavigate(selectedJob)}
                          disabled={updatingStatus}
                        >
                          {updatingStatus ? (
                            <ActivityIndicator color="#000000" />
                          ) : (
                            <>
                              <Text style={styles.primaryBtnText}>
                                Accept Job & Start Navigation
                              </Text>
                              <Ionicons
                                name="arrow-forward"
                                size={18}
                                color="#000000"
                              />
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {selectedJob?.status === "rescheduled" && (
                      <View style={styles.modalActions}>
                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={() => confirmResume(selectedJob)}
                          disabled={updatingStatus}
                        >
                          {updatingStatus ? (
                            <ActivityIndicator color="#000000" />
                          ) : (
                            <>
                              <Text style={styles.primaryBtnText}>
                                Confirm New Time & Resume
                              </Text>
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color="#000000"
                              />
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  headerSub: { color: "#888888", fontSize: 12, marginTop: 2 },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#282828",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#141414",
  },
  tabsContainer: { paddingHorizontal: 20, gap: 8 },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141414",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
  tabButtonActive: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  tabText: { color: "#888888", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#000000", fontWeight: "800" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },
  emptyCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 36,
    alignItems: "center",
    marginTop: 20,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 12,
  },
  emptySub: {
    color: "#666666",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  jobCard: {
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 16,
    marginBottom: 12,
  },
  jobCardDirect: { borderColor: "#EAB308", backgroundColor: "#16150E" },
  directTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAB308",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 10,
  },
  directTagText: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  custRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  custAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
  },
  custAvatarText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  custName: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  timeScheduleText: {
    color: "#3B82F6",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#181818",
  },
  statusPillText: { fontSize: 9, fontWeight: "800" },
  serviceTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  metaText: { color: "#888888", fontSize: 12, flex: 1 },
  jobCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },
  priceText: { color: "#10B981", fontSize: 15, fontWeight: "800" },
  actionLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionLinkText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
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
  modalTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  modalSubTitle: { color: "#888888", fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },
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
  infoLabel: { color: "#888888", fontSize: 11 },
  infoValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  detailBlock: { marginBottom: 18 },
  detailLabel: {
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
  detailBody: { color: "#AAAAAA", fontSize: 13, lineHeight: 18 },
  priceCard: {
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
  priceCardLabel: { color: "#CCCCCC", fontSize: 13, fontWeight: "600" },
  priceCardValue: { color: "#10B981", fontSize: 20, fontWeight: "900" },
  modalActions: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 10 },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#000000", fontSize: 14, fontWeight: "800" },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  completedBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0B2A20",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completedBadgeText: { color: "#10B981", fontSize: 11, fontWeight: "800" },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentBadgePaid: { backgroundColor: "#0B2A20", borderColor: "#10B981" },
  paymentBadgeUnpaid: { backgroundColor: "#2A1F0B", borderColor: "#F59E0B" },
  paymentBadgeText: { fontSize: 11, fontWeight: "800" },
  invoiceCard: {
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#242424",
    marginBottom: 20,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceRowLabel: { color: "#999999", fontSize: 12, fontWeight: "600" },
  invoiceRowValue: { color: "#CCCCCC", fontSize: 13, fontWeight: "700" },
  invoiceDivider: {
    height: 1,
    backgroundColor: "#242424",
    marginVertical: 10,
  },
  invoiceTotalLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  invoiceTotalValue: { color: "#10B981", fontSize: 20, fontWeight: "900" },
});
