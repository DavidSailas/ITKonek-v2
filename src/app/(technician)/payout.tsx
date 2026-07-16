import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

type PayoutInfo = {
  default_payment_method: string | null;
  default_card_last4: string | null;
  default_card_payment_method: string | null;
};

const METHOD_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  card: "card-outline",
  bank: "business-outline",
  wallet: "wallet-outline",
};

export default function PayoutScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payout, setPayout] = useState<PayoutInfo | null>(null);

  useEffect(() => {
    fetchPayout();
  }, []);

  const fetchPayout = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // Note: adjust the column name below if your `default_card_payment_m...`
      // column is named differently in Supabase (it was truncated in the
      // schema view) — this assumes `default_card_payment_method`.
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "default_payment_method, default_card_last4, default_card_payment_method",
        )
        .eq("id", uid)
        .single();

      if (error) throw error;
      setPayout(data);
    } catch (err) {
      Alert.alert("Error", "Could not load your payout method.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = () => {
    Alert.alert(
      "Add Payout Method",
      "Hook this up to your payments provider (e.g. Stripe Connect / GCash / bank transfer flow).",
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#FFF" />
        </View>
      </SafeAreaView>
    );
  }

  const hasMethod = !!payout?.default_payment_method;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(technician)/(tabs)/settings")}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Method</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {hasMethod ? (
          <View style={styles.methodCard}>
            <View style={styles.methodIconWrap}>
              <Ionicons
                name={
                  METHOD_ICON[payout?.default_payment_method ?? ""] ??
                  "card-outline"
                }
                size={22}
                color="#3B82F6"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodTitle}>
                {payout?.default_card_payment_method ??
                  payout?.default_payment_method}
              </Text>
              {payout?.default_card_last4 && (
                <Text style={styles.methodSubtitle}>
                  •••• {payout.default_card_last4}
                </Text>
              )}
            </View>
            <View style={styles.defaultPill}>
              <Text style={styles.defaultPillText}>Default</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={28} color="#555" />
            <Text style={styles.emptyTitle}>No payout method yet</Text>
            <Text style={styles.emptySubtitle}>
              Add a bank account or card to start receiving payouts.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.addBtn} onPress={handleAddMethod}>
          <Ionicons name="add-circle-outline" size={18} color="#3B82F6" />
          <Text style={styles.addBtnText}>
            {hasMethod ? "Change payout method" : "Add payout method"}
          </Text>
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color="#888" />
          <Text style={styles.noteText}>
            Payouts are processed weekly. Updating your method here does not
            affect payouts already in progress.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 60 },

  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  methodTitle: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  methodSubtitle: { color: "#888", fontSize: 12, marginTop: 2 },
  defaultPill: {
    backgroundColor: "#0F2A14",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  defaultPillText: { color: "#22C55E", fontSize: 11, fontWeight: "700" },

  emptyCard: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: { color: "#FFF", fontSize: 14, fontWeight: "700", marginTop: 10 },
  emptySubtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
  },
  addBtnText: { color: "#3B82F6", fontSize: 14, fontWeight: "600" },

  noteBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 14,
    alignItems: "flex-start",
  },
  noteText: { color: "#888", fontSize: 12, flex: 1, lineHeight: 18 },
});
