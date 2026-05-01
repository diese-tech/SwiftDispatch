import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <span className="text-xl font-bold text-teal-700">SwiftDispatch</span>
        <Link
          href="/login"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 transition"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="max-w-2xl text-5xl font-bold tracking-tight">
          HVAC dispatch, finally under control.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-600">
          Assign jobs, track technicians in real time, send quotes by SMS, and close
          faster — all from one dashboard.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <a
            href="mailto:hello@swiftdispatch.app?subject=Demo%20Request"
            className="rounded-lg bg-teal-700 px-6 py-3 text-base font-semibold text-white hover:bg-teal-800 transition"
          >
            Request a Demo
          </a>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">📞</div>
              <h3 className="text-lg font-semibold mb-2">Customer calls</h3>
              <p className="text-slate-600 text-sm">
                Customer submits a request online or calls in. A job is created instantly.
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold mb-2">Dispatcher assigns</h3>
              <p className="text-slate-600 text-sm">
                Dispatcher drags the job to the right tech on the live Kanban board.
                Tech gets an SMS with one-tap status links.
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2">Tech updates from phone</h3>
              <p className="text-slate-600 text-sm">
                Tech taps links to go En Route, Arrived, and Complete — no app needed.
                Customer approves quote by SMS.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold mb-12">Key features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: '📋', title: 'Real-time Kanban', desc: 'Drag-and-drop job board with live status updates across your whole team.' },
              { icon: '📱', title: 'SMS notifications', desc: 'Technicians get one-tap action links. Customers get status updates and quote approvals.' },
              { icon: '💰', title: 'Quote approval', desc: 'Send quotes by SMS. Customers approve with one tap. No app install needed.' },
              { icon: '📊', title: 'Analytics', desc: 'Track response times, quote acceptance rates, and revenue per tech.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-slate-200 p-6">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="text-lg font-semibold mb-1">{title}</h3>
                <p className="text-slate-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold mb-4">Simple pricing</h2>
          <p className="text-center text-slate-600 mb-12">No setup fees. No contracts. Cancel any time.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { name: 'Starter', price: '$99', period: '/mo', techs: '3 technicians', features: ['Kanban dispatch board', 'SMS notifications', 'Quote builder'] },
              { name: 'Growth', price: '$199', period: '/mo', techs: '10 technicians', features: ['Everything in Starter', 'Analytics dashboard', 'Quote templates'] },
              { name: 'Pro', price: '$399', period: '/mo', techs: 'Unlimited technicians', features: ['Everything in Growth', 'Priority support', 'Custom integrations'] },
            ].map(({ name, price, period, techs, features }) => (
              <div key={name} className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col">
                <h3 className="text-lg font-bold">{name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold">{price}</span>
                  <span className="text-slate-500 text-sm">{period}</span>
                </div>
                <p className="text-sm text-slate-500 mb-4">{techs}</p>
                <ul className="space-y-2 text-sm text-slate-600 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-teal-600 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:hello@swiftdispatch.app?subject=SwiftDispatch%20Pricing"
                  className="mt-6 block text-center rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition"
                >
                  Contact us
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/privacy" className="hover:text-slate-700">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-700">Terms of Service</Link>
          <a href="mailto:hello@swiftdispatch.app" className="hover:text-slate-700">Contact</a>
        </div>
        <p>&copy; {new Date().getFullYear()} SwiftDispatch. All rights reserved.</p>
      </footer>
    </div>
  )
}
