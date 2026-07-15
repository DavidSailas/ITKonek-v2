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

export default function TechChatScreen() {
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

    const channel = supabase
      .channel(`tech-chat-threads-realtime-${user.uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_threads",
          filter: `technician_id=eq.${user.uid}`,
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

    const { data, error } = await supabase
      .from("chat_threads")
      .select("*, customer:customer_id(first_name, last_name, avatar_url)")
      .eq("technician_id", user.uid)
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
        "This job is complete, so this chat is now read-only. It'll reopen automatically if this client books you again.",
      );
      return;
    }
    router.push({
      pathname: "/(technician)/chat-thread",
      params: { threadId: thread.id },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>Messages</Text>
          {threads.length > 0 && (
            <Text style={styles.headerCount}>{threads.length}</Text>
          )}
        </View>
        <Text style={styles.headerSub}>Direct client communication</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.emptyText}>Loading conversations...</Text>
        ) : fetchError ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
            <Text style={styles.emptyTitle}>Couldn't load conversations</Text>
            <Text style={styles.emptyText}>{fetchError}</Text>
          </View>
        ) : threads.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={44}
              color="#333333"
            />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>
              A chat opens automatically once you accept a client's job.
            </Text>
          </View>
        ) : (
          threads.map((thread) => {
            const name =
              `${thread.customer?.first_name ?? ""} ${thread.customer?.last_name ?? ""}`.trim() ||
              "Customer";
            const initials = name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((n: string) => n[0]?.toUpperCase())
              .join("");
            const isOnline = onlineIds.has(thread.customer_id);

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
                    <Ionicons name="lock-closed" size={11} color="#888888" />
                    <Text style={styles.lockBadgeText}>Closed</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#555555" />
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
    backgroundColor: "#0A0A0A",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  headerTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  headerCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#AAAAAA",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerSub: { fontSize: 12, color: "#888888", marginTop: 2 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  emptyText: { fontSize: 12, color: "#666666", textAlign: "center" },
  threadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 12,
  },
  threadCardLocked: { backgroundColor: "#0F0F0F", borderColor: "#1A1A1A" },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#333333",
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
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#0A0A0A",
  },
  threadTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  threadName: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", flex: 1 },
  threadTime: { fontSize: 10, color: "#666666", marginLeft: 8 },
  threadPreview: { fontSize: 12, color: "#888888", marginTop: 2 },
  threadPreviewLocked: { fontStyle: "italic" },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  lockBadgeText: { fontSize: 10, fontWeight: "700", color: "#888888" },
});
