import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword, User } from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";
import { supabase } from "../../config/supabase";

// Shared by email/password, Google, and Facebook logins — makes sure a
// Supabase profile exists (creating one on first social sign-in), then
// routes to the correct app experience based on role.
async function completeLogin(user: User, router: ReturnType<typeof useRouter>) {
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.uid)
    .maybeSingle();

  if (fetchError) {
    console.error("Profile lookup error:", fetchError);
    Alert.alert("Something went wrong", "Please try again.");
    return;
  }

  let role = existing?.role;

  if (!existing) {
    const nameParts = (user.displayName ?? "").trim().split(" ");
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.uid,
      first_name: nameParts[0] || "New",
      last_name: nameParts.slice(1).join(" ") || "User",
      email: user.email ?? "",
      role: "customer",
    });

    if (insertError) {
      console.error("Profile creation error:", insertError);
      Alert.alert("Something went wrong", "Please try again.");
      return;
    }
    role = "customer";
  }

  if (role === "technician") {
    router.replace("/(technician)/(tabs)/home" as any);
  } else {
    router.replace("/(customer)/(tabs)/home" as any);
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleComingSoon = (provider: string) => {
    Alert.alert(
      `${provider} sign-in`,
      "This needs a Development Build to work (Expo Go can't handle the login redirect). Coming soon.",
    );
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await completeLogin(cred.user, router);
    } catch (err: any) {
      console.error("Login error:", err);
      Alert.alert(
        "Login failed",
        "Check your email and password and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Password reset flow coming soon.");
  };

  const isBusy = loading;

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.logoBox}>
          <Image
            source={require("../../assets/Logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heading}>Log in to your Account</Text>
        <Text style={styles.subheading}>All IT services in one place</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.cardWrapper}
      >
        <ScrollView
          style={styles.card}
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Example@itkonek.com"
            placeholderTextColor="#B0B0B0"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••"
              placeholderTextColor="#B0B0B0"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#8A8A8A"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe((r) => !r)}
            >
              <View
                style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
              >
                {rememberMe && (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isBusy && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isBusy}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Log in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleComingSoon("Google")}
            >
              <Ionicons name="logo-google" size={20} color="#C4C4C4" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleComingSoon("Apple")}
            >
              <Ionicons name="logo-apple" size={22} color="#C4C4C4" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleComingSoon("Facebook")}
            >
              <Ionicons name="logo-facebook" size={20} color="#C4C4C4" />
            </TouchableOpacity>
          </View>
          <Text style={styles.socialNote}>
            Social login is coming soon — email/password works today.
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  topSection: { paddingTop: 70, paddingHorizontal: 28, paddingBottom: 28 },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2E2E2E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    padding: 12,
  },
  logoImage: { width: "100%", height: "100%", tintColor: "#FFFFFF" },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  subheading: { fontSize: 13, color: "#9A9A9A" },
  cardWrapper: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardContent: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: "600", color: "#1A1A1A", marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },
  passwordInput: { flex: 1, fontSize: 14, color: "#1A1A1A" },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  rememberRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#CCCCCC",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  rememberText: { fontSize: 13, color: "#4A4A4A" },
  forgotText: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  loginButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E5E5" },
  dividerText: { fontSize: 12, color: "#9A9A9A", marginHorizontal: 12 },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  footerRow: { flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 13, color: "#757575" },
  footerLink: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  socialNote: {
    fontSize: 11,
    color: "#B0B0B0",
    textAlign: "center",
    marginTop: -22,
    marginBottom: 24,
  },
});
