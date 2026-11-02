import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, query, where, onSnapshot,
  doc, updateDoc, getDoc, setDoc, increment, serverTimestamp, orderBy, deleteDoc,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import { useAuth } from './AuthContext';
import { scheduleValidationNotification, scheduleRewardNotification, sendMunicipalityPushNotification, scheduleStreakReminderNotification, scheduleProximityNotification } from '../utils/notifications';
import { findNearestMunicipality } from '../utils/geo';
import { getStreak, recordReportToday } from '../utils/streaks';

const WEEKLY_BONUS_KEY = 'poubcoin_weekly_bonus_week';
const OFFLINE_QUEUE_KEY = 'poubcoin_offline_queue';
const DAILY_BONUS_KEY = 'poubcoin_last_login_date';

const ACHIEVEMENTS = [
  { id: 'first_report',  check: (r: Report[], b: number) => r.some(x => x.status === 'validated') },
  { id: 'reports_10',    check: (r: Report[], b: number) => r.filter(x => x.status === 'validated').length >= 10 },
  { id: 'reports_50',    check: (r: Report[], b: number) => r.filter(x => x.status === 'validated').length >= 50 },
  { id: 'coins_100',     check: (r: Report[], b: number) => b >= 100 },
] as const;

function currentWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

export interface Report {
  id: string;
  imageUri: string;
  latitude: number;
  longitude: number;
  address: string;
  date: string;
  status: 'pending' | 'validated' | 'rejected';
  coins: number;
  userId: string;
  municipalityId?: string;
  adminComment?: string;
  afterImageUri?: string;
  afterDate?: string;
  afterValidated?: boolean;
}

export interface Transaction {
  id: string;
  type: 'earned' | 'spent';
  amount: number;
  label: string;
  date: string;
}

export interface DailyBonus { coins: number; day: number; isStreak7: boolean; }

interface WalletContextType {
  balance: number;
  reports: Report[];
  transactions: Transaction[];
  newlyValidated: Report | null;
  clearNewlyValidated: () => void;
  dailyBonus: DailyBonus | null;
  clearDailyBonus: () => void;
  addReport: (report: Omit<Report, 'id' | 'date' | 'status' | 'coins' | 'userId'>) => Promise<{ municipalityName: string; municipalityId: string }>;
  deleteReport: (reportId: string) => Promise<void>;
  spendCoins: (amount: number, rewardTitle?: string) => Promise<boolean>;
  addCoins: (amount: number, label?: string) => Promise<void>;
  updateReportLocation: (reportId: string, latitude: number, longitude: number, address: string) => Promise<void>;
  sendMessage: (reportId: string, text: string) => Promise<void>;
  addAfterPhoto: (reportId: string, imageUri: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newlyValidated, setNewlyValidated] = useState<Report | null>(null);
  const [dailyBonus, setDailyBonus] = useState<DailyBonus | null>(null);
  const prevReports = useRef<Report[]>([]);
  const pendingValidations = useRef<Report[]>([]);
  const validationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const achievementsChecked = useRef(false);

