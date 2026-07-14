import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [state.index, tabWidth]);

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
                <Ionicons
                  name={iconConfig.inactive}
                  size={20}
                  color="#9CA3AF"
                />
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
});
