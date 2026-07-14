import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../../config/firebase";
import { supabase } from "../../../config/supabase";

export default function ChatScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Refetch every time the tab is focused so a newly-unlocked or
  // newly-created thread (from accepting/re-booking) shows up right away.
  useFocusEffect(
    useCallback(() => {
      fetchThreads();
    }, []),
  );

  // Live updates while this screen is open: a technician accepting a job,
  // sending a message, or a job completing (locking the thread) all show
  // up instantly without needing to leave and come back to this tab.
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const channel = supabase
      .channel(`customer-chat-threads-realtime-${user.uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_threads",
          filter: `customer_id=eq.${user.uid}`,
        },
        () => {
          fetchThreads();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchThreads = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // A thread exists per customer/technician pair and is reused across
    // bookings. `is_locked` is true once the linked job is completed &
    // paid, and flips back to false the moment the technician accepts a
    // new booking from this same customer.
    const { data, error } = await supabase
      .from("chat_threads")
      .select("*, technician:technician_id(first_name, last_name, avatar_url)")
      .eq("customer_id", user.uid)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Fetch chat threads error:", error.message);
      setFetchError(error.message);
    } else {
      setFetchError(null);
    }

    setThreads(data ?? []);
    setLoading(false);
  };

  const openThread = (thread: any) => {
    if (thread.is_locked) {
      Alert.alert(
        "Conversation closed",
        "This job is complete, so this chat is now read-only. Book this technician again to reopen it.",
      );
      return;
    }
    router.push({
      pathname: "/(customer)/chat-thread",
      params: { threadId: thread.id },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.emptyText}>Loading conversations...</Text>
        ) : fetchError ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.emptyTitle}>Couldn't load conversations</Text>
            <Text style={styles.emptyText}>{fetchError}</Text>
          </View>
        ) : threads.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={40}
              color="#D1D5DB"
            />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>
              A chat opens automatically once a technician accepts your job.
            </Text>
          </View>
        ) : (
          threads.map((thread) => (
            <TouchableOpacity
              key={thread.id}
              style={[
                styles.threadCard,
                thread.is_locked && styles.threadCardLocked,
              ]}
              activeOpacity={0.7}
              onPress={() => openThread(thread)}
            >
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color="#1A1A1A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.threadName}>
                  {thread.technician?.first_name} {thread.technician?.last_name}
                </Text>
                <Text
                  style={[
                    styles.threadPreview,
                    thread.is_locked && styles.threadPreviewLocked,
                  ]}
                  numberOfLines={1}
                >
                  {thread.is_locked
                    ? "Conversation closed · job completed"
                    : thread.last_message ?? "Tap to open conversation"}
                </Text>
              </View>
              {thread.is_locked ? (
                <View style={styles.lockBadge}>
                  <Ionicons
                    name="lock-closed"
                    size={11}
                    color="#9CA3AF"
                  />
                  <Text style={styles.lockBadgeText}>Closed</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  threadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  threadCardLocked: { backgroundColor: "#FAFAFA", borderColor: "#EFEFEF" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  threadName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  threadPreview: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  threadPreviewLocked: { fontStyle: "italic" },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  lockBadgeText: { fontSize: 10, fontWeight: "700", color: "#9CA3AF" },
});
