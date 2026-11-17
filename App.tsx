import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WebView, { type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

const DEFAULT_APP_URL = 'https://skill-bridge-frontend-swart.vercel.app';
const APP_URL = (process.env.EXPO_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL).replace(/\/+$/, '');
const APP_HOST = new URL(APP_URL).host;

const BRAND_COLOR = '#ad222b';
const INACTIVE_COLOR = '#6b7280';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type TabKey = 'home' | 'projects' | 'news' | 'companies' | 'account';

interface NavTab {
  key: TabKey;
  label: string;
  path: string;
  activeIcon: IoniconName;
  inactiveIcon: IoniconName;
}

const PORTAL_ROOTS: Array<{ prefix: string; dashboard: string }> = [
  { prefix: '/student', dashboard: '/student/dashboard' },
  { prefix: '/company', dashboard: '/company/dashboard' },
  { prefix: '/lecturer', dashboard: '/lecturer/dashboard' },
  { prefix: '/admin', dashboard: '/admin/dashboard' },
];

const AUTH_OR_PORTAL_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/student',
  '/company',
  '/lecturer',
  '/admin',
  '/notifications',
  '/settings',
  '/onboarding',
];

// Bỏ viền highlight xám mặc định khi chạm trên WebView để cảm giác bấm mượt như app gốc.
const MOBILE_TOUCH_POLISH_JS = `
  (function() {
    if (!document.getElementById('sb-mobile-polish') && document.head) {
      var style = document.createElement('style');
      style.id = 'sb-mobile-polish';
      style.textContent = '* { -webkit-tap-highlight-color: transparent; } html, body { overscroll-behavior-y: contain; }';
      document.head.appendChild(style);
    }
  })();
  true;
`;

function getPathFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.host !== APP_HOST) return '/';
    return parsed.pathname || '/';
  } catch {
    return '/';
  }
}

