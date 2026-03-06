import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Chaotix",
  description: "Privacy Policy for Chaotix. How we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: March 4, 2025</p>

        <div className="mt-10 max-w-none space-y-6 text-slate-400 leading-relaxed">
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">1. Introduction</h2>
            <p>
              Chaotix (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services (&quot;Service&quot;). By using the Service, you consent to the practices described in this policy.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">2. Information We Collect</h2>
            <p>We may collect the following:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong className="text-slate-300">Account information:</strong> email address, username, name, profile image, and password (stored in hashed form) when you register or sign in with email. If you connect a wallet or use third-party sign-in (e.g., Google), we may receive identifiers and profile data from the provider.
              </li>
              <li>
                <strong className="text-slate-300">Wallet and blockchain data:</strong> wallet address(es) and related account data when you connect a wallet to the Service.
              </li>
              <li>
                <strong className="text-slate-300">Usage and activity:</strong> trades, positions, market activity, referral usage, and other actions you take on the Service.
              </li>
              <li>
                <strong className="text-slate-300">Device and log data:</strong> IP address, browser type, device information, and general usage logs to operate and secure the Service.
              </li>
              <li>
                <strong className="text-slate-300">Cookies and similar technologies:</strong> we use session cookies (e.g., for authentication and CSRF protection) and similar technologies to maintain your session and secure the Service.
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide, operate, and improve the Service</li>
              <li>Authenticate you and manage your account</li>
              <li>Process and record your activity (e.g., trades, positions, referrals)</li>
              <li>Send you service-related communications (e.g., notifications you opt into)</li>
              <li>Detect and prevent fraud, abuse, and security issues</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
              <li>Analyze usage to improve the product (in aggregated or anonymized form where appropriate)</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">4. Sharing and Disclosure</h2>
            <p>
              We may share your information with: (a) service providers who assist us in operating the Service (e.g., hosting, analytics), subject to confidentiality and use limitations; (b) law enforcement or other parties when required by law or to protect our rights and safety; (c) affiliates or successors in connection with a merger, sale, or restructuring. We do not sell your personal information. We may share aggregated or de-identified data that does not identify you.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">5. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide the Service, comply with law, resolve disputes, and enforce our agreements. You may request deletion of your account and associated personal data subject to applicable law and our retention requirements (e.g., for legal or safety reasons).
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">6. Your Rights and Choices</h2>
            <p>
              Depending on your location, you may have the right to access, correct, delete, or port your personal data, or to object to or restrict certain processing. You can update account details in your profile and contact us to exercise other rights. You may also disable cookies in your browser (some features may not work correctly). To request access or deletion, contact us at the email below.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">7. Security</h2>
            <p>
              We implement reasonable technical and organizational measures to protect your information. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">8. Children</h2>
            <p>
              The Service is not intended for users under 18 (or the age of majority in your jurisdiction). We do not knowingly collect personal information from children. If you believe we have collected such information, please contact us so we can delete it.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">9. International Transfers</h2>
            <p>
              Your information may be processed in countries other than your own. We take steps to ensure that such transfers are subject to appropriate safeguards where required by applicable law.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance of the updated policy. We encourage you to review this policy periodically.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-200">11. Contact</h2>
            <p>
              For privacy-related questions or requests, contact us at:{" "}
              <a href="mailto:privacy@chaotix.io" className="text-emerald-400 hover:underline">
                privacy@chaotix.io
              </a>
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-slate-500">
          <Link href="/" className="text-emerald-400 hover:underline">
            ← Back to Chaotix
          </Link>
          {" · "}
          <Link href="/terms" className="text-emerald-400 hover:underline">
            Terms of Service
          </Link>
        </p>
      </div>
  );
}
