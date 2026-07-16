import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type ThreadInfo = {
  id: string;
  is_locked: boolean;
  technician_id: string;
  last_sender_id: string | null;
  customer_last_read_at: string | null;
  technician_last_read_at: string | null;
  technician: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

const GROUP_WINDOW_MS = 60000;
const PRESENCE_CHANNEL_NAME = "presence:app-users";

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export default function CustomerChatThread() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [technicianOnline, setTechnicianOnline] = useState(false);

  useEffect(() => {
    if (!threadId) return;
    fetchThreadInfo();
    fetchMessages();
    const unsubscribeMessages = subscribeToMessages();
    const unsubscribeThread = subscribeToThreadUpdates();
    markThreadAsRead();
    return () => {
      unsubscribeMessages();
      unsubscribeThread();
    };
  }, [threadId]);

  useEffect(() => {
    if (!threadInfo?.technician_id) return;

    const presenceChannel = supabase.channel(PRESENCE_CHANNEL_NAME, {
      config: { presence: { key: auth.currentUser?.uid ?? "anonymous" } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setTechnicianOnline(Boolean(state[threadInfo.technician_id]));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [threadInfo?.technician_id]);

  const fetchThreadInfo = async () => {
    const { data, error } = await supabase
      .from("chat_threads")
      .select(
        "id, is_locked, technician_id, last_sender_id, customer_last_read_at, technician_last_read_at, technician:technician_id(first_name, last_name, avatar_url)",
      )
      .eq("id", threadId)
      .maybeSingle();

    if (error) {
      console.error("[chat-thread] Fetch thread info error:", error.message);
      return;
    }
    setThreadInfo(data as any);
  };

  // Marks this thread as read by the customer. Called on open, and again
  // whenever a new message arrives while the thread is already on screen.
  const markThreadAsRead = async () => {
    const nowIso = new Date().toISOString();
    setThreadInfo((prev) =>
      prev ? { ...prev, customer_last_read_at: nowIso } : prev,
    );
    const { error } = await supabase
      .from("chat_threads")
      .update({ customer_last_read_at: nowIso })
      .eq("id", threadId);
    if (error) {
      console.error("[chat-thread] Mark as read error:", error.message);
    }
  };

  // Keeps threadInfo in sync when the technician's side updates the row —
  // most importantly technician_last_read_at, which drives the "Seen" label.
  const subscribeToThreadUpdates = () => {
    const channel = supabase
      .channel(`thread-updates-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_threads",
          filter: `id=eq.${threadId}`,
        },
        (payload) => {
          setThreadInfo((prev) =>
            prev ? { ...prev, ...(payload.new as any) } : prev,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[chat-thread] Fetch messages error:", error.message);
    }

    setMessages(data || []);
    setLoading(false);
  };

  const mergeIncomingMessage = (incoming: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;

      const tempIndex = prev.findIndex(
        (m) =>
          m.id.startsWith("temp-") &&
          m.sender_id === incoming.sender_id &&
          m.message === incoming.message,
      );

      if (tempIndex !== -1) {
        const next = [...prev];
        next[tempIndex] = incoming;
        return next;
      }

      return [incoming, ...prev];
    });
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          mergeIncomingMessage(incoming);
          if (incoming.sender_id !== auth.currentUser?.uid) {
            markThreadAsRead();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending || threadInfo?.is_locked) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      thread_id: threadId as string,
      sender_id: auth.currentUser?.uid ?? "",
      message: trimmed,
      created_at: new Date().toISOString(),
    };

    // Show it immediately — don't wait for the network round trip.
    setMessages((prev) => [optimisticMessage, ...prev]);
    setInputText("");
    setSending(true);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        sender_id: auth.currentUser?.uid,
        message: trimmed,
      })
      .select()
      .single();

    if (error) {
      console.error("[chat-thread] Send message error:", error.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(trimmed);
      setSending(false);
      return;
    }

    mergeIncomingMessage(data as Message);

    await supabase
      .from("chat_threads")
      .update({
        last_message: trimmed,
        last_sender_id: auth.currentUser?.uid,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    setSending(false);
  };

  const latestMessage = messages[0];
  const showSeen =
    Boolean(latestMessage) &&
    !latestMessage.id.startsWith("temp-") &&
    latestMessage.sender_id === auth.currentUser?.uid &&
    Boolean(threadInfo?.technician_last_read_at) &&
    new Date(threadInfo!.technician_last_read_at!).getTime() >=
      new Date(latestMessage.created_at).getTime();

  const technicianName = threadInfo?.technician
    ? `${threadInfo.technician.first_name ?? ""} ${threadInfo.technician.last_name ?? ""}`.trim()
    : "";
  const displayName = technicianName || "Technician";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)/(tabs)/chat")}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerAvatarWrap}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials || "?"}</Text>
          </View>
          {technicianOnline && !threadInfo?.is_locked && (
            <View style={styles.onlineRing} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>
            {displayName}
          </Text>
          {threadInfo?.is_locked ? (
            <Text style={styles.headerSubtitle}>Read-only · job completed</Text>
          ) : (
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  technicianOnline
                    ? styles.statusDotOnline
                    : styles.statusDotOffline,
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  technicianOnline && styles.statusPillTextOnline,
                ]}
              >
                {technicianOnline ? "Active now" : "Offline"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {threadInfo?.is_locked && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={13} color="#92400E" />
          <Text style={styles.lockedBannerText}>
            This job is complete, so this conversation is now read-only.
          </Text>
        </View>
      )}

      {/* Messages */}
      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#1A1A1A" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centerFill}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={36}
            color="#D1D5DB"
          />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>
            Say hello to {displayName.split(" ")[0]} to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            showSeen ? (
              <View style={styles.seenWrap}>
                <Ionicons name="checkmark-done" size={13} color="#2F6FED" />
                <Text style={styles.seenText}>Seen</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isMe = item.sender_id === auth.currentUser?.uid;
            const isPending = item.id.startsWith("temp-");
            const nextItem = messages[index + 1];
            const showDayLabel =
              !nextItem ||
              formatDayLabel(nextItem.created_at) !==
                formatDayLabel(item.created_at);

            const prevItem = messages[index - 1];
            const isGroupedWithPrev = Boolean(
              prevItem &&
              prevItem.sender_id === item.sender_id &&
              Math.abs(
                new Date(prevItem.created_at).getTime() -
                  new Date(item.created_at).getTime(),
              ) < GROUP_WINDOW_MS,
            );

            return (
              <View>
                <View
                  style={[
                    styles.bubbleRow,
                    isMe ? styles.bubbleRowMe : styles.bubbleRowThem,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isMe ? styles.sent : styles.received,
                      isGroupedWithPrev &&
                        (isMe ? styles.sentGrouped : styles.receivedGrouped),
                      isPending && styles.bubblePending,
                    ]}
                  >
                    <Text style={isMe ? styles.sentText : styles.receivedText}>
                      {item.message}
                    </Text>
                  </View>
                </View>
                {!isGroupedWithPrev && (
                  <Text
                    style={[
                      styles.timeLabel,
                      isMe ? styles.timeLabelMe : styles.timeLabelThem,
                    ]}
                  >
                    {isPending
                      ? "Sending..."
                      : formatMessageTime(item.created_at)}
                  </Text>
                )}
                {showDayLabel && (
                  <View style={styles.dayLabelWrap}>
                    <Text style={styles.dayLabelText}>
                      {formatDayLabel(item.created_at)}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        style={{ width: "100%" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {threadInfo?.is_locked ? (
          <View style={styles.lockedInputBar}>
            <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
            <Text style={styles.lockedInputText}>Conversation closed</Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message your technician..."
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim()}
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
    gap: 10,
  },
  backButton: { padding: 4 },
  headerAvatarWrap: { position: "relative" },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  onlineRing: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  headerSubtitle: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotOnline: { backgroundColor: "#22C55E" },
  statusDotOffline: { backgroundColor: "#D1D5DB" },
  statusPillText: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  statusPillTextOnline: { color: "#16A34A" },

  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#FDE68A",
  },
  lockedBannerText: { fontSize: 11, color: "#92400E", flex: 1 },

  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginTop: 4,
  },
  emptySubtitle: { fontSize: 12, color: "#9CA3AF", textAlign: "center" },

  list: { padding: 16, paddingBottom: 8 },

  seenWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginRight: 4,
    marginBottom: 10,
  },
  seenText: { fontSize: 10.5, color: "#2F6FED", fontWeight: "700" },


  dayLabelWrap: { alignItems: "center", marginVertical: 14 },
  dayLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  bubbleRow: { flexDirection: "row", marginBottom: 2 },
  bubbleRowMe: { justifyContent: "flex-end" },
  bubbleRowThem: { justifyContent: "flex-start" },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: "78%",
  },
  bubblePending: { opacity: 0.6 },
  sent: { backgroundColor: "#111827", borderBottomRightRadius: 4 },
  received: { backgroundColor: "#F3F4F6", borderBottomLeftRadius: 4 },
  sentGrouped: { borderBottomRightRadius: 20, borderTopRightRadius: 4 },
  receivedGrouped: { borderBottomLeftRadius: 20, borderTopLeftRadius: 4 },

  sentText: { color: "#fff", fontSize: 14, lineHeight: 19 },
  receivedText: { color: "#111827", fontSize: 14, lineHeight: 19 },

  timeLabel: { fontSize: 9, color: "#B0B0B0", marginTop: 4, marginBottom: 10 },
  timeLabelMe: { alignSelf: "flex-end", marginRight: 4 },
  timeLabelThem: { alignSelf: "flex-start", marginLeft: 4 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    borderTopWidth: 1,
    borderColor: "#F0F0F0",
    gap: 10,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#111827",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { backgroundColor: "#D1D5DB" },

  lockedInputBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
  },
  lockedInputText: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
});
