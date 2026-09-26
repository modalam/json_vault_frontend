export function AboutPage() {
  return (
    <LegalLayout title="About JSON Vault">
      <p>
        JSON Vault is an edge-native workspace for storing, editing, comparing, and sharing JSON.
        It runs on Cloudflare Workers and Pages so your documents stay close to your users.
      </p>
      <p>
        Create anonymous blobs for quick sharing, or sign in to sync workspaces, manage vaults, and
        use API keys for automation.
      </p>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>Last updated: July 23, 2026</p>
      <p>
        We collect account email, authentication tokens, blob metadata, and usage metrics needed to
        operate the service. Blob contents you save are stored in Cloudflare D1 and optionally R2.
      </p>
      <p>
        API keys are stored hashed. Edit tokens remain in your browser unless you share them. We do
        not sell personal data. Contact support to request account or data deletion.
      </p>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>Last updated: July 23, 2026</p>
      <p>
        By using JSON Vault you agree not to store unlawful content, abuse rate limits, or attempt
        unauthorized access to other users&apos; data. Free-plan quotas may change with notice.
      </p>
      <p>
        The service is provided as-is without warranties. We may suspend accounts that violate these
        terms or threaten platform stability.
      </p>
    </LegalLayout>
  );
}

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}
