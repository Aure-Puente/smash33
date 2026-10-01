//PushNotifications:
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getSeasonInfo, getVisibleSeasonEnd, SEASONS } from "../utils/season";
import { getAllUsers } from "./firestoreService";

const isExpoGo = Constants.appOwnership === "expo";

let Notifications = null;
let Device = null;

if (!isExpoGo) {
  Notifications = require("expo-notifications");
  Device = require("expo-device");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
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

// ---------- AVISOS DE FIN DE TEMPORADA (notificaciones locales) ----------

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_HOUR = 10; 

function reminderDate(visibleEnd, daysBefore) {
  const d = new Date(visibleEnd.getTime() - daysBefore * DAY_MS);
  d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d;
}

export async function scheduleSeasonReminders() {
  if (isExpoGo || !Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith("season-"))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const current = getSeasonInfo(new Date());
  const next = getSeasonInfo(new Date(current.end.getTime() + 1000));
  const now = new Date();

  for (const info of [current, next]) {
    const season = SEASONS[info.key];
    const visibleEnd = getVisibleSeasonEnd(info);

    const reminders = [
      {
        id: `season-10d-${info.key}-${visibleEnd.getFullYear()}`,
        date: reminderDate(visibleEnd, 11),
        title: "⏳ Faltan 10 días",
        body: `La Temporada de ${season.label} está por terminar. ¡A sumar victorias!`,
      },
      {
        id: `season-1d-${info.key}-${visibleEnd.getFullYear()}`,
        date: reminderDate(visibleEnd, 2),
        title: "🔥 ¡Mañana termina la temporada!",
        body: `Última oportunidad para pelear por la insignia de ${season.label}.`,
      },
    ];

    for (const r of reminders) {
      if (r.date <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, sound: "default" },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date },
      });
    }
  }
}

// ---------- AVISO DE COMENTARIOS (push) ----------

export async function notifyNewComment({ tournamentId, authorUid, authorName, text }) {
  const users = await getAllUsers();
  const tokens = users
    .filter((u) => u.uid !== authorUid)
    .map((u) => u.expoPushToken);

  const preview = text.length > 80 ? `${text.slice(0, 77)}…` : text;

  await sendPushNotifications(
    tokens,
    `💬 ${authorName} comentó en un torneo`,
    preview,
    { type: "comment", tournamentId }
  );
}