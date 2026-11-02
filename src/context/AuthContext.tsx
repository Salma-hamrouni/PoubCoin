import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, onSnapshot,
  collection, addDoc, query, where, getDocs, increment, arrayUnion,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../firebase';
import { getExpoPushToken } from '../utils/notifications';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  avatar: string;
  photoURL?: string;
  joinedAt: string;
  bannerColor?: string;
  role?: 'citizen' | 'municipality_admin';
  municipalityId?: string;
  municipalityName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  redeemReferralCode: (code: string, forUserId: string, forUserName: string) => Promise<boolean>;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  referralCode?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loggingOut = useRef(false);
  const userUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Safety timeout — don't block UI more than 2s if Firebase is slow
    const timeout = setTimeout(() => setIsLoading(false), 2000);

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);

      if (!firebaseUser || firebaseUser.isAnonymous) {
        // Signed out — always clean up the Firestore listener
        if (userUnsubRef.current) { userUnsubRef.current(); userUnsubRef.current = null; }
        // setUser(null) already called synchronously in logout(); avoid a redundant update
        // that could overwrite a new user who logged in during the transition
        if (!loggingOut.current) setUser(null);
        setIsLoading(false);
        return;
      }

      // New user authenticated — attach their Firestore listener regardless of loggingOut state
      // (race condition: user can sign in while the previous signOut() promise is still pending)
      if (userUnsubRef.current) userUnsubRef.current();
      userUnsubRef.current = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.blocked) {
            auth.signOut();
            setUser(null);
          } else {
            setUser({ id: firebaseUser.uid, ...data } as User);
          }
        }
        setIsLoading(false);
      }, () => setIsLoading(false));

      if (Platform.OS !== 'web') {
        getExpoPushToken().then(token => {
          if (token) updateDoc(doc(db, 'users', firebaseUser.uid), { pushToken: token }).catch(() => {});
        });
      }
    });
    return () => { clearTimeout(timeout); unsub(); if (userUnsubRef.current) userUnsubRef.current(); };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists() && snap.data().blocked) {
        await auth.signOut();
        return { success: false, error: 'Ce compte a été désactivé par un administrateur.' };
      }
      // If the Firestore user document was lost, recreate it from Firebase Auth data
      if (!snap.exists()) {
        const recovered = {
          name:         cred.user.displayName ?? email.split('@')[0],
          email:        cred.user.email ?? email,
          phone:        '',
          city:         '',
          avatar:       '🌱',
          joinedAt:     new Date().toISOString().split('T')[0],
          referralCode: `POUB-${cred.user.uid.slice(0, 6).toUpperCase()}`,
        };
        await setDoc(doc(db, 'users', cred.user.uid), recovered);
      }
      // onSnapshot listener (set up by onAuthStateChanged) will call setUser
      if (Platform.OS !== 'web') {
        getExpoPushToken().then(token => {
          if (token) updateDoc(doc(db, 'users', cred.user.uid), { pushToken: token }).catch(() => {});
        });
      }
      return { success: true };
    } catch (e: any) {
      const code = e?.code ?? '';
      const msg =
        ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(code)
          ? 'Email ou mot de passe incorrect'
        : code === 'auth/invalid-email'
          ? 'Adresse email invalide'
        : code === 'auth/too-many-requests'
          ? 'Trop de tentatives. Réessayez plus tard.'
        : code === 'auth/network-request-failed'
          ? 'Erreur réseau. Vérifiez votre connexion.'
        : code === 'auth/user-disabled'
          ? 'Ce compte a été désactivé.'
        : 'Email ou mot de passe incorrect';
      return { success: false, error: msg };
    }
  };

  const redeemReferralCode = async (code: string, forUserId: string, forUserName: string) => {
    try {
      const upperCode = code.trim().toUpperCase();
      const q = query(collection(db, 'users'), where('referralCode', '==', upperCode));
      const snap = await getDocs(q);
      if (snap.empty) return false;
      const referrerDoc = snap.docs[0];
      const referrerId = referrerDoc.id;
      if (referrerId === forUserId) return false;
      // Check the current user hasn't already redeemed a code
      const mySnap = await getDoc(doc(db, 'users', forUserId));
      if (mySnap.data()?.referredBy) return false;
      await Promise.all([
        // +50 coins referrer
        updateDoc(doc(db, 'wallets', referrerId), { balance: increment(50) }).catch(() => {}),
        addDoc(collection(db, 'transactions', referrerId, 'items'), {
          type: 'earned', amount: 50,
          label: `🤝 Parrainage de ${forUserName}`,
          date: new Date().toISOString(),
        }),
        // +50 coins new user (wallet may not exist yet → merge)
        setDoc(doc(db, 'wallets', forUserId), { balance: increment(50) }, { merge: true }),
        addDoc(collection(db, 'transactions', forUserId, 'items'), {
          type: 'earned', amount: 50,
          label: '🤝 Bonus code d\'invitation',
          date: new Date().toISOString(),
        }),
        // record referral on both sides
        updateDoc(doc(db, 'users', forUserId), { referredBy: referrerId }),
        updateDoc(doc(db, 'users', referrerId), { referredUsers: arrayUnion(forUserId) }),
      ]);
      return true;
    } catch {
      return false;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await firebaseUpdateProfile(cred.user, { displayName: data.name });
      const myReferralCode = `POUB-${cred.user.uid.slice(0, 6).toUpperCase()}`;
      const newUser: Omit<User, 'id'> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        city: data.city,
        avatar: '🌱',
        joinedAt: new Date().toISOString().split('T')[0],
      };
      await setDoc(doc(db, 'users', cred.user.uid), { ...newUser, referralCode: myReferralCode });
      setUser({ id: cred.user.uid, ...newUser });
      // Redeem invite code if provided
      if (data.referralCode) {
        await redeemReferralCode(data.referralCode, cred.user.uid, data.name);
      }
      // Save push token to Firestore for real push notifications
      if (Platform.OS !== 'web') {
        getExpoPushToken().then(token => {
          if (token) updateDoc(doc(db, 'users', cred.user.uid), { pushToken: token }).catch(() => {});
        });
      }
      return { success: true };
    } catch (e: any) {
      const msg =
        e.code === 'auth/email-already-in-use'
          ? 'Cet email est déjà utilisé'
          : e.code === 'auth/weak-password'
          ? 'Le mot de passe doit contenir au moins 6 caractères'
          : e.code === 'auth/invalid-email'
          ? 'Adresse email invalide'
          : 'Une erreur est survenue';
      return { success: false, error: msg };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (e: any) {
      const msg =
        e.code === 'auth/user-not-found' ? 'Aucun compte trouvé avec cet email'
        : e.code === 'auth/invalid-email' ? 'Adresse email invalide'
        : e.code === 'auth/network-request-failed' ? 'Erreur réseau. Vérifiez votre connexion.'
        : 'Une erreur est survenue';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    loggingOut.current = true;
    setUser(null);          // immediate UI switch
    signOut(auth)
      .catch(() => {})
      .finally(() => { loggingOut.current = false; });
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    try {
      await updateDoc(doc(db, 'users', user.id), data);
    } catch {
      // Rollback optimistic update si Firestore échoue
      setUser(user);
      throw new Error('Impossible de sauvegarder le profil. Réessayez.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, resetPassword, logout, updateProfile, redeemReferralCode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
