import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

export default function TechLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTechLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const uid = userCredential.user.uid;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;

      if (!profile || profile.role !== "technician") {
        Alert.alert(
          "Access Denied",
          "This account is not registered as a Technician.",
        );
        return;
      }

      router.replace("/(technician)/(tabs)/home" as any);
    } catch (error: any) {
      console.error("Login Error:", error);
      Alert.alert(
        "Login Failed",
        error.message || "Invalid credentials or account mismatch.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* Header with notch padding */}
          <View
            style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}
          >
            <View style={styles.brandRow}>
              <Text style={styles.brandName}>ITKONEK</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>

            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>DISPATCH ONLINE</Text>
            </View>
          </View>

          {/* Centered Scroll Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContainer}>
              {/* Hero Branding Section */}
              <View style={styles.heroSection}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="construct-outline"
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.mainTitle}>Technician Portal</Text>
                <Text style={styles.subTitle}>
                  Sign in to manage field service dispatches, customer requests,
                  and job active status.
                </Text>
              </View>

              {/* Login Form Card */}
              <View style={styles.formCard}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="mail-outline" size={18} color="#777777" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="tech@itkonek.ph"
                      placeholderTextColor="#555555"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.inputBox}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#777777"
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="••••••••••••"
                      placeholderTextColor="#555555"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color="#777777"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleTechLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>
                        Sign In to Portal
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#000000"
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#0A0A0A",
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  proBadge: {
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#333333",
  },
  proBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#121212",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  statusText: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexGrow: 1, // Ensures content takes full screen height for perfect vertical centering
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  formContainer: {
    width: "100%",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#282828",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  formCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CCCCCC",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  submitBtnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
  },
});
