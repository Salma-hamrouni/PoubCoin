import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  collection, onSnapshot, doc, updateDoc,
  deleteDoc, addDoc, increment, setDoc, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getExpoPushToken } from '../utils/notifications';

export interface AdminReport {
  id: string;
  userId: string;
  userName: string;
  imageUri: string;
  latitude: number;
  longitude: number;
  address: string;
  date: string;
  status: 'pending' | 'validated' | 'rejected';
  coins: number;
  comment?: string;
}

export interface Sponsor {
  id: string;
  name: string;
  title: string;
  description: string;
  coins: number;
  category: string;
  emoji: string;
  stock: number;
  active: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  city: string;
  avatar: string;
  joinedAt: string;
  blocked?: boolean;
  role?: 'citizen' | 'municipality_admin';
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  reward: number;
  active: boolean;
  deadline?: string;
}

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
  loginAdmin: (email: string, password?: string) => boolean;
  logoutAdmin: () => void;
  // Reports
  reports: AdminReport[];
  validateReport: (id: string, comment?: string) => Promise<void>;
  rejectReport: (id: string, comment?: string) => Promise<void>;
  // Sponsors
  sponsors: Sponsor[];
  updateSponsor: (id: string, data: Partial<Sponsor>) => Promise<void>;
  deleteSponsor: (id: string) => Promise<void>;
  addSponsor: (s: Omit<Sponsor, 'id'>) => Promise<void>;
  // Users
  users: AdminUser[];
  blockUser: (id: string) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  giveCoins: (userId: string, amount: number, label?: string) => Promise<void>;
  // Challenges
  challenges: Challenge[];
  addChallenge: (c: Omit<Challenge, 'id'>) => Promise<void>;
  updateChallenge: (id: string, data: Partial<Challenge>) => Promise<void>;
  deleteChallenge: (id: string) => Promise<void>;
  // Settings
  coinsPerValidation: number;
  updateCoinsPerValidation: (n: number) => Promise<void>;
  // Notifications
  sendPushToAll: (title: string, body: string, target?: 'all' | 'inactive' | 'top') => Promise<void>;
  // Migration
  fixReportData: () => Promise<{ fixed: number; skipped: number }>;
}

const AdminContext = createContext<AdminContextType | null>(null);

const INITIAL_SPONSORS: Omit<Sponsor, 'id'>[] = [
  { name: 'Monoprix',       title: 'Bon 5 DT',        description: 'Valable en caisse',   coins: 50,  category: 'shopping',  emoji: '🛒', stock: 20, active: true  },
  { name: 'Métro Tunis',    title: 'Ticket gratuit',   description: 'Un trajet simple',    coins: 30,  category: 'transport', emoji: '🚇', stock: 50, active: true  },
  { name: 'Pizza Hut',      title: 'Pizza offerte',    description: 'Pizza individuelle',  coins: 100, category: 'food',      emoji: '🍕', stock: 10, active: true  },
  { name: 'Géant',          title: 'Bon 10 DT',        description: 'Achat > 30 DT',       coins: 80,  category: 'shopping',  emoji: '🏪', stock: 15, active: true  },
  { name: 'Cinéma Colisée', title: 'Place cinéma',     description: 'Entrée standard',     coins: 70,  category: 'culture',   emoji: '🎬', stock: 8,  active: false },
  { name: 'Café Sarra',     title: 'Café + Croissant', description: 'Le matin',            coins: 25,  category: 'food',      emoji: '☕', stock: 30, active: true  },
];

