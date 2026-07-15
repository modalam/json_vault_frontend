type StatusBarProps = {
  valid: boolean;
  error: string | null;
  bytes: number;
  message: string | null;
};

export function StatusBar({ valid, error, bytes, message }: StatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-700 bg-surface px-3 py-1.5 text-xs text-slate-300">
      <span className={valid ? 'text-emerald-400' : 'text-red-400'}>
        {valid ? '✓ Valid JSON' : `✗ ${error ?? 'Invalid JSON'}`}
      </span>
      <span>{bytes} bytes</span>
      {message && <span className="text-sky-300">{message}</span>}
    </div>
  );
}
