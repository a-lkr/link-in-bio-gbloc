import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { loadSharedFonts } from '@/lib/profile-fonts';

import './index.css';
import './styles/gbloc-neon.css';
import './styles/brand-pages.css';

loadSharedFonts();

if (import.meta.env.DEV) {
  const reportRuntimeError = (error: Error) => {
    import.meta.hot?.send('runtime-error-plugin:error', {
      message: error.message,
      stack: error.stack,
    });
  };

  window.addEventListener('error', event => {
    const location = event.filename
      ? ` at ${event.filename}:${event.lineno}:${event.colno}`
      : '';
    const error = event.error instanceof Error
      ? event.error
      : new Error(`${event.message || 'Script or resource error'}${location}`);
    event.stopImmediatePropagation();
    reportRuntimeError(error);
  }, true);
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(`Unhandled promise rejection: ${String(event.reason)}`);
    event.stopImmediatePropagation();
    reportRuntimeError(error);
  }, true);
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
