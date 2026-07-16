import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

// NOTE: This assumes a `transactions` table with the columns below.
// It wasn't part of the schema you shared, so adjust the table/column
// names to match your actual Supabase schema.
type Transaction = {
  id: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  description: string | null;
  created_at: string;
};

const STATUS_COLOR: Record<Transaction["status"], string> = {
  paid: "#22C55E",
  pending: "#EAB308",
  failed: "#EF4444",
};

export default function TransactionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, status, description, created_at")
        .eq("technician_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data ?? []);
    } catch (err) {
      Alert.alert(
        "Error",
        "Could not load transaction history. Confirm your `transactions` table exists.",
      );
    } finally {
      setLoading(false);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(technician)/(tabs)/settings")}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={28} color="#555" />
            <Text style={styles.emptyText}>No transactions yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="cash-outline" size={18} color="#CCC" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {item.description ?? "Job payout"}
              </Text>
              <Text style={styles.rowDate}>
                {new Date(item.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.rowAmount}>
                ₱{item.amount.toLocaleString()}
              </Text>
              <Text
                style={[styles.rowStatus, { color: STATUS_COLOR[item.status] }]}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
      />
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
  content: { padding: 20, paddingBottom: 60, flexGrow: 1 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    padding: 14,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowLabel: { color: "#EEE", fontSize: 14, fontWeight: "600" },
  rowDate: { color: "#777", fontSize: 11, marginTop: 2 },
  rowAmount: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  rowStatus: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  divider: { height: 10 },

  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#555", fontSize: 13, marginTop: 10 },
});
