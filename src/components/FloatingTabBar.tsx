import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// NOTE: adjust these two import paths if FloatingTabBar.tsx doesn't sit
// directly under /components — they need to resolve to your config folder.
import { auth } from "../config/firebase";
import { supabase } from "../config/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TAB_ICONS: Record<
  string,
  {
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
  }
> = {
  home: { active: "home", inactive: "home-outline" },
  search: { active: "search", inactive: "search-outline" },
  cart: { active: "cart", inactive: "cart-outline" },
  jobs: { active: "briefcase", inactive: "briefcase-outline" },
  schedule: { active: "calendar", inactive: "calendar-outline" },
  chat: {
    active: "chatbubble-ellipses",
    inactive: "chatbubble-ellipses-outline",
  },
  settings: { active: "settings", inactive: "settings-outline" },
};

const CIRCLE_SIZE = 48;
const BAR_MARGIN = 16;

export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const totalTabs = state.routes.length || 1;
  const barWidth = SCREEN_WIDTH - BAR_MARGIN * 2;
  const tabWidth = barWidth / totalTabs;

  const translateX = useRef(new Animated.Value(state.index * tabWidth)).current;
  const [hasUnreadChats, setHasUnreadChats] = useState(false);

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [state.index, tabWidth]);

  // Red dot on the chat tab: works out unread state for whichever side of
  // the conversation the signed-in user is on (customer or technician),
  // using last_sender_id plus each side's own last-read timestamp.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const computeUnread = (threads: any[]) =>
      threads.some((t) => {
        if (!t.last_sender_id || t.last_sender_id === uid) return false;
        const isCustomer = t.customer_id === uid;
        const lastReadAt = isCustomer
          ? t.customer_last_read_at
          : t.technician_last_read_at;
        return !lastReadAt || new Date(t.updated_at) > new Date(lastReadAt);
      });

    const fetchUnread = async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select(
          "customer_id, technician_id, last_sender_id, updated_at, customer_last_read_at, technician_last_read_at",
        )
        .or(`customer_id.eq.${uid},technician_id.eq.${uid}`);

      if (error) {
        console.warn("[FloatingTabBar] Unread check failed:", error.message);
        return;
      }
      setHasUnreadChats(computeUnread(data ?? []));
    };

    fetchUnread();

    const channel = supabase
      .channel(`tabbar-chat-threads-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_threads" },
        fetchUnread,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeRoute = state.routes[state.index];
  const activeRouteName = activeRoute ? activeRoute.name : "home";
  const activeIcon = TAB_ICONS[activeRouteName]?.active ?? "ellipse";

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.bar, { width: barWidth }]}>
        {/* Animated Active Circle */}
        <Animated.View
          style={[
            styles.circle,
            {
              width: tabWidth,
              transform: [{ translateX }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.circleInner}>
            <Ionicons name={activeIcon} size={22} color="#0D0D0D" />
            {activeRouteName === "chat" && hasUnreadChats && (
              <View style={styles.unreadBadgeOnCircle} />
            )}
          </View>
        </Animated.View>

        {/* Tab Items */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const rawLabel = options.title ?? route.name;
          const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

          const iconConfig = TAB_ICONS[route.name] || {
            active: "ellipse",
            inactive: "ellipse-outline",
          };

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tab, { width: tabWidth }]}
              activeOpacity={0.7}
              onPress={onPress}
            >
              {isFocused ? (
                <Text style={styles.activeLabel}>{label}</Text>
              ) : (
                <View>
                  <Ionicons
                    name={iconConfig.inactive}
                    size={20}
                    color="#9CA3AF"
                  />
                  {route.name === "chat" && hasUnreadChats && (
                    <View style={styles.unreadBadge} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    backgroundColor: "#161616",
    borderRadius: 30,
    height: 60,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262626",
    elevation: 10,
  },
  tab: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  activeLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 18,
  },
  circle: {
    position: "absolute",
    top: -16,
    height: CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  circleInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#0D0D0D",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#161616",
  },
  unreadBadgeOnCircle: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
