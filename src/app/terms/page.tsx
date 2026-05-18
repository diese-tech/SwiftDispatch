import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — SwiftDispatch",
  description: "SwiftDispatch Terms of Service.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 mb-3">Terms of Service</h1>
      <p className="text-sm text-slate-400 mb-10">Last updated: May 2026</p>

      <div className="space-y-6 text-slate-700 leading-7">
        <p>
          By accessing or using SwiftDispatch (&ldquo;the Service&rdquo;), you agree to be bound by these
          Terms of Service. If you do not agree, do not use the Service.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Use of the Service</h2>
          <p>
            SwiftDispatch is a field service operations platform. You may use the Service only for lawful
            business purposes and in accordance with these Terms. You are responsible for maintaining the
            confidentiality of your account credentials.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-600">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the Service</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Transmit harmful, offensive, or deceptive content through the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service are owned by SwiftDispatch and are
            protected by applicable intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Disclaimer of Warranties</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either
            express or implied, including but not limited to implied warranties of merchantability,
            fitness for a particular purpose, or non-infringement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, SwiftDispatch shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after changes
            become effective constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact</h2>
          <p>
            Questions about these Terms may be directed to{" "}
            <a className="text-teal-700 hover:underline" href="mailto:hello@swiftdispatch.app">
              hello@swiftdispatch.app
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-slate-200 pt-8">
        <a className="text-sm text-teal-700 hover:underline" href="/">← Back to home</a>
      </div>
    </main>
  );
}
