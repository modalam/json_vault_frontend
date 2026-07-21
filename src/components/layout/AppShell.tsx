import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ToolsSidebar } from '@/components/layout/ToolsSidebar';
import { useAuthStore } from '@/stores/auth-store';

const AUTH_ONLY_PATHS = new Set(['/login', '/register']);

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const onLoginPage = location.pathname === '/login';

  const authPrimary =
    'rounded bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-blue-500';
  const authGhost = 'hover:text-white';

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-700 bg-surface px-4 py-3">
      <Link to={user ? '/dashboard' : '/'} className="text-lg font-semibold tracking-tight text-white">
        JSON Vault
      </Link>
      <nav className="flex items-center gap-3 text-sm text-slate-300">
        {user ? (
          <>
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
            <Link className={onLoginPage ? authPrimary : authGhost} to="/login">
              Sign in
            </Link>
            <Link className={onLoginPage ? authGhost : authPrimary} to="/register">
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
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const hideToolsSidebar = AUTH_ONLY_PATHS.has(location.pathname);
  const showToolsSidebar = Boolean(user) && !hideToolsSidebar;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showToolsSidebar && <ToolsSidebar />}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
