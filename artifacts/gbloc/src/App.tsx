import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { AuthProvider, useUser } from '@/components/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { appBasePath } from '@/components/gbloc-shared';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AccountPage from '@/pages/account';
import { SignInPage, SignUpPage } from '@/pages/auth';
import CustomizePage from '@/pages/customize';
import HomePage from '@/pages/home';
import NotFound from '@/pages/not-found';
import PricePage from '@/pages/pricing';
import PublicProfilePage from '@/pages/public-profile';
import SocialLinksPage from '@/pages/social-links';
import ModerationReportsPage from '@/pages/moderation-reports';
import AdminPage from '@/pages/admin';
import CookieSettingsPage from '@/pages/cookie-settings';
import LegalPage from '@/pages/legal';
import { CookieConsentProvider } from '@/components/cookie-consent';
import { getGetAccountEmailQueryKey, useSyncAccountEmail } from '@workspace/api-client-react';
import seoPages from '@/lib/seo-pages.json';
import { publicOrigin, publicProfileUrl } from '@/lib/public-origin';

const queryClient = new QueryClient();

function setMetaContent(selector: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    const match = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
    if (!match) return;
    meta = document.createElement('meta');
    meta.setAttribute(match[1], match[2]);
    document.head.append(meta);
  }
  meta.setAttribute('content', content);
}

function stripBase(path: string) {
  return appBasePath && path.startsWith(appBasePath)
    ? path.slice(appBasePath.length) || '/'
    : path;
}

function AuthQueryClientCacheInvalidator() {
  const { isLoaded, user } = useUser();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    const userId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) client.clear();
    previousUserId.current = userId;
  }, [client, isLoaded, user?.id]);
  return null;
}

function AccountEmailSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const client = useQueryClient();
  const syncEmail = useSyncAccountEmail();
  const lastSyncKey = useRef('');
  const userId = user?.id ?? '';
  const primaryEmailId = user?.primaryEmailAddressId ?? '';
  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? '';

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
      lastSyncKey.current = '';
      return;
    }

    const syncKey = `${userId}:${primaryEmailId}:${primaryEmail}`;
    if (lastSyncKey.current === syncKey) return;
    lastSyncKey.current = syncKey;
    syncEmail.mutate(undefined, {
      onSuccess: data => client.setQueryData(getGetAccountEmailQueryKey(), data),
      onError: () => {
        if (lastSyncKey.current === syncKey) lastSyncKey.current = '';
      },
    });
  }, [client, isLoaded, isSignedIn, primaryEmail, primaryEmailId, syncEmail.mutate, userId]);

  return null;
}

function AppRoutes() {
  const [location] = useLocation();
  useEffect(() => {
    const SEO_ORIGIN = publicOrigin();
    const pathname = stripBase(location).split(/[?#]/, 1)[0] || '/';
    const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const isPublicProfile = /^\/@[A-Za-z0-9_]{3,20}$/.test(normalizedPath);
    const pageMetadata = seoPages[normalizedPath as keyof typeof seoPages];
    const isPublicPage = Boolean(pageMetadata);
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robots) robots.content = isPublicProfile || isPublicPage ? 'index, follow' : 'noindex, nofollow';

    if (pageMetadata) {
      document.title = pageMetadata.title;
      setMetaContent('meta[name="description"]', pageMetadata.description);
      setMetaContent('meta[property="og:title"]', pageMetadata.title);
      setMetaContent('meta[property="og:description"]', pageMetadata.description);
      setMetaContent('meta[property="og:image"]', `${SEO_ORIGIN}/brand-full.png`);
      setMetaContent('meta[name="twitter:title"]', pageMetadata.title);
      setMetaContent('meta[name="twitter:description"]', pageMetadata.description);
      setMetaContent('meta[name="twitter:image"]', `${SEO_ORIGIN}/brand-full.png`);
    } else if (!isPublicProfile) {
      document.title = 'gbloc';
      setMetaContent('meta[name="description"]', 'จัดการโปรไฟล์ ลิงก์ และการตั้งค่าบัญชีบน GBLOC');
      setMetaContent('meta[property="og:title"]', document.title);
      setMetaContent('meta[property="og:description"]', 'จัดการโปรไฟล์ ลิงก์ และการตั้งค่าบัญชีบน GBLOC');
      setMetaContent('meta[property="og:image"]', `${SEO_ORIGIN}/brand-full.png`);
      setMetaContent('meta[name="twitter:title"]', document.title);
      setMetaContent('meta[name="twitter:description"]', 'จัดการโปรไฟล์ ลิงก์ และการตั้งค่าบัญชีบน GBLOC');
      setMetaContent('meta[name="twitter:image"]', `${SEO_ORIGIN}/brand-full.png`);
    }

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const pageUrl = isPublicProfile ? publicProfileUrl(normalizedPath.slice(2)) : `${SEO_ORIGIN}${normalizedPath}`;
    if (canonical) canonical.href = pageUrl;
    setMetaContent('meta[property="og:url"]', pageUrl);
  }, [location]);

  return <ErrorBoundary resetKey={location}>
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/price" component={PricePage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/customize" component={CustomizePage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/moderation/reports" component={ModerationReportsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/cookies" component={CookieSettingsPage} />
      <Route path="/legal"><LegalPage /></Route>
      <Route path="/terms"><Redirect to="/legal#terms" replace /></Route>
      <Route path="/privacy"><Redirect to="/legal#privacy" replace /></Route>
      <Route path="/link" component={SocialLinksPage} />
      <Route path={/^\/@(?<username>[A-Za-z0-9_]{3,20})\/?$/}>
        {params => <PublicProfilePage username={params.username ?? ''} />}
      </Route>
      <Route path={/^\/(?<username>[A-Za-z0-9_]{3,20})\/?$/}>
        {params => <Redirect to={`/@${params.username ?? ''}`} replace />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  </ErrorBoundary>;
}

function AppContent() {
  return <>
    <AuthQueryClientCacheInvalidator />
    <TooltipProvider>
      <CookieConsentProvider>
        <AccountEmailSync />
        <AppRoutes />
        <Toaster />
      </CookieConsentProvider>
    </TooltipProvider>
  </>;
}

export default function App() {
  return <WouterRouter base={appBasePath}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider><AppContent /></AuthProvider>
    </QueryClientProvider>
  </WouterRouter>;
}
