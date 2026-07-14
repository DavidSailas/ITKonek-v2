import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React from "react";
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth } from "../../../config/firebase";

export default function TechSettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/tech-login" as any);
    } catch (err: any) {
      Alert.alert("Logout Error", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Technician Settings</Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  content: { padding: 20, paddingTop: 40 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "800", marginBottom: 30 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1A1414",
    borderWidth: 1,
    borderColor: "#451A1A",
    padding: 16,
    borderRadius: 12,
  },
  logoutText: { color: "#EF4444", fontSize: 14, fontWeight: "700" },
});
