import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

export default function ChatThreadScreen() {
  const router = useRouter();
  // We expect threadId, customerName, and customerAvatar from the navigation params
  const { threadId, customerName } = useLocalSearchParams<{
    threadId: string;
    customerName: string;
  }>();

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
  }, [threadId]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false });
    setMessages(data ?? []);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => setMessages((prev) => [payload.new, ...prev]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const onSend = async () => {
    if (!newMessage.trim()) return;
    const { error } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: auth.currentUser?.uid,
      content: newMessage,
    });
    if (!error) setNewMessage("");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* PROFESSIONAL PROFILE HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {customerName?.charAt(0) || "U"}
            </Text>
          </View>
          <View>
            <Text style={styles.customerName}>
              {customerName || "Customer"}
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.dot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isMe = item.sender_id === auth.currentUser?.uid;
          return (
            <View
              style={[
                styles.bubble,
                isMe ? styles.bubbleMe : styles.bubbleOther,
              ]}
            >
              <Text style={isMe ? styles.textMe : styles.textOther}>
                {item.content}
              </Text>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={newMessage}
            onChangeText={setNewMessage}
          />
          <TouchableOpacity onPress={onSend} style={styles.sendBtn}>
            <Ionicons name="arrow-up" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  backBtn: { marginRight: 10 },
  profileInfo: { flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "bold" },
  customerName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 5,
  },
  statusText: { color: "#666", fontSize: 12 },
  messageList: { padding: 16 },
  bubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: "80%" },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: "#fff" },
  bubbleOther: { alignSelf: "flex-start", backgroundColor: "#1a1a1a" },
  textMe: { color: "#000" },
  textOther: { color: "#fff" },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#000",
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 25,
    paddingHorizontal: 20,
    color: "#fff",
    height: 50,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: "#fff",
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
});
