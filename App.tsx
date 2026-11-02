import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, View, Text, ActivityIndicator, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';

import { WalletProvider } from './src/context/WalletContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { AdminProvider, useAdmin } from './src/context/AdminContext';
import { AdminPrefsProvider, useAdminPrefs } from './src/context/AdminPrefsContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useT } from './src/i18n/useT';
import { registerForPushNotifications, scheduleWelcomeNotification } from './src/utils/notifications';
import { colors } from './src/theme';

import OnboardingScreen    from './src/screens/OnboardingScreen';
import LoginScreen         from './src/screens/LoginScreen';
import HomeScreen          from './src/screens/HomeScreen';
import CameraScreen        from './src/screens/CameraScreen';
import MarketplaceScreen   from './src/screens/MarketplaceScreen';
import MapScreen           from './src/screens/MapScreen';
import ProfileScreen       from './src/screens/ProfileScreen';
import LeaderboardScreen   from './src/screens/LeaderboardScreen';
import HistoryScreen       from './src/screens/HistoryScreen';
import ChatbotScreen       from './src/screens/ChatbotScreen';
import ChallengesScreen    from './src/screens/ChallengesScreen';
import StatsScreen         from './src/screens/StatsScreen';
import MessageScreen       from './src/screens/MessageScreen';
import VictoryScreen       from './src/screens/VictoryScreen';
import WasteAIScreen           from './src/screens/WasteAIScreen';
import MonthlyReportScreen     from './src/screens/MonthlyReportScreen';
import NotificationsScreen     from './src/screens/NotificationsScreen';
import TeamScreen          from './src/screens/TeamScreen';
import TeamChatScreen      from './src/screens/TeamChatScreen';
import VoteScreen          from './src/screens/VoteScreen';
import FeedScreen          from './src/screens/FeedScreen';
import ExploreScreen          from './src/screens/ExploreScreen';
import EventsScreen           from './src/screens/EventsScreen';
import PlantTreeScreen        from './src/screens/PlantTreeScreen';
import NearbyMissionsScreen   from './src/screens/NearbyMissionsScreen';
import PersonalizeScreen      from './src/screens/PersonalizeScreen';
import CitizenStoriesScreen   from './src/screens/CitizenStoriesScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import ReferralScreen             from './src/screens/ReferralScreen';
import ReportAppealScreen         from './src/screens/ReportAppealScreen';
import ReportStatusScreen         from './src/screens/ReportStatusScreen';
import CityLeaderboardScreen      from './src/screens/CityLeaderboardScreen';
import ReportCommentsScreen       from './src/screens/ReportCommentsScreen';
import StreakFreezeScreen         from './src/screens/StreakFreezeScreen';
import AchievementLeaderboardScreen from './src/screens/AchievementLeaderboardScreen';
import CommunityScreen              from './src/screens/CommunityScreen';
import ImpactScreen                 from './src/screens/ImpactScreen';
import PublicProfileScreen          from './src/screens/PublicProfileScreen';
import AuctionScreen                from './src/screens/AuctionScreen';
import VoiceReportScreen           from './src/screens/VoiceReportScreen';
import WasteSortingGameScreen      from './src/screens/WasteSortingGameScreen';
import FriendsScreen               from './src/screens/FriendsScreen';
import BusinessPortalScreen        from './src/screens/BusinessPortalScreen';
import WastePickupScreen           from './src/screens/WastePickupScreen';
import AdminFraudScreen            from './src/screens/admin/AdminFraudScreen';
import AdminAIChatScreen          from './src/screens/admin/AdminAIChatScreen';
import AdminTimelineScreen        from './src/screens/admin/AdminTimelineScreen';
import AdminEnvironmentScreen     from './src/screens/admin/AdminEnvironmentScreen';
import AdminNeighborhoodScreen    from './src/screens/admin/AdminNeighborhoodScreen';
import AdminCitizenScoresScreen   from './src/screens/admin/AdminCitizenScoresScreen';
import AdminReplayScreen          from './src/screens/admin/AdminReplayScreen';
import AdminReportExportScreen    from './src/screens/admin/AdminReportExportScreen';
import AdminDroneScreen           from './src/screens/admin/AdminDroneScreen';
import AdminMunicipalitiesScreen  from './src/screens/admin/AdminMunicipalitiesScreen';
import AdminMunicipalityInboxScreen from './src/screens/admin/AdminMunicipalityInboxScreen';
import MunicipalityPortalScreen  from './src/screens/MunicipalityPortalScreen';
import AdminDashboardAPIScreen    from './src/screens/admin/AdminDashboardAPIScreen';

