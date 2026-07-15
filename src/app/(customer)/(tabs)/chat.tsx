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

const PRESENCE_CHANNEL_NAME = "presence:app-users";

function formatRelativeTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      fetchThreads();
    }, []),
  );

  // Presence: tracks which technician_ids currently have their app open.
  // Requires matching presence-tracking code on the technician side, using
  // the same channel name.
  useEffect(() => {
    const presenceChannel = supabase.channel(PRESENCE_CHANNEL_NAME, {
      config: { presence: { key: auth.currentUser?.uid ?? "anonymous" } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const threadsChannel = supabase
      .channel(`customer-chat-threads-realtime-${user.uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_threads",
          filter: `customer_id=eq.${user.uid}`,
        },
        () => fetchThreads(),
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel(`customer-bookings-realtime-${user.uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${user.uid}`,
        },
        () => fetchThreads(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(threadsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, []);

  const ACTIVE_BOOKING_STATUSES = ["accepted"];

  const ensureThreadsForAcceptedBookings = async (
    userId: string,
    existingTechnicianIds: Set<string>,
  ) => {
    const { data: acceptedBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("technician_id, status")
      .eq("customer_id", userId)
      .not("technician_id", "is", null)
      .in("status", ACTIVE_BOOKING_STATUSES);

    if (bookingsError) {
      console.error(
        "[chat] Failed to read accepted bookings:",
        bookingsError.message,
      );
      return;
    }

    const missingTechnicianIds = [
      ...new Set(
        (acceptedBookings ?? [])
          .map((b) => b.technician_id as string)
          .filter((techId) => !existingTechnicianIds.has(techId)),
      ),
    ];

    if (missingTechnicianIds.length === 0) return;

    const { error } = await supabase.from("chat_threads").upsert(
      missingTechnicianIds.map((technicianId) => ({
        customer_id: userId,
        technician_id: technicianId,
        is_locked: false,
      })),
      { onConflict: "customer_id,technician_id", ignoreDuplicates: true },
    );

    if (error) {
      console.error("[chat] Failed to create thread(s):", error.message);
    }
  };

  const fetchThreads = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("chat_threads")
      .select("technician_id")
      .eq("customer_id", user.uid);

    const existingTechnicianIds = new Set(
      (existing ?? []).map((t) => t.technician_id as string),
    );

    await ensureThreadsForAcceptedBookings(user.uid, existingTechnicianIds);

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
        {threads.length > 0 && (
          <Text style={styles.headerCount}>{threads.length}</Text>
        )}
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
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={32}
                color="#9CA3AF"
              />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>
              A chat opens automatically once a technician accepts your job.
            </Text>
          </View>
        ) : (
          threads.map((thread) => {
            const name =
              `${thread.technician?.first_name ?? ""} ${thread.technician?.last_name ?? ""}`.trim() ||
              "Technician";
            const initials = name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((n: string) => n[0]?.toUpperCase())
              .join("");
            const isOnline = onlineIds.has(thread.technician_id);

            return (
              <TouchableOpacity
                key={thread.id}
                style={[
                  styles.threadCard,
                  thread.is_locked && styles.threadCardLocked,
                ]}
                activeOpacity={0.7}
                onPress={() => openThread(thread)}
              >
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials || "?"}</Text>
                  </View>
                  {isOnline && !thread.is_locked && (
                    <View style={styles.onlineDot} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.threadTopRow}>
                    <Text style={styles.threadName} numberOfLines={1}>
                      {name}
                    </Text>
                    {!thread.is_locked && thread.updated_at && (
                      <Text style={styles.threadTime}>
                        {formatRelativeTime(thread.updated_at)}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.threadPreview,
                      thread.is_locked && styles.threadPreviewLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {thread.is_locked
                      ? "Conversation closed · job completed"
                      : (thread.last_message ?? "Tap to open conversation")}
                  </Text>
                </View>
                {thread.is_locked ? (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#9CA3AF" />
                    <Text style={styles.lockBadgeText}>Closed</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                )}
              </TouchableOpacity>
            );
          })
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  headerCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 6 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
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
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  threadCardLocked: { backgroundColor: "#FAFAFA", borderColor: "#EFEFEF" },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#F9FAFB",
  },
  threadTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  threadName: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 },
  threadTime: { fontSize: 10, color: "#9CA3AF", marginLeft: 8 },
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
