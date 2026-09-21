'use client'

import { useState, useEffect } from 'react'
import { verifyAPI } from '@/lib/api'
import Link from 'next/link'

// XSS Prevention: Escape HTML special characters
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

interface VerifyData {
  batch_id: string
  beekeeper_name: string
  beekeeper_cluster?: string
  honey_type: string
  quantity_kg: number
  harvest_date: string
  apiary_location: string
  moisture_pct?: number
  purity_score?: number
  status: string
  ledger_timeline: Array<{
    index: number
    batch_id: string
    event_type: string
    payload: any
    actor: string
    timestamp_str: string
    hash: string
  }>
  chain_verification: {
    valid: boolean
    errors: string[]
    first_tampering_at_index?: number
    total_blocks: number
  }
  authenticity_badge: string
  transfer_count: number
  direct_trade: boolean
}

export default function VerifyPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<VerifyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await verifyAPI.batch(params.id)
        setData(response.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Batch not found')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl text-honey mb-4">🔍</div>
          <p className="text-cream">Verifying batch...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl text-brick mb-4">⚠</div>
          <h1 className="text-2xl font-serif font-bold text-cream mb-4">Batch Not Found</h1>
          <p className="text-cream/80 mb-6">{escapeHtml(error)}</p>
          <Link href="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const eventTypeIcons: Record<string, string> = {
    HARVEST: '🌾',
    QUALITY_TEST: '🧪',
    TRANSFER: '🚚',
    PACKAGE: '📦',
    SALE: '🛒',
    SYSTEM_INIT: '⚙️',
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-espresso/95 backdrop-blur border-b border-honey/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-honey rounded transform rotate-45"></div>
            <span className="text-2xl font-serif font-bold text-honey">HoneyChain</span>
          </Link>
          <p className="text-sm text-cream/60">Authenticity Verification</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Authenticity Badge */}
        <div className="mb-8 text-center">
          {data.authenticity_badge === 'VERIFIED' ? (
            <div className="badge-verified text-lg inline-block mb-4">
              ✓ VERIFIED AUTHENTIC
            </div>
          ) : (
            <div className="badge-tampered text-lg inline-block mb-4">
              ⚠ TAMPERING DETECTED
            </div>
          )}
          <h1 className="text-4xl font-serif font-bold text-honey mb-2">
            {data.honey_type}
          </h1>
          <p className="text-cream/80">
            From {data.beekeeper_name}
            {data.beekeeper_cluster && ` • ${data.beekeeper_cluster}`}
          </p>
          <p className={`mt-3 text-sm font-semibold ${data.direct_trade ? 'text-sage' : 'text-honey'}`}>
            {data.direct_trade
              ? `Direct from ${data.beekeeper_cluster || 'the cooperative'} cluster — verified, no middleman markup`
              : `${data.transfer_count} recorded transfers for this batch`}
          </p>
        </div>

        {/* Chain Integrity Alert */}
        {!data.chain_verification.valid && (
          <div className="mb-6 p-4 bg-brick/20 border-2 border-brick rounded-lg">
            <p className="font-semibold text-brick mb-2">⚠ Chain Integrity Issue</p>
            <p className="text-sm text-brick/90">
              This honey batch&apos;s record has been tampered with. First tampering detected at block {data.chain_verification.first_tampering_at_index}.
            </p>
            {data.chain_verification.errors.length > 0 && (
              <ul className="mt-2 text-xs space-y-1 text-brick/80">
                {data.chain_verification.errors.map((err, idx) => (
                  <li key={idx}>• {escapeHtml(err)}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Batch Info */}
          <div className="lg:col-span-2 card">
            <h2 className="text-2xl font-serif font-bold text-honey mb-6">Batch Details</h2>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-honey mb-1">Quantity</p>
                  <p className="text-xl text-cream">{data.quantity_kg} kg</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-honey mb-1">Harvest Date</p>
                  <p className="text-xl text-cream">
                    {new Date(data.harvest_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-honey mb-1">Apiary Location</p>
                  <p className="text-xl text-cream">{data.apiary_location}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-honey mb-1">Status</p>
                  <p className="text-xl text-cream capitalize">{data.status}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-honey/20 space-y-3">
                {data.moisture_pct !== null && (
                  <div>
                    <p className="text-xs font-semibold text-honey mb-1">Moisture Content</p>
                    <p className="text-cream">
                      {data.moisture_pct}%
                      <span className="text-xs text-cream/60 ml-2">
                        (BIS/Codex limit: 20%)
                      </span>
                    </p>
                  </div>
                )}

                {data.purity_score !== null && (
                  <div>
                    <p className="text-xs font-semibold text-honey mb-1">Purity Score</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-espresso rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            data.purity_score >= 90
                              ? 'bg-sage'
                              : data.purity_score >= 70
                              ? 'bg-honey'
                              : 'bg-brick'
                          }`}
                          style={{ width: `${data.purity_score}%` }}
                        ></div>
                      </div>
                      <p className="text-cream font-semibold">{data.purity_score.toFixed(1)}/100</p>
                    </div>
                    <p className="text-xs text-cream/60 mt-1">
                      {data.purity_score >= 90
                        ? '✓ Excellent purity'
                        : data.purity_score >= 70
                        ? '⚠ Good purity, lab confirmation recommended'
                        : '⚠ Borderline purity, lab testing required'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Beekeeper Card */}
          <div className="card">
            <h3 className="text-xl font-serif font-bold text-honey mb-4">From the Beekeeper</h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-cream/60 uppercase">Name</p>
                <p className="text-lg font-semibold text-cream">{data.beekeeper_name}</p>
              </div>

              {data.beekeeper_cluster && (
                <div>
                  <p className="text-xs font-semibold text-cream/60 uppercase">Cluster</p>
                  <p className="text-lg font-semibold text-cream">{data.beekeeper_cluster}</p>
                </div>
              )}

              <div className="pt-4 border-t border-honey/20">
                <p className="text-xs text-cream/60 mb-3">
                  This beekeeper is part of the KVIC Honey Mission network and maintains traceability records for all honey.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Timeline */}
        <div className="card">
          <h2 className="text-2xl font-serif font-bold text-honey mb-6">Traceability Timeline</h2>

          <div className="space-y-0">
            {data.ledger_timeline.map((block, idx) => {
              const isLast = idx === data.ledger_timeline.length - 1
              return (
                <div key={block.index} className={`relative ${!isLast ? 'pb-8' : ''}`}>
                  {/* Connection line */}
                  {!isLast && (
                    <div className="absolute left-6 top-12 w-1 h-16 bg-gradient-to-b from-honey/60 to-honey/10"></div>
                  )}

                  {/* Block */}
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-honey/20 border-2 border-honey flex items-center justify-center text-xl">
                      {eventTypeIcons[block.event_type] || '📋'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-serif font-bold text-honey">
                          {block.event_type}
                        </h3>
                        <span className="text-xs text-cream/60">
                          Block #{block.index}
                        </span>
                      </div>

                      <p className="text-sm text-cream/80 mb-2">
                        {new Date(block.timestamp_str).toLocaleString()}
                      </p>

                      {/* Payload details */}
                      {Object.keys(block.payload).length > 0 && (
                        <div className="bg-espresso/50 rounded px-3 py-2 mb-2 text-xs text-cream/70 max-h-32 overflow-y-auto">
                          {Object.entries(block.payload).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-honey">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Hash display */}
                      <div className="text-xs font-mono text-cream/50 truncate">
                        Hash: {block.hash.substring(0, 16)}...
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Chain Stats */}
          <div className="mt-8 pt-6 border-t border-honey/20">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-cream/60 uppercase font-semibold">Total Events</p>
                <p className="text-2xl font-serif font-bold text-honey">
                  {data.chain_verification.total_blocks}
                </p>
              </div>
              <div>
                <p className="text-xs text-cream/60 uppercase font-semibold">Chain Status</p>
                <p className={`text-2xl font-serif font-bold ${
                  data.chain_verification.valid ? 'text-sage' : 'text-brick'
                }`}>
                  {data.chain_verification.valid ? '✓ Valid' : '✗ Tampered'}
                </p>
              </div>
              <div>
                <p className="text-xs text-cream/60 uppercase font-semibold">Batch ID</p>
                <p className="text-sm font-mono text-honey truncate">{escapeHtml(data.batch_id)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Message */}
        <div className="mt-8 text-center">
          <p className="text-cream/80 mb-4">
            {data.authenticity_badge === 'VERIFIED'
              ? '✓ This honey has passed our traceability verification. You can trust its origin and quality.'
              : '⚠ This honey record shows signs of tampering. Please contact KVIC for clarification.'}
          </p>
          <Link href="/" className="btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
