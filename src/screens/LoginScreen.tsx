import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, SafeAreaView, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import { useT } from '../i18n/useT';

type Mode = 'login' | 'register' | 'forgot';

const { height: SCREEN_H } = Dimensions.get('window');

// Fixed green palette — overrides any theme that drifts to teal
const G = {
  dark:    '#0A3D20',
  mid:     '#1B6B3A',
  light:   '#2E8B57',
  ghost:   '#EEF7F1',
  text:    '#134E2A',
};

export default function LoginScreen() {
  const { login, register, resetPassword } = useAuth();
  const { loginAdmin } = useAdmin();
  const t = useT();
  const s = getStyles();
  const [mode, setMode]       = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [form, setForm]       = useState({ name: '', email: '', phone: '', city: '', password: '', confirm: '', referral: '' });

  const set = (key: keyof typeof form) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const switchMode = (m: Mode) => { setMode(m); setError(''); setSuccess(''); };

  const submit = async () => {
    setError(''); setSuccess('');

    if (mode === 'forgot') {
      if (!form.email) { setError(t('login_err_email')); return; }
      setLoading(true);
      const result = await resetPassword(form.email);
      setLoading(false);
      if (result.success) setSuccess(t('login_err_reset_sent'));
      else setError(result.error ?? t('login_err_unknown'));
      return;
    }

    if (!form.email) { setError(t('login_err_fields')); return; }
    if (mode === 'login' && loginAdmin(form.email)) {
      setLoading(false);
      return;
    }
    if (!form.password) { setError(t('login_err_fields')); return; }
    if (mode === 'register') {
      if (!form.name) { setError(t('login_err_name')); return; }
      if (form.password !== form.confirm) { setError(t('login_err_pwd_match')); return; }
    }
    setLoading(true);

    const result = mode === 'login'
      ? await login(form.email, form.password)
      : await register({ name: form.name, email: form.email, phone: form.phone, city: form.city, password: form.password, referralCode: form.referral });
    setLoading(false);
    if (!result.success) setError(result.error ?? t('login_err_credentials'));
  };

  const FIELDS_LOGIN = [
    { key: 'email',    icon: 'mail-outline',        placeholder: t('login_email'),    keyboard: 'email-address', secure: false },
    { key: 'password', icon: 'lock-closed-outline',  placeholder: t('login_password'), keyboard: 'default',       secure: true  },
  ];
  const FIELDS_REGISTER = [
    { key: 'name',     icon: 'person-outline',           placeholder: t('login_name'),     keyboard: 'default',       secure: false },
    { key: 'phone',    icon: 'call-outline',             placeholder: t('login_phone'),    keyboard: 'phone-pad',     secure: false },
    { key: 'city',     icon: 'location-outline',         placeholder: t('login_city'),     keyboard: 'default',       secure: false },
    { key: 'email',    icon: 'mail-outline',             placeholder: t('login_email'),    keyboard: 'email-address', secure: false },
    { key: 'password', icon: 'lock-closed-outline',      placeholder: t('login_password'), keyboard: 'default',       secure: true  },
    { key: 'confirm',  icon: 'shield-checkmark-outline', placeholder: t('login_confirm'),  keyboard: 'default',       secure: true  },
    { key: 'referral', icon: 'gift-outline',             placeholder: 'Code d\'invitation (optionnel)', keyboard: 'default', secure: false },
  ];
  const FIELDS_FORGOT = [
    { key: 'email', icon: 'mail-outline', placeholder: t('login_email'), keyboard: 'email-address', secure: false },
  ];

  const fields = mode === 'login' ? FIELDS_LOGIN : mode === 'register' ? FIELDS_REGISTER : FIELDS_FORGOT;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />

      {/* ── Hero gradient ─────────────────────────────────── */}
      <LinearGradient
        colors={['#0A3D20', '#1B6B3A', '#2E8B57']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        {/* Decorative circles */}
        <View style={s.circleTopRight} />
        <View style={s.circleBottomLeft} />
        <View style={s.circleCenter} />

        <View style={s.logoWrap}>
          <Image
            source={require('../../assets/icon.png')}
            style={s.logoImage}
            resizeMode="contain"
          />
          <View style={s.taglineRow}>
            <View style={s.taglineDot} />
            <Text style={s.tagline}>{t('login_tagline')}</Text>
            <View style={s.taglineDot} />
          </View>
        </View>
      </LinearGradient>

      {/* ── Floating card ─────────────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.cardWrapper}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.card}>

            {/* Mode tabs */}
            {mode !== 'forgot' && (
              <View style={s.tabs}>
                {(['login', 'register'] as Mode[]).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.tab, mode === m && s.tabActive]}
                    onPress={() => switchMode(m)}
                  >
                    {mode === m && (
                      <LinearGradient
                        colors={[G.dark, G.mid]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={s.tabGradient}
                      />
                    )}
                    <Text style={[s.tabText, mode === m && s.tabTextActive]}>
                      {m === 'login' ? t('login_tab_login') : t('login_tab_register')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Forgot password header */}
            {mode === 'forgot' && (
              <View style={s.forgotHeader}>
                <TouchableOpacity onPress={() => switchMode('login')} style={s.backBtn}>
                  <View style={s.backIconWrap}>
                    <Ionicons name="arrow-back-outline" size={16} color={G.mid} />
                  </View>
                  <Text style={s.backText}>{t('login_back')}</Text>
                </TouchableOpacity>
                <Text style={s.forgotTitle}>{t('login_forgot_title')}</Text>
                <Text style={s.forgotSubtitle}>{t('login_forgot_desc')}</Text>
              </View>
            )}

            {/* Form fields */}
            <View style={s.form}>
              {fields.map((f, idx) => {
                const isConfirm = f.key === 'confirm';
                const visible   = isConfirm ? showConfirmPwd : showPwd;
                const toggle    = isConfirm ? () => setShowConfirmPwd(v => !v) : () => setShowPwd(v => !v);
                return (
                  <View key={f.key} style={[s.fieldRow, idx === fields.length - 1 && s.fieldRowLast]}>
                    <View style={s.fieldIconWrap}>
                      <Ionicons name={f.icon as any} size={17} color={G.mid} />
                    </View>
                    <TextInput
                      style={s.fieldInput}
                      placeholder={f.placeholder}
                      placeholderTextColor="#9EB5A4"
                      value={form[f.key as keyof typeof form]}
                      onChangeText={set(f.key as keyof typeof form)}
                      keyboardType={f.keyboard as any}
                      autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                      secureTextEntry={f.secure && !visible}
                    />
                    {f.secure && (
                      <TouchableOpacity onPress={toggle} style={s.eye}>
                        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={17} color="#9EB5A4" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {!!error && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {!!success && (
                <View style={s.successBox}>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#16A34A" />
                  <Text style={s.successText}>{success}</Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[s.submitBtn, loading && { opacity: 0.65 }]}
                onPress={submit}
                disabled={loading}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={[G.dark, G.mid]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.submitGradient}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons
                          name={mode === 'login' ? 'log-in-outline' : mode === 'register' ? 'person-add-outline' : 'send-outline'}
                          size={18} color="#fff"
                        />
                        <Text style={s.submitText}>
                          {mode === 'login' ? t('login_btn') : mode === 'register' ? t('login_register_btn') : t('login_send_link')}
                        </Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>

              {mode === 'login' && (
                <TouchableOpacity style={s.forgotBtn} onPress={() => switchMode('forgot')}>
                  <Text style={s.forgotText}>{t('login_forgot')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={s.footer}>{t('login_footer')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (): any => ({
  root: { flex: 1, backgroundColor: '#0A3D20' },

  // ── Hero ──────────────────────────────────────────────────
  hero: {
    height: SCREEN_H * 0.40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  circleTopRight: {
    position: 'absolute', top: -80, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleBottomLeft: {
    position: 'absolute', bottom: -50, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circleCenter: {
    position: 'absolute', top: '30%', left: '5%',
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  logoWrap: { alignItems: 'center', gap: 14 },
  logoImage: {
    width: SCREEN_H * 0.22, height: SCREEN_H * 0.22,
    maxWidth: 190, maxHeight: 190,
  },
  taglineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  taglineDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tagline: {
    fontSize: 12, color: 'rgba(255,255,255,0.8)',
    letterSpacing: 3, fontWeight: '700', textTransform: 'uppercase',
  },

  // ── Card ──────────────────────────────────────────────────
  cardWrapper: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:      { flexGrow: 1, justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingTop: 28, paddingBottom: 40, paddingHorizontal: 28,
    flex: 1,
    maxWidth: 520,
    alignSelf: 'center' as any,
    width: '100%' as any,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 20,
  },

  // ── Tabs ──────────────────────────────────────────────────
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F7',
    borderRadius: 18,
    padding: 5,
    marginBottom: 24,
  },
  tab: {
    flex: 1, paddingVertical: 12,
    alignItems: 'center', borderRadius: 14,
    overflow: 'hidden', position: 'relative',
  },
  tabActive: {},
  tabGradient: {
    ...{ position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12 },
  },
  tabText:       { fontSize: 13, fontWeight: '700', color: '#94A3B8', zIndex: 1 },
  tabTextActive: { color: '#fff' },

  // ── Form ──────────────────────────────────────────────────
  form: { gap: 11 },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F4F7FA',
    borderRadius: 16, paddingHorizontal: 16, height: 56,
    borderWidth: 1.5, borderColor: '#E8EDF2',
  },
  fieldRowLast: {},
  fieldIconWrap: {
    width: 32, alignItems: 'center', marginRight: 8,
  },
  fieldInput:  { flex: 1, fontSize: 15, color: '#1A2B1F' },
  eye: { padding: 4 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText:   { color: '#DC2626', fontSize: 13, flex: 1 },

  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#BBF7D0',
  },
  successText: { color: '#16A34A', fontSize: 13, flex: 1 },

  submitBtn:      { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  submitGradient: {
    height: 58, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 9,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },

  forgotBtn: { alignItems: 'center', paddingVertical: 12 },
  forgotText: { color: G.mid, fontSize: 13, fontWeight: '600' },

  forgotHeader: { marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  backIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: G.ghost,
    justifyContent: 'center', alignItems: 'center',
  },
  backText: { color: G.mid, fontSize: 14, fontWeight: '600' },
  forgotTitle:    { fontSize: 22, fontWeight: '800', color: '#1A2B1F', marginBottom: 6 },
  forgotSubtitle: { fontSize: 14, color: '#6B7F72', lineHeight: 20 },

  footer: { textAlign: 'center', color: '#9EB5A4', fontSize: 12, marginTop: 24 },
});
