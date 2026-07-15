import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
};

const ACCOUNT_ITEMS: MenuItem[] = [
  {
    icon: "person-outline",
    label: "Personal information",
    route: "/(customer)/personal-information",
  },
  {
    icon: "location-outline",
    label: "Location",
    route: "/(customer)/location",
  },
  {
    icon: "lock-closed-outline",
    label: "Password & Security",
    route: "/(customer)/password-security",
  },
];

const PREFERENCE_ITEMS: MenuItem[] = [
  {
    icon: "notifications-outline",
    label: "Notifications",
    route: "/(customer)/notification",
  },
];

const LEGAL_ITEMS: MenuItem[] = [
  {
    icon: "document-text-outline",
    label: "Terms of Service",
    route: "/(customer)/terms",
  },
  {
    icon: "shield-checkmark-outline",
    label: "Privacy Policy",
    route: "/(customer)/privacy",
  },
];

const FEEDBACK_ITEMS: MenuItem[] = [
  {
    icon: "chatbubble-ellipses-outline",
    label: "Send Feedback",
    route: "/(customer)/feedback",
  },
  { icon: "star-outline", label: "Rate ITKonek", route: "/(customer)/rate" },
];

const SUPPORT_ITEMS: MenuItem[] = [
  { icon: "help-circle-outline", label: "Help", route: "/(customer)/help" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, avatar_url")
      .eq("id", user.uid)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const handleEditProfilePhoto = () => {
    Alert.alert(
      "Profile Photo",
      "Choose an option to update your profile photo:",
      [
        { text: "Choose from Library", onPress: pickAndUploadImage },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const pickAndUploadImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await uploadAvatar(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const uploadAvatar = async (base64Data: string, fileUri: string) => {
    const user = auth.currentUser;
    if (!user) return;
    setUploading(true);
    try {
      const fileName = `${user.uid}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, decode(base64Data), {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.uid);
      setProfile((prev: any) => ({ ...prev, avatar_url: data.publicUrl }));
      Alert.alert("Success", "Profile photo updated!");
    } catch (err) {
      Alert.alert("Error", "Failed to update photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  };

  const renderGroup = (title: string, items: MenuItem[]) => (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.row, i < items.length - 1 && styles.rowBorder]}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={item.icon} size={19} color="#1A1A1A" />
            </View>
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.8}
          onPress={handleEditProfilePhoto}
        >
          <View style={styles.avatarCircleWrap}>
            <View style={styles.avatarCircle}>
              {uploading ? (
                <ActivityIndicator color="#FFF" />
              ) : profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {(profile?.first_name?.[0] ?? "U").toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color="#FFF" />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>
              {profile
                ? `${profile.first_name} ${profile.last_name}`
                : "Loading..."}
            </Text>
            <Text style={styles.profileEmail}>{profile?.email ?? ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
        </TouchableOpacity>

        {renderGroup("Account", ACCOUNT_ITEMS)}
        {renderGroup("Preferences", PREFERENCE_ITEMS)}
        {renderGroup("Legal", LEGAL_ITEMS)}
        {renderGroup("Support & Feedback", [
          ...SUPPORT_ITEMS,
          ...FEEDBACK_ITEMS,
        ])}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  avatarCircleWrap: {
    position: "relative",
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#111827",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  profileEmail: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  tapToEdit: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 4,
  },
  group: { marginBottom: 24 },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111827" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginTop: 4,
  },
  logoutText: { color: "#EF4444", fontSize: 14, fontWeight: "700" },
});
