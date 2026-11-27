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
import WebView, { type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

const DEFAULT_APP_URL = 'https://skill-bridge-frontend-swart.vercel.app';
const APP_URL = (process.env.EXPO_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL).replace(/\/+$/, '');
const APP_HOST = new URL(APP_URL).host;

const BRAND_COLOR = '#ad222b';
const INACTIVE_COLOR = '#64748b';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type AppRole = 'guest' | 'student' | 'company' | 'lecturer' | 'admin';

interface NavTab {
  key: string;
  label: string;
  path: string;
  activeIcon: IoniconName;
  inactiveIcon: IoniconName;
  matchPrefixes: string[];
  exact?: boolean;
  badge?: number;
}

interface WebBridgeMessage {
  type?: string;
  role?: AppRole;
  unreadCount?: number;
  hideBottomBar?: boolean;
  pathname?: string;
}

const ROLE_TABS: Record<AppRole, Omit<NavTab, 'badge'>[]> = {
  guest: [
    {
      key: 'home',
      label: 'Trang chủ',
      path: '/',
      activeIcon: 'home',
      inactiveIcon: 'home-outline',
      matchPrefixes: ['/'],
      exact: true,
    },
    {
      key: 'projects',
      label: 'Đề tài',
      path: '/projects',
      activeIcon: 'briefcase',
      inactiveIcon: 'briefcase-outline',
      matchPrefixes: ['/projects'],
    },
    {
      key: 'news',
      label: 'Tin tức',
      path: '/news',
      activeIcon: 'newspaper',
      inactiveIcon: 'newspaper-outline',
      matchPrefixes: ['/news'],
    },
    {
      key: 'companies',
      label: 'Đối tác',
      path: '/companies',
      activeIcon: 'business',
      inactiveIcon: 'business-outline',
      matchPrefixes: ['/companies'],
    },
    {
      key: 'login',
      label: 'Tài khoản',
      path: '/login',
      activeIcon: 'person',
      inactiveIcon: 'person-outline',
      matchPrefixes: ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'],
    },
  ],
  student: [
    {
      key: 'st-dashboard',
      label: 'Tổng quan',
      path: '/student/dashboard',
      activeIcon: 'grid',
      inactiveIcon: 'grid-outline',
      matchPrefixes: ['/student/dashboard'],
    },
    {
      key: 'st-projects',
      label: 'Sàn đề tài',
      path: '/student/projects',
      activeIcon: 'compass',
      inactiveIcon: 'compass-outline',
      matchPrefixes: ['/student/projects', '/projects'],
    },
    {
      key: 'st-my-projects',
      label: 'Dự án',
      path: '/student/my-projects',
      activeIcon: 'folder-open',
      inactiveIcon: 'folder-open-outline',
      matchPrefixes: [
        '/student/my-projects',
        '/student/workspace',
        '/student/teams',
        '/student/applications',
        '/student/meetings',
        '/student/lecturer-invitations',
      ],
    },
    {
      key: 'st-messages',
      label: 'Hộp thư',
      path: '/student/messages',
      activeIcon: 'chatbubbles',
      inactiveIcon: 'chatbubbles-outline',
      matchPrefixes: ['/student/messages', '/student/notifications'],
    },
    {
      key: 'st-portfolio',
      label: 'Hồ sơ',
      path: '/student/portfolio',
      activeIcon: 'ribbon',
      inactiveIcon: 'ribbon-outline',
      matchPrefixes: ['/student/portfolio', '/student/profile', '/student/settings'],
    },
  ],
  company: [
    {
      key: 'co-dashboard',
      label: 'Tổng quan',
      path: '/company/dashboard',
      activeIcon: 'grid',
      inactiveIcon: 'grid-outline',
      matchPrefixes: ['/company/dashboard'],
    },
    {
      key: 'co-projects',
      label: 'Bài toán',
      path: '/company/projects',
      activeIcon: 'briefcase',
      inactiveIcon: 'briefcase-outline',
      matchPrefixes: ['/company/projects', '/company/workspace', '/company/allowance'],
    },
    {
      key: 'co-applications',
      label: 'Ứng viên',
      path: '/company/applications',
      activeIcon: 'people',
      inactiveIcon: 'people-outline',
      matchPrefixes: ['/company/applications', '/company/meetings', '/company/lecturer-invitations'],
    },
    {
      key: 'co-messages',
      label: 'Hộp thư',
      path: '/company/messages',
      activeIcon: 'chatbubbles',
      inactiveIcon: 'chatbubbles-outline',
      matchPrefixes: ['/company/messages', '/company/notifications'],
    },
    {
      key: 'co-profile',
      label: 'Hồ sơ DN',
      path: '/company/profile',
      activeIcon: 'business',
      inactiveIcon: 'business-outline',
      matchPrefixes: ['/company/profile', '/company/settings', '/onboarding'],
    },
  ],
  lecturer: [
    {
      key: 'le-dashboard',
      label: 'Bàn làm việc',
      path: '/lecturer/dashboard',
      activeIcon: 'grid',
      inactiveIcon: 'grid-outline',
      matchPrefixes: ['/lecturer/dashboard'],
    },
    {
      key: 'le-projects',
      label: 'Hướng dẫn',
      path: '/lecturer/projects',
      activeIcon: 'folder-open',
      inactiveIcon: 'folder-open-outline',
      matchPrefixes: ['/lecturer/projects', '/lecturer/workspace', '/lecturer/recommendations', '/lecturer/schedule'],
    },
    {
      key: 'le-evaluation',
      label: 'Chấm điểm',
      path: '/lecturer/evaluation',
      activeIcon: 'ribbon',
      inactiveIcon: 'ribbon-outline',
      matchPrefixes: ['/lecturer/evaluation', '/lecturer/skills'],
    },
    {
      key: 'le-messages',
      label: 'Hộp thư',
      path: '/lecturer/messages',
      activeIcon: 'chatbubbles',
      inactiveIcon: 'chatbubbles-outline',
      matchPrefixes: ['/lecturer/messages', '/lecturer/notifications'],
    },
    {
      key: 'le-profile',
      label: 'Cá nhân',
      path: '/lecturer/profile',
      activeIcon: 'person',
      inactiveIcon: 'person-outline',
      matchPrefixes: ['/lecturer/profile', '/lecturer/settings', '/lecturer/help'],
    },
  ],
  admin: [
    {
      key: 'ad-dashboard',
      label: 'Điều hành',
      path: '/admin/dashboard',
      activeIcon: 'grid',
      inactiveIcon: 'grid-outline',
      matchPrefixes: ['/admin/dashboard', '/admin/projects', '/admin/reports', '/admin/finance', '/admin/companies'],
    },
    {
      key: 'ad-projects',
      label: 'Duyệt đề tài',
      path: '/admin/approvals/projects',
      activeIcon: 'checkmark-done-circle',
      inactiveIcon: 'checkmark-done-circle-outline',
      matchPrefixes: ['/admin/approvals/projects'],
    },
    {
      key: 'ad-lecturers',
      label: 'Duyệt GV',
      path: '/admin/approvals/lecturers',
      activeIcon: 'school',
      inactiveIcon: 'school-outline',
      matchPrefixes: ['/admin/approvals/lecturers', '/admin/users'],
    },
    {
      key: 'ad-news',
      label: 'Tin tức',
      path: '/admin/news',
      activeIcon: 'newspaper',
      inactiveIcon: 'newspaper-outline',
      matchPrefixes: ['/admin/news', '/admin/cms', '/admin/catalog'],
    },
    {
      key: 'ad-settings',
      label: 'Hệ thống',
      path: '/admin/settings',
      activeIcon: 'settings',
      inactiveIcon: 'settings-outline',
      matchPrefixes: ['/admin/settings', '/admin/policies', '/admin/audit-logs', '/admin/notifications'],
    },
  ],
};

// Đánh dấu môi trường Native Mobile App ngay từ trước khi trang render để Web kích hoạt giao diện App riêng.
const BEFORE_LOAD_MOBILE_BRIDGE_JS = `
  (function() {
    window.__SKILLBRIDGE_MOBILE_APP__ = true;
    if (document.documentElement) {
      document.documentElement.setAttribute('data-mobile-app', 'true');
    }
  })();
  true;
`;

const MOBILE_TOUCH_POLISH_JS = `
  (function() {
    window.__SKILLBRIDGE_MOBILE_APP__ = true;
    if (document.documentElement) {
      document.documentElement.setAttribute('data-mobile-app', 'true');
    }
    if (!document.getElementById('sb-mobile-polish') && document.head) {
      var style = document.createElement('style');
      style.id = 'sb-mobile-polish';
      style.textContent = '* { -webkit-tap-highlight-color: transparent; } html, body { overscroll-behavior-y: contain; }';
      document.head.appendChild(style);
    }
  })();
  true;
`;

function parseUrlInfo(rawUrl: string, currentHost: string): { pathname: string; search: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.host !== currentHost && parsed.host !== APP_HOST) {
      return { pathname: '/', search: '' };
    }
    return { pathname: parsed.pathname || '/', search: parsed.search || '' };
  } catch {
    return { pathname: '/', search: '' };
  }
}

