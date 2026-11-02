// Web stubs — expo-notifications is not supported on web
export async function registerForPushNotifications() { return null; }
export async function scheduleValidationNotification(_address: string) {}
export async function scheduleWelcomeNotification(_name: string) {}
export async function scheduleRewardNotification(_rewardTitle: string) {}
export async function scheduleStreakReminderNotification() {}
export async function scheduleAfterPhotoNotification(_address: string) {}
export async function getExpoPushToken(): Promise<string | null> { return null; }
export async function sendMunicipalityPushNotification(_params: {
  pushToken: string; municipalityName: string; address: string;
  reportId: string; userName: string;
}) {}