const INITIAL_CHALLENGES: Omit<Challenge, 'id'>[] = [
  { title: 'Débutant',    description: 'Faites votre premier signalement',       emoji: '🌱', target: 1,  reward: 10,  active: true  },
  { title: 'Actif',       description: 'Signalez 5 déchets cette semaine',       emoji: '⚡', target: 5,  reward: 50,  active: true  },
  { title: 'Champion',    description: 'Atteignez 10 signalements validés',      emoji: '🏆', target: 10, reward: 100, active: true  },
  { title: 'Explorateur', description: 'Signalez dans 3 zones différentes',      emoji: '🗺️', target: 3,  reward: 75,  active: false },
];

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin,   setIsAdmin]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reports,   setReports]   = useState<AdminReport[]>([]);
  const [sponsors,  setSponsors]  = useState<Sponsor[]>([]);
  const [users,     setUsers]     = useState<AdminUser[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [coinsPerValidation, setCoinsPerValidation] = useState(50);
  const autoFixDone = React.useRef(false);

  // Auto-migration: fix userName & zone in Firestore once per admin session
  useEffect(() => {
    if (!isAdmin || autoFixDone.current || reports.length === 0 || users.length === 0) return;
    autoFixDone.current = true;
    fixReportData().catch(() => {});
  }, [isAdmin, reports.length, users.length]);

  useEffect(() => {
    if (!isAdmin) return;

    setIsLoading(true);
    let loadedCount = 0;
    const totalCollections = 4;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= totalCollections) setIsLoading(false);
    };

    // Mode hors-ligne : charger le cache d'abord
    AsyncStorage.getItem('cache_reports').then(cached => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as AdminReport[];
          if (parsed.length > 0) setReports(parsed);
        } catch {}
      }
    });

    const unsubReports = onSnapshot(collection(db, 'reports'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminReport));
      const toStr = (v: any) => v?.toDate ? v.toDate().toISOString() : (typeof v === 'string' ? v : '');
      data.sort((a, b) => toStr(b.date).localeCompare(toStr(a.date)));
      setReports(data);
      // Sauvegarder dans le cache pour mode hors-ligne
      AsyncStorage.setItem('cache_reports', JSON.stringify(
        data.map(r => ({ ...r, date: toStr((r as any).createdAt ?? r.date) }))
      )).catch(() => {});
      checkDone();
    }, () => {
      // Firestore inaccessible : le cache déjà chargé reste actif
      checkDone();
    });

    const unsubSponsors = onSnapshot(collection(db, 'sponsors'), async snap => {
      if (snap.empty) {
        for (const s of INITIAL_SPONSORS) await addDoc(collection(db, 'sponsors'), s);
        checkDone();
        return;
      }
      setSponsors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sponsor)));
      checkDone();
    }, () => checkDone());

    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser)));
      checkDone();
    }, () => checkDone());

    const unsubChallenges = onSnapshot(collection(db, 'challenges'), async snap => {
      if (snap.empty) {
        for (const c of INITIAL_CHALLENGES) await addDoc(collection(db, 'challenges'), c);
        checkDone();
        return;
      }
      setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge)));
      checkDone();
    }, () => checkDone());

    import('firebase/firestore').then(({ getDoc }) =>
      getDoc(doc(db, 'settings', 'main')).then(snap => {
        if (snap.exists() && snap.data()?.coinsPerValidation !== undefined) {
          setCoinsPerValidation(snap.data()!.coinsPerValidation);
        }
      }).catch(() => {})
    );

    return () => { unsubReports(); unsubSponsors(); unsubUsers(); unsubChallenges(); };
  }, [isAdmin]);

  const loginAdmin = (email: string, _password?: string) => {
    if (email.trim().toLowerCase() === 'admin@poubcoin.tn') {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
    setReports([]);
    setSponsors([]);
    setUsers([]);
    setChallenges([]);
  };

  const sendPushToUser = async (userId: string, title: string, body: string, data?: Record<string, any>) => {
    try {
      const { getDoc: gd } = await import('firebase/firestore');
      const userSnap = await gd(doc(db, 'users', userId));
      const pushToken = userSnap.data()?.pushToken;
      if (!pushToken) return;
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ to: pushToken, title, body, data: data ?? {}, sound: 'default', priority: 'high' }),
      });
    } catch {}
  };

  const logAdminAction = async (action: string, reportId: string, extra?: Record<string, any>) => {
    try {
      await addDoc(collection(db, 'adminLogs'), {
        action,
        reportId,
        ...extra,
        createdAt: serverTimestamp(),
      });
    } catch {}
  };

  // Feature 9 — Webhook vers DashGen : notifie que les données PoubCoin ont changé
  const notifyDashGen = async (action: string, reportId: string) => {
    const webhookUrl = process.env.EXPO_PUBLIC_DASHGEN_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'poubcoin', event: action, reportId, ts: Date.now() }),
      });
    } catch {/* silencieux — ne pas bloquer l'action admin */}
  };

  const validateReport = async (id: string, comment?: string) => {
    const { getDoc } = await import('firebase/firestore');
    const reportRef = doc(db, 'reports', id);
    const reportSnap = await getDoc(reportRef);
    const data = reportSnap.data();
    const multiplier: number = data?.streakMultiplier ?? 1;
    const awardedCoins = coinsPerValidation * multiplier;
    await updateDoc(reportRef, { status: 'validated', coins: awardedCoins, adminComment: comment ?? '', validatedAt: serverTimestamp() });
    if (data?.userId) {
      const walletRef = doc(db, 'wallets', data.userId);
      const walletSnap = await getDoc(walletRef);
      if (walletSnap.exists()) {
        await updateDoc(walletRef, { balance: increment(awardedCoins) });
      } else {
        await setDoc(walletRef, { balance: awardedCoins, userId: data.userId });
      }
      const streakLabel = multiplier > 1 ? ` 🔥 ×${multiplier} bonus série !` : '';
      await addDoc(collection(db, 'transactions', data.userId, 'items'), {
        type: 'earned',
        amount: awardedCoins,
        label: `Signalement validé — ${data.address?.split(',')[0] ?? 'déchet'}${streakLabel}`,
        date: new Date().toISOString(),
      });
      await sendPushToUser(
        data.userId,
        multiplier > 1 ? `✅ Validé + bonus série 🔥 ×${multiplier} !` : '✅ Signalement validé !',
        `Votre signalement à "${data.address?.split(',')[0] ?? 'votre zone'}" a été approuvé. +${awardedCoins} 🪙 crédités !`,
        { type: 'validation', reportId: id }
      );
      // Suggest after-photo
      await sendPushToUser(
        data.userId,
        '📸 La zone sera bientôt nettoyée !',
        `Repassez à "${data.address?.split(',')[0] ?? 'la zone'}" pour prendre la photo "après" et gagner un bonus communautaire.`,
        { type: 'after_photo', reportId: id }
      );
    }
    await logAdminAction('validate', id, { comment: comment ?? '' });
    notifyDashGen('validate', id);
  };

  const rejectReport = async (id: string, comment?: string) => {
    await updateDoc(doc(db, 'reports', id), { status: 'rejected', adminComment: comment ?? '' });
    await logAdminAction('reject', id, { comment: comment ?? '' });
    notifyDashGen('reject', id);
    const { getDoc: gd } = await import('firebase/firestore');
    const rejSnap = await gd(doc(db, 'reports', id));
    const rejData = rejSnap.data();
    if (rejData?.userId) {
      await sendPushToUser(
        rejData.userId,
        '❌ Signalement rejeté',
        `Votre signalement à "${rejData.address?.split(',')[0] ?? 'votre zone'}" n'a pas pu être validé. ${comment ? `Raison : ${comment}` : ''}`,
        { type: 'rejection', reportId: id }
      );
    }
  };

  const updateSponsor = async (id: string, data: Partial<Sponsor>) => {
    await updateDoc(doc(db, 'sponsors', id), data);
  };
  const deleteSponsor = async (id: string) => { await deleteDoc(doc(db, 'sponsors', id)); };
  const addSponsor    = async (s: Omit<Sponsor, 'id'>) => { await addDoc(collection(db, 'sponsors'), s); };

  const blockUser   = async (id: string) => { await updateDoc(doc(db, 'users', id), { blocked: true }); };
  const unblockUser = async (id: string) => { await updateDoc(doc(db, 'users', id), { blocked: false }); };
  const deleteUser  = async (id: string) => { await deleteDoc(doc(db, 'users', id)); };

  const giveCoins = async (userId: string, amount: number, label = 'Bonus admin') => {
    const walletRef = doc(db, 'wallets', userId);
    const { getDoc: gd } = await import('firebase/firestore');
    const snap = await gd(walletRef);
    if (snap.exists()) {
      await updateDoc(walletRef, { balance: increment(amount) });
    } else {
      await setDoc(walletRef, { balance: amount, userId });
    }
    await addDoc(collection(db, 'transactions', userId, 'items'), {
      type: 'earned', amount, label, date: new Date().toISOString(),
    });
    await sendPushToUser(userId, '🪙 Coins reçus !', `${amount} PoubCoins ont été ajoutés à votre portefeuille. ${label}`, { type: 'bonus' });
  };

  const addChallenge    = async (c: Omit<Challenge, 'id'>) => { await addDoc(collection(db, 'challenges'), c); };
  const updateChallenge = async (id: string, data: Partial<Challenge>) => { await updateDoc(doc(db, 'challenges', id), data); };
  const deleteChallenge = async (id: string) => { await deleteDoc(doc(db, 'challenges', id)); };

  const updateCoinsPerValidation = async (n: number) => {
    setCoinsPerValidation(n);
    await setDoc(doc(db, 'settings', 'main'), { coinsPerValidation: n }, { merge: true });
  };

  const fixReportData = async (): Promise<{ fixed: number; skipped: number }> => {
    const { getDocs: gd, writeBatch, doc: d } = await import('firebase/firestore');
    const [reportsSnap, usersSnap] = await Promise.all([
      gd(collection(db, 'reports')),
      gd(collection(db, 'users')),
    ]);

    // Build UID → name map from users collection
    const nameMap: Record<string, string> = {};
    usersSnap.docs.forEach(u => {
      const data = u.data();
      const name = data.name ?? data.displayName ?? data.userName ?? '';
      if (name) nameMap[u.id] = name;
    });

    const batch = writeBatch(db);
    let fixed = 0;
    let skipped = 0;

    reportsSnap.docs.forEach(snap => {
      const r = snap.data();
      const correctName = nameMap[r.userId] ?? '';
      const zone = r.address ? String(r.address).split(',')[0].trim() : (r.zone ?? '');

      // A userName is "wrong" if it looks like a UID (no spaces, >20 chars, no @) or is empty
      const currentName: string = r.userName ?? '';
      const isUid = !currentName || (currentName.length > 20 && !currentName.includes(' ') && !currentName.includes('@'));
      const needsNameFix = isUid && correctName;
      const needsZoneFix = !r.zone && zone;

      if (needsNameFix || needsZoneFix) {
        const update: Record<string, string> = {};
        if (needsNameFix) update.userName = correctName;
        if (needsZoneFix) update.zone = zone;
        batch.update(d(db, 'reports', snap.id), update);
        fixed++;
      } else {
        skipped++;
      }
    });

    await batch.commit();
    return { fixed, skipped };
  };

  const sendPushToAll = async (title: string, body: string, target: 'all' | 'inactive' | 'top' = 'all') => {
    const usersSnap = await getDocs(collection(db, 'users'));
    let userDocs = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // Filter by target
    if (target === 'inactive') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffStr = cutoff.toISOString();
      const activeUserIds = new Set(
        reports
          .filter(r => {
            const raw = (r as any).createdAt;
            const dateStr = raw?.toDate ? raw.toDate().toISOString() : (typeof raw === 'string' ? raw : r.date ?? '');
            return dateStr >= cutoffStr;
          })
          .map(r => r.userId)
      );
      userDocs = userDocs.filter((u: any) => !activeUserIds.has(u.id));
    } else if (target === 'top') {
      const countMap: Record<string, number> = {};
      reports.filter(r => r.status === 'validated').forEach(r => {
        countMap[r.userId] = (countMap[r.userId] ?? 0) + 1;
      });
      const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
      const topIds = new Set(sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2))).map(([id]) => id));
      userDocs = userDocs.filter((u: any) => topIds.has(u.id));
    }

    // Save notification to Firestore (in-app notifications)
    await addDoc(collection(db, 'notifications'), {
      title, body, target,
      createdAt: serverTimestamp(),
      readBy: [],
    });

    // Send Expo push notifications to native users
    const tokens = userDocs.map((u: any) => u.pushToken).filter(Boolean);
    if (tokens.length === 0) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map((to: string) => ({ to, title, body, sound: 'default', priority: 'high' }))),
    });
  };

  return (
    <AdminContext.Provider value={{
      isAdmin, isLoading, loginAdmin, logoutAdmin,
      reports, validateReport, rejectReport,
      sponsors, updateSponsor, deleteSponsor, addSponsor,
      users, blockUser, unblockUser, deleteUser, giveCoins,
      challenges, addChallenge, updateChallenge, deleteChallenge,
      coinsPerValidation, updateCoinsPerValidation,
      sendPushToAll, fixReportData,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
