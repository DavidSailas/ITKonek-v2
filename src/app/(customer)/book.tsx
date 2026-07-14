import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

type PaymentMethod = "gcash" | "paymaya" | "card";

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}[] = [
  {
    id: "gcash",
    label: "GCash",
    icon: "phone-portrait-outline",
    tint: "#0072CE",
  },
  { id: "paymaya", label: "Maya", icon: "wallet-outline", tint: "#00B14F" },
  { id: "card", label: "Bank / Card", icon: "card-outline", tint: "#111827" },
];

const PAYMONGO_PUBLIC_KEY = process.env
  .EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY as string;

export default function BookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    techId?: string;
    techName?: string;
    techAvatar?: string;
  }>();

  const [serviceTitle, setServiceTitle] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState(new Date());
  // Only used on iOS now — Android uses the imperative API below and
  // manages its own native dialog, so it doesn't need a "visible" flag.
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [linkedMethod, setLinkedMethod] = useState<PaymentMethod | null>(null);
  const [linkedCardLast4, setLinkedCardLast4] = useState<string | null>(null);
  const [linkedCardPaymentMethodId, setLinkedCardPaymentMethodId] = useState<
    string | null
  >(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [linkModalMethod, setLinkModalMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    prefillAddress();
    fetchLinkedPaymentMethod();
  }, []);

  const prefillAddress = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("location")
      .eq("id", user.uid)
      .maybeSingle();
    if (data?.location) setLocationAddress(data.location);
  };

  const fetchLinkedPaymentMethod = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingProfile(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select(
        "default_payment_method, default_card_last4, default_card_payment_method_id",
      )
      .eq("id", user.uid)
      .maybeSingle();

    if (data?.default_payment_method) {
      setLinkedMethod(data.default_payment_method as PaymentMethod);
      setLinkedCardLast4(data.default_card_last4 ?? null);
      setLinkedCardPaymentMethodId(data.default_card_payment_method_id ?? null);
    }
    setLoadingProfile(false);
  };

  const openLinkModal = (method: PaymentMethod) => {
    setCardNumber("");
    setCardExpMonth("");
    setCardExpYear("");
    setCardCvc("");
    setLinkModalMethod(method);
  };

  const handleLinkCard = async () => {
    if (
      !cardNumber.trim() ||
      !cardExpMonth.trim() ||
      !cardExpYear.trim() ||
      !cardCvc.trim()
    ) {
      Alert.alert("Missing card info", "Please fill out all card fields.");
      return;
    }

    setLinking(true);
    try {
      const res = await fetch("https://api.paymongo.com/v1/payment_methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(PAYMONGO_PUBLIC_KEY + ":")}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              type: "card",
              details: {
                card_number: cardNumber.replace(/\s/g, ""),
                exp_month: parseInt(cardExpMonth, 10),
                exp_year: parseInt(cardExpYear, 10),
                cvc: cardCvc,
              },
            },
          },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Card tokenization failed:", data);
        Alert.alert(
          "Card error",
          data?.errors?.[0]?.detail ??
            "Please check your card details and try again.",
        );
        return;
      }

      const paymentMethodId = data.data.id;
      const last4 = cardNumber.replace(/\s/g, "").slice(-4);

      await saveLinkedMethod("card", paymentMethodId, last4);
      setLinkModalMethod(null);
    } catch (err) {
      console.error("Card tokenization error:", err);
      Alert.alert(
        "Card error",
        "Could not reach the payment provider. Please try again.",
      );
    } finally {
      setLinking(false);
    }
  };

  const handleLinkWallet = async (method: "gcash" | "paymaya") => {
    setLinking(true);
    await saveLinkedMethod(method, null, null);
    setLinking(false);
    setLinkModalMethod(null);
  };

  const saveLinkedMethod = async (
    method: PaymentMethod,
    cardPaymentMethodId: string | null,
    cardLast4: string | null,
  ) => {
    const user = auth.currentUser;
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        default_payment_method: method,
        default_card_payment_method_id: cardPaymentMethodId,
        default_card_last4: cardLast4,
      })
      .eq("id", user.uid);

    if (error) {
      console.error("Save linked payment method error:", error.message);
      Alert.alert(
        "Something went wrong",
        "Could not save this payment method. Please try again.",
      );
      return;
    }

    setLinkedMethod(method);
    setLinkedCardPaymentMethodId(cardPaymentMethodId);
    setLinkedCardLast4(cardLast4);
  };

  // ---- DATE PICKER --------------------------------------------------------
  // Android: never mount <DateTimePicker/> as JSX — it doesn't render a real
  // view there, it's an imperative wrapper. Keeping it mounted causes the
  // "Cannot read property 'dismiss' of undefined" crash on unmount, because
  // its cleanup effect fires against a ref that was never attached.
  // Use DateTimePickerAndroid.open() directly instead.
  const openDatePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: scheduledDate,
        mode: "date",
        minimumDate: new Date(),
        onChange: (event, date) => {
          if (event.type !== "set" || !date) return;
          // Chain a time picker so the result is a combined date+time,
          // same as the old single "datetime" mode.
          DateTimePickerAndroid.open({
            value: date,
            mode: "time",
            onChange: (timeEvent, time) => {
              if (timeEvent.type !== "set" || !time) return;
              const combined = new Date(date);
              combined.setHours(time.getHours(), time.getMinutes());
              setScheduledDate(combined);
            },
          });
        },
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const handleSubmit = async () => {
    if (
      !serviceTitle.trim() ||
      !problemDescription.trim() ||
      !locationAddress.trim()
    ) {
      Alert.alert(
        "Missing info",
        "Please fill out the service, problem, and location fields.",
      );
      return;
    }
    if (!linkedMethod) {
      Alert.alert(
        "Link a payment method",
        "Please link a payment method before booking.",
      );
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      customer_id: user.uid,
      technician_id: params.techId ?? null,
      service_title: serviceTitle.trim(),
      problem_description: problemDescription.trim(),
      location_address: locationAddress.trim(),
      is_urgent: isUrgent,
      scheduled_date:
        scheduleMode === "now"
          ? new Date().toISOString()
          : scheduledDate.toISOString(),
      payment_method: linkedMethod,
      payment_status: "unpaid",
      paymongo_payment_method_id:
        linkedMethod === "card" ? linkedCardPaymentMethodId : null,
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      console.error("Booking insert error:", error.message);
      Alert.alert("Booking failed", error.message);
      return;
    }

    Alert.alert(
      "Booking submitted!",
      params.techId
        ? `Your request has been sent to ${params.techName}. Once the job is done, you'll confirm payment — nothing is charged yet.`
        : "We're matching you with the best available technician nearby. Once the job is done, you'll confirm payment — nothing is charged yet.",
      [
        {
          text: "OK",
          onPress: () => router.replace("/(customer)/(tabs)/home" as any),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Book a Repair</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {params.techId ? (
            <View style={styles.techCard}>
              <Image
                source={
                  params.techAvatar
                    ? { uri: params.techAvatar as string }
                    : require("../../assets/images/user.png")
                }
                style={styles.techAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.techLabel}>Assigned Technician</Text>
                <Text style={styles.techName}>{params.techName}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            </View>
          ) : (
            <View style={styles.matchBanner}>
              <Ionicons name="people-outline" size={20} color="#111827" />
              <Text style={styles.matchBannerText}>
                No technician selected — we'll match you with the best available
                one nearby.
              </Text>
            </View>
          )}

          <Text style={styles.label}>What service do you need?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Laptop LCD Repair"
            placeholderTextColor="#B0B0B0"
            value={serviceTitle}
            onChangeText={setServiceTitle}
          />

          <Text style={styles.label}>Describe the problem</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="e.g. My laptop screen is cracked in the corner and has a black spot..."
            placeholderTextColor="#B0B0B0"
            value={problemDescription}
            onChangeText={setProblemDescription}
            multiline
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="House/Unit no., Street, Barangay, City"
            placeholderTextColor="#B0B0B0"
            value={locationAddress}
            onChangeText={setLocationAddress}
            multiline
          />

          <Text style={styles.label}>When</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, scheduleMode === "now" && styles.pillActive]}
              onPress={() => setScheduleMode("now")}
            >
              <Text
                style={[
                  styles.pillText,
                  scheduleMode === "now" && styles.pillTextActive,
                ]}
              >
                Book Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pill,
                scheduleMode === "later" && styles.pillActive,
              ]}
              onPress={() => {
                setScheduleMode("later");
                openDatePicker();
              }}
            >
              <Text
                style={[
                  styles.pillText,
                  scheduleMode === "later" && styles.pillTextActive,
                ]}
              >
                Schedule
              </Text>
            </TouchableOpacity>
          </View>

          {scheduleMode === "later" && (
            <TouchableOpacity
              style={styles.dateDisplay}
              onPress={openDatePicker}
            >
              <Ionicons name="calendar-outline" size={18} color="#111827" />
              <Text style={styles.dateDisplayText}>
                {scheduledDate.toLocaleString()}
              </Text>
            </TouchableOpacity>
          )}

          {/* Only ever mounted on iOS — on Android, DateTimePickerAndroid.open() (above) handles it */}
          {Platform.OS === "ios" && showDatePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="datetime"
              minimumDate={new Date()}
              onChange={(event, date) => {
                if (event.type === "dismissed") {
                  setShowDatePicker(false);
                  return;
                }
                if (date) setScheduledDate(date);
              }}
            />
          )}

          <Text style={styles.label}>Urgency</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, !isUrgent && styles.pillActive]}
              onPress={() => setIsUrgent(false)}
            >
              <Text
                style={[styles.pillText, !isUrgent && styles.pillTextActive]}
              >
                Standard
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, isUrgent && styles.pillUrgentActive]}
              onPress={() => setIsUrgent(true)}
            >
              <Text
                style={[styles.pillText, isUrgent && styles.pillTextActive]}
              >
                Urgent
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.paymentGrid}>
            {PAYMENT_OPTIONS.map((option) => {
              const isLinked = linkedMethod === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.paymentCard,
                    isLinked && styles.paymentCardSelected,
                  ]}
                  onPress={() => openLinkModal(option.id)}
                >
                  <View
                    style={[
                      styles.paymentIcon,
                      { backgroundColor: `${option.tint}1A` },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={option.tint}
                    />
                  </View>
                  <Text style={styles.paymentLabel}>{option.label}</Text>
                  <Text style={styles.paymentSubLabel}>
                    {isLinked
                      ? option.id === "card" && linkedCardLast4
                        ? `•••• ${linkedCardLast4}`
                        : "Linked"
                      : "Tap to link"}
                  </Text>
                  {isLinked && (
                    <View style={styles.paymentCheck}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#10B981"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {linkedMethod && (
            <Text style={styles.changeMethodText}>
              This will be used automatically on future bookings too — tap
              another option above anytime to switch.
            </Text>
          )}

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.infoBoxText}>
              Payments go to ITKonek, not the technician directly — this covers
              your protection and support. You're not charged now; you'll
              confirm payment once the job is complete and the final cost is
              set. Tips for your technician are optional and separate.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={!!linkModalMethod}
        transparent
        animationType="slide"
        onRequestClose={() => setLinkModalMethod(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            {linkModalMethod === "card" ? (
              <>
                <Text style={styles.modalTitle}>Link Bank / Card</Text>
                <Text style={styles.modalSubtitle}>
                  Saved securely with PayMongo — your card details never touch
                  our servers. Once linked, it's remembered for every future
                  booking automatically.
                </Text>

                <Text style={styles.cardFormLabel}>Card Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4343 4343 4343 4345"
                  placeholderTextColor="#B0B0B0"
                  keyboardType="number-pad"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  maxLength={19}
                />
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardFormLabel}>Month</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="12"
                      placeholderTextColor="#B0B0B0"
                      keyboardType="number-pad"
                      value={cardExpMonth}
                      onChangeText={setCardExpMonth}
                      maxLength={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardFormLabel}>Year</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="2028"
                      placeholderTextColor="#B0B0B0"
                      keyboardType="number-pad"
                      value={cardExpYear}
                      onChangeText={setCardExpYear}
                      maxLength={4}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardFormLabel}>CVC</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="123"
                      placeholderTextColor="#B0B0B0"
                      keyboardType="number-pad"
                      value={cardCvc}
                      onChangeText={setCardCvc}
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>
                <Text style={styles.cardFormNote}>
                  Test mode: try 4343 4343 4343 4345, any future date, any
                  3-digit CVC.
                </Text>

                <TouchableOpacity
                  style={[styles.modalButton, linking && styles.buttonDisabled]}
                  onPress={handleLinkCard}
                  disabled={linking}
                >
                  {linking ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>Link Card</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  Link {linkModalMethod === "gcash" ? "GCash" : "Maya"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {linkModalMethod === "gcash" ? "GCash" : "Maya"} doesn't work
                  like a card — there's no account number to type here. Once
                  linked, we'll remember it as your default for every future
                  booking. When a job is actually billed, you'll get a quick
                  one-tap confirmation inside the{" "}
                  {linkModalMethod === "gcash" ? "GCash" : "Maya"} app itself —
                  that's how e-wallets keep your money safe, the same way it
                  works everywhere else you use it.
                </Text>

                <TouchableOpacity
                  style={[styles.modalButton, linking && styles.buttonDisabled]}
                  onPress={() =>
                    handleLinkWallet(linkModalMethod as "gcash" | "paymaya")
                  }
                  disabled={linking}
                >
                  {linking ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>
                      Link {linkModalMethod === "gcash" ? "GCash" : "Maya"}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setLinkModalMethod(null)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
  techCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  techAvatar: { width: 44, height: 44, borderRadius: 22 },
  techLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  techName: { fontSize: 14, fontWeight: "800", color: "#111827", marginTop: 2 },
  matchBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  matchBannerText: { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  multilineInput: { minHeight: 70, textAlignVertical: "top" },
  pillRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  pillActive: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  pillUrgentActive: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  pillText: { fontSize: 13, fontWeight: "700", color: "#4B5563" },
  pillTextActive: { color: "#FFFFFF" },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  dateDisplayText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paymentCard: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  paymentCardSelected: { borderColor: "#10B981", backgroundColor: "#F0FDF4" },
  paymentIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  paymentLabel: { fontSize: 12, fontWeight: "800", color: "#111827" },
  paymentSubLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 2,
    lineHeight: 12,
  },
  paymentCheck: { position: "absolute", top: 8, right: 8 },
  changeMethodText: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  infoBoxText: { flex: 1, fontSize: 11, color: "#6B7280", lineHeight: 16 },
  submitButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 18,
  },
  cardFormLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  cardRow: { flexDirection: "row", gap: 10 },
  cardFormNote: {
    fontSize: 10,
    color: "#9CA3AF",
    lineHeight: 15,
    marginTop: -6,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  modalCancelButton: { alignItems: "center", padding: 8 },
  modalCancelText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
});
