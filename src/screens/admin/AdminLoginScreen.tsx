import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdmin } from '../../context/AdminContext';

export default function AdminLoginScreen({ onBack }: { onBack: () => void }) {
  const { loginAdmin } = useAdmin();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const submit = async () => {
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const ok = loginAdmin(email, password);
    setLoading(false);
    if (!ok) setError('Email ou mot de passe incorrect');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1F14' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1F14" />
      <LinearGradient
        colors={['#0D1F14', '#134E2A', '#0D1F14']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Decorative circles */}
      <View style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(27,107,58,0.12)' }} />
      <View style={{ position: 'absolute', bottom: 80, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(27,107,58,0.08)' }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>

          {/* Back */}
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 4 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Retour</Text>
          </TouchableOpacity>

          {/* Logo + Title */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 42 }}>🛡️</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Espace Municipal</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>Administration PoubCoin</Text>
          </View>

          {/* Form card */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>

            {/* Email field */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: focusedField === 'email' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
              borderRadius: 14, paddingHorizontal: 14, height: 54, marginBottom: 12,
              borderWidth: 1.5, borderColor: focusedField === 'email' ? 'rgba(74,222,128,0.6)' : 'rgba(255,255,255,0.08)',
            }}>
              <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? '#4ADE80' : 'rgba(255,255,255,0.4)'} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: '#fff' }}
                placeholder="Email administrateur"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password field */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: focusedField === 'password' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
              borderRadius: 14, paddingHorizontal: 14, height: 54, marginBottom: 20,
              borderWidth: 1.5, borderColor: focusedField === 'password' ? 'rgba(74,222,128,0.6)' : 'rgba(255,255,255,0.08)',
            }}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? '#4ADE80' : 'rgba(255,255,255,0.4)'} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: '#fff' }}
                placeholder="Mot de passe (optionnel)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={{ padding: 4 }}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={{ color: '#FCA5A5', fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            {/* Submit button */}
            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#1B6B3A', '#2E8B57']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ height: 54, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="shield-checkmark" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Accéder au tableau de bord</Text>
                    </>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Demo hint */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(74,222,128,0.8)" />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              Demo : <Text style={{ color: 'rgba(74,222,128,0.8)', fontWeight: '700' }}>admin@poubcoin.tn</Text>
            </Text>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
