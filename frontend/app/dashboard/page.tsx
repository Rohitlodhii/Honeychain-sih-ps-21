'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, hiveAPI, batchAPI } from '@/lib/api'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Hive {
  id: string
  name: string
  location: string
  species: string
}

interface HealthStatus {
  status: 'HEALTHY' | 'WATCH' | 'HIGH_RISK'
  confidence: number
  reasons: string[]
}

// XSS Prevention: Escape HTML special characters to prevent XSS - uses textContent to sanitize
function escapeHtml(text: string): string {
  // Create a temporary element and set textContent to escape HTML entities
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

interface Batch {
  id: string
  hive_id: string
  honey_type: string
  quantity_kg: number
  status: string
  purity_score?: number
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [hives, setHives] = useState<Hive[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewHive, setShowNewHive] = useState(false)
  const [showNewBatch, setShowNewBatch] = useState(false)
  const [selectedHive, setSelectedHive] = useState<string>('')
  const [hiveHealth, setHiveHealth] = useState<Record<string, HealthStatus>>({})
  const [simulatingHive, setSimulatingHive] = useState<string>('')

  // Form states
  const [newHiveName, setNewHiveName] = useState('')
  const [newHiveLocation, setNewHiveLocation] = useState('')
  const [newHiveSpecies, setNewHiveSpecies] = useState('apis_mellifera')

  const [newBatchHive, setNewBatchHive] = useState('')
  const [newBatchType, setNewBatchType] = useState('')
  const [newBatchQty, setNewBatchQty] = useState('')
  const [newBatchLocation, setNewBatchLocation] = useState('')
  const [newBatchMoisture, setNewBatchMoisture] = useState('')

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const meResponse = await authAPI.me()
        setUser(meResponse.data)

        const hivesResponse = await hiveAPI.list()
        setHives(hivesResponse.data)
        setSelectedHive(hivesResponse.data[0]?.id || '')

        const batchesResponse = await batchAPI.list()
        setBatches(batchesResponse.data)
      } catch (err) {
        console.error('Failed to load data', err)
        localStorage.removeItem('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // Load health for selected hive
  useEffect(() => {
    if (!selectedHive) return

    const loadHealth = async () => {
      try {
        const response = await hiveAPI.getHealth(selectedHive)
        setHiveHealth((prev) => ({
          ...prev,
          [selectedHive]: response.data.health,
        }))
      } catch (err) {
        console.error('Failed to load health', err)
      }
    }

    loadHealth()
  }, [selectedHive])

  const handleCreateHive = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await hiveAPI.create({
        name: newHiveName,
        location: newHiveLocation,
        species: newHiveSpecies,
      })
      setHives([...hives, response.data])
      setNewHiveName('')
      setNewHiveLocation('')
      setShowNewHive(false)
    } catch (err) {
      console.error('Failed to create hive', err)
    }
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await batchAPI.create({
        hive_id: newBatchHive,
        honey_type: newBatchType,
        quantity_kg: parseFloat(newBatchQty),
        apiary_location: newBatchLocation,
        moisture_pct: parseFloat(newBatchMoisture),
      })
      setBatches([...batches, response.data])
      setNewBatchHive('')
      setNewBatchType('')
      setNewBatchQty('')
      setNewBatchLocation('')
      setNewBatchMoisture('')
      setShowNewBatch(false)

      // Use safe innerHTML instead of raw alert
      const message = `Batch created! QR code generated. Batch ID: ${response.data.batch_id}`
      const safeDiv = document.createElement('div')
      safeDiv.innerHTML = escapeHtml(message)
      console.log('Batch created:', safeDiv.textContent)
      alert(safeDiv.textContent)
    } catch (err) {
      console.error('Failed to create batch', err)
    }
  }

  const handleSimulate = async (hiveId: string, withAnomaly: boolean) => {
    setSimulatingHive(hiveId)
    try {
      const response = await hiveAPI.simulate(hiveId, withAnomaly)
      setHiveHealth((prev) => ({
        ...prev,
        [hiveId]: response.data.health_status,
      }))
      // Use safe innerHTML instead of raw alert
      const message = `Simulation complete. Status: ${response.data.health_status.status}`
      const safeDiv = document.createElement('div')
      safeDiv.innerHTML = escapeHtml(message)
      alert(safeDiv.textContent)
    } catch (err) {
      console.error('Simulation failed', err)
    } finally {
      setSimulatingHive('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-espresso flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl text-honey mb-4">🐝</div>
          <p className="text-cream">Loading HoneyChain Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const currentHealth = selectedHive ? hiveHealth[selectedHive] : null
  const userBatches = batches.filter((b) => b.hive_id === selectedHive)

  return (
    <main className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-espresso/95 backdrop-blur border-b border-honey/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-honey">{user.name}&apos;s Hives</h1>
            <p className="text-sm text-cream/60">{user.cluster || 'No cluster assigned'}</p>
          </div>

          <div className="flex gap-3">
            {user.role === 'cooperative_admin' && (
              <Link href="/admin" className="btn-secondary">
                Admin Dashboard
              </Link>
            )}
            <button
              onClick={() => {
                localStorage.removeItem('token')
                router.push('/')
              }}
              className="btn-ghost"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar: Hives List */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-serif font-bold text-honey mb-4">My Hives</h2>

              <div className="space-y-2 mb-4">
                {hives.map((hive) => (
                  <button
                    key={hive.id}
                    onClick={() => setSelectedHive(hive.id)}
                    className={`w-full text-left p-3 rounded transition-colors ${
                      selectedHive === hive.id
                        ? 'bg-honey/20 border-l-4 border-honey'
                        : 'hover:bg-surface/50'
                    }`}
                  >
                    <div className="font-semibold text-cream">{hive.name}</div>
                    <div className="text-xs text-cream/60">{hive.location}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowNewHive(!showNewHive)}
                className="btn-secondary w-full text-sm"
              >
                {showNewHive ? 'Cancel' : '+ Add Hive'}
              </button>

              {showNewHive && (
                <form onSubmit={handleCreateHive} className="mt-4 pt-4 border-t border-honey/20 space-y-3">
                  <input
                    type="text"
                    placeholder="Hive name"
                    value={newHiveName}
                    onChange={(e) => setNewHiveName(e.target.value)}
                    className="input-field text-sm"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={newHiveLocation}
                    onChange={(e) => setNewHiveLocation(e.target.value)}
                    className="input-field text-sm"
                    required
                  />
                  <select
                    value={newHiveSpecies}
                    onChange={(e) => setNewHiveSpecies(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="apis_mellifera">Apis Mellifera</option>
                    <option value="apis_cerana">Apis Cerana</option>
                  </select>
                  <button type="submit" className="btn-primary w-full text-sm">
                    Create Hive
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Main: Health & Batches */}
          <div className="lg:col-span-3 space-y-6">
            {selectedHive ? (
              <>
                {/* Health Status Card */}
                {currentHealth && (
                  <div className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-serif font-bold text-honey">Hive Health</h2>
                        <div className={`mt-2 ${
                          currentHealth.status === 'HEALTHY'
                            ? 'badge-healthy'
                            : currentHealth.status === 'WATCH'
                            ? 'badge-watch'
                            : 'badge-risk'
                        }`}>
                          {currentHealth.status}
                        </div>
                      </div>
                      <div className="text-sm text-cream/60">
                        Confidence: {(currentHealth.confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {currentHealth.reasons.map((reason, idx) => (
                        <p key={idx} className="text-sm text-cream/80">
                          {/* XSS: Escape reason content before rendering */}
                          {escapeHtml(reason)}
                        </p>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleSimulate(selectedHive, false)}
                        disabled={simulatingHive === selectedHive}
                        className="btn-secondary text-sm disabled:opacity-50"
                      >
                        {simulatingHive === selectedHive ? 'Simulating...' : 'Simulate Reading'}
                      </button>
                      <button
                        onClick={() => handleSimulate(selectedHive, true)}
                        disabled={simulatingHive === selectedHive}
                        className="btn-secondary text-sm disabled:opacity-50"
                      >
                        {simulatingHive === selectedHive ? 'Simulating...' : 'Simulate Anomaly'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Batches */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-serif font-bold text-honey">Honey Batches</h2>
                    <button
                      onClick={() => setShowNewBatch(!showNewBatch)}
                      className="btn-secondary text-sm"
                    >
                      {showNewBatch ? 'Cancel' : '+ New Batch'}
                    </button>
                  </div>

                  {showNewBatch && (
                    <form onSubmit={handleCreateBatch} className="mb-6 pb-6 border-b border-honey/20 space-y-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Honey type (e.g., Wildflower)"
                          value={newBatchType}
                          onChange={(e) => setNewBatchType(e.target.value)}
                          className="input-field text-sm"
                          required
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Quantity (kg)"
                          value={newBatchQty}
                          onChange={(e) => setNewBatchQty(e.target.value)}
                          className="input-field text-sm"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Apiary location"
                          value={newBatchLocation}
                          onChange={(e) => setNewBatchLocation(e.target.value)}
                          className="input-field text-sm"
                          required
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Measured moisture %"
                          value={newBatchMoisture}
                          onChange={(e) => setNewBatchMoisture(e.target.value)}
                          className="input-field text-sm"
                          min="0"
                          max="100"
                          required
                        />
                      </div>
                      <button type="submit" className="btn-primary w-full text-sm">
                        Create & Generate QR
                      </button>
                    </form>
                  )}

                  {userBatches.length > 0 ? (
                    <div className="space-y-3">
                      {userBatches.map((batch) => (
                        <div key={batch.id} className="bg-espresso/50 p-4 rounded-lg border border-honey/20">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              {/* XSS: Escape honey_type before rendering */}
                              <h3 className="font-semibold text-cream">{escapeHtml(batch.honey_type)}</h3>
                              <p className="text-sm text-cream/60">{batch.quantity_kg} kg</p>
                            </div>
                            <div className={`text-xs font-semibold ${
                              batch.status === 'HARVESTED' ? 'badge-watch' : 'badge-verified'
                            }`}>
                              {batch.status}
                            </div>
                          </div>
                          {batch.purity_score !== null && (
                            <p className="text-xs text-cream/60">
                              Purity: {(batch.purity_score || 0).toFixed(1)}/100
                            </p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <a
                              href={batchAPI.getQR(batch.id)}
                              download
                              className="text-sm text-honey hover:text-amber"
                            >
                              Download QR
                            </a>
                            <Link
                              href={`/verify/${batch.id}`}
                              className="text-sm text-honey hover:text-amber"
                            >
                              View Public Page
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-cream/60">No batches yet. Create your first harvest!</p>
                  )}
                </div>
              </>
            ) : (
              <div className="card text-center py-12">
                <p className="text-cream/60 mb-4">Create your first hive to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
