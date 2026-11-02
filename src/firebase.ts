import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyDNIvKfX12bHvwBwxqTCzsk1qwkZULiuq0',
  authDomain: 'poubcoin-31c41.firebaseapp.com',
  projectId: 'poubcoin-31c41',
  storageBucket: 'poubcoin-31c41.firebasestorage.app',
  messagingSenderId: '931711830149',
  appId: '1:931711830149:web:492be00043a6144343c1ec',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enable offline persistence: IndexedDB on web, memory cache on native (expo doesn't support IndexedDB)
export const db = initializeFirestore(app, {
  localCache: Platform.OS === 'web'
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager(), cacheSizeBytes: CACHE_SIZE_UNLIMITED })
    : memoryLocalCache(),
});
