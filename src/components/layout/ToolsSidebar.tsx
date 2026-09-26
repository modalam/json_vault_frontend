import { NavLink, useLocation } from 'react-router-dom';
import { useEditorStore } from '@/stores/editor-store';

const linkBase =
  'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition md:gap-3 md:py-2.5';
const linkIdle = 'text-slate-300 hover:bg-slate-800/80 hover:text-white';
const linkActive = 'bg-slate-800 text-white ring-1 ring-slate-600';

export function ToolsSidebar() {
  const location = useLocation();
  const blobId = useEditorStore((state) => state.blobId);
  const editorTo = blobId ? `/b/${blobId}` : '/';
  const editorActive = location.pathname === '/' || location.pathname.startsWith('/b/');

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-700 bg-slate-950/90 md:w-56 md:border-b-0 md:border-r">
      <div className="hidden border-b border-slate-800 px-3 py-3 md:block">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Tools</p>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto p-2 md:flex-1 md:flex-col"
        aria-label="App tools"
      >
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          end
        >
          <NavIcon kind="dashboard" />
          Dashboard
        </NavLink>
        <NavLink to={editorTo} className={`${linkBase} ${editorActive ? linkActive : linkIdle}`}>
          <NavIcon kind="editor" />
          JSON Editor
        </NavLink>
        <NavLink
          to="/compare"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
        >
          <NavIcon kind="compare" />
          JSON Compare
        </NavLink>
        <NavLink
          to="/request"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
        >
          <NavIcon kind="request" />
          Request
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${linkBase} ${isActive || location.pathname.startsWith('/settings/') ? linkActive : linkIdle}`
          }
        >
          <NavIcon kind="settings" />
          Settings
        </NavLink>
      </nav>
      <p className="hidden border-t border-slate-800 px-3 py-3 text-[11px] leading-relaxed text-slate-500 md:block">
        Switch tools anytime — your work stays in this browser and syncs when signed in.
      </p>
    </aside>
  );
}

function NavIcon({
  kind,
}: {
  kind: 'dashboard' | 'editor' | 'compare' | 'request' | 'settings';
}) {
  const className = 'h-4 w-4 shrink-0 opacity-80';
  switch (kind) {
    case 'dashboard':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'editor':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M8 8h8M8 12h8M8 16h5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'compare':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 5h4v14H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM13 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4V5Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      );
    case 'request':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 12h11M11 7l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M18 6v12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.1.7.7 1.2 1.5 1.3H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
