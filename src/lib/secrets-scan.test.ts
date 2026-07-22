import { describe, expect, it } from 'vitest';
import {
  formatSecretFindingsMessage,
  hasHighSeveritySecrets,
  scanForSecrets,
  scanRequestForSecrets,
} from '@/lib/secrets-scan';

describe('secrets-scan', () => {
  it('detects OpenAI-style keys, JWT, AWS keys, and emails', () => {
    const text = JSON.stringify({
      apiKey: 'sk-abcdefghijklmnopqrstuvwxyz012345',
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturepaddinghereXX',
      aws: 'AKIAIOSFODNN7EXAMPLE',
      email: 'user@example.com',
    });

    const findings = scanForSecrets(text);
    const labels = findings.map((f) => f.label).join(' ');
    expect(labels).toMatch(/API key|OpenAI/i);
    expect(labels).toMatch(/JWT/i);
    expect(labels).toMatch(/AWS/i);
    expect(labels).toMatch(/Email/i);
    expect(hasHighSeveritySecrets(findings)).toBe(true);
    expect(findings.every((f) => !f.sample.includes('sk-abcdefghijklmnopqrstuvwxyz'))).toBe(true);
  });

  it('detects password-like assignments', () => {
    const findings = scanForSecrets('password: "hunter2secret"');
    expect(findings.some((f) => f.kind === 'password')).toBe(true);
  });

  it('scans request parts', () => {
    const findings = scanRequestForSecrets({
      url: 'https://api.example.com',
      headers: [{ key: 'Authorization', value: 'Bearer abcdefghijklmnopqrstuvwxyz0123456789' }],
      body: '{"email":"ada@example.com"}',
    });
    expect(findings.some((f) => f.kind === 'bearer_token' || f.kind === 'email')).toBe(true);
  });

  it('formats a share warning message', () => {
    const findings = scanForSecrets('contact me at ada@example.com');
    const message = formatSecretFindingsMessage(findings, 'share');
    expect(message).toMatch(/Sharing could expose/i);
    expect(message).toMatch(/Email/i);
  });

  it('returns empty for clean JSON', () => {
    expect(scanForSecrets('{"hello":"world","count":3}')).toEqual([]);
  });
});
