import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 mt-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent">
            HT-1 Patient Queue & Triage Optimizer
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Privacy-first, explainable triage system that reduces critical-case waiting time using ML-powered smart queue management
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Check-in Card */}
          <Link href="/checkin" className="group">
            <div className="glass rounded-2xl p-8 hover:shadow-glow transition-all duration-300 transform hover:-translate-y-2 cursor-pointer">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-2xl font-bold mb-3 text-primary-600 dark:text-primary-400">
                Patient Check-in
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Quick patient registration with vital signs and symptom assessment
              </p>
            </div>
          </Link>

          {/* Dashboard Card */}
          <Link href="/dashboard" className="group">
            <div className="glass rounded-2xl p-8 hover:shadow-glow transition-all duration-300 transform hover:-translate-y-2 cursor-pointer">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-3 text-primary-600 dark:text-primary-400">
                Queue Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time queue monitoring with intelligent priority sorting
              </p>
            </div>
          </Link>

          {/* Admin Card */}
          <Link href="/admin" className="group">
            <div className="glass rounded-2xl p-8 hover:shadow-glow transition-all duration-300 transform hover:-translate-y-2 cursor-pointer">
              <div className="text-5xl mb-4">⚙️</div>
              <h2 className="text-2xl font-bold mb-3 text-primary-600 dark:text-primary-400">
                Admin Panel
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Configure triage weights and manage queue settings
              </p>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="glass rounded-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Key Features</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h4 className="font-semibold mb-1">ML-Powered Triage</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Logistic regression model with rule-based safety fallback
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h4 className="font-semibold mb-1">Real-time Updates</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  WebSocket-powered live queue updates and alerts
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔍</span>
              <div>
                <h4 className="font-semibold mb-1">Explainable AI</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Full audit trail showing how each triage decision was made
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h4 className="font-semibold mb-1">Privacy-First</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Minimal PII collection with encrypted connections
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🚨</span>
              <div>
                <h4 className="font-semibold mb-1">Smart Alerts</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatic notifications for critical patients and SLA breaches
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">📈</span>
              <div>
                <h4 className="font-semibold mb-1">Analytics</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track wait times, queue efficiency, and critical case metrics
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-500 mt-8">
          ⚠️ This system is a triage assistance tool and not a replacement for clinical judgment.
          Always defer to qualified healthcare professionals for final medical decisions.
        </div>
      </div>
    </main>
  )
}
