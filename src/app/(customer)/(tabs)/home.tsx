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
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
  },
  {
    id: "2",
    title: "OS Reinstallation",
    desc: "Clean installation of Windows or macOS",
    price: "₱800",
    icon: "desktop-outline" as const,
  },
  {
    id: "3",
    title: "Network Setup & WiFi",
    desc: "Router configuration & signal optimization",
    price: "₱1,200",
    icon: "wifi-outline" as const,
  },
  {
    id: "4",
    title: "Malware & Virus Removal",
    desc: "Deep scan and protection setup",
    price: "₱650",
    icon: "shield-checkmark-outline" as const,
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

function CustomerHomeScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [nearbyTechs, setNearbyTechs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  // Billing Modal State
  const [billingModalVisible, setBillingModalVisible] =
    useState<boolean>(false);
  const [paying, setPaying] = useState<boolean>(false);

  // Notification Modal, Unread Badge & 3-Dot Options Dropdown
  const [notificationsModalVisible, setNotificationsModalVisible] =
    useState<boolean>(false);
  const [notificationsMenuVisible, setNotificationsMenuVisible] =
    useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Auto-banner carousel state
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);

  // Re-fetch profile data instantly when navigating back to Home tab
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

    // Realtime channel listening to BOTH 'bookings' and 'profiles' table updates
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
      if (data.status === "payment_pending") {
        setBillingModalVisible(true);
      }
    } else {
      setActiveJob(null);
    }
  };

  const fetchRecentInvoices = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const { data } = await supabase
      .from("bookings")
      .select(
        "id, service_title, estimated_cost, payment_status, updated_at",
      )
      .eq("customer_id", user.uid)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(3);

    setRecentInvoices(data ?? []);
  };

  const fetchNearbyTechnicians = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, is_online")
      .eq("role", "technician")
      .limit(8);

    if (data) setNearbyTechs(data);
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

    if (data && data.length > 0) {
      setNotifications(data);
    } else if (activeJob?.status === "payment_pending") {
      setNotifications([
        {
          id: `bill-${activeJob.id}`,
          title: "Invoice Ready for Payment",
          body: `Your technician set the bill: ₱${Number(
            activeJob.estimated_cost || 0,
          ).toFixed(2)}. Tap to complete payment.`,
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", user.uid);
      } catch (error) {
        console.error("Error marking notifications as read:", error);
      }
    }
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

      // Lock the chat thread for this job now that it's paid & completed —
      // it stays visible in the conversation list (read-only) until the
      // customer books this technician again.
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
    if (currentIndex !== activeBannerIndex) {
      setActiveBannerIndex(currentIndex);
    }
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
          { paddingTop: Math.max(insets.top, 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting} numberOfLines={1}>
              Hello, {userProfile?.first_name || "there"}
            </Text>
            <Text style={styles.subGreeting} numberOfLines={1} ellipsizeMode="tail">
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

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => router.push("/(customer)/(tabs)/search" as any)}
        >
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <Text style={styles.searchPlaceholder}>Search IT Services...</Text>
        </TouchableOpacity>

        {/* Quick Actions Grid */}
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

        {/* Active Job Tracker Card — updates in real time as soon as a
            technician is assigned or the job's status changes. */}
        {activeJob && (
          <View style={styles.activeJobCard}>
            <View style={styles.activeJobHeader}>
              <View style={styles.pulseDotWrap}>
                <View style={styles.statusDot} />
              </View>
              <Text style={styles.activeJobTitle}>
                {activeJob.status === "pending"
                  ? "FINDING A TECHNICIAN"
                  : `ACTIVE SERVICE · ${activeJob.status
                      .replace("_", " ")
                      .toUpperCase()}`}
              </Text>
            </View>

            <Text style={styles.activeJobIssue} numberOfLines={1}>
              {activeJob.service_title ||
                activeJob.issue_description ||
                "Hardware Support Request"}
            </Text>

            {activeJob.technician ? (
              <View style={styles.activeJobTechRow}>
                <View style={styles.activeJobTechAvatar}>
                  {activeJob.technician.avatar_url ? (
                    <Image
                      source={{ uri: activeJob.technician.avatar_url }}
                      style={styles.activeJobTechAvatarImg}
                    />
                  ) : (
                    <Text style={styles.activeJobTechInitial}>
                      {(activeJob.technician.first_name?.[0] ||
                        "T"
                      ).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeJobTechName}>
                    {activeJob.technician.first_name}{" "}
                    {activeJob.technician.last_name}
                  </Text>
                  <Text style={styles.activeJobTechRole}>
                    Your assigned technician
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.activeJobIconBtn}
                  onPress={() => router.push("/(customer)/(tabs)/chat" as any)}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={17}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.activeJobTech}>
                Waiting for a nearby technician to accept this job...
              </Text>
            )}

            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => router.push("/(customer)/track" as any)}
            >
              <Text style={styles.trackButtonText}>View Order Status</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Promotional Carousel */}
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

          {/* Carousel Indicator Dots */}
          <View style={styles.dotContainer}>
            {PROMO_BANNERS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  activeBannerIndex === idx
                    ? styles.activeDot
                    : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Popular Services Section */}
        <View style={styles.sectionMargin}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Popular Services</Text>
            <TouchableOpacity
              onPress={() => router.push("/(customer)/(tabs)/search" as any)}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.popularList}>
            {POPULAR_SERVICES.map((item) => (
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
        </View>

        {/* Categories Section */}
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

            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Nearby Technicians Section */}
        <View style={styles.sectionMargin}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Available Technicians</Text>
            <TouchableOpacity
              onPress={() => router.push("/(customer)/(tabs)/search" as any)}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {nearbyTechs.length === 0 ? (
              <Text style={styles.emptyText}>
                No technicians online nearby.
              </Text>
            ) : (
              nearbyTechs.map((tech) => (
                <TouchableOpacity
                  key={tech.id}
                  style={styles.techCard}
                  onPress={() => router.push("/(customer)/book" as any)}
                >
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
                    {tech.first_name} {tech.last_name}
                  </Text>
                  <Text style={styles.techRole}>Hardware Expert</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Payment History Section (formerly "Recent Invoices") */}
        {recentInvoices.length > 0 && (
          <View style={styles.sectionMargin}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              <TouchableOpacity
                onPress={() => router.push("/(customer)/invoices" as any)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.invoicePreviewList}>
              {recentInvoices.map((inv) => {
                const isPaid = inv.payment_status === "paid";
                return (
                  <TouchableOpacity
                    key={inv.id}
                    style={styles.invoicePreviewCard}
                    onPress={() => router.push("/(customer)/invoices" as any)}
                  >
                    <View style={styles.invoicePreviewIconWrap}>
                      <Ionicons
                        name="receipt-outline"
                        size={18}
                        color="#111827"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoicePreviewTitle} numberOfLines={1}>
                        {inv.service_title || "IT Service"}
                      </Text>
                      <Text style={styles.invoicePreviewDate}>
                        {new Date(inv.updated_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.invoicePreviewAmount}>
                        ₱{Number(inv.estimated_cost || 0).toFixed(2)}
                      </Text>
                      <View
                        style={[
                          styles.invoicePreviewBadge,
                          isPaid
                            ? styles.invoicePreviewBadgePaid
                            : styles.invoicePreviewBadgeUnpaid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.invoicePreviewBadgeText,
                            { color: isPaid ? "#10B981" : "#F59E0B" },
                          ]}
                        >
                          {isPaid ? "Paid" : "Unpaid"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Why Choose Us Section */}
        <View style={styles.sectionMargin}>
          <Text style={styles.sectionTitle}>Why ITKonek?</Text>
          <View style={styles.whyChooseContainer}>
            {WHY_CHOOSE_ITEMS.map((item, index) => (
              <View key={index} style={styles.whyChooseItem}>
                <View style={styles.whyIconWrap}>
                  <Ionicons name={item.icon} size={20} color="#111827" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.whyTitle}>{item.title}</Text>
                  <Text style={styles.whyDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* BILLING MODAL */}
      <Modal visible={billingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons
              name="receipt-outline"
              size={48}
              color="#111827"
              style={{ alignSelf: "center", marginBottom: 12 }}
            />
            <Text style={styles.modalTitle}>Bill Ready for Payment</Text>
            <Text style={styles.modalSubtitle}>
              Your technician has finalized the repair bill.
            </Text>

            <View style={styles.billDetailsCard}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Service Issue:</Text>
                <Text style={styles.billValue}>
                  {activeJob?.issue_description || "IT Service"}
                </Text>
              </View>
              <View style={styles.billDivider} />
              <View style={styles.billRow}>
                <Text style={styles.billTotalLabel}>Total Amount Due:</Text>
                <Text style={styles.billTotalValue}>
                  ₱{Number(activeJob?.estimated_cost || 0).toFixed(2)}
                </Text>
              </View>
            </View>

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

      {/* NOTIFICATIONS MODAL WITH 3-DOT ACTION MENU */}
      <Modal
        visible={notificationsModalVisible}
        transparent
        animationType="fade"
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setNotificationsModalVisible(false);
            setNotificationsMenuVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.notifModalCard}>
                {/* Header Row */}
                <View style={styles.notifHeaderRow}>
                  <Text style={styles.notifHeaderTitle}>Notifications</Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* 3-Dot Options Button */}
                    <TouchableOpacity
                      style={styles.threeDotBtn}
                      onPress={() =>
                        setNotificationsMenuVisible(!notificationsMenuVisible)
                      }
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={20}
                        color="#374151"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setNotificationsModalVisible(false);
                        setNotificationsMenuVisible(false);
                      }}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={24}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* 3-Dot Options Popover Dropdown */}
                  {notificationsMenuVisible && (
                    <View style={styles.optionsDropdown}>
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={markAllNotificationsAsRead}
                      >
                        <Ionicons
                          name="checkmark-done-outline"
                          size={16}
                          color="#111827"
                        />
                        <Text style={styles.dropdownOptionText}>
                          Mark all as read
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.dropdownDivider} />

                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => {
                          setNotificationsMenuVisible(false);
                          setNotificationsModalVisible(false);
                          router.push("/(customer)/notification" as any);
                        }}
                      >
                        <Ionicons
                          name="settings-outline"
                          size={16}
                          color="#111827"
                        />
                        <Text style={styles.dropdownOptionText}>
                          Notification Settings
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Notifications List */}
                <ScrollView
                  style={{ maxHeight: 360 }}
                  showsVerticalScrollIndicator={false}
                >
                  {notifications.length === 0 ? (
                    <Text style={styles.emptyNotifText}>
                      No notifications right now.
                    </Text>
                  ) : (
                    notifications.map((notif) => (
                      <View
                        key={notif.id}
                        style={[
                          styles.notifItem,
                          !notif.read && styles.notifItemUnread,
                        ]}
                      >
                        <View style={styles.notifIconWrap}>
                          <Ionicons
                            name="notifications"
                            size={18}
                            color="#111827"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.notifItemTitle}>
                            {notif.title}
                          </Text>
                          <Text style={styles.notifItemBody}>{notif.body}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
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
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },

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
  },
  searchPlaceholder: { color: "#9CA3AF", fontSize: 14, fontWeight: "500" },

  /* Quick Actions Styles */
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  activeJobHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  pulseDotWrap: { alignItems: "center", justifyContent: "center" },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  activeJobTitle: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  activeJobIssue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  activeJobTech: { color: "#9CA3AF", fontSize: 13, marginTop: 8 },
  activeJobTechRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 10,
  },
  activeJobTechAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  activeJobTechAvatarImg: { width: "100%", height: "100%" },
  activeJobTechInitial: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  activeJobTechName: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  activeJobTechRole: { color: "#9CA3AF", fontSize: 11, marginTop: 1 },
  activeJobIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1F2937",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  trackButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

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
  bannerSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  bannerButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  bannerButtonText: { color: "#111827", fontWeight: "800", fontSize: 12 },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: { height: 6, borderRadius: 3 },
  activeDot: { width: 18, backgroundColor: "#111827" },
  inactiveDot: { width: 6, backgroundColor: "#D1D5DB" },

  /* Popular Services Styles */
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

  invoicePreviewList: { gap: 10 },
  invoicePreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  invoicePreviewIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  invoicePreviewTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  invoicePreviewDate: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  invoicePreviewAmount: { fontSize: 14, fontWeight: "800", color: "#111827" },
  invoicePreviewBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  invoicePreviewBadgePaid: {
    backgroundColor: "#F0FDF4",
    borderColor: "#10B981",
  },
  invoicePreviewBadgeUnpaid: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  invoicePreviewBadgeText: { fontSize: 9, fontWeight: "800" },

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

  techCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    width: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  techAvatarWrap: { position: "relative", marginBottom: 8 },
  techAvatar: { width: 48, height: 48, borderRadius: 24 },
  techAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  techInitial: { fontSize: 16, fontWeight: "800", color: "#111827" },
  onlineBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  techName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  techRole: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
    textAlign: "center",
  },
  emptyText: { fontSize: 13, color: "#9CA3AF" },

  whyChooseContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
  },
  whyChooseItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  whyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  whyTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  whyDesc: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  billDetailsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billLabel: { fontSize: 13, color: "#6B7280" },
  billValue: { fontSize: 13, fontWeight: "700", color: "#111827" },
  billDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 10 },
  billTotalLabel: { fontSize: 14, fontWeight: "800", color: "#111827" },
  billTotalValue: { fontSize: 16, fontWeight: "800", color: "#10B981" },
  payNowBtn: {
    backgroundColor: "#111827",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  payNowBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  notifModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    position: "relative",
  },
  notifHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    zIndex: 10,
  },
  notifHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  threeDotBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  optionsDropdown: {
    position: "absolute",
    top: 36,
    right: 36,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,
    width: 180,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  dropdownDivider: { height: 1, backgroundColor: "#F3F4F6" },

  notifItem: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
  },
  notifItemUnread: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  notifIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  notifItemTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  notifItemBody: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  emptyNotifText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginVertical: 20,
    fontSize: 13,
  },
});
