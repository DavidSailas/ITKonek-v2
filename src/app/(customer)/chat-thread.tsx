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

export default function CustomerChatThread() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    if (!threadId) return;
    fetchMessages();
    subscribeToMessages();
  }, [threadId]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false });

    setMessages(data || []);
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
        (payload) => {
          setMessages((prev) => [payload.new, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const { error } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: auth.currentUser?.uid,
      content: inputText.trim(),
    });

    if (!error) setInputText("");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Technician Chat</Text>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isMe = item.sender_id === auth.currentUser?.uid;
          return (
            <View style={[styles.bubble, isMe ? styles.sent : styles.received]}>
              <Text style={isMe ? styles.sentText : styles.receivedText}>
                {item.content}
              </Text>
            </View>
          );
        }}
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", marginLeft: 15 },
  list: { padding: 20 },
  bubble: { padding: 12, borderRadius: 18, marginBottom: 10, maxWidth: "80%" },
  sent: { alignSelf: "flex-end", backgroundColor: "#111" },
  received: { alignSelf: "flex-start", backgroundColor: "#f3f4f6" },
  sentText: { color: "#fff" },
  receivedText: { color: "#111" },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  input: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 25,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#111",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});
