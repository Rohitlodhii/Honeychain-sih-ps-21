'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function Home() {
  const [demoHovered, setDemoHovered] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso">
      {/* Header/Nav */}
      <nav className="sticky top-0 z-50 bg-espresso/95 backdrop-blur border-b border-honey/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-honey rounded transform rotate-45"></div>
            <span className="text-2xl font-serif font-bold text-honey">HoneyChain</span>
          </div>
          <div className="flex gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="btn-ghost">
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    setIsAuthenticated(false)
                  }}
                  className="btn-ghost"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">
                  Login
                </Link>
                <Link href="/login?mode=register" className="btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section py-20">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Problem/Solution */}
          <div>
            <h1 className="text-5xl font-serif font-bold text-honey mb-6 leading-tight">
              Trust Your Honey From Hive to Cup
            </h1>
            <p className="text-xl text-cream/90 mb-4">
              Counterfeit honey erodes consumer trust and exploits honest beekeepers. HoneyChain brings transparency.
            </p>
            <ul className="space-y-3 mb-8 text-lg">
              <li className="flex gap-3">
                <span className="text-honey text-2xl">✓</span>
                <span>QR scan reveals complete honey traceability</span>
              </li>
              <li className="flex gap-3">
                <span className="text-honey text-2xl">✓</span>
                <span>Tamper-proof ledger proves authenticity</span>
              </li>
              <li className="flex gap-3">
                <span className="text-honey text-2xl">✓</span>
                <span>Beekeepers get AI hive health alerts</span>
              </li>
              <li className="flex gap-3">
                <span className="text-honey text-2xl">✓</span>
                <span>KVIC can aggregate honey supply at scale</span>
              </li>
            </ul>

            <div className="flex gap-4">
              <Link href="/login?mode=register" className="btn-primary">
                Join as Beekeeper
              </Link>
              <a
                href="#demo"
                className="btn-secondary"
              >
                See Demo
              </a>
            </div>
          </div>

          {/* Right: Live Demo */}
          <div
            id="demo"
            className="relative"
            onMouseEnter={() => setDemoHovered(true)}
            onMouseLeave={() => setDemoHovered(false)}
          >
            <div className={`card glow-honey transform transition-transform ${
              demoHovered ? 'scale-105' : ''
            }`}>
              <div className="text-center">
                <h3 className="text-2xl font-serif font-bold text-honey mb-4">
                  Scan a Honey Batch
                </h3>
                <p className="text-cream/80 mb-6">
                  This QR code links to a real verification page. Point your phone camera and tap:
                </p>

                {/* QR Code - links to demo batch */}
                <div className="flex justify-center mb-6">
                  <div className="bg-cream p-4 rounded-lg">
                    <QRCodeSVG
                      value="https://honeychain.vercel.app/verify/demo-batch-001"
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>

                <p className="text-sm text-cream/60">
                  Tap the QR to see the full traceability timeline, purity score, and authenticity badge.
                </p>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute top-4 right-4 badge-verified text-xs">
              VERIFIED
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-surface/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold text-center text-honey mb-12">
            Built for Rural Beekeepers
          </h2>

          <div className="hex-grid">
            {/* Feature 1 */}
            <div className="card">
              <div className="text-4xl text-honey mb-3">📱</div>
              <h3 className="font-serif font-bold text-xl text-honey mb-3">Simple Interface</h3>
              <p className="text-cream/80">
                Large buttons, clear language, Hindi labels. No complex dashboards — just the essential info.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card">
              <div className="text-4xl text-honey mb-3">🐝</div>
              <h3 className="font-serif font-bold text-xl text-honey mb-3">Hive Health Monitoring</h3>
              <p className="text-cream/80">
                AI tracks temperature, humidity, and hive acoustics to predict disease and yield.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card">
              <div className="text-4xl text-honey mb-3">🔗</div>
              <h3 className="font-serif font-bold text-xl text-honey mb-3">Unforgeable Ledger</h3>
              <p className="text-cream/80">
                Every harvest, test, and sale is locked into a tamper-proof chain. Consumers can verify instantly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card">
              <div className="text-4xl text-honey mb-3">📊</div>
              <h3 className="font-serif font-bold text-xl text-honey mb-3">KVIC Dashboard</h3>
              <p className="text-cream/80">
                Cooperative admins see cluster-level supply, quality metrics, and ledger health in real time.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card">
              <div className="text-4xl text-honey mb-3">🌍</div>
              <h3 className="font-serif font-bold text-xl text-honey mb-3">Offline Ready</h3>
              <p className="text-cream/80">
                Works in rural areas with no reliable internet. Sync when connectivity returns.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card">
              <div className="text-4xl text-honey mb-3">⚙️</div>
              <h3 className="font-serif font-bold text-xl text-honey mb-3">Cooperative Consortium</h3>
              <p className="text-cream/80">
                Permissioned ledger for KVIC network. No public blockchain dependency, full control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold text-center text-honey mb-12">
            How It Works
          </h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="text-4xl font-serif font-bold text-honey/40 flex-shrink-0 w-16 text-center">1</div>
              <div className="card flex-1">
                <h3 className="font-serif font-bold text-xl text-honey mb-2">Harvest & Register</h3>
                <p className="text-cream/80">
                  Beekeeper creates a batch (honey lot) in the app. System tests moisture purity and writes a HARVEST block to the ledger.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="text-4xl font-serif font-bold text-honey/40 flex-shrink-0 w-16 text-center">2</div>
              <div className="card flex-1">
                <h3 className="font-serif font-bold text-xl text-honey mb-2">Track & Transfer</h3>
                <p className="text-cream/80">
                  As honey moves (QA test → packaging → sale), each step is logged as a new block. Beekeeper can transfer batches between roles.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="text-4xl font-serif font-bold text-honey/40 flex-shrink-0 w-16 text-center">3</div>
              <div className="card flex-1">
                <h3 className="font-serif font-bold text-xl text-honey mb-2">Print & Sell</h3>
                <p className="text-cream/80">
                  QR code is generated and printed on the honey jar label. Retailers scan → instant consumer-facing verification page.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6 items-start">
              <div className="text-4xl font-serif font-bold text-honey/40 flex-shrink-0 w-16 text-center">4</div>
              <div className="card flex-1">
                <h3 className="font-serif font-bold text-xl text-honey mb-2">Verify & Trust</h3>
                <p className="text-cream/80">
                  Consumer scans QR → sees full timeline (harvest date, beekeeper, tests), purity score, and an authenticity badge. Tamper-proof.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hive Health Monitoring */}
      <section className="py-20 bg-surface/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold text-center text-honey mb-12">
            Smart Hive Monitoring
          </h2>
          <p className="text-center text-cream/80 max-w-2xl mx-auto mb-8">
            Beekeepers install low-cost sensors (temperature, humidity, acoustic). AI analyzes apiculture science ranges to detect disease, starvation, and predict honey yield.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Health Card */}
            <div className="card">
              <div className="text-center">
                <div className="text-5xl text-sage mb-4">✓</div>
                <h3 className="font-serif font-bold text-xl text-honey mb-3">HEALTHY</h3>
                <p className="text-cream/80 text-sm mb-4">
                  Temp: 34.5°C | Humidity: 58% | Sound: 220Hz
                </p>
                <p className="text-xs text-cream/60">
                  Brood developing normally. Foraging active. No signs of disease.
                </p>
              </div>
            </div>

            {/* Watch Card */}
            <div className="card">
              <div className="text-center">
                <div className="text-5xl text-honey mb-4">⚠</div>
                <h3 className="font-serif font-bold text-xl text-honey mb-3">WATCH</h3>
                <p className="text-cream/80 text-sm mb-4">
                  Temp: 30°C | Humidity: 42% | Weight: -0.3kg
                </p>
                <p className="text-xs text-cream/60">
                  Low humidity and cooling. Check insulation. Verify water source.
                </p>
              </div>
            </div>

            {/* High Risk Card */}
            <div className="card border-brick/50">
              <div className="text-center">
                <div className="text-5xl text-brick mb-4">🔴</div>
                <h3 className="font-serif font-bold text-xl text-brick mb-3">HIGH_RISK</h3>
                <p className="text-cream/80 text-sm mb-4">
                  Temp: 27°C | Humidity: 75% | Sound: 140Hz
                </p>
                <p className="text-xs text-cream/60">
                  Extreme temperatures + acoustic anomaly. Possible disease. Act now.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-serif font-bold text-honey mb-6">
            Ready to Join HoneyChain?
          </h2>
          <p className="text-xl text-cream/80 mb-8 max-w-2xl mx-auto">
            Whether you're a beekeeper protecting your heritage or a cooperative scaling trust, HoneyChain is built for you.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/login?mode=register" className="btn-primary">
              Sign Up Now
            </Link>
            <Link href="/login" className="btn-secondary">
              I Already Have Account
            </Link>
          </div>

          <p className="text-sm text-cream/60 mt-8">
            HoneyChain is built for KVIC's Honey Mission. All data stays within the cooperative network.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-honey/20 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-cream/60">
          <p>&copy; 2024 HoneyChain. Bringing trust to honey, from hive to cup.</p>
        </div>
      </footer>
    </main>
  )
}
