import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import React from "react";
import { Platform } from "react-native";
import "react-native-reanimated";

import { AuthProvider } from "@/components/auth-provider";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(user)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        {Platform.OS !== "web" && <NotificationResponseHandler />}
        <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(user)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}

function NotificationResponseHandler() {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();

  React.useEffect(() => {
    const url = lastResponse?.notification.request.content.data?.url;
    if (typeof url === "string") router.push(url as never);
  }, [lastResponse, router]);

  return null;
}
