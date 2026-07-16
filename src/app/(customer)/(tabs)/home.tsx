import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import TechnicianDetailModal, {
  TechnicianDetails,
} from "../../../components/TechnicianDetailModal";
import { auth } from "../../../config/firebase";
import { supabase } from "../../../config/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 40;

const CATEGORIES = ["Laptops", "Desktops", "Networking", "Mobile", "Printers"];

const QUICK_ACTIONS = [
  {
    id: "book",
    title: "Book Repair",
    icon: "calendar-outline" as const,
    route: "/(customer)/book",
  },
  {
    id: "track",
    title: "Track Order",
    icon: "location-outline" as const,
    route: "/(customer)/track-order",
  },
  {
    id: "pricing",
    title: "Pricing",
    icon: "pricetag-outline" as const,
    route: "/(customer)/pricing",
  },
  {
    id: "invoices",
    title: "Invoices",
    icon: "receipt-outline" as const,
    route: "/(customer)/invoices",
  },
];

const POPULAR_SERVICES = [
  {
    id: "1",
    title: "PC & Laptop Diagnostics",
    desc: "Complete hardware checkup & error troubleshooting",
    price: "₱500",
    icon: "hardware-chip-outline" as const,
    category: "Laptops",
  },
  {
    id: "2",
    title: "OS Reinstallation",
    desc: "Clean installation of Windows or macOS",
    price: "₱800",
    icon: "desktop-outline" as const,
    category: "Desktops",
  },
  {
    id: "3",
    title: "Network Setup & WiFi",
    desc: "Router configuration & signal optimization",
    price: "₱1,200",
    icon: "wifi-outline" as const,
    category: "Networking",
  },
  {
    id: "4",
    title: "Malware & Virus Removal",
    desc: "Deep scan and protection setup",
    price: "₱650",
    icon: "shield-checkmark-outline" as const,
    category: "Mobile",
  },
];

const PROMO_BANNERS = [
  {
    id: "1",
    title: "Broken Laptop or PC?",
    subtitle: "Get certified technicians dispatched directly to your location.",
    buttonText: "Book Repair Now",
    route: "/(customer)/book",
    icon: "laptop-outline" as const,
    bgColor: "#1E293B",
  },
  {
    id: "2",
    title: "20% Off Network Setup",
    subtitle: "Fast and secure Wi-Fi configuration for homes & small offices.",
    buttonText: "Claim Discount",
    route: "/(customer)/book",
    icon: "wifi-outline" as const,
    bgColor: "#111827",
  },
  {
    id: "3",
    title: "Fast Virus Cleaning",
    subtitle: "Same-day software fix and malware removal guaranteed.",
    buttonText: "Explore Fixes",
    route: "/(customer)/(tabs)/search",
    icon: "shield-checkmark-outline" as const,
    bgColor: "#0F172A",
  },
];

const WHY_CHOOSE_ITEMS = [
  {
    icon: "shield-checkmark-outline" as const,
    title: "Verified Technicians",
    desc: "Background-checked & skilled IT pros.",
  },
  {
    icon: "flash-outline" as const,
    title: "Fast On-Demand Dispatch",
    desc: "Techs arrive right at your doorstep.",
  },
  {
    icon: "cash-outline" as const,
    title: "Transparent Pricing",
    desc: "No hidden fees. Upfront estimate guarantees.",
  },
];

const TRUST_STATS = [
  { id: "1", value: "4.9", label: "Avg. Rating", icon: "star" as const },
  {
    id: "2",
    value: "1K+",
    label: "Repairs Done",
    icon: "checkmark-done-outline" as const,
  },
  {
    id: "3",
    value: "12+",
    label: "Technicians",
    icon: "people-outline" as const,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    id: "1",
    title: "Book a Service",
    desc: "Choose your issue and schedule a convenient time.",
    icon: "calendar-outline" as const,
  },
  {
    id: "2",
    title: "Get Matched",
    desc: "A verified technician is dispatched to you.",
    icon: "person-add-outline" as const,
  },
  {
    id: "3",
    title: "Device Fixed",
    desc: "Pay securely once the repair is complete.",
    icon: "checkmark-circle-outline" as const,
  },
];

