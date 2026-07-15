import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

export default function InvoicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Live updates: reflect payment status changes instantly without
  // requiring a manual pull-to-refresh.
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const channel = supabase
      .channel(`customer-invoices-realtime-${user.uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${user.uid}`,
        },
        () => {
          fetchInvoices();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInvoices = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // Invoices are completed bookings. `estimated_cost` holds the final
    // billed total once the technician sends the bill, and `payment_status`
    // reflects whether it's actually been paid yet.
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, service_title, estimated_cost, payment_status, payment_method, created_at, updated_at, technician:technician_id(first_name, last_name)",
      )
      .eq("customer_id", user.uid)
      .eq("status", "completed")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Fetch invoices error:", error.message);
    }

    setInvoices(data ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent
      />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)/(tabs)/home")}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Invoices</Text>
          <Text style={styles.subtitle}>
            {invoices.length} completed {invoices.length === 1 ? "job" : "jobs"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <Text style={styles.emptyText}>Loading invoices...</Text>
        ) : invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptyText}>
              Invoices appear here once a repair is marked complete.
            </Text>
          </View>
        ) : (
          invoices.map((inv) => {
            const isPaid = inv.payment_status === "paid";
            return (
              <TouchableOpacity
                key={inv.id}
                style={styles.invoiceCard}
                activeOpacity={0.7}
                onPress={() => setSelectedInvoice(inv)}
              >
                <View style={styles.invoiceCardTop}>
                  <View style={styles.invoiceIconWrap}>
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color="#111827"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceService} numberOfLines={1}>
                      {inv.service_title || "IT Service"}
                    </Text>
                    <Text style={styles.invoiceDate}>
                      {formatDate(inv.updated_at || inv.created_at)}
                      {inv.technician
                        ? ` · ${inv.technician.first_name} ${inv.technician.last_name}`
                        : ""}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isPaid
                        ? styles.statusBadgePaid
                        : styles.statusBadgeUnpaid,
                    ]}
                  >
                    <Ionicons
                      name={isPaid ? "checkmark-circle" : "time-outline"}
                      size={12}
                      color={isPaid ? "#10B981" : "#F59E0B"}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: isPaid ? "#10B981" : "#F59E0B" },
                      ]}
                    >
                      {isPaid ? "Paid" : "Unpaid"}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceCardBottom}>
                  <Text style={styles.invoiceAmountLabel}>Total Amount</Text>
                  <Text style={styles.invoiceAmount}>
                    {inv.estimated_cost
                      ? `₱${Number(inv.estimated_cost).toFixed(2)}`
                      : "—"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* RECEIPT MODAL */}
      <Modal
        visible={!!selectedInvoice}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedInvoice(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedInvoice(null)}>
          <View style={styles.receiptOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.receiptCard}>
                <View style={styles.receiptHandle} />

                <View style={styles.receiptBrandRow}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={20}
                    color="#111827"
                  />
                  <Text style={styles.receiptBrand}>ITKonek Receipt</Text>
                </View>

                {selectedInvoice && (
                  <>
                    <View
                      style={[
                        styles.receiptStamp,
                        selectedInvoice.payment_status === "paid"
                          ? styles.receiptStampPaid
                          : styles.receiptStampUnpaid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.receiptStampText,
                          {
                            color:
                              selectedInvoice.payment_status === "paid"
                                ? "#10B981"
                                : "#F59E0B",
                          },
                        ]}
                      >
                        {selectedInvoice.payment_status === "paid"
                          ? "PAID"
                          : "UNPAID"}
                      </Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Invoice No.</Text>
                        <Text style={styles.receiptValue}>
                          #{selectedInvoice.id?.slice(0, 8).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Date</Text>
                        <Text style={styles.receiptValue}>
                          {formatDate(
                            selectedInvoice.updated_at ||
                              selectedInvoice.created_at,
                          )}
                        </Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Service</Text>
                        <Text style={styles.receiptValue}>
                          {selectedInvoice.service_title || "IT Service"}
                        </Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Technician</Text>
                        <Text style={styles.receiptValue}>
                          {selectedInvoice.technician
                            ? `${selectedInvoice.technician.first_name} ${selectedInvoice.technician.last_name}`
                            : "—"}
                        </Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Payment Method</Text>
                        <Text style={styles.receiptValue}>
                          {selectedInvoice.payment_method || "Cash"}
                        </Text>
                      </View>

                      <View style={styles.receiptDashedDivider} />

                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptTotalLabel}>
                          Total Amount
                        </Text>
                        <Text style={styles.receiptTotalValue}>
                          ₱
                          {Number(selectedInvoice.estimated_cost || 0).toFixed(
                            2,
                          )}
                        </Text>
                      </View>
                    </ScrollView>

                    <Text style={styles.receiptFootnote}>
                      Thank you for using ITKonek. Keep this receipt for your
                      records.
                    </Text>

                    <TouchableOpacity
                      style={styles.receiptCloseBtn}
                      onPress={() => setSelectedInvoice(null)}
                    >
                      <Text style={styles.receiptCloseBtnText}>Close</Text>
                    </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", marginLeft: 4 },
  subtitle: { fontSize: 12, color: "#9CA3AF", marginLeft: 4, marginTop: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  invoiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  invoiceCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  invoiceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceService: { fontSize: 14, fontWeight: "700", color: "#111827" },
  invoiceDate: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgePaid: { backgroundColor: "#F0FDF4", borderColor: "#10B981" },
  statusBadgeUnpaid: { backgroundColor: "#FFFBEB", borderColor: "#F59E0B" },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  invoiceCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  invoiceAmountLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  invoiceAmount: { fontSize: 17, fontWeight: "800", color: "#111827" },

  /* Receipt Modal */
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.6)",
    justifyContent: "flex-end",
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "85%",
  },
  receiptHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 16,
  },
  receiptBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  receiptBrand: { fontSize: 13, fontWeight: "800", color: "#111827" },
  receiptStamp: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 16,
  },
  receiptStampPaid: { borderColor: "#10B981" },
  receiptStampUnpaid: { borderColor: "#F59E0B" },
  receiptStampText: { fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  receiptLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  receiptValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },
  receiptDashedDivider: {
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderBottomColor: "#D1D5DB",
    marginVertical: 10,
  },
  receiptTotalLabel: { fontSize: 15, fontWeight: "800", color: "#111827" },
  receiptTotalValue: { fontSize: 20, fontWeight: "900", color: "#10B981" },
  receiptFootnote: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
  receiptCloseBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  receiptCloseBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
