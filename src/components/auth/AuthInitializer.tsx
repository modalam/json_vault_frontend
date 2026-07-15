import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-slate-400">
        Loading…
      </div>
    );
  }

  return children;
}
