import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Animated, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NetworkContextType { isOnline: boolean; }
const NetworkContext = createContext<NetworkContextType>({ isOnline: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-48)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      const connected = state.isConnected ?? true;
      setIsOnline(connected);
      if (!connected) {
        setVisible(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: Platform.OS !== 'web' }).start();
      } else {
        Animated.timing(slideAnim, { toValue: -48, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start(() => setVisible(false));
      }
    });
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
      {visible && (
        <Animated.View style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
          transform: [{ translateY: slideAnim }],
        }}>
          <View style={{
            backgroundColor: isOnline ? '#16A34A' : '#DC2626',
            paddingVertical: 10, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingTop: Platform.OS === 'ios' ? 52 : 10,
          }}>
            <Ionicons name={isOnline ? 'wifi' : 'wifi-outline'} size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 }}>
              {isOnline ? 'Connexion rétablie ✓' : 'Pas de connexion internet'}
            </Text>
            {!isOnline && (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                Les données seront sync dès le retour
              </Text>
            )}
          </View>
        </Animated.View>
      )}
    </NetworkContext.Provider>
  );
}

export function useNetwork() { return useContext(NetworkContext); }