  useEffect(() => {
    if (!user) {
      setReports([]);
      setBalance(0);
      setTransactions([]);
      prevReports.current = [];
      return;
    }

    // Daily login bonus
    const today = new Date().toISOString().split('T')[0];
    AsyncStorage.getItem(DAILY_BONUS_KEY).then(async (lastDate) => {
      if (lastDate === today) return;
      await AsyncStorage.setItem(DAILY_BONUS_KEY, today);
      const streak = await getStreak();
      const day = ((streak - 1) % 7) + 1;
      const isStreak7 = day === 7;
      const coins = isStreak7 ? 50 : 10;
      const walletRef = doc(db, 'wallets', user.id);
      await updateDoc(walletRef, { balance: increment(coins) }).catch(() => {});
      await addDoc(collection(db, 'transactions', user.id, 'items'), {
        type: 'earned', amount: coins,
        label: isStreak7 ? '🎉 Bonus 7 jours consécutifs !' : '☀️ Bonus de connexion',
        date: new Date().toISOString(),
      }).catch(() => {});
      setDailyBonus({ coins, day, isStreak7 });
    }).catch(() => {});

    // Sync offline queue on startup
    AsyncStorage.getItem(OFFLINE_QUEUE_KEY).then(async (raw) => {
      if (!raw) return;
      const queue: any[] = JSON.parse(raw);
      if (!queue.length) return;
      const remaining: any[] = [];
      for (const item of queue) {
        try {
          await addDoc(collection(db, 'reports'), {
            ...item,
            status: 'pending',
            coins: 0,
            createdAt: serverTimestamp(),
          });
        } catch {
          remaining.push(item);
        }
      }
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    }).catch(() => {});

    const q = query(collection(db, 'reports'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const raw = d.data();
        // Normalize createdAt Firestore Timestamp → ISO string
        if (raw.createdAt?.toDate) raw.createdAt = raw.createdAt.toDate().toISOString();
        return { id: d.id, ...raw } as Report;
      });
      data.sort((a, b) => {
        const da = typeof a.date === 'string' ? a.date : '';
        const db2 = typeof b.date === 'string' ? b.date : '';
        return db2.localeCompare(da);
      });
      setReports(data);

      // Detect newly validated reports
      const prev = prevReports.current;
      if (prev.length > 0) {
        const newlyValidatedList = data.filter(r =>
          r.status === 'validated' &&
          prev.some(p => p.id === r.id && p.status === 'pending')
        );
        if (newlyValidatedList.length > 0) {
          setNewlyValidated(newlyValidatedList[0]);
          updateDoc(doc(db, 'users', user.id), {
            xp: increment(25 * newlyValidatedList.length),
            pendingXp: increment(-5 * newlyValidatedList.length),
          }).catch(() => {});
          // Batch notifications: debounce 3 s and send one grouped notification
          pendingValidations.current.push(...newlyValidatedList);
          if (validationDebounce.current) clearTimeout(validationDebounce.current);
          validationDebounce.current = setTimeout(() => {
            const batch = pendingValidations.current;
            pendingValidations.current = [];
            if (batch.length === 1) {
              scheduleValidationNotification(batch[0].address ?? '');
            } else if (batch.length > 1) {
              const totalCoins = batch.reduce((s, r) => s + (r.coins ?? 50), 0);
              scheduleValidationNotification(`${batch.length} signalements validés ! +${totalCoins} 🪙`);
            }
          }, 3000);
        }
      }
      prevReports.current = data;

      // Achievement auto-unlock (runs once per session after first data load)
      if (!achievementsChecked.current && data.length > 0) {
        achievementsChecked.current = true;
        getDoc(doc(db, 'users', user.id)).then(snap => {
          if (!snap.exists()) return;
          const current: string[] = snap.data().achievements ?? [];
          const toGrant = ACHIEVEMENTS
            .filter(a => !current.includes(a.id) && a.check(data, 0))
            .map(a => a.id);
          if (toGrant.length > 0) {
            updateDoc(doc(db, 'users', user.id), {
              achievements: [...current, ...toGrant],
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    }, () => {});

    const walletRef = doc(db, 'wallets', user.id);
    const unsubWallet = onSnapshot(walletRef, (snap) => {
      const bal = snap.exists() ? (snap.data().balance ?? 0) : 0;
      setBalance(bal);
      if (bal >= 100) {
        getDoc(doc(db, 'users', user.id)).then(usnap => {
          if (!usnap.exists()) return;
          const cur: string[] = usnap.data().achievements ?? [];
          if (!cur.includes('coins_100')) {
            updateDoc(doc(db, 'users', user.id), { achievements: [...cur, 'coins_100'] }).catch(() => {});
          }
        }).catch(() => {});
      }
    }, () => {});

    const txQ = query(
      collection(db, 'transactions', user.id, 'items'),
      orderBy('date', 'desc'),
    );
    const unsubTx = onSnapshot(txQ, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, () => {});

    return () => {
      unsub(); unsubWallet(); unsubTx();
      if (validationDebounce.current) clearTimeout(validationDebounce.current);
    };
  }, [user?.id]);

  // Proximity notifications: alert when another citizen reports nearby
  const proximityCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!user) return;
    const nearestMunicipalityId = prevReports.current[0]?.municipalityId;
    if (!nearestMunicipalityId) return;

    const q = query(
      collection(db, 'reports'),
      where('municipalityId', '==', nearestMunicipalityId),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(q, snap => {
      const others = snap.docs.filter(d => d.data().userId !== user.id);
      if (proximityCountRef.current !== null && others.length > proximityCountRef.current) {
        const newest = others[others.length - 1]?.data();
        if (newest?.address) scheduleProximityNotification(newest.address).catch(() => {});
      }
      proximityCountRef.current = others.length;
    }, () => {});
    return () => unsub();
  }, [user?.id, reports[0]?.municipalityId]);

  const addReport = async (report: Omit<Report, 'id' | 'date' | 'status' | 'coins' | 'userId'>): Promise<{ municipalityName: string; municipalityId: string }> => {
    if (!user) return { municipalityName: '', municipalityId: '' };

    const nearest = findNearestMunicipality(report.latitude, report.longitude);

    const currentStreak = await getStreak();
    const streakMultiplier = currentStreak >= 7 ? 2 : 1;
    const newStreak = await recordReportToday();
    scheduleStreakReminderNotification().catch(() => {});

    // XP +5 pour signalement en attente
    updateDoc(doc(db, 'users', user.id), { pendingXp: increment(5) }).catch(() => {});

    // Bonus hebdomadaire si on atteint 7 jours consécutifs cette semaine
    if (newStreak >= 7) {
      const weekKey = currentWeekKey();
      const lastBonus = await AsyncStorage.getItem(WEEKLY_BONUS_KEY);
      if (lastBonus !== weekKey) {
        try {
          await AsyncStorage.setItem(WEEKLY_BONUS_KEY, weekKey);
          const walletRef = doc(db, 'wallets', user.id);
          await updateDoc(walletRef, { balance: increment(50) });
          await addDoc(collection(db, 'transactions', user.id, 'items'), {
            type: 'earned', amount: 50,
            label: '🔥 Bonus 7 jours consécutifs !',
            date: new Date().toISOString(),
          });
        } catch {
          // Bonus non crédité — ne pas bloquer le signalement
        }
      }
    }

    let docRef: any;
    try {
    docRef = await addDoc(collection(db, 'reports'), {
      ...report,
      userId: user.id,
      userName: user.name,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      coins: 0,
      streakMultiplier,
      municipalityId: nearest.id,
      municipalityName: nearest.name,
      createdAt: serverTimestamp(),
    });

    // Write to municipality inbox so the mairie can see their pending reports
    addDoc(collection(db, 'municipalities', nearest.id, 'inbox'), {
      reportId: docRef.id,
      userId: user.id,
      userName: user.name,
      address: report.address,
      imageUri: report.imageUri,
      latitude: report.latitude,
      longitude: report.longitude,
      governorate: nearest.governorate,
      createdAt: serverTimestamp(),
      status: 'pending',
    }).catch(() => {});

    // Notify the nearest municipality if it has a registered push token
    try {
      const { getDoc } = await import('firebase/firestore');
      const munSnap = await getDoc(doc(db, 'municipalities', nearest.id));
      const pushToken: string | undefined = munSnap.data()?.pushToken;
      if (pushToken) {
        await sendMunicipalityPushNotification({
          pushToken,
          municipalityName: nearest.name,
          address: report.address,
          reportId: docRef.id,
          userName: user.name,
        });
      }
    } catch {
      // Non-critical — report is already saved
    }

    // Update neighborhood challenge progress for this city
    try {
      const { query: q2, where: w2, getDocs, arrayUnion } = await import('firebase/firestore');
      const city = (user as any).city || '';
      if (city) {
        const ncQ = q2(collection(db, 'neighborhoodChallenges'), w2('city', '==', city), w2('active', '==', true));
        const ncSnap = await getDocs(ncQ);
        await Promise.all(ncSnap.docs.map(ncDoc =>
          updateDoc(doc(db, 'neighborhoodChallenges', ncDoc.id), {
            current: increment(1),
            participants: arrayUnion(user.id),
          })
        ));
      }
    } catch {}
    } catch {
      // Réseau indisponible — sauvegarder dans la file hors-ligne
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: any[] = raw ? JSON.parse(raw) : [];
      queue.push({
        ...report,
        userId: user.id,
        userName: user.name,
        date: new Date().toISOString().split('T')[0],
        streakMultiplier,
        municipalityId: nearest.id,
        municipalityName: nearest.name,
        savedAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      throw new Error('offline');
    }
    return { municipalityName: nearest.name, municipalityId: nearest.id };
  };

  const deleteReport = async (reportId: string) => {
    await deleteDoc(doc(db, 'reports', reportId));
  };

  const updateReportLocation = async (reportId: string, latitude: number, longitude: number, address: string) => {
    await updateDoc(doc(db, 'reports', reportId), { latitude, longitude, address });
  };

  const sendMessage = async (reportId: string, text: string) => {
    if (!user) return;
    await addDoc(collection(db, 'messages', reportId, 'items'), {
      text,
      from: 'citizen',
      createdAt: new Date().toISOString(),
    });
  };

  const spendCoins = async (amount: number, rewardTitle?: string): Promise<boolean> => {
    if (!user || balance < amount) return false;
    const walletRef = doc(db, 'wallets', user.id);
    await updateDoc(walletRef, { balance: increment(-amount) });
    await addDoc(collection(db, 'transactions', user.id, 'items'), {
      type: 'spent',
      amount,
      label: rewardTitle ?? 'Récompense',
      date: new Date().toISOString(),
    });
    if (rewardTitle) scheduleRewardNotification(rewardTitle);
    return true;
  };

  const addCoins = async (amount: number, label = 'Bonus') => {
    if (!user) return;
    const walletRef = doc(db, 'wallets', user.id);
    await updateDoc(walletRef, { balance: increment(amount) });
    await addDoc(collection(db, 'transactions', user.id, 'items'), {
      type: 'earned', amount, label, date: new Date().toISOString(),
    });
  };

  const addAfterPhoto = async (reportId: string, imageUri: string) => {
    const url = await uploadImageToCloudinary(imageUri);
    await updateDoc(doc(db, 'reports', reportId), {
      afterImageUri: url,
      afterDate: new Date().toISOString().split('T')[0],
      afterValidated: false,
    });
  };

  const clearNewlyValidated = () => setNewlyValidated(null);
  const clearDailyBonus = () => setDailyBonus(null);

  return (
    <WalletContext.Provider value={{
      balance, reports, transactions,
      newlyValidated, clearNewlyValidated,
      dailyBonus, clearDailyBonus,
      addReport, deleteReport, spendCoins, addCoins, updateReportLocation, sendMessage,
      addAfterPhoto,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
