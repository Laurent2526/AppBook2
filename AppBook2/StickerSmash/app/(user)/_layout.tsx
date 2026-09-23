import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="home/index"
      screenOptions={{
        tabBarActiveTintColor:
          Colors[colorScheme === "dark" ? "dark" : "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home/explore"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="discover/index"
        options={{
          title: "Đề xuất",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.recommendationIcon,
                focused && styles.recommendationIconActive,
              ]}
            >
              <IconSymbol size={24} name="safari.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="library/index"
        options={{
          title: "Thư viện",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="books.vertical.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[styles.messageIcon, focused && styles.messageIconActive]}
            >
              <IconSymbol size={24} name="envelope.fill" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account/index"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account/publish"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="account/my-books"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="account/wallet"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="account/transactions"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  recommendationIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  recommendationIconActive: {
    backgroundColor: "#D8F3F0",
  },
  messageIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  messageIconActive: {
    backgroundColor: "#D8F3F0",
  },
});
