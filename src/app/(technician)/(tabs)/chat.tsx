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

export default function TechChatScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchThreads();
    }, []),
  );

  // Live updates while this screen is open: newly accepted jobs open a
  // fresh thread instantly, and new client messages update the preview
  // without needing to leave and come back to this tab.
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
        <Text style={styles.title}>Messages</Text>
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
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.threadName}>
                  {thread.customer?.first_name} {thread.customer?.last_name}
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
          ))
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
  title: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
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
  threadName: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
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
