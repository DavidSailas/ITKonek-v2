import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { supabase } from "../../config/supabase";

type JobStatus =
  | "accepted"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "payment_pending"
  | "completed";

const STATUS_STEPS: { key: JobStatus; label: string }[] = [
  { key: "accepted", label: "Accepted" },
  { key: "en_route", label: "En Route" },
  { key: "arrived", label: "Arrived" },
  { key: "in_progress", label: "In Progress" },
  { key: "payment_pending", label: "Bill Sent" },
  { key: "completed", label: "Done" },
];

export default function TrackJobScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  // Invoice State
  const [invoiceModalVisible, setInvoiceModalVisible] =
    useState<boolean>(false);
  const [laborFee, setLaborFee] = useState<string>("");
  const [partsFee, setPartsFee] = useState<string>("");

  const defaultTechCoords = { latitude: 10.3157, longitude: 123.8854 };
  const defaultCustCoords = { latitude: 10.33, longitude: 123.9 };

  useEffect(() => {
    if (id) {
      fetchJobDetails();

      // Realtime listener for payment completion by customer
      const channel = supabase
        .channel(`track-job-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `id=eq.${id}`,
          },
          (payload) => {
            if (payload.new) {
              setJob((prev: any) => ({ ...prev, ...payload.new }));
            }
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "*, customer:customer_id(id, first_name, last_name, phone_number, avatar_url)",
        )
        .eq("id", id)
        .single();

      if (error) {
        Alert.alert("Error", "Could not fetch job details.");
      } else {
        setJob(data);
        if (data.estimated_cost) {
          setLaborFee(data.estimated_cost.toString());
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (
    nextStatus: JobStatus,
    extraPayload = {},
  ): Promise<boolean> => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: nextStatus, ...extraPayload })
        .eq("id", id);

      if (error) {
        Alert.alert("Update Failed", error.message);
        return false;
      } else {
        setJob((prev: any) => ({
          ...prev,
          status: nextStatus,
          ...extraPayload,
        }));
        return true;
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "An unexpected error occurred.");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleNextStep = () => {
    if (!job) return;
    switch (job.status) {
      case "accepted":
        updateJobStatus("en_route");
        break;
      case "en_route":
        updateJobStatus("arrived");
        break;
      case "arrived":
        updateJobStatus("in_progress");
        break;
      case "in_progress":
        setInvoiceModalVisible(true);
        break;
      default:
        break;
    }
  };

  const handleSendInvoice = async () => {
    const labor = parseFloat(laborFee) || 0;
    const parts = parseFloat(partsFee) || 0;
    const totalCost = labor + parts;

    if (totalCost <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid total amount.");
      return;
    }

    const success = await updateJobStatus("payment_pending", {
      estimated_cost: totalCost,
    });

    if (success) {
      setInvoiceModalVisible(false);
      Alert.alert(
        "Invoice Dispatched",
        "Payment request sent to the customer.",
      );
    }
  };

  const handleCallCustomer = () => {
    if (job?.customer?.phone_number) {
      Linking.openURL(`tel:${job.customer.phone_number}`);
    } else {
      Alert.alert("No Contact Info", "Customer phone number is not available.");
    }
  };

  const handleOpenChat = () => {
    router.push("/chat");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading Dispatch Navigation...</Text>
      </View>
    );
  }

  const techCoords = {
    latitude: job?.latitude
      ? Number(job.latitude) - 0.005
      : defaultTechCoords.latitude,
    longitude: job?.longitude
      ? Number(job.longitude) - 0.005
      : defaultTechCoords.longitude,
  };

  const customerCoords = {
    latitude: job?.latitude ? Number(job.latitude) : defaultCustCoords.latitude,
    longitude: job?.longitude
      ? Number(job.longitude)
      : defaultCustCoords.longitude,
  };

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === job?.status);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000000"
        translucent={false}
      />

      {/* Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(technician)/(tabs)/jobs")}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Live Dispatch Navigation</Text>
          <Text style={styles.headerSub}>Booking #{job?.id?.slice(0, 8)}</Text>
        </View>
        <TouchableOpacity
          style={styles.callHeaderBtn}
          onPress={handleCallCustomer}
        >
          <Ionicons name="call-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: (techCoords.latitude + customerCoords.latitude) / 2,
            longitude: (techCoords.longitude + customerCoords.longitude) / 2,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          customMapStyle={darkMapStyle}
        >
          <Marker coordinate={techCoords} title="Your Location">
            <View style={styles.techMarker}>
              <Ionicons name="navigate" size={16} color="#000000" />
            </View>
          </Marker>

          <Marker coordinate={customerCoords} title="Customer Location">
            <View style={styles.custMarker}>
              <Ionicons name="location" size={18} color="#FFFFFF" />
            </View>
          </Marker>

          <Polyline
            coordinates={[techCoords, customerCoords]}
            strokeColor="#FFFFFF"
            strokeWidth={3}
          />
        </MapView>
      </View>

      {/* Bottom Sheet Card */}
      <View style={styles.sheetContainer}>
        {/* Progress Stepper */}
        <View style={styles.stepperContainer}>
          {STATUS_STEPS.map((step, idx) => {
            const isDone = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <View key={step.key} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    isDone && styles.stepDotDone,
                    isCurrent && styles.stepDotCurrent,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={10} color="#000000" />
                  ) : (
                    <Text style={styles.stepDotText}>{idx + 1}</Text>
                  )}
                </View>
                <Text
                  style={[styles.stepLabel, isDone && styles.stepLabelActive]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetBody}
        >
          {/* Customer Contact Card */}
          <View style={styles.customerCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(job?.customer?.first_name?.[0] || "C").toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>
                {job?.customer
                  ? `${job.customer.first_name} ${job.customer.last_name}`
                  : "Client"}
              </Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {job?.location_address || "No address provided"}
              </Text>
            </View>
            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={styles.iconCircleBtn}
                onPress={handleOpenChat}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconCircleBtn, styles.callBtnBg]}
                onPress={handleCallCustomer}
              >
                <Ionicons name="call-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Job Details Section */}
          <View style={styles.detailBlock}>
            <Text style={styles.blockLabel}>Service Detail</Text>
            <Text style={styles.serviceTitle}>
              {job?.service_title || "Technical Service"}
            </Text>
            <Text style={styles.problemDesc}>
              {job?.problem_description || "No problem notes attached."}
            </Text>
          </View>
        </ScrollView>

        {/* Dynamic Action Button Footer */}
        <View style={styles.footerAction}>
          {job?.status === "payment_pending" ? (
            <View style={styles.pendingPaymentBanner}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.pendingPaymentText}>
                Waiting for Customer Payment (₱
                {Number(job?.estimated_cost || 0).toFixed(2)})
              </Text>
            </View>
          ) : job?.status === "completed" ? (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.completedText}>
                Payment Received • Job Completed
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.mainStepBtn}
              onPress={handleNextStep}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Text style={styles.mainStepBtnText}>
                    {job?.status === "accepted" && "Start Journey (En Route)"}
                    {job?.status === "en_route" && "Mark as Arrived"}
                    {job?.status === "arrived" && "Start Work"}
                    {job?.status === "in_progress" && "Complete Work & Bill"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#000000" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FINAL INVOICE & BILLING MODAL */}
      <Modal visible={invoiceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Complete Work & Request Payment
            </Text>
            <Text style={styles.modalSub}>
              Enter final breakdown costs below. The customer will receive a
              payment prompt on their home screen.
            </Text>

            <Text style={styles.inputLabel}>Labor & Service Fee (₱)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#555555"
              value={laborFee}
              onChangeText={setLaborFee}
            />

            <Text style={styles.inputLabel}>
              Replacement Parts / Extra Materials (₱)
            </Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#555555"
              value={partsFee}
              onChangeText={setPartsFee}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setInvoiceModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitInvoiceBtn}
                onPress={handleSendInvoice}
              >
                <Text style={styles.submitInvoiceText}>Send Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#2C2C2C" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#3C3C3C" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#888888", marginTop: 12, fontSize: 13 },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#181818",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextGroup: { alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  headerSub: { color: "#888888", fontSize: 11, marginTop: 2 },
  callHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#181818",
    alignItems: "center",
    justifyContent: "center",
  },
  mapContainer: { flex: 1, backgroundColor: "#121212" },
  map: { width: "100%", height: "100%" },
  techMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  custMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  sheetContainer: {
    backgroundColor: "#000000",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#222222",
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: "50%",
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  stepItem: { alignItems: "center", flex: 1 },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepDotDone: { backgroundColor: "#FFFFFF" },
  stepDotCurrent: { backgroundColor: "#888888" },
  stepDotText: { color: "#888888", fontSize: 10, fontWeight: "700" },
  stepLabel: { color: "#666666", fontSize: 9, fontWeight: "600" },
  stepLabelActive: { color: "#FFFFFF", fontWeight: "800" },
  sheetBody: { paddingTop: 16, paddingBottom: 20 },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222222",
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  customerName: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  addressText: { color: "#888888", fontSize: 12, marginTop: 2 },
  actionGroup: { flexDirection: "row", gap: 8 },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  callBtnBg: { backgroundColor: "#333333" },
  detailBlock: { marginBottom: 16 },
  blockLabel: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  serviceTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  problemDesc: { color: "#AAAAAA", fontSize: 12, marginTop: 4, lineHeight: 16 },
  footerAction: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },
  mainStepBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mainStepBtnText: { color: "#000000", fontSize: 14, fontWeight: "800" },
  pendingPaymentBanner: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#333333",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pendingPaymentText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  completedBanner: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#064E3B",
    borderWidth: 1,
    borderColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  completedText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 20,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  modalSub: { color: "#888888", fontSize: 12, marginTop: 4, marginBottom: 16 },
  inputLabel: {
    color: "#AAAAAA",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333333",
    color: "#FFFFFF",
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
    fontSize: 14,
  },
  modalActionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  submitInvoiceBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  submitInvoiceText: { color: "#000000", fontWeight: "800", fontSize: 13 },
});
