import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPushToken } from "@/lib/messaging-api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushNotificationsForSession() {
  if (Platform.OS === "web" || !Device.isDevice) return false;

  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.info("Expo push is not configured: missing EAS project ID.");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("appbook", {
      name: "AppBook",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#0F766E",
    });
  }

  const permission = await Notifications.getPermissionsAsync();
  const result = permission.granted
    ? permission
    : await Notifications.requestPermissionsAsync();
  if (!result.granted) return false;

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerPushToken(token.data);
  return true;
}
