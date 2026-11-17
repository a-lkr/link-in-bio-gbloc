import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { AuthProvider } from '@/components/auth-context';
import HomePage from '@/pages/home';
import LegalPage from '@/pages/legal';
import PricePage from '@/pages/pricing';
import { getGetPublishedTermsQueryKey, getGetPrivacyPolicyQueryKey } from '@workspace/api-client-react';

// Render the same public components without session data or browser-only effects.
export async function render(pathname: string, getDocument: (path: string) => Promise<unknown>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    if (pathname === '/legal') {
      const [terms, privacy] = await Promise.all([
        getDocument('/api/legal/terms'),
        getDocument('/api/legal/privacy'),
      ]);
      if (terms) client.setQueryData(getGetPublishedTermsQueryKey(), terms);
      client.setQueryData(getGetPrivacyPolicyQueryKey(), privacy);
      return renderToString(<Router ssrPath={pathname}><QueryClientProvider client={client}>
        <AuthProvider><LegalPage termsUnpublishedOnServer={!terms} /></AuthProvider>
      </QueryClientProvider></Router>);
    }
    return renderToString(<Router ssrPath={pathname}><QueryClientProvider client={client}>
      <AuthProvider>{pathname === '/' ? <HomePage /> : <PricePage />}</AuthProvider>
    </QueryClientProvider></Router>);
  } finally {
    client.clear();
  }
}
