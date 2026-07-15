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
  customer_id: string;
  customer: {
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

export default function ChatThreadScreen() {
  const router = useRouter();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [customerOnline, setCustomerOnline] = useState(false);

  useEffect(() => {
    if (!threadId) return;
    fetchThreadInfo();
    fetchMessages();
    const unsubscribe = subscribeToMessages();
    return unsubscribe;
  }, [threadId]);

  // Presence: requires the customer app to also track presence on this
  // exact channel name (already wired on the customer side).
  useEffect(() => {
    if (!threadInfo?.customer_id) return;

    const presenceChannel = supabase.channel(PRESENCE_CHANNEL_NAME, {
      config: { presence: { key: auth.currentUser?.uid ?? "anonymous" } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setCustomerOnline(Boolean(state[threadInfo.customer_id]));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [threadInfo?.customer_id]);

  const fetchThreadInfo = async () => {
    const { data, error } = await supabase
      .from("chat_threads")
      .select(
        "id, is_locked, customer_id, customer:customer_id(first_name, last_name, avatar_url)",
      )
      .eq("id", threadId)
      .maybeSingle();

    if (error) {
      console.error(
        "[tech chat-thread] Fetch thread info error:",
        error.message,
      );
      return;
    }
    setThreadInfo(data as any);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[tech chat-thread] Fetch messages error:", error.message);
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
          mergeIncomingMessage(payload.new as Message);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const onSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || threadInfo?.is_locked) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      thread_id: threadId as string,
      sender_id: auth.currentUser?.uid ?? "",
      message: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [optimisticMessage, ...prev]);
    setInputText("");

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
      console.error("[tech chat-thread] Send message error:", error.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(trimmed);
      return;
    }

    mergeIncomingMessage(data as Message);

    await supabase
      .from("chat_threads")
      .update({
        last_message: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);
  };

  const customerName = threadInfo?.customer
    ? `${threadInfo.customer.first_name ?? ""} ${threadInfo.customer.last_name ?? ""}`.trim()
    : "";
  const displayName = customerName || "Customer";
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
          onPress={() => router.push("/(technician)/(tabs)/chat")}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.avatarWrap}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initials || "?"}</Text>
          </View>
          {customerOnline && !threadInfo?.is_locked && (
            <View style={styles.onlineRing} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.customerName} numberOfLines={1}>
            {displayName}
          </Text>
          {threadInfo?.is_locked ? (
            <Text style={styles.closedSubtitle}>Read-only · job completed</Text>
          ) : (
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.dot,
                  customerOnline ? styles.dotOnline : styles.dotOffline,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  customerOnline && styles.statusTextOnline,
                ]}
              >
                {customerOnline ? "Active now" : "Offline"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {threadInfo?.is_locked && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={13} color="#D4A017" />
          <Text style={styles.lockedBannerText}>
            This job is complete, so this conversation is now read-only.
          </Text>
        </View>
      )}

      {/* Messages */}
      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centerFill}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={36}
            color="#333333"
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
          contentContainerStyle={styles.messageList}
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
                      isMe ? styles.bubbleMe : styles.bubbleOther,
                      isGroupedWithPrev &&
                        (isMe
                          ? styles.bubbleMeGrouped
                          : styles.bubbleOtherGrouped),
                      isPending && styles.bubblePending,
                    ]}
                  >
                    <Text style={isMe ? styles.textMe : styles.textOther}>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {threadInfo?.is_locked ? (
          <View style={styles.lockedInputBar}>
            <Ionicons name="lock-closed" size={14} color="#666666" />
            <Text style={styles.lockedInputText}>Conversation closed</Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity
              onPress={onSend}
              disabled={!inputText.trim()}
              style={[
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
              ]}
            >
              <Ionicons name="arrow-up" size={20} color="#000" />
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
    backgroundColor: "#000",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  backBtn: { marginRight: 2 },
  avatarWrap: { position: "relative" },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  onlineRing: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#000",
  },
  customerName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  closedSubtitle: { color: "#888888", fontSize: 11, marginTop: 2 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOnline: { backgroundColor: "#22c55e" },
  dotOffline: { backgroundColor: "#444444" },
  statusText: { color: "#666", fontSize: 12 },
  statusTextOnline: { color: "#4ADE80" },

  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1F1A0A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#3A2E10",
  },
  lockedBannerText: { fontSize: 11, color: "#D4A017", flex: 1 },

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
    color: "#FFFFFF",
    marginTop: 4,
  },
  emptySubtitle: { fontSize: 12, color: "#666666", textAlign: "center" },

  messageList: { padding: 16, paddingBottom: 8 },

  dayLabelWrap: { alignItems: "center", marginVertical: 14 },
  dayLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#888888",
    backgroundColor: "#161616",
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
    borderRadius: 18,
    maxWidth: "80%",
  },
  bubblePending: { opacity: 0.6 },
  bubbleMe: { backgroundColor: "#fff", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#1a1a1a", borderBottomLeftRadius: 4 },
  bubbleMeGrouped: { borderBottomRightRadius: 18, borderTopRightRadius: 4 },
  bubbleOtherGrouped: { borderBottomLeftRadius: 18, borderTopLeftRadius: 4 },

  textMe: { color: "#000", fontSize: 14, lineHeight: 19 },
  textOther: { color: "#fff", fontSize: 14, lineHeight: 19 },

  timeLabel: { fontSize: 9, color: "#555555", marginTop: 4, marginBottom: 10 },
  timeLabelMe: { alignSelf: "flex-end", marginRight: 4 },
  timeLabelThem: { alignSelf: "flex-start", marginLeft: 4 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 15,
    gap: 10,
    backgroundColor: "#000",
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#fff",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#333333" },

  lockedInputBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: "#1a1a1a",
    backgroundColor: "#050505",
  },
  lockedInputText: { fontSize: 12, color: "#666666", fontWeight: "600" },
});
