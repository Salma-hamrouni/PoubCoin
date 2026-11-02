import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const isNative = Platform.OS !== 'web';

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications() {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function scheduleValidationNotification(address: string) {
  if (!isNative) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Signalement validé !',
      body: `Votre signalement à "${address}" a été vérifié. +50 🪙 ajoutés à votre portefeuille !`,
      data: { type: 'validation' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
  });
}

export async function scheduleWelcomeNotification(name: string) {
  if (!isNative) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Bienvenue ${name} ! 🌿`,
      body: 'Commencez à signaler des déchets et gagnez vos premiers PoubCoins !',
      data: { type: 'welcome' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}

export async function scheduleRewardNotification(rewardTitle: string) {
  if (!isNative) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎁 Bon généré avec succès !',
      body: `Votre "${rewardTitle}" est prêt à être utilisé chez le sponsor.`,
      data: { type: 'reward' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function scheduleStreakReminderNotification() {
  if (!isNative) return;
  // Cancel any existing reminder so we don't stack them
  await Notifications.cancelAllScheduledNotificationsAsync();
  // Fire at 8 PM today (or in 30s if past 8 PM already for testing purposes)
  const now = new Date();
  const target = new Date(now);
  target.setHours(20, 0, 0, 0);
  const secondsUntil = Math.max(30, Math.floor((target.getTime() - now.getTime()) / 1000));
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Ne brise pas ta série !',
      body: 'Tu n\'as pas encore signalé de déchet aujourd\'hui. Maintiens ta série et gagne plus de PoubCoins !',
      data: { type: 'streak_reminder' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil },
  });
}

export async function scheduleAfterPhotoNotification(address: string) {
  if (!isNative) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📸 La zone a été nettoyée !',
      body: `Ajoutez la photo "après" pour votre signalement à "${address}" et inspirez la communauté.`,
      data: { type: 'after_photo' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}

export async function scheduleProximityNotification(address: string) {
  if (!isNative) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📍 Déchet signalé près de chez vous !',
      body: `Un citoyen vient de signaler un déchet à "${address}". Vous pouvez aider !`,
      data: { type: 'proximity' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}

export async function sendMunicipalityPushNotification(params: {
  pushToken: string;
  municipalityName: string;
  address: string;
  reportId: string;
  userName: string;
}) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: params.pushToken,
        title: `🗑️ Nouveau signalement — ${params.municipalityName}`,
        body: `${params.userName} a signalé un déchet à : ${params.address}`,
        data: { type: 'new_report', reportId: params.reportId },
        sound: 'default',
        priority: 'high',
        channelId: 'municipality',
      }),
    });
  } catch {
    // Silent fail — notification is non-critical
  }
}
