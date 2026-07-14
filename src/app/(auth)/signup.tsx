import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function SignupScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedNotRobot, setAgreedNotRobot] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !contactNumber.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Missing info", "Please fill out every field.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (!agreedNotRobot) {
      Alert.alert(
        "Verification required",
        "Please confirm you're not a robot.",
      );
      return;
    }

    setLoading(true);
    try {
      // 1. Save email & password in Firebase Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const fullPhoneNumber = contactNumber.startsWith("+63")
        ? contactNumber.trim()
        : "+63" + contactNumber.trim().replace(/^0/, "");

      // 2. Save complete profile details into Supabase (Automatic role: "customer")
      const { error: dbError } = await supabase.from("profiles").insert([
        {
          id: cred.user.uid,
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: fullPhoneNumber,
          role: "customer", // Automatically sets role as customer
        },
      ]);

      if (dbError) {
        console.error("Supabase profile insert error:", dbError.message);
        Alert.alert("Profile Insert Error", dbError.message);
      } else {
        Alert.alert("Success", "Account created successfully!");
        router.replace("/(customer)/(tabs)/home" as any);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      Alert.alert("Signup failed", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.heading}>Let's get you Started</Text>
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
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                placeholderTextColor="#B0B0B0"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor="#B0B0B0"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

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

          <Text style={styles.label}>Contact Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇵🇭 +63</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="912 233 3421"
              placeholderTextColor="#B0B0B0"
              keyboardType="phone-pad"
              value={contactNumber}
              onChangeText={setContactNumber}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
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

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#B0B0B0"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword((s) => !s)}>
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#8A8A8A"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.captchaCard}
            onPress={() => setAgreedNotRobot((a) => !a)}
            activeOpacity={0.8}
          >
            <View style={styles.captchaRow}>
              <View
                style={[
                  styles.checkbox,
                  agreedNotRobot && styles.checkboxChecked,
                ]}
              >
                {agreedNotRobot && (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.captchaText}>I'm not a robot</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By signing up, you agree to the{" "}
            <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
            <Text style={styles.termsLink}>Data Privacy Agreement</Text>
          </Text>

          <TouchableOpacity
            style={[styles.signupButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signupButtonText}>Sign up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.footerLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  topSection: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 24 },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    marginBottom: 12,
    marginLeft: -8,
  },
  heading: { fontSize: 26, fontWeight: "800", color: "#FFFFFF" },
  cardWrapper: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardContent: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40 },
  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#1A1A1A", marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 18,
    backgroundColor: "#FAFAFA",
  },
  phoneRow: { flexDirection: "row", marginBottom: 18 },
  countryCode: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#FAFAFA",
  },
  countryCodeText: { fontSize: 14, color: "#1A1A1A", fontWeight: "600" },
  phoneInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#1A1A1A",
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
    marginBottom: 18,
    backgroundColor: "#FAFAFA",
  },
  passwordInput: { flex: 1, fontSize: 14, color: "#1A1A1A" },
  captchaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FAFAFA",
    marginBottom: 16,
  },
  captchaRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#CCCCCC",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  captchaText: { fontSize: 13, color: "#1A1A1A", fontWeight: "500" },
  termsText: {
    fontSize: 12,
    color: "#9A9A9A",
    lineHeight: 18,
    marginBottom: 28,
  },
  termsLink: { color: "#1A1A1A", fontWeight: "600" },
  signupButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  signupButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  footerRow: { flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 13, color: "#757575" },
  footerLink: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
});