import AdminDashboardScreen    from './src/screens/admin/AdminDashboardScreen';
import AdminReportsScreen      from './src/screens/admin/AdminReportsScreen';
import AdminSponsorsScreen     from './src/screens/admin/AdminSponsorsScreen';
import AdminUsersScreen        from './src/screens/admin/AdminUsersScreen';
import AdminUserDetailScreen   from './src/screens/admin/AdminUserDetailScreen';
import AdminMoreScreen         from './src/screens/admin/AdminMoreScreen';
import AdminQRScanScreen      from './src/screens/admin/AdminQRScanScreen';
import AdminMapScreen          from './src/screens/admin/AdminMapScreen';
import AdminNotificationsScreen from './src/screens/admin/AdminNotificationsScreen';
import AdminChallengesScreen   from './src/screens/admin/AdminChallengesScreen';
import AdminStatsScreen        from './src/screens/admin/AdminStatsScreen';
import AdminSettingsScreen     from './src/screens/admin/AdminSettingsScreen';
import AdminCampaignsScreen    from './src/screens/admin/AdminCampaignsScreen';
import AdminTeamsScreen        from './src/screens/admin/AdminTeamsScreen';
import AdminAuctionsScreen     from './src/screens/admin/AdminAuctionsScreen';
import AdminMunAdminsScreen    from './src/screens/admin/AdminMunAdminsScreen';

const Tab       = createBottomTabNavigator();
const Stack     = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();
const UsersStack = createNativeStackNavigator();

SplashScreen.preventAutoHideAsync();

// ─── FAB Camera button ────────────────────────────────────────────────────────
function CameraFAB({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{
        top: -26,
        width: 66,
        height: 66,
        borderRadius: 33,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1B6B3A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 14,
        borderWidth: 4,
        borderColor: '#fff',
      }}
    >
      <LinearGradient
        colors={['#2E8B57', '#1B6B3A', '#134E2A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: '100%', height: '100%', borderRadius: 33, justifyContent: 'center', alignItems: 'center' }}
      >
        <Ionicons name="camera" size={26} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Placeholder screen for the FAB tab (never actually rendered)
function EmptyScan() { return null; }

// ─── User Tab Navigator ────────────────────────────────────────────────────────
function HomeTabs() {
  const { colors: tc } = useTheme();
  const { user } = useAuth();
  const t = useT();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tc.primary,
        tabBarInactiveTintColor: tc.textMuted,
        tabBarActiveBackgroundColor: tc.primaryGhost,
        tabBarStyle: {
          backgroundColor: tc.surface,
          borderTopColor: tc.border,
          borderTopWidth: 1,
          height: 74,
          paddingBottom: 12,
          paddingTop: 6,
          paddingHorizontal: 10,
          shadowColor: '#1B6B3A',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
          elevation: 24,
        },
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 3,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Profile' && user?.photoURL) {
            return (
              <Image
                source={{ uri: user.photoURL }}
                style={{ width: size + 4, height: size + 4, borderRadius: (size + 4) / 2, borderWidth: focused ? 2.5 : 1.5, borderColor: focused ? tc.primary : tc.border }}
              />
            );
          }
          const icons: Record<string, [string, string]> = {
            Home:        ['home',   'home-outline'],
            Marketplace: ['gift',   'gift-outline'],
            Profile:     ['person', 'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['help', 'help-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={focused ? size + 2 : size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"        component={HomeScreen}        options={{ tabBarLabel: t('tab_home')    }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} options={{ tabBarLabel: t('tab_rewards') }} />
      <Tab.Screen
        name="Scan"
        component={EmptyScan}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <CameraFAB onPress={props.onPress ? () => (props.onPress as any)() : undefined} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.getParent()?.navigate('Camera');
          },
        })}
      />
      <Tab.Screen name="Profile"     component={ProfileScreen}     options={{ tabBarLabel: t('tab_profile') }} />
    </Tab.Navigator>
  );
}

