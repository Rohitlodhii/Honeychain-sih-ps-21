'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, hiveAPI, batchAPI } from '@/lib/api'
import {
  APIARY_HINTS,
  FIELD_LIMITS,
  HIVE_SPECIES_OPTIONS,
  isHiveSpecies,
  validateBatchForm,
  validateHiveForm,
  validateReadingForm,
  type FormErrors,
  type HiveSpecies,
} from '@/lib/farmer-forms'
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

// NOTE: React auto-escapes all interpolated strings, so no manual
// escapeHtml() is needed. (A manual div.innerHTML escape + JSX render
// would double-escape and show entities like &amp;lt; to users.)

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

  // Form states — raw strings for controlled inputs; parsed + validated
  // into typed payloads (lib/farmer-forms) before any API call so the JSON
  // body always matches backend/app/schemas.py (number vs string vs null).
  const [newHiveName, setNewHiveName] = useState('')
  const [newHiveLocation, setNewHiveLocation] = useState('')
  const [newHiveSpecies, setNewHiveSpecies] = useState<HiveSpecies>('apis_mellifera')
  const [hiveErrors, setHiveErrors] = useState<FormErrors<'name' | 'location' | 'species'>>({})

  const [newBatchHive, setNewBatchHive] = useState('')
  const [newBatchType, setNewBatchType] = useState('')
  const [newBatchQty, setNewBatchQty] = useState('')
  const [newBatchLocation, setNewBatchLocation] = useState('')
  const [newBatchMoisture, setNewBatchMoisture] = useState('')
  const [batchErrors, setBatchErrors] = useState<FormErrors<'hiveId' | 'honeyType' | 'quantity' | 'location' | 'moisture'>>({})
  const [batchSubmitError, setBatchSubmitError] = useState<string | null>(null)

  const [readingTemp, setReadingTemp] = useState('')
  const [readingHumidity, setReadingHumidity] = useState('')
  const [readingWeight, setReadingWeight] = useState('')
  const [readingSound, setReadingSound] = useState('')
  const [readingErrors, setReadingErrors] = useState<FormErrors<'temperature' | 'humidity' | 'weight' | 'sound'>>({})
  const [readingSubmitError, setReadingSubmitError] = useState<string | null>(null)

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

  // Default the batch hive picker to the currently selected hive so the
  // required hive_id always resolves to a hive the user owns.
  useEffect(() => {
    if (selectedHive && !newBatchHive) setNewBatchHive(selectedHive)
  }, [selectedHive, newBatchHive])

  const handleCreateHive = async (e: React.FormEvent) => {
    e.preventDefault()
    const { errors, payload } = validateHiveForm({
      name: newHiveName,
      location: newHiveLocation,
      species: newHiveSpecies,
    })
    setHiveErrors(errors)
    if (!payload) return
    try {
      const response = await hiveAPI.create(payload)
      setHives([...hives, response.data])
      setNewHiveName('')
      setNewHiveLocation('')
      setNewHiveSpecies('apis_mellifera')
      setHiveErrors({})
      setShowNewHive(false)
    } catch (err) {
      console.error('Failed to create hive', err)
    }
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setBatchSubmitError(null)
    // Fall back to the selected hive when the picker was never touched.
    const hiveId = (newBatchHive || selectedHive || '').trim()
    const { errors, payload } = validateBatchForm({
      hiveId,
      honeyType: newBatchType,
      quantity: newBatchQty,
      location: newBatchLocation,
      moisture: newBatchMoisture,
      ownedHiveIds: hives.map((h) => h.id),
    })
    setBatchErrors(errors)
    if (!payload) {
      if (errors.hiveId && !hiveId) alert('Create/select a hive first before harvesting a batch.')
      return
    }
    try {
      const response = await batchAPI.create(payload)
      // Backend returns {id/batch_id, hive_id, ...}; normalize to Batch shape
      // so the list filter (b.hive_id === selectedHive) keeps working.
      const created = response.data
      const newBatch: Batch = {
        id: created.id || created.batch_id,
        hive_id: created.hive_id || hiveId,
        honey_type: created.honey_type || payload.honey_type,
        quantity_kg: created.quantity_kg ?? payload.quantity_kg,
        status: created.status,
        purity_score: created.purity_score,
      }
      setBatches([...batches, newBatch])
      setNewBatchHive('')
      setNewBatchType('')
      setNewBatchQty('')
      setNewBatchLocation('')
      setNewBatchMoisture('')
      setBatchErrors({})
      setShowNewBatch(false)

      console.log('Batch created:', `Batch created! QR code generated. Batch ID: ${response.data.batch_id}`)
      alert(`Batch created! QR code generated. Batch ID: ${response.data.batch_id}`)
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: unknown } }; message?: string })?.response?.data?.detail
        ?? (err as Error)?.message ?? 'Unknown error'
      console.error('Failed to create batch', err)
      const message = typeof detail === 'string' ? detail : JSON.stringify(detail)
      setBatchSubmitError(message)
      alert(`Failed to create batch: ${message}`)
    }
  }

  const handleCreateReading = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHive) return
    setReadingSubmitError(null)
    const { errors, payload } = validateReadingForm({
      temperature: readingTemp,
      humidity: readingHumidity,
      weight: readingWeight,
      sound: readingSound,
    })
    setReadingErrors(errors)
    if (!payload) return
    try {
      await hiveAPI.createReading(selectedHive, payload)
      const response = await hiveAPI.getHealth(selectedHive)
      setHiveHealth((prev) => ({
        ...prev,
        [selectedHive]: response.data.health,
      }))
      setReadingTemp(''); setReadingHumidity(''); setReadingWeight(''); setReadingSound('')
      setReadingErrors({})
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: unknown } }; message?: string })?.response?.data?.detail
        ?? (err as Error)?.message ?? 'Unknown error'
      console.error('Failed to record reading', err)
      setReadingSubmitError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    }
  }

  const downloadComplianceReport = async (batchId: string) => {
    try {
      const response = await batchAPI.complianceReport(batchId)
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `honeychain-${batchId}-compliance.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download compliance report', err)
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
                <form onSubmit={handleCreateHive} className="mt-4 pt-4 border-t border-honey/20 space-y-3" noValidate>
                  <div>
                    <input
                      type="text"
                      placeholder="Hive name"
                      value={newHiveName}
                      onChange={(e) => setNewHiveName(e.target.value)}
                      className="input-field text-sm"
                      required
                      minLength={FIELD_LIMITS.hiveName.minLength}
                      maxLength={FIELD_LIMITS.hiveName.maxLength}
                      autoComplete="off"
                      aria-invalid={Boolean(hiveErrors.name)}
                    />
                    {hiveErrors.name && <p className="mt-1 text-xs text-red-400">{hiveErrors.name}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Location"
                      value={newHiveLocation}
                      onChange={(e) => setNewHiveLocation(e.target.value)}
                      className="input-field text-sm"
                      required
                      minLength={FIELD_LIMITS.hiveLocation.minLength}
                      maxLength={FIELD_LIMITS.hiveLocation.maxLength}
                      autoComplete="off"
                      aria-invalid={Boolean(hiveErrors.location)}
                    />
                    {hiveErrors.location && <p className="mt-1 text-xs text-red-400">{hiveErrors.location}</p>}
                  </div>
                  <div>
                    <select
                      value={newHiveSpecies}
                      onChange={(e) => {
                        const next = e.target.value
                        if (isHiveSpecies(next)) setNewHiveSpecies(next)
                      }}
                      className="input-field text-sm"
                      required
                      aria-invalid={Boolean(hiveErrors.species)}
                    >
                      {HIVE_SPECIES_OPTIONS.map((species) => (
                        <option key={species} value={species}>
                          {species === 'apis_mellifera' ? 'Apis Mellifera'
                            : species === 'apis_cerana' ? 'Apis Cerana'
                            : species === 'apis_dorsata' ? 'Apis Dorsata'
                            : 'Apis Florea'}
                        </option>
                      ))}
                    </select>
                    {hiveErrors.species && <p className="mt-1 text-xs text-red-400">{hiveErrors.species}</p>}
                  </div>
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
                          {reason}
                        </p>
                      ))}
                    </div>

                    <form onSubmit={handleCreateReading} className="mt-4 space-y-2" noValidate>
                      <div className="grid sm:grid-cols-5 gap-2">
                        <div>
                          <input className="input-field text-sm" type="number" inputMode="decimal" step={FIELD_LIMITS.temperatureC.step} min={FIELD_LIMITS.temperatureC.min} max={FIELD_LIMITS.temperatureC.max} placeholder="Temp °C" title={APIARY_HINTS.temperatureC} value={readingTemp} onChange={(e) => setReadingTemp(e.target.value)} required aria-invalid={Boolean(readingErrors.temperature)} />
                          {readingErrors.temperature && <p className="mt-1 text-xs text-red-400">{readingErrors.temperature}</p>}
                        </div>
                        <div>
                          <input className="input-field text-sm" type="number" inputMode="decimal" step={FIELD_LIMITS.humidityPct.step} min={FIELD_LIMITS.humidityPct.min} max={FIELD_LIMITS.humidityPct.max} placeholder="Humidity %" title={APIARY_HINTS.humidityPct} value={readingHumidity} onChange={(e) => setReadingHumidity(e.target.value)} required aria-invalid={Boolean(readingErrors.humidity)} />
                          {readingErrors.humidity && <p className="mt-1 text-xs text-red-400">{readingErrors.humidity}</p>}
                        </div>
                        <div>
                          <input className="input-field text-sm" type="number" inputMode="decimal" step={FIELD_LIMITS.weightKg.step} min={FIELD_LIMITS.weightKg.min} max={FIELD_LIMITS.weightKg.max} placeholder="Weight kg" title={APIARY_HINTS.weightKg} value={readingWeight} onChange={(e) => setReadingWeight(e.target.value)} required aria-invalid={Boolean(readingErrors.weight)} />
                          {readingErrors.weight && <p className="mt-1 text-xs text-red-400">{readingErrors.weight}</p>}
                        </div>
                        <div>
                          <input className="input-field text-sm" type="number" inputMode="decimal" step={FIELD_LIMITS.soundHz.step} min={FIELD_LIMITS.soundHz.min} max={FIELD_LIMITS.soundHz.max} placeholder="Sound Hz (optional)" title={APIARY_HINTS.soundHz} value={readingSound} onChange={(e) => setReadingSound(e.target.value)} aria-invalid={Boolean(readingErrors.sound)} />
                          {readingErrors.sound && <p className="mt-1 text-xs text-red-400">{readingErrors.sound}</p>}
                        </div>
                        <button type="submit" className="btn-secondary text-sm">Record reading</button>
                      </div>
                      <p className="text-xs text-cream/50">{APIARY_HINTS.temperatureC} · {APIARY_HINTS.humidityPct} · {APIARY_HINTS.soundHz}</p>
                      {readingSubmitError && <p className="text-xs text-red-400">{readingSubmitError}</p>}
                    </form>
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
                    <form onSubmit={handleCreateBatch} className="mb-6 pb-6 border-b border-honey/20 space-y-3" noValidate>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label htmlFor="batch-hive" className="mb-1 block text-xs text-cream/60">Harvest from hive</label>
                          <select
                            id="batch-hive"
                            value={newBatchHive || selectedHive}
                            onChange={(e) => setNewBatchHive(e.target.value)}
                            className="input-field text-sm"
                            required
                            aria-invalid={Boolean(batchErrors.hiveId)}
                          >
                            <option value="" disabled>Select a hive</option>
                            {hives.map((hive) => (
                              <option key={hive.id} value={hive.id}>
                                {hive.name} — {hive.location}
                              </option>
                            ))}
                          </select>
                          {batchErrors.hiveId && <p className="mt-1 text-xs text-red-400">{batchErrors.hiveId}</p>}
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Honey type (e.g., Wildflower)"
                            value={newBatchType}
                            onChange={(e) => setNewBatchType(e.target.value)}
                            className="input-field text-sm"
                            required
                            minLength={FIELD_LIMITS.honeyType.minLength}
                            maxLength={FIELD_LIMITS.honeyType.maxLength}
                            autoComplete="off"
                            aria-invalid={Boolean(batchErrors.honeyType)}
                          />
                          {batchErrors.honeyType && <p className="mt-1 text-xs text-red-400">{batchErrors.honeyType}</p>}
                        </div>
                        <div>
                          <input
                            type="number"
                            inputMode="decimal"
                            step={FIELD_LIMITS.quantityKg.step}
                            min={0.1}
                            max={FIELD_LIMITS.quantityKg.max}
                            placeholder="Quantity (kg)"
                            value={newBatchQty}
                            onChange={(e) => setNewBatchQty(e.target.value)}
                            className="input-field text-sm"
                            required
                            aria-invalid={Boolean(batchErrors.quantity)}
                          />
                          {batchErrors.quantity && <p className="mt-1 text-xs text-red-400">{batchErrors.quantity}</p>}
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Apiary location"
                            value={newBatchLocation}
                            onChange={(e) => setNewBatchLocation(e.target.value)}
                            className="input-field text-sm"
                            required
                            minLength={FIELD_LIMITS.apiaryLocation.minLength}
                            maxLength={FIELD_LIMITS.apiaryLocation.maxLength}
                            autoComplete="off"
                            aria-invalid={Boolean(batchErrors.location)}
                          />
                          {batchErrors.location && <p className="mt-1 text-xs text-red-400">{batchErrors.location}</p>}
                        </div>
                        <div>
                          <input
                            type="number"
                            inputMode="decimal"
                            step={FIELD_LIMITS.moisturePct.step}
                            placeholder="Measured moisture %"
                            title={APIARY_HINTS.moisturePct}
                            value={newBatchMoisture}
                            onChange={(e) => setNewBatchMoisture(e.target.value)}
                            className="input-field text-sm"
                            min={FIELD_LIMITS.moisturePct.min}
                            max={FIELD_LIMITS.moisturePct.max}
                            required
                            aria-invalid={Boolean(batchErrors.moisture)}
                          />
                          {batchErrors.moisture && <p className="mt-1 text-xs text-red-400">{batchErrors.moisture}</p>}
                        </div>
                      </div>
                      <p className="text-xs text-cream/50">{APIARY_HINTS.moisturePct} · quantity must be &gt; 0 kg</p>
                      {batchSubmitError && <p className="text-xs text-red-400">{batchSubmitError}</p>}
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
                              <h3 className="font-semibold text-cream">{batch.honey_type}</h3>
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
                            <button
                              onClick={() => downloadComplianceReport(batch.id)}
                              className="text-sm text-honey hover:text-amber"
                            >
                              Compliance Report
                            </button>
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
