import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { applyTheme, useSettings } from '@/stores/settingsStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/** Keeps the <html> theme class in sync with the settings store. */
function ThemeSync() {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeSync />
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