// ─── Admin More Stack ──────────────────────────────────────────────────────────
function AdminMoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="AdminMore"          component={AdminMoreScreen}          />
      <MoreStack.Screen name="AdminMap"           component={AdminMapScreen}           />
      <MoreStack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
      <MoreStack.Screen name="AdminChallenges"    component={AdminChallengesScreen}    />
      <MoreStack.Screen name="AdminStats"         component={AdminStatsScreen}         />
      <MoreStack.Screen name="AdminSettings"      component={AdminSettingsScreen}      />
      <MoreStack.Screen name="AdminCampaigns"     component={AdminCampaignsScreen}     />
      <MoreStack.Screen name="AdminTeams"         component={AdminTeamsScreen}         />
      <MoreStack.Screen name="AdminAuctions"      component={AdminAuctionsScreen}      />
      <MoreStack.Screen name="AdminMunAdmins"    component={AdminMunAdminsScreen}     />
      <MoreStack.Screen name="AdminFraud"             component={AdminFraudScreen}           />
      <MoreStack.Screen name="AdminAIChat"            component={AdminAIChatScreen}          />
      <MoreStack.Screen name="AdminTimeline"          component={AdminTimelineScreen}        />
      <MoreStack.Screen name="AdminEnvironment"       component={AdminEnvironmentScreen}     />
      <MoreStack.Screen name="AdminNeighborhood"      component={AdminNeighborhoodScreen}    />
      <MoreStack.Screen name="AdminCitizenScores"     component={AdminCitizenScoresScreen}   />
      <MoreStack.Screen name="AdminReplay"            component={AdminReplayScreen}          />
      <MoreStack.Screen name="AdminReportExport"      component={AdminReportExportScreen}    />
      <MoreStack.Screen name="AdminDrone"             component={AdminDroneScreen}           />
      <MoreStack.Screen name="AdminMunicipalities"    component={AdminMunicipalitiesScreen}  />
      <MoreStack.Screen name="AdminMunicipalityInbox" component={AdminMunicipalityInboxScreen} />
      <MoreStack.Screen name="AdminDashboardAPI"      component={AdminDashboardAPIScreen}    />
      <MoreStack.Screen name="AdminQRScan"            component={AdminQRScanScreen}          />
    </MoreStack.Navigator>
  );
}

// ─── Admin Users Stack ────────────────────────────────────────────────────────
function AdminUsersNavigator() {
  return (
    <UsersStack.Navigator screenOptions={{ headerShown: false }}>
      <UsersStack.Screen name="AdminUsersList"   component={AdminUsersScreen}      />
      <UsersStack.Screen name="AdminUserDetail"  component={AdminUserDetailScreen} />
    </UsersStack.Navigator>
  );
}

// ─── Fade transition HOC for admin tabs ────────────────────────────────────────
function withFadeTransition<P extends object>(Comp: React.ComponentType<P>) {
  return function FadeTab(props: P) {
    const opacity = useRef(new Animated.Value(0)).current;
    useFocusEffect(useCallback(() => {
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      return () => { opacity.setValue(0); };
    }, []));
    return (
      <Animated.View style={{ flex: 1, opacity }}>
        <Comp {...props} />
      </Animated.View>
    );
  };
}
const FadedAdminDashboard  = withFadeTransition(AdminDashboardScreen);
const FadedAdminReports    = withFadeTransition(AdminReportsScreen);
const FadedAdminUsers      = withFadeTransition(AdminUsersNavigator);
const FadedAdminSponsors   = withFadeTransition(AdminSponsorsScreen);
const FadedAdminMore       = withFadeTransition(AdminMoreNavigator);

// ─── Admin Navigator ───────────────────────────────────────────────────────────
const AdminTab = createBottomTabNavigator();

function AdminNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1B6B3A',
        tabBarInactiveTintColor: '#94A99A',
        tabBarActiveBackgroundColor: '#1B6B3A12',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E4E8E4',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
          paddingHorizontal: 10,
          shadowColor: '#1B6B3A',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 18,
          elevation: 20,
        },
        tabBarItemStyle: { borderRadius: 12, marginHorizontal: 3 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [string, string]> = {
            Dashboard: ['grid',                'grid-outline'              ],
            Reports:   ['documents',           'documents-outline'         ],
            Users:     ['people',              'people-outline'            ],
            Sponsors:  ['gift',                'gift-outline'              ],
            More:      ['ellipsis-horizontal', 'ellipsis-horizontal-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={focused ? size + 1 : size} color={color} />;
        },
      })}
    >
      <AdminTab.Screen name="Dashboard" component={FadedAdminDashboard}  options={{ tabBarLabel: 'Accueil'       }} />
      <AdminTab.Screen name="Reports"   component={FadedAdminReports}    options={{ tabBarLabel: 'Signalements'  }} />
      <AdminTab.Screen name="Users"     component={FadedAdminUsers}      options={{ tabBarLabel: 'Utilisateurs'  }} />
      <AdminTab.Screen name="Sponsors"  component={FadedAdminSponsors}   options={{ tabBarLabel: 'Sponsors'      }} />
      <AdminTab.Screen name="More"      component={FadedAdminMore}       options={{ tabBarLabel: 'Plus' } as any}
        listeners={({ navigation }) => ({
          tabPress: () => { navigation.navigate('More', { screen: 'AdminMore' }); },
        })}
      />
    </AdminTab.Navigator>
  );
}

// ─── Authenticated user app ────────────────────────────────────────────────────
// Transition presets per screen type
const SLIDE_UP   = Platform.OS !== 'web' ? { animation: 'slide_from_bottom' as const } : {};
const SLIDE_RIGHT = Platform.OS !== 'web' ? { animation: 'slide_from_right' as const } : {};
const FADE_SCALE  = Platform.OS !== 'web' ? { animation: 'fade_from_bottom' as const } : {};

function UserApp() {
  const { isDark } = useTheme();
  return (
    <NavigationContainer key={isDark ? 'dark' : 'light'}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false, ...SLIDE_RIGHT }}>
        <Stack.Screen name="Main"       component={HomeTabs}     options={{ animation: 'none' }} />
        <Stack.Screen name="Camera"     component={CameraScreen} options={{ presentation: 'fullScreenModal', ...SLIDE_UP }} />
        <Stack.Screen name="History"    component={HistoryScreen}    />
        <Stack.Screen name="Chatbot"    component={ChatbotScreen}    {...SLIDE_UP} />
        <Stack.Screen name="Challenges" component={ChallengesScreen} />
        <Stack.Screen name="Stats"      component={StatsScreen}      />
        <Stack.Screen name="Message"    component={MessageScreen}    />
        <Stack.Screen name="Victory"    component={VictoryScreen}    options={{ presentation: 'fullScreenModal', headerShown: false, ...SLIDE_UP }} />
        <Stack.Screen name="WasteAI"        component={WasteAIScreen}       {...SLIDE_UP} />
        <Stack.Screen name="MonthlyReport"  component={MonthlyReportScreen} options={{ presentation: 'fullScreenModal', headerShown: false, ...SLIDE_UP }} />
        <Stack.Screen name="Notifications"  component={NotificationsScreen}  />
        <Stack.Screen name="Leaderboard"  component={LeaderboardScreen}  />
        <Stack.Screen name="Map"          component={MapScreen}          />
        <Stack.Screen name="Team"          component={TeamScreen}          />
        <Stack.Screen name="TeamChat"      component={TeamChatScreen}      />
        <Stack.Screen name="Vote"          component={VoteScreen}          />
        <Stack.Screen name="Feed"          component={FeedScreen}          />
        <Stack.Screen name="Explore"           component={ExploreScreen}           options={{ ...SLIDE_UP }} />
        <Stack.Screen name="Events"            component={EventsScreen}            />
        <Stack.Screen name="PlantTree"        component={PlantTreeScreen}        options={{ ...SLIDE_UP }} />
        <Stack.Screen name="NearbyMissions"  component={NearbyMissionsScreen}  />
        <Stack.Screen name="Personalize"     component={PersonalizeScreen}     options={{ ...SLIDE_UP }} />
        <Stack.Screen name="CitizenStories"  component={CitizenStoriesScreen}  />
        <Stack.Screen name="NotificationSettings"    component={NotificationSettingsScreen}    />
        <Stack.Screen name="Referral"                component={ReferralScreen}                options={{ ...SLIDE_UP }} />
        <Stack.Screen name="ReportAppeal"            component={ReportAppealScreen}            />
        <Stack.Screen name="ReportStatus"            component={ReportStatusScreen}            options={{ ...FADE_SCALE }} />
        <Stack.Screen name="CityLeaderboard"         component={CityLeaderboardScreen}         />
        <Stack.Screen name="ReportComments"          component={ReportCommentsScreen}          options={{ ...SLIDE_UP }} />
        <Stack.Screen name="StreakFreeze"            component={StreakFreezeScreen}            options={{ ...SLIDE_UP }} />
        <Stack.Screen name="AchievementLeaderboard"  component={AchievementLeaderboardScreen}  options={{ ...FADE_SCALE }} />
        <Stack.Screen name="Community"               component={CommunityScreen}               options={{ ...SLIDE_UP }} />
        <Stack.Screen name="Impact"                  component={ImpactScreen}                  options={{ ...FADE_SCALE }} />
        <Stack.Screen name="PublicProfile"           component={PublicProfileScreen}           options={{ ...FADE_SCALE }} />
        <Stack.Screen name="Auction"                 component={AuctionScreen}                 options={{ ...SLIDE_UP }} />
        <Stack.Screen name="VoiceReport"             component={VoiceReportScreen}             options={{ ...SLIDE_UP }} />
        <Stack.Screen name="WasteSortingGame"        component={WasteSortingGameScreen}        options={{ ...SLIDE_UP }} />
        <Stack.Screen name="Friends"                 component={FriendsScreen}                 options={{ ...FADE_SCALE }} />
        <Stack.Screen name="BusinessPortal"          component={BusinessPortalScreen}          />
        <Stack.Screen name="WastePickup"             component={WastePickupScreen}             />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Root logic ────────────────────────────────────────────────────────────────