function inferRoleFromPath(pathname: string, currentRole: AppRole): AppRole {
  if (pathname.startsWith('/student')) return 'student';
  if (pathname.startsWith('/company') || pathname.startsWith('/onboarding/company')) return 'company';
  if (pathname.startsWith('/lecturer')) return 'lecturer';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return 'guest';
  return currentRole;
}

function isTabActive(tab: NavTab, pathname: string): boolean {
  if (tab.exact) {
    return pathname === tab.path || pathname === '';
  }
  return tab.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function SkillBridgeWebView() {
  const webViewRef = useRef<WebView<object>>(null);
  const [baseUrl, setBaseUrl] = useState(APP_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentPath, setCurrentPath] = useState('/');
  const [currentSearch, setCurrentSearch] = useState('');
  const [role, setRole] = useState<AppRole>('guest');
  const [unreadCount, setUnreadCount] = useState(0);
  const [webHideBottomBar, setWebHideBottomBar] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const activeHost = useMemo(() => {
    try {
      return new URL(baseUrl).host;
    } catch {
      return APP_HOST;
    }
  }, [baseUrl]);

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

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);
      const { pathname, search } = parseUrlInfo(navState.url, activeHost);
      setCurrentPath(pathname);
      setCurrentSearch(search);
      setRole((prev) => inferRoleFromPath(pathname, prev));
    },
    [activeHost],
  );

  const handleWebMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as WebBridgeMessage;
      if (data.type === 'SB_STATE') {
        if (data.role) setRole(data.role);
        if (typeof data.unreadCount === 'number') setUnreadCount(data.unreadCount);
        if (typeof data.hideBottomBar === 'boolean') setWebHideBottomBar(data.hideBottomBar);
        if (typeof data.pathname === 'string' && data.pathname.startsWith('/')) {
          setCurrentPath(data.pathname);
        }
      }
    } catch {
      // Bỏ qua message không phải JSON của bridge
    }
  }, []);

  const handleShouldStartLoadWithRequest = useCallback((request: ShouldStartLoadRequest) => {
    const { url } = request;

    if (url.startsWith('about:') || url.startsWith('blob:') || url.startsWith('data:')) {
      return true;
    }

    try {
      const parsed = new URL(url);
      if (parsed.host === activeHost || parsed.host === APP_HOST) {
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
  }, [activeHost]);

  const tabs = useMemo<NavTab[]>(() => {
    const baseTabs = ROLE_TABS[role] ?? ROLE_TABS.guest;
    return baseTabs.map((tab) => ({
      ...tab,
      badge: tab.key.endsWith('messages') && unreadCount > 0 ? unreadCount : undefined,
    }));
  }, [role, unreadCount]);

  const activeTabKey = useMemo(() => {
    const matched = tabs.find((tab) => isTabActive(tab, currentPath));
    return matched?.key ?? '';
  }, [tabs, currentPath]);

  // Tự ẩn bottom bar khi đang mở khung hội thoại chat chi tiết (?c=...) hoặc mở bàn phím
  const isInChatThread =
    currentPath.endsWith('/messages') && currentSearch.includes('c=');
  const shouldShowBottomBar = !isKeyboardVisible && !webHideBottomBar && !isInChatThread;

  const handleTabPress = useCallback(
    (tab: NavTab) => {
      if (hasError) {
        setHasError(false);
        setIsInitialLoad(true);
        webViewRef.current?.reload();
        return;
      }

      const targetUrl = `${baseUrl}${tab.path}`;
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
    [baseUrl, currentPath, hasError],
  );

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsInitialLoad(true);
    webViewRef.current?.reload();
  }, []);

  const handleSwitchToCloud = useCallback(() => {
    setBaseUrl(DEFAULT_APP_URL);
    setHasError(false);
    setIsInitialLoad(true);
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
            <Text style={styles.errorTitle}>Không thể kết nối máy chủ</Text>
            <Text style={styles.errorMessage}>
              Không thể truy cập {baseUrl}. Hãy kiểm tra điện thoại đang dùng chung Wi-Fi với máy tính (hoặc chuyển sang bản Cloud).
            </Text>
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </Pressable>
            {baseUrl !== DEFAULT_APP_URL ? (
              <Pressable style={styles.secondaryButton} onPress={handleSwitchToCloud}>
                <Text style={styles.secondaryButtonText}>Mở bản Cloud (Vercel)</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <WebView<object>
            ref={webViewRef}
            source={{ uri: baseUrl }}
            style={styles.webview}
            applicationNameForUserAgent="SkillBridgeMobile/1.0"
            mixedContentMode="always"
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            injectedJavaScriptBeforeContentLoaded={BEFORE_LOAD_MOBILE_BRIDGE_JS}
            injectedJavaScript={MOBILE_TOUCH_POLISH_JS}
            onMessage={handleWebMessage}
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

      {shouldShowBottomBar && (
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
                      size={20}
                      color={isActive ? BRAND_COLOR : INACTIVE_COLOR}
                    />
                    {tab.badge && tab.badge > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {tab.badge > 99 ? '99+' : String(tab.badge)}
                        </Text>
                      </View>
                    ) : null}
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
  secondaryButton: {
    marginTop: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '600',
  },
  bottomBarSafe: {
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    elevation: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
    paddingBottom: 5,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  tabItemPressed: {
    opacity: 0.72,
  },
  tabPill: {
    position: 'relative',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  tabPillActive: {
    backgroundColor: 'rgba(173, 34, 43, 0.11)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: INACTIVE_COLOR,
  },
  tabLabelActive: {
    color: BRAND_COLOR,
    fontWeight: '700',
  },
});