const JOB_STATUS_META: Record<
  string,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: {
    label: "Pending Confirmation",
    color: "#F59E0B",
    icon: "time-outline",
  },
  accepted: {
    label: "Technician Assigned",
    color: "#3B82F6",
    icon: "checkmark-circle-outline",
  },
  en_route: {
    label: "Technician En Route",
    color: "#3B82F6",
    icon: "navigate-outline",
  },
  arrived: {
    label: "Technician Arrived",
    color: "#8B5CF6",
    icon: "location-outline",
  },
  in_progress: {
    label: "Repair In Progress",
    color: "#10B981",
    icon: "construct-outline",
  },
  payment_pending: {
    label: "Payment Pending",
    color: "#EF4444",
    icon: "card-outline",
  },
};

const getJobStatusMeta = (status: string) =>
  JOB_STATUS_META[status] ?? {
    label: status.replace(/_/g, " "),
    color: "#9CA3AF",
    icon: "information-circle-outline" as const,
  };

const TESTIMONIALS = [
  {
    id: "1",
    name: "Maria Santos",
    text: "Technician arrived within the hour and fixed my laptop screen fast. Great service!",
    rating: 5,
  },
  {
    id: "2",
    name: "James Cruz",
    text: "Very transparent pricing, no surprises. Will definitely book again.",
    rating: 5,
  },
  {
    id: "3",
    name: "Angela Reyes",
    text: "My WiFi setup was a headache until this app matched me with a great tech.",
    rating: 4,
  },
];

function CustomerHomeScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [nearbyTechs, setNearbyTechs] = useState<TechnicianDetails[]>([]);
  const [selectedTechnician, setSelectedTechnician] =
    useState<TechnicianDetails | null>(null);
  const [techModalVisible, setTechModalVisible] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [billingModalVisible, setBillingModalVisible] =
    useState<boolean>(false);
  const [paying, setPaying] = useState<boolean>(false);
  const [notificationsModalVisible, setNotificationsModalVisible] =
    useState<boolean>(false);
  const [notificationsMenuVisible, setNotificationsMenuVisible] =
    useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim().length > 0;

  const getFilteredServices = () => {
    let list = POPULAR_SERVICES;
    if (selectedCategory !== null) {
      list = list.filter((service) => service.category === selectedCategory);
    }
    if (isSearching) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (service) =>
          service.title.toLowerCase().includes(q) ||
          service.desc.toLowerCase().includes(q) ||
          service.category.toLowerCase().includes(q),
      );
    }
    return list;
  };
  const displayedServices = getFilteredServices();

  const filteredTechs = isSearching
    ? nearbyTechs.filter((tech) =>
        `${tech.first_name ?? ""} ${tech.last_name ?? ""}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()),
      )
    : nearbyTechs;

  const handleSearchSubmit = () => {
    if (!isSearching) return;
    router.push({
      pathname: "/(customer)/(tabs)/search" as any,
      params: { q: searchQuery.trim() },
    });
  };

  const clearSearch = () => setSearchQuery("");

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, []),
  );

  useEffect(() => {
    fetchUserData();
    fetchActiveJob();
    fetchNearbyTechnicians();
    fetchNotifications();
    fetchRecentInvoices();
    const user = auth.currentUser;
    if (!user) return;
    const channel = supabase
      .channel("customer-home-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${user.uid}`,
        },
        () => {
          fetchActiveJob();
          fetchNotifications();
          fetchRecentInvoices();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.uid}`,
        },
        () => {
          fetchUserData();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % PROMO_BANNERS.length;
        bannerScrollRef.current?.scrollTo({
          x: nextIndex * BANNER_WIDTH,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url, email")
      .eq("id", user.uid)
      .maybeSingle();
    if (data) setUserProfile(data);
  };

  const fetchActiveJob = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select(
        "*, technician:technician_id(first_name, last_name, phone_number, avatar_url)",
      )
      .eq("customer_id", user.uid)
      .in("status", [
        "pending",
        "accepted",
        "en_route",
        "arrived",
        "in_progress",
        "payment_pending",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setActiveJob(data);
      if (data.status === "payment_pending") setBillingModalVisible(true);
    } else {
      setActiveJob(null);
    }
  };

  const fetchRecentInvoices = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select("id, service_title, estimated_cost, payment_status, updated_at")
      .eq("customer_id", user.uid)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(3);
    setRecentInvoices(data ?? []);
  };

  const fetchNearbyTechnicians = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, avatar_url, is_online, is_verified, location, technician_details(rank, years_experience, specialization, certification_level, exam_passing_score, is_nbi_cleared, is_police_cleared, bio)",
      )
      .eq("role", "technician")
      .limit(8);

    if (!error && data) {
      // technician_details comes back as an array from the join; flatten to a single object
      const normalized = data.map((tech: any) => ({
        ...tech,
        technician_details: Array.isArray(tech.technician_details)
          ? (tech.technician_details[0] ?? null)
          : tech.technician_details,
      }));

      // The join can "succeed" (no error) but still come back with every
      // technician_details flattened to null — typically because a Row Level
      // Security policy on technician_details is silently filtering out rows
      // that don't belong to the current user, rather than raising an error.
      // Treat that case the same as a hard failure and fall back to a manual
      // merge (which, if RLS is truly the blocker, will surface the same gap
      // so it shows up in the console instead of failing silently).
      const hasAnyDetails = normalized.some(
        (t: any) => t.technician_details != null,
      );

      if (normalized.length === 0 || hasAnyDetails) {
        setNearbyTechs(normalized);
        return;
      }

      console.warn(
        "profiles→technician_details join returned no details for any technician " +
          "(likely blocked by a Row Level Security policy on technician_details). " +
          "Falling back to manual merge.",
      );
    } else {
      // The embedded join failed — most likely there's no foreign key relationship
      // registered between profiles and technician_details in Supabase yet.
      console.warn(
        "profiles→technician_details join failed, falling back to manual merge:",
        error?.message,
      );
    }

    // Fall back to fetching both tables separately and merging on the client.

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, avatar_url, is_online, is_verified, location",
      )
      .eq("role", "technician")
      .limit(8);

    if (profileError || !profileRows) {
      console.error(
        "Failed to fetch technician profiles:",
        profileError?.message,
      );
      return;
    }

    const ids = profileRows.map((p) => p.id);
    const { data: detailRows, error: detailError } = await supabase
      .from("technician_details")
      .select(
        "id, rank, years_experience, specialization, certification_level, exam_passing_score, is_nbi_cleared, is_police_cleared, bio",
      )
      .in("id", ids);

    if (detailError) {
      console.error("Failed to fetch technician_details:", detailError.message);
    } else if (ids.length > 0 && (detailRows?.length ?? 0) === 0) {
      console.warn(
        "technician_details returned 0 rows for known technician ids. " +
          "This usually means a Row Level Security policy is blocking reads — " +
          "add a SELECT policy on technician_details for customers/authenticated users.",
      );
    }

    const detailsById = new Map((detailRows ?? []).map((d: any) => [d.id, d]));

    const merged = profileRows.map((p) => ({
      ...p,
      technician_details: detailsById.get(p.id) ?? null,
    }));

    setNearbyTechs(merged);
  };

  const openTechnicianDetails = (tech: TechnicianDetails) => {
    setSelectedTechnician(tech);
    setTechModalVisible(true);
  };

  const closeTechnicianDetails = () => {
    setTechModalVisible(false);
    setSelectedTechnician(null);
  };

  const handleBookTechnician = (tech: TechnicianDetails) => {
    setTechModalVisible(false);
    router.push({
      pathname: "/(customer)/book" as any,
      params: { technicianId: tech.id },
    });
  };

  const fetchNotifications = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.uid)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data && data.length > 0) setNotifications(data);
    else if (activeJob?.status === "payment_pending")
      setNotifications([
        {
          id: `bill-${activeJob.id}`,
          title: "Invoice Ready for Payment",
          body: `Amount: ₱${Number(activeJob.estimated_cost || 0).toFixed(2)}`,
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);
  };

  const markAllNotificationsAsRead = async () => {
    const user = auth.currentUser;
    if (user)
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotificationsMenuVisible(false);
  };

  const handlePayBill = async () => {
    if (!activeJob) return;
    setPaying(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", activeJob.id);
      if (error) throw error;
      await supabase
        .from("chat_threads")
        .update({ is_locked: true })
        .eq("booking_id", activeJob.id);
      Alert.alert(
        "Payment Successful",
        "Thank you! Your job is now completed.",
      );
      setBillingModalVisible(false);
      fetchActiveJob();
      fetchRecentInvoices();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to process payment.");
    } finally {
      setPaying(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const handleBannerScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / BANNER_WIDTH);
    if (currentIndex !== activeBannerIndex) setActiveBannerIndex(currentIndex);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              Hello, {userProfile?.first_name || "there"}
            </Text>
            <Text style={styles.subGreeting}>
              Need hardware repair or support today?
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => setNotificationsModalVisible(true)}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#111827"
              />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push("/(customer)/(tabs)/settings" as any)}
            >
              {userProfile?.avatar_url ? (
                <Image
                  source={{ uri: userProfile.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {(userProfile?.first_name?.[0] ?? "U").toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search IT services, e.g. WiFi setup..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCorrect={false}
          />
          {isSearching && (
            <TouchableOpacity onPress={clearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionMargin}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={() => router.push(action.route as any)}
              >
                <View style={styles.quickActionIconWrap}>
                  <Ionicons name={action.icon} size={22} color="#111827" />
                </View>
                <Text style={styles.quickActionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {activeJob &&
          (() => {
            const statusMeta = getJobStatusMeta(activeJob.status);
            const technicianName = activeJob.technician
              ? `${activeJob.technician.first_name ?? ""} ${
                  activeJob.technician.last_name ?? ""
                }`.trim()
              : "";
            return (
              <View style={styles.activeJobCard}>
                <View style={styles.activeJobTopRow}>
                  <View
                    style={[
                      styles.activeJobStatusPill,
                      { backgroundColor: `${statusMeta.color}26` },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusMeta.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.activeJobStatusText,
                        { color: statusMeta.color },
                      ]}
                    >
                      {statusMeta.label}
                    </Text>
                  </View>
                  {!!activeJob.id && (
                    <Text style={styles.activeJobBookingId}>
                      #{String(activeJob.id).slice(0, 8).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.activeJobBody}>
                  <View style={styles.activeJobIconWrap}>
                    <Ionicons
                      name={statusMeta.icon}
                      size={22}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeJobIssue} numberOfLines={1}>
                      {activeJob.service_title || "Hardware Support Request"}
                    </Text>
                    <Text style={styles.activeJobSubtext} numberOfLines={1}>
                      {technicianName
                        ? `Technician: ${technicianName}`
                        : "Waiting for technician assignment"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.trackButton}
                  onPress={() => router.push("/(customer)/track-order" as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.trackButtonText}>View Order Status</Text>
                  <Ionicons name="arrow-forward" size={16} color="#111827" />
                </TouchableOpacity>
              </View>
            );
          })()}

        <View style={styles.sectionMargin}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleBannerScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={BANNER_WIDTH + 12}
            snapToAlignment="center"
            contentContainerStyle={{ gap: 12 }}
          >
            {PROMO_BANNERS.map((banner) => (
              <View
                key={banner.id}
                style={[
                  styles.bannerCard,
                  { backgroundColor: banner.bgColor, width: BANNER_WIDTH },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                  <TouchableOpacity
                    style={styles.bannerButton}
                    onPress={() => router.push(banner.route as any)}
                  >
                    <Text style={styles.bannerButtonText}>
                      {banner.buttonText}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Ionicons
                  name={banner.icon}
                  size={64}
                  color="rgba(255,255,255,0.15)"
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionMargin}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === null && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === null && styles.categoryChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionMargin}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {isSearching
                ? `Results for "${searchQuery.trim()}"`
                : "Popular Services"}
            </Text>
            {!isSearching && (
              <TouchableOpacity
                onPress={() => router.push("/(customer)/services" as any)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {displayedServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={28} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                No services match your search.
              </Text>
            </View>
          ) : (
            <View style={styles.popularList}>
              {displayedServices.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.popularCard}
                  onPress={() => router.push("/(customer)/book" as any)}
                >
                  <View style={styles.popularIconWrap}>
                    <Ionicons name={item.icon} size={22} color="#111827" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.popularTitle}>{item.title}</Text>
                    <Text style={styles.popularDesc} numberOfLines={1}>
                      {item.desc}
                    </Text>
                  </View>
                  <Text style={styles.popularPrice}>{item.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionMargin}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Available Technicians</Text>
          </View>
          {filteredTechs.length === 0 ? (
            <View style={styles.techEmptyState}>
              <Ionicons name="people-outline" size={20} color="#9CA3AF" />
              <Text style={styles.techEmptyStateText}>
                {isSearching
                  ? "No technicians match your search."
                  : "No technicians available right now."}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {filteredTechs.map((tech) => (
                <TouchableOpacity
                  key={tech.id}
                  style={styles.techCard}
                  activeOpacity={0.8}
                  onPress={() => openTechnicianDetails(tech)}
                >
                  {tech.is_verified && (
                    <View style={styles.techVerifiedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#3B82F6"
                      />
                    </View>
                  )}
                  <View style={styles.techAvatarWrap}>
                    {tech.avatar_url ? (
                      <Image
                        source={{ uri: tech.avatar_url }}
                        style={styles.techAvatar}
                      />
                    ) : (
                      <View style={styles.techAvatarPlaceholder}>
                        <Text style={styles.techInitial}>
                          {(tech.first_name?.[0] || "T").toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {tech.is_online && <View style={styles.onlineBadge} />}
                  </View>
                  <Text style={styles.techName} numberOfLines={1}>
                    {tech.first_name}
                  </Text>
                  {!!tech.technician_details?.specialization && (
                    <Text style={styles.techSpecialization} numberOfLines={1}>
                      {tech.technician_details.specialization}
                    </Text>
                  )}
                  {!!tech.technician_details?.rank && (
                    <View style={styles.techRankChip}>
                      <Text style={styles.techRankChipText} numberOfLines={1}>
                        {tech.technician_details.rank}
                      </Text>
                    </View>
                  )}
                  <View style={styles.techViewBtn}>
                    <Text style={styles.techViewBtnText}>View Profile</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {!isSearching && (
          <>
            <View style={styles.trustBar}>
              {TRUST_STATS.map((stat, i) => (
                <React.Fragment key={stat.id}>
                  <View style={styles.trustStat}>
                    <View style={styles.trustStatHeader}>
                      <Ionicons name={stat.icon} size={14} color="#FBBF24" />
                      <Text style={styles.trustStatValue}>{stat.value}</Text>
                    </View>
                    <Text style={styles.trustStatLabel}>{stat.label}</Text>
                  </View>
                  {i < TRUST_STATS.length - 1 && (
                    <View style={styles.trustDivider} />
                  )}
                </React.Fragment>
              ))}
            </View>

            <View style={styles.sectionMargin}>
              <Text style={styles.sectionTitle}>Why Choose Us</Text>
              <View style={styles.whyChooseList}>
                {WHY_CHOOSE_ITEMS.map((item) => (
                  <View key={item.title} style={styles.whyChooseCard}>
                    <View style={styles.whyChooseIconWrap}>
                      <Ionicons name={item.icon} size={20} color="#111827" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.whyChooseTitle}>{item.title}</Text>
                      <Text style={styles.whyChooseDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sectionMargin}>
              <Text style={styles.sectionTitle}>How It Works</Text>
              <View style={styles.stepsList}>
                {HOW_IT_WORKS_STEPS.map((step, i) => (
                  <View key={step.id} style={styles.stepRow}>
                    <View style={styles.stepIconColumn}>
                      <View style={styles.stepIconWrap}>
                        <Ionicons name={step.icon} size={18} color="#FFFFFF" />
                      </View>
                      {i < HOW_IT_WORKS_STEPS.length - 1 && (
                        <View style={styles.stepConnector} />
                      )}
                    </View>
                    <View style={styles.stepTextWrap}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {recentInvoices.length > 0 && (
              <View style={styles.sectionMargin}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Recent Invoices</Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(customer)/invoices" as any)}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.popularList}>
                  {recentInvoices.map((invoice) => (
                    <TouchableOpacity
                      key={invoice.id}
                      style={styles.invoiceCard}
                      onPress={() => router.push("/(customer)/invoices" as any)}
                    >
                      <View style={styles.invoiceIconWrap}>
                        <Ionicons
                          name="receipt-outline"
                          size={20}
                          color="#111827"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.popularTitle} numberOfLines={1}>
                          {invoice.service_title || "Repair Service"}
                        </Text>
                        <Text style={styles.popularDesc}>
                          {new Date(invoice.updated_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.popularPrice}>
                          ₱{Number(invoice.estimated_cost || 0).toFixed(2)}
                        </Text>
                        <View
                          style={[
                            styles.invoiceStatusPill,
                            invoice.payment_status === "paid" &&
                              styles.invoiceStatusPillPaid,
                          ]}
                        >
                          <Text
                            style={[
                              styles.invoiceStatusText,
                              invoice.payment_status === "paid" &&
                                styles.invoiceStatusTextPaid,
                            ]}
                          >
                            {invoice.payment_status === "paid"
                              ? "Paid"
                              : "Pending"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.sectionMargin}>
              <Text style={styles.sectionTitle}>What Customers Say</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {TESTIMONIALS.map((review) => (
                  <View key={review.id} style={styles.testimonialCard}>
                    <View style={styles.testimonialStars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < review.rating ? "star" : "star-outline"}
                          size={13}
                          color="#FBBF24"
                        />
                      ))}
                    </View>
                    <Text style={styles.testimonialText} numberOfLines={4}>
                      "{review.text}"
                    </Text>
                    <Text style={styles.testimonialName}>{review.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={styles.supportCard}
              activeOpacity={0.85}
              onPress={() => router.push("/(customer)/help" as any)}
            >
              <View style={styles.supportIconWrap}>
                <Ionicons name="headset-outline" size={22} color="#111827" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportTitle}>Need Help?</Text>
                <Text style={styles.supportDesc}>
                  Our support team is available 24/7 to assist you.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#111827" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <TechnicianDetailModal
        visible={techModalVisible}
        technician={selectedTechnician}
        onClose={closeTechnicianDetails}
        onBook={handleBookTechnician}
      />

      <Modal visible={billingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bill Ready for Payment</Text>
            <TouchableOpacity
              style={styles.payNowBtn}
              onPress={handlePayBill}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.payNowBtnText}>Complete Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={notificationsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNotificationsModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.notifCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.notifHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={markAllNotificationsAsRead}>
                  <Text style={styles.notifMarkRead}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="notifications-off-outline"
                  size={26}
                  color="#9CA3AF"
                />
                <Text style={styles.emptyStateText}>You're all caught up.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {notifications.map((n) => (
                  <View
                    key={n.id}
                    style={[
                      styles.notifItem,
                      !n.read && styles.notifItemUnread,
                    ]}
                  >
                    <Text style={styles.notifItemTitle}>{n.title}</Text>
                    <Text style={styles.notifItemBody}>{n.body}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.notifCloseBtn}
              onPress={() => setNotificationsModalVisible(false)}
            >
              <Text style={styles.notifCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function CustomerHomeScreen() {
  return (
    <SafeAreaProvider>
      <CustomerHomeScreenContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  greeting: { fontSize: 20, fontWeight: "800", color: "#111827" },
  subGreeting: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  badgeContainer: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 21 },
  avatarInitial: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    fontWeight: "500",
    height: "100%",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  emptyStateText: { color: "#9CA3AF", fontSize: 13, fontWeight: "600" },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  activeJobCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  activeJobTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeJobStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  activeJobStatusText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  activeJobBookingId: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  activeJobBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  activeJobIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  activeJobIssue: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  activeJobSubtext: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  trackButtonText: { color: "#111827", fontSize: 13, fontWeight: "800" },
  sectionMargin: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAllText: { fontSize: 13, color: "#111827", fontWeight: "700" },
  bannerCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 140,
  },
  bannerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  bannerSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 4 },
  bannerButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  bannerButtonText: { color: "#111827", fontWeight: "800", fontSize: 12 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  categoryChipText: { color: "#374151", fontSize: 13, fontWeight: "600" },
  categoryChipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  popularList: { gap: 10 },
  popularCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  popularIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  popularTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  popularDesc: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  popularPrice: { fontSize: 13, fontWeight: "800", color: "#111827" },
  techEmptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  techEmptyStateText: {
    fontSize: 12.5,
    color: "#9CA3AF",
    fontWeight: "600",
    textAlign: "center",
  },
  techCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    width: 132,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    position: "relative",
  },
  techVerifiedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
  },
  techAvatarWrap: { position: "relative", marginBottom: 8, marginTop: 2 },
  techAvatar: { width: 56, height: 56, borderRadius: 28 },
  techAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  techInitial: { fontSize: 18, fontWeight: "800", color: "#111827" },
  onlineBadge: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#10B981",
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  techName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  techSpecialization: {
    fontSize: 10.5,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
    textTransform: "capitalize",
  },
  techRankChip: {
    marginTop: 8,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: "100%",
  },
  techRankChipText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#374151",
  },
  techViewBtn: {
    marginTop: 10,
    width: "100%",
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  techViewBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
  },
  payNowBtn: {
    backgroundColor: "#111827",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  payNowBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  trustBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  trustStat: { flex: 1, alignItems: "center", gap: 4 },
  trustStatHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustStatValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  trustStatLabel: { color: "#9CA3AF", fontSize: 11, fontWeight: "600" },
  trustDivider: { width: 1, height: 28, backgroundColor: "#374151" },

  whyChooseList: { gap: 10 },
  whyChooseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  whyChooseIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  whyChooseTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  whyChooseDesc: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  stepsList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  stepRow: { flexDirection: "row", gap: 12 },
  stepIconColumn: { alignItems: "center" },
  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  stepConnector: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  stepTextWrap: { flex: 1, paddingBottom: 18 },
  stepTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  stepDesc: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  invoiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  invoiceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceStatusPill: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
  },
  invoiceStatusPillPaid: { backgroundColor: "#D1FAE5" },
  invoiceStatusText: { fontSize: 10, fontWeight: "700", color: "#B45309" },
  invoiceStatusTextPaid: { color: "#047857" },

  testimonialCard: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  testimonialStars: { flexDirection: "row", gap: 2 },
  testimonialText: { fontSize: 12, color: "#374151", lineHeight: 17 },
  testimonialName: { fontSize: 12, fontWeight: "700", color: "#111827" },

  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    marginBottom: 8,
  },
  supportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  supportTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  supportDesc: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  notifCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  notifHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  notifMarkRead: { fontSize: 12, fontWeight: "700", color: "#111827" },
  notifItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  notifItemUnread: { backgroundColor: "#F9FAFB" },
  notifItemTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  notifItemBody: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  notifCloseBtn: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  notifCloseBtnText: { fontSize: 13, fontWeight: "700", color: "#111827" },
});