function AppContent() {
  const { user, isLoading } = useAuth();
  const { isAdmin }         = useAdmin();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    // Hide splash as soon as local storage is read — don't wait for Firebase
    AsyncStorage.getItem('poubcoin_onboarded').then(v => {
      setOnboarded(v === 'done');
      SplashScreen.hideAsync();
    });
    // Defer push permission request — non-blocking, runs after first render
    const t = setTimeout(() => registerForPushNotifications(), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (user?.name) scheduleWelcomeNotification(user.name.split(' ')[0]);
  }, [user?.id]);

  if (onboarded === null || isLoading) {
    return (
      <View style={s.splash}>
        <Text style={s.splashEmoji}>♻️</Text>
        <Text style={s.splashName}>PoubCoin</Text>
        <ActivityIndicator color={colors.primary} size="small" style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <OnboardingScreen
        onDone={async () => {
          await AsyncStorage.setItem('poubcoin_onboarded', 'done');
          setOnboarded(true);
        }}
      />
    );
  }

  // Admin logged in → admin interface (no NavigationContainer from UserApp)
  if (isAdmin) {
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <AdminNavigator />
      </NavigationContainer>
    );
  }

  // Not authenticated → single login screen
  if (!user) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen />
      </>
    );
  }

  // Municipality admin → dedicated portal (no tabs)
  if (user?.role === 'municipality_admin') {
    return (
      <>
        <StatusBar style="light" />
        <MunicipalityPortalScreen />
      </>
    );
  }

  // Citizen authenticated → full user app
  return <UserApp />;
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  // On web, Ionicons is loaded via @font-face in index.html — no need to block
  const [fontsLoaded] = useFonts(Platform.OS !== 'web' ? { ...Ionicons.font } : {});
  const [webFontsReady, setWebFontsReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const p = (window as any).__ioniconsReady;
      if (p) {
        p.finally(() => setWebFontsReady(true));
      } else {
        setWebFontsReady(true);
      }
    }
  }, []);

  if (!fontsLoaded || !webFontsReady) return null;

  return (
    <ThemeProvider>
      <AdminProvider>
        <AdminPrefsProvider>
          <AuthProvider>
            <WalletProvider>
              <ToastProvider>
                <NetworkProvider>
                  <AppContent />
                </NetworkProvider>
              </ToastProvider>
            </WalletProvider>
          </AuthProvider>
        </AdminPrefsProvider>
      </AdminProvider>
    </ThemeProvider>
  );
}

const s = StyleSheet.create({
  splash:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  splashEmoji: { fontSize: 72 },
  splashName:  { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 16, letterSpacing: -0.5 },
});
