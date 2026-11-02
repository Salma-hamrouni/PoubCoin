import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'poubcoin_streak';
const LAST_REPORT_KEY = 'poubcoin_last_report_date';

export async function getStreak(): Promise<number> {
  const val = await AsyncStorage.getItem(STREAK_KEY);
  return val ? parseInt(val) : 0;
}

export async function recordReportToday(): Promise<number> {
  const today     = new Date().toISOString().split('T')[0];
  const lastDate  = await AsyncStorage.getItem(LAST_REPORT_KEY);
  const streak    = await getStreak();

  if (lastDate === today) return streak; // already reported today

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = lastDate === yesterday ? streak + 1 : 1;

  await AsyncStorage.setItem(STREAK_KEY, String(newStreak));
  await AsyncStorage.setItem(LAST_REPORT_KEY, today);
  return newStreak;
}
