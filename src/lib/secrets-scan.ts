/**
 * Local secrets / PII heuristics — no LLM, no network.
 */

export type SecretFindingKind =
  | 'api_key'
  | 'aws_key'
  | 'jwt'
  | 'private_key'
  | 'password'
  | 'email'
  | 'phone'
  | 'connection_string'
  | 'bearer_token'
  | 'generic_secret';

export type SecretFinding = {
  kind: SecretFindingKind;
  label: string;
  /** Redacted sample of the match for UI (never full secret). */
  sample: string;
  severity: 'high' | 'medium' | 'low';
};

type PatternRule = {
  kind: SecretFindingKind;
  label: string;
  severity: 'high' | 'medium' | 'low';
  pattern: RegExp;
  /** Optional: refine match before accepting */
  validate?: (match: string) => boolean;
};

const RULES: PatternRule[] = [
  {
    kind: 'private_key',
    label: 'Private key block',
    severity: 'high',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gi,
  },
  {
    kind: 'aws_key',
    label: 'AWS access key',
    severity: 'high',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    kind: 'api_key',
    label: 'OpenAI-style API key',
    severity: 'high',
    pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    kind: 'api_key',
    label: 'Stripe-style secret key',
    severity: 'high',
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  },
  {
    kind: 'api_key',
    label: 'GitHub token',
    severity: 'high',
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    kind: 'api_key',
    label: 'Slack token',
    severity: 'high',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    kind: 'jwt',
    label: 'JWT',
    severity: 'high',
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    validate: (match) => match.split('.').length === 3 && match.length > 40,
  },
  {
    kind: 'bearer_token',
    label: 'Bearer token',
    severity: 'high',
    pattern: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  },
  {
    kind: 'connection_string',
    label: 'Database connection string',
    severity: 'high',
    pattern:
      /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s"'\\]+/gi,
  },
  {
    kind: 'password',
    label: 'Password / secret field',
    severity: 'high',
    pattern:
      /(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|private[_-]?key|client[_-]?secret)\s*["']?\s*[:=]\s*["']?[^\s"',}\\]{6,}/gi,
  },
  {
    kind: 'generic_secret',
    label: 'Long high-entropy token',
    severity: 'medium',
    pattern: /\b[A-Za-z0-9_-]{40,}\b/g,
    validate: (match) => {
      if (/^[0-9]+$/.test(match)) return false;
      if (/^(true|false|null)$/i.test(match)) return false;
      // Require mixed character classes to reduce false positives on UUIDs-only / hex dumps of ids
      const hasLetter = /[A-Za-z]/.test(match);
      const hasDigit = /\d/.test(match);
      return hasLetter && hasDigit && !/^[a-f0-9-]{36}$/i.test(match);
    },
  },
  {
    kind: 'email',
    label: 'Email address',
    severity: 'low',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    kind: 'phone',
    label: 'Phone-like number',
    severity: 'low',
    pattern: /(?<!\w)(?:\+?\d[\d\s().-]{8,}\d)(?!\w)/g,
    validate: (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
  },
];

function maskSample(raw: string): string {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= 8) return '••••';
  if (trimmed.length <= 16) return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

function dedupeKey(finding: SecretFinding): string {
  return `${finding.kind}:${finding.label}:${finding.sample}`;
}

/**
 * Scan arbitrary text for likely secrets and PII.
 * Returns unique findings (capped) for UI warnings.
 */
export function scanForSecrets(text: string, options?: { maxFindings?: number }): SecretFinding[] {
  if (!text) return [];
  const maxFindings = options?.maxFindings ?? 12;
  const found: SecretFinding[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(text)) !== null) {
      const value = match[0] ?? '';
      if (!value) continue;
      if (rule.validate && !rule.validate(value)) continue;

      const finding: SecretFinding = {
        kind: rule.kind,
        label: rule.label,
        sample: maskSample(value),
        severity: rule.severity,
      };
      const key = dedupeKey(finding);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(finding);
      if (found.length >= maxFindings) return sortFindings(found);
    }
  }

  return sortFindings(found);
}

function sortFindings(findings: SecretFinding[]): SecretFinding[] {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...findings].sort((a, b) => rank[a.severity] - rank[b.severity] || a.label.localeCompare(b.label));
}

export function hasHighSeveritySecrets(findings: SecretFinding[]): boolean {
  return findings.some((f) => f.severity === 'high');
}

/** Build plain-text description for confirm dialogs. */
export function formatSecretFindingsMessage(
  findings: SecretFinding[],
  context: 'share' | 'send',
): string {
  if (findings.length === 0) return '';

  const intro =
    context === 'share'
      ? 'This blob may contain secrets or personal data. Sharing could expose them to anyone with the link.'
      : 'This request may contain secrets or personal data that will be sent to the remote server.';

  const lines = findings.slice(0, 8).map((f) => {
    const tag = f.severity === 'high' ? '[high]' : f.severity === 'medium' ? '[medium]' : '[low]';
    return `• ${tag} ${f.label} (${f.sample})`;
  });
  if (findings.length > 8) {
    lines.push(`• …and ${findings.length - 8} more`);
  }

  return `${intro}\n\n${lines.join('\n')}\n\nContinue only if you trust the destination and intended audience.`;
}

/** Scan multiple fields (URL, headers, body, etc.). */
export function scanRequestForSecrets(parts: {
  url?: string;
  headers?: Array<{ key: string; value: string }>;
  queryParams?: Array<{ key: string; value: string }>;
  body?: string;
  envValues?: string[];
}): SecretFinding[] {
  const chunks: string[] = [];
  if (parts.url) chunks.push(parts.url);
  if (parts.body) chunks.push(parts.body);
  for (const row of parts.headers ?? []) {
    chunks.push(`${row.key}: ${row.value}`);
  }
  for (const row of parts.queryParams ?? []) {
    chunks.push(`${row.key}=${row.value}`);
  }
  for (const value of parts.envValues ?? []) {
    if (value) chunks.push(value);
  }
  return scanForSecrets(chunks.join('\n'));
}
