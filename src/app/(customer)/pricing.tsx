import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRICE_LIST = [
  {
    category: "Diagnostics & Inspection",
    items: [
      { name: "Standard Hardware & Software Diagnostic", price: "₱300" },
      { name: "On-Site / On-Demand Onsite Diagnostic Fee", price: "₱500" },
      { name: "Advanced Motherboard / Board-Level Inspection", price: "₱600" },
    ],
  },
  {
    category: "Laptop Hardware Repair",
    items: [
      {
        name: "Laptop LCD/Screen Replacement (Standard 60Hz)",
        price: "From ₱2,800 + parts",
      },
      {
        name: "Laptop LCD/Screen Replacement (Gaming 120Hz+/OLED)",
        price: "From ₱4,500 + parts",
      },
      { name: "Laptop Battery Replacement", price: "₱500 labor + parts" },
      {
        name: "Laptop Keyboard / Touchpad Replacement",
        price: "₱600 labor + parts",
      },
      {
        name: "Laptop Charging Port (DC Jack) Soldering Repair",
        price: "₱1,200 - ₱1,800",
      },
      { name: "Laptop Deep Cleaning & Thermal Paste Repaste", price: "₱800" },
    ],
  },
  {
    category: "Desktop PC Hardware Repair",
    items: [
      {
        name: "Desktop Monitor / Display Troubleshooting & Cable Repair",
        price: "₱500 - ₱1,000",
      },
      {
        name: "Desktop Power Supply (PSU) Replacement",
        price: "₱500 labor + parts",
      },
      {
        name: "Custom PC Assembly & Cable Management",
        price: "₱1,200 - ₱2,000",
      },
      {
        name: "GPU / Graphics Card Maintenance & Repasting",
        price: "₱800 - ₱1,200",
      },
      { name: "Desktop Dust Cleaning & Cable Re-routing", price: "₱600" },
    ],
  },
  {
    category: "Upgrades & Storage (Laptop & Desktop)",
    items: [
      {
        name: "RAM Upgrade Installation & Memory Test",
        price: "₱350 labor + parts",
      },
      {
        name: "SSD Upgrade & OS Migration / Cloning",
        price: "₱800 labor + parts",
      },
      {
        name: "Data Transfer / Hard Drive Data Backup",
        price: "₱500 - ₱1,200",
      },
    ],
  },
  {
    category: "Software & Operating System",
    items: [
      { name: "Windows / macOS Clean OS Reinstall & Drivers", price: "₱800" },
      { name: "Deep Virus, Spyware & Malware Removal", price: "₱700" },
      {
        name: "Essential Productivity & Specialized Software Setup",
        price: "₱400",
      },
      {
        name: "Data Recovery (Formatted or Corrupted Drive)",
        price: "From ₱1,500",
      },
    ],
  },
  {
    category: "Networking & Peripherals",
    items: [
      { name: "Wi-Fi Router / Mesh Network Installation", price: "₱600" },
      {
        name: "Home / Small Office Network Troubleshooting",
        price: "₱800 - ₱1,500",
      },
      { name: "Network Printer & Scanner Configuration", price: "₱500" },
    ],
  },
];

export default function PricingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Estimated Service Rates</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.disclaimer}>
          * Note: Prices listed below represent base service labor fees. Final
          costs may vary depending on spare parts required, component
          availability, device complexity, and actual diagnostic results.
        </Text>

        {PRICE_LIST.map((group) => (
          <View key={group.category} style={styles.group}>
            <Text style={styles.groupTitle}>{group.category}</Text>
            {group.items.map((item, index) => (
              <View
                key={item.name}
                style={[
                  styles.row,
                  index < group.items.length - 1 && styles.rowBorder,
                ]}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{item.price}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginLeft: 12,
  },
  content: {
    padding: 16,
  },
  disclaimer: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 18,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 12,
    borderRadius: 12,
  },
  group: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemName: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
    paddingRight: 12,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});
