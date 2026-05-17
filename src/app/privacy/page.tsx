import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SwiftDispatch",
  description: "SwiftDispatch Privacy Policy — how we collect, use, and protect your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 mb-3">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-10">Last updated: May 16, 2026</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-7">

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Introduction</h2>
          <p>
            This Privacy Policy describes how SwiftDispatch (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, stores, and shares
            information when you use our website, applications, and related services (collectively, the
            &ldquo;Services&rdquo;).
          </p>
          <p className="mt-3">
            By using SwiftDispatch, you agree to the collection and use of information in accordance with
            this Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">About SwiftDispatch</h2>
          <p>
            SwiftDispatch is a field service operations platform designed to help service businesses manage
            scheduling, technician workflows, customer communication, invoicing, dispatch coordination, and
            related operational activities.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Information We Collect</h2>

          <h3 className="text-base font-semibold text-slate-800 mt-5 mb-2">Information You Provide</h3>
          <p>We may collect personal information that you voluntarily provide when using the Services, including:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-600">
            <li>Names</li>
            <li>Email addresses</li>
            <li>Phone numbers</li>
            <li>Mailing addresses</li>
            <li>Business names</li>
            <li>Job titles</li>
            <li>Account credentials and authentication data</li>
            <li>Customer information entered into the platform</li>
            <li>Job notes, dispatch details, and operational records</li>
            <li>Contact preferences</li>
          </ul>
          <p className="mt-3">
            You are responsible for ensuring that any information submitted to the Services is accurate and
            up to date.
          </p>

          <h3 className="text-base font-semibold text-slate-800 mt-5 mb-2">Information Collected Automatically</h3>
          <p>When you use the Services, we may automatically collect certain technical and usage information, including:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-600">
            <li>IP addresses</li>
            <li>Browser and device information</li>
            <li>Operating system information</li>
            <li>Login timestamps</li>
            <li>Usage activity within the platform</li>
            <li>Diagnostic and performance data</li>
            <li>Cookies and similar technologies</li>
          </ul>
          <p className="mt-3">
            This information helps us maintain platform security, improve performance, troubleshoot issues,
            and better understand how the Services are used.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">How We Use Information</h2>
          <p>We may use collected information to:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-600">
            <li>Provide and maintain the Services</li>
            <li>Create and manage user accounts</li>
            <li>Authenticate users and maintain platform security</li>
            <li>Facilitate dispatching, scheduling, invoicing, and operational workflows</li>
            <li>Send service-related communications and notifications</li>
            <li>Respond to support requests and inquiries</li>
            <li>Improve platform functionality and user experience</li>
            <li>Monitor for fraud, abuse, or unauthorized access</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">SMS Communications</h2>
          <p>
            SwiftDispatch may send transactional or operational text messages related to account activity,
            dispatch updates, scheduling, technician notifications, customer communication, and related service
            operations.
          </p>
          <p className="mt-3">
            Users may opt out of SMS communications by following instructions included in applicable messages,
            including replying STOP where supported.
          </p>
          <p className="mt-3">Message and data rates may apply depending on your mobile carrier.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Cookies and Tracking Technologies</h2>
          <p>We may use cookies and similar technologies to:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-600">
            <li>Maintain platform functionality</li>
            <li>Store user preferences</li>
            <li>Improve security and performance</li>
            <li>Analyze usage trends</li>
            <li>Enhance the overall user experience</li>
          </ul>
          <p className="mt-3">Most browsers allow users to control cookie settings through browser preferences.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Third-Party Services</h2>
          <p>
            We may use third-party service providers to support platform infrastructure, communications,
            authentication, hosting, analytics, and related operations.
          </p>
          <p className="mt-3">Third-party providers may include:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-600">
            <li>Supabase</li>
            <li>Twilio</li>
            <li>Vercel</li>
            <li>Stripe (if payment processing is enabled)</li>
          </ul>
          <p className="mt-3">
            These providers may process information only as necessary to perform services on our behalf.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Sharing</h2>
          <p>We do not sell personal information.</p>
          <p className="mt-3">We may share information:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-600">
            <li>With service providers supporting the operation of the Services</li>
            <li>To comply with legal obligations or lawful requests</li>
            <li>To protect platform security and prevent fraud</li>
            <li>In connection with a merger, acquisition, financing event, or business transfer</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Retention</h2>
          <p>We retain information for as long as reasonably necessary to:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-600">
            <li>Provide the Services</li>
            <li>Maintain account functionality</li>
            <li>Comply with legal obligations</li>
            <li>Resolve disputes</li>
            <li>Enforce agreements</li>
          </ul>
          <p className="mt-3">
            When information is no longer needed, we may delete, anonymize, or securely archive it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Security</h2>
          <p>
            We implement reasonable administrative, technical, and organizational safeguards intended to
            protect personal information.
          </p>
          <p className="mt-3">
            However, no method of electronic transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Children&rsquo;s Privacy</h2>
          <p>SwiftDispatch is not intended for individuals under the age of 18.</p>
          <p className="mt-3">
            We do not knowingly collect personal information from children under 18 years of age.
          </p>
          <p className="mt-3">
            If we become aware that information from a child under 18 has been collected, we will take
            reasonable steps to delete it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Your Rights and Choices</h2>
          <p>
            Depending on your location and applicable laws, you may have rights regarding your personal
            information, including the right to:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-600">
            <li>Access your information</li>
            <li>Correct inaccurate information</li>
            <li>Delete your information</li>
            <li>Request a copy of your information</li>
            <li>Withdraw consent where applicable</li>
          </ul>
          <p className="mt-3">
            Users may also update account information through platform account settings where available.
          </p>
          <p className="mt-3">
            To submit requests regarding your information, contact us using the information below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Do Not Track Signals</h2>
          <p>
            Some browsers include Do Not Track (DNT) settings. Because there is currently no universally
            accepted standard for DNT signals, SwiftDispatch does not currently respond to them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time.</p>
          <p className="mt-3">
            Updated versions will be posted on this page with a revised effective date. Continued use of
            the Services after updates become effective constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact Information</h2>
          <p>
            If you have questions about this Privacy Policy or your personal information, you may contact
            us at:
          </p>
          <address className="not-italic mt-4 space-y-1 text-slate-700">
            <p className="font-semibold">SwiftDispatch</p>
            <p>Clermont, FL 34711</p>
            <p>United States</p>
            <p>
              Email:{" "}
              <a className="text-teal-700 hover:underline" href="mailto:privacy@swiftdispatch.app">
                privacy@swiftdispatch.app
              </a>
            </p>
          </address>
        </section>

      </div>

      <div className="mt-12 border-t border-slate-200 pt-8">
        <a className="text-sm text-teal-700 hover:underline" href="/">← Back to home</a>
      </div>
    </main>
  );
}