function getActiveTabKey(pathname: string): TabKey {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/news')) return 'news';
  if (pathname.startsWith('/companies') || pathname.startsWith('/about')) return 'companies';
  if (AUTH_OR_PORTAL_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'account';
  return 'home';
}

function SkillBridgeWebView() {
  const webViewRef = useRef<WebView<object>>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentPath, setCurrentPath] = useState('/');
  const [portalDashboard, setPortalDashboard] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Ẩn thanh bottom navbar khi mở bàn phím trên Android để không che form nhập liệu.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Bắt nút Back cứng trên Android để lùi trang web thay vì thoát app.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    const nextPath = getPathFromUrl(navState.url);
    setCurrentPath(nextPath);

    const matchedPortal = PORTAL_ROOTS.find((item) => nextPath.startsWith(item.prefix));
    if (matchedPortal) {
      setPortalDashboard(matchedPortal.dashboard);
    } else if (nextPath.startsWith('/login')) {
      setPortalDashboard(null);
    }
  }, []);

  const handleShouldStartLoadWithRequest = useCallback((request: ShouldStartLoadRequest) => {
    const { url } = request;

    if (url.startsWith('about:') || url.startsWith('blob:') || url.startsWith('data:')) {
      return true;
    }

    try {
      const parsed = new URL(url);
      if (parsed.host === APP_HOST) {
        return true;
      }

      if (
        parsed.protocol === 'http:' ||
        parsed.protocol === 'https:' ||
        parsed.protocol === 'mailto:' ||
        parsed.protocol === 'tel:'
      ) {
        void Linking.openURL(url);
        return false;
      }
    } catch {
      return true;
    }

    return true;
  }, []);

  const tabs = useMemo<NavTab[]>(
    () => [
      {
        key: 'home',
        label: 'Trang chủ',
        path: '/',
        activeIcon: 'home',
        inactiveIcon: 'home-outline',
      },
      {
        key: 'projects',
        label: 'Dự án',
        path: '/projects',
        activeIcon: 'briefcase',
        inactiveIcon: 'briefcase-outline',
      },
      {
        key: 'news',
        label: 'Tin tức',
        path: '/news',
        activeIcon: 'newspaper',
        inactiveIcon: 'newspaper-outline',
      },
      {
        key: 'companies',
        label: 'Doanh nghiệp',
        path: '/companies',
        activeIcon: 'business',
        inactiveIcon: 'business-outline',
      },
      {
        key: 'account',
        label: portalDashboard ? 'Không gian' : 'Tài khoản',
        path: portalDashboard ?? '/login',
        activeIcon: 'person',
        inactiveIcon: 'person-outline',
      },
    ],
    [portalDashboard],
  );

  const activeTabKey = useMemo(() => getActiveTabKey(currentPath), [currentPath]);

  const handleTabPress = useCallback(
    (tab: NavTab) => {
      if (hasError) {
        setHasError(false);
        setIsInitialLoad(true);
        webViewRef.current?.reload();
        return;
      }

      const targetUrl = `${APP_URL}${tab.path}`;
      if (currentPath === tab.path) {
        webViewRef.current?.injectJavaScript(
          'window.scrollTo({ top: 0, behavior: "smooth" }); true;',
        );
        return;
      }

      webViewRef.current?.injectJavaScript(
        `window.location.assign(${JSON.stringify(targetUrl)}); true;`,
      );
    },
    [currentPath, hasError],
  );

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsInitialLoad(true);
    webViewRef.current?.reload();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.webArea} edges={['top', 'left', 'right']}>
        {loadProgress > 0 && loadProgress < 1 && !hasError && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(loadProgress * 100)}%` }]} />
          </View>
        )}

        {hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Không thể kết nối</Text>
            <Text style={styles.errorMessage}>
              Vui lòng kiểm tra kết nối Internet trên thiết bị rồi thử lại.
            </Text>
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : (
          <WebView<object>
            ref={webViewRef}
            source={{ uri: APP_URL }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            injectedJavaScript={MOBILE_TOUCH_POLISH_JS}
            onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onLoadEnd={() => {
              setIsInitialLoad(false);
              setLoadProgress(1);
            }}
            onError={() => {
              setIsInitialLoad(false);
              setHasError(true);
            }}
            onRenderProcessGone={() => webViewRef.current?.reload()}
          />
        )}

        {isInitialLoad && !hasError && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <Image
              source={require('./assets/splash-icon.png')}
              style={styles.splashImage}
              resizeMode="contain"
            />
            <ActivityIndicator size="large" color={BRAND_COLOR} />
            <Text style={styles.loadingText}>Đang tải DNTU SkillBridge...</Text>
          </View>
        )}
      </SafeAreaView>

      {!isKeyboardVisible && (
        <SafeAreaView style={styles.bottomBarSafe} edges={['bottom', 'left', 'right']}>
          <View style={styles.bottomBar}>
            {tabs.map((tab) => {
              const isActive = activeTabKey === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
                  onPress={() => handleTabPress(tab)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <View style={[styles.tabPill, isActive && styles.tabPillActive]}>
                    <Ionicons
                      name={isActive ? tab.activeIcon : tab.inactiveIcon}
                      size={21}
                      color={isActive ? BRAND_COLOR : INACTIVE_COLOR}
                    />
                  </View>
                  <Text
                    style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SkillBridgeWebView />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  progressTrack: {
    height: 2.5,
    width: '100%',
    backgroundColor: '#f3f4f6',
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND_COLOR,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  splashImage: {
    width: '88%',
    maxWidth: 380,
    height: 360,
  },
  loadingText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBarSafe: {
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  tabItemPressed: {
    opacity: 0.7,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  tabPillActive: {
    backgroundColor: 'rgba(173, 34, 43, 0.1)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: INACTIVE_COLOR,
  },
  tabLabelActive: {
    color: BRAND_COLOR,
    fontWeight: '700',
  },
});
