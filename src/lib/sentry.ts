/** Optional frontend Sentry hook — enable when VITE_SENTRY_DSN is set. */
export function initFrontendSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  console.info('[sentry] DSN configured — wire @sentry/react when ready');
}

export function captureFrontendError(error: unknown, context?: string): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  console.error('[sentry]', context ?? 'error', error);
}
