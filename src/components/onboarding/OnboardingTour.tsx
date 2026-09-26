import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'jv_onboarding_done';

export function OnboardingTour() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        setOpen(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-900 p-5 shadow-xl"
        role="dialog"
        aria-labelledby="onboarding-title"
      >
        <h2 id="onboarding-title" className="text-lg font-semibold text-white">
          Welcome to JSON Vault
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>
            Use <strong className="text-white">JSON Editor</strong> to create and share blobs.
          </li>
          <li>
            Compare documents in <strong className="text-white">JSON Compare</strong>.
          </li>
          <li>
            Build HTTP calls in <strong className="text-white">Request</strong>.
          </li>
          <li>
            Manage quotas and API keys under{' '}
            <Link to="/settings" className="text-brand hover:underline" onClick={dismiss}>
              Settings
            </Link>
            .
          </li>
        </ol>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
