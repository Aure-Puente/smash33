//PushNotifications:
import Constants from "expo-constants";
import { Platform } from "react-native";

const isExpoGo = Constants.appOwnership === "expo";

let Notifications = null;
let Device = null;

if (!isExpoGo) {
  Notifications = require("expo-notifications");
  Device = require("expo-device");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotificationsAsync() {
  if (isExpoGo) {
    console.log("Notificaciones push no disponibles en Expo Go — hace falta una build de desarrollo.");
    return null;
  }

  if (!Device.isDevice) {
    console.log("Las notificaciones push necesitan un dispositivo físico o un emulador con Google Play.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("Permiso de notificaciones denegado.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return tokenData.data;
  } catch (e) {
    console.log("Error obteniendo el push token:", e.message);
    return null;
  }
}

export async function sendPushNotifications(tokens, title, body, data = {}) {
  const messages = tokens.filter(Boolean).map((to) => ({ to, sound: "default", title, body, data }));
  if (messages.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
    } catch (e) {
      console.log("Error enviando notificaciones push:", e.message);
    }
  }
}