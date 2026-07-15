import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-700 bg-surface px-4 py-3">
      <Link to="/" className="text-lg font-semibold tracking-tight text-white">
        JSON Vault
      </Link>
      <nav className="flex items-center gap-3 text-sm text-slate-300">
        {user ? (
          <>
            <Link className="hover:text-white" to="/dashboard">
              Dashboard
            </Link>
            <span className="hidden text-slate-500 sm:inline">{user.email}</span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded border border-slate-600 px-2 py-1 text-xs hover:border-slate-400 hover:text-white"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link className="hover:text-white" to="/login">
              Sign in
            </Link>
            <Link
              className="rounded bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-blue-500"
              to="/register"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-800 px-4 py-3 text-center text-xs text-slate-500">
      JSON Vault — store, edit, and share JSON at the edge
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
