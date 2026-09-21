'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, adminAPI } from '@/lib/api'
import Link from 'next/link'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AdminData {
  total_beekeepers: number
  total_hives: number
  total_batches: number
  total_honey_kg: number
  batches_by_status: Record<string, number>
  batches_by_cluster: Record<string, number>
  avg_purity_score: number
  avg_hive_health_status: Record<string, number>
  ledger_integrity: {
    valid: boolean
    errors: string[]
    first_tampering_at_index?: number
    total_blocks: number
  }
  reputation_leaderboard: Array<{
    cluster: string
    batch_count: number
    avg_purity: number
    tamper_incidents: number
    score: number
  }>
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const meResponse = await authAPI.me()
        if (meResponse.data.role !== 'cooperative_admin') {
          router.push('/dashboard')
          return
        }
        setUser(meResponse.data)

        const adminResponse = await adminAPI.overview()
        setData(adminResponse.data)
      } catch (err) {
        console.error('Failed to load admin data', err)
        localStorage.removeItem('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-espresso flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl text-honey mb-4">📊</div>
          <p className="text-cream">Loading KVIC Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !data) {
    return null
  }

  const statusChartData = Object.entries(data.batches_by_status).map(([status, count]) => ({
    name: status,
    value: count,
  }))

  const clusterChartData = Object.entries(data.batches_by_cluster).map(([cluster, count]) => ({
    name: cluster,
    value: count,
  }))

  const healthChartData = Object.entries(data.avg_hive_health_status).map(([status, count]) => ({
    name: status,
    value: count,
  }))

  const COLORS = ['#E3A530', '#B6651D', '#7C9473', '#B4523A', '#F3E9D2']

  return (
    <main className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-espresso/95 backdrop-blur border-b border-honey/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-honey">KVIC Honey Mission</h1>
            <p className="text-sm text-cream/60">Cooperative Dashboard</p>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="btn-ghost">
              Back to Hives
            </Link>
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
        {/* Key Metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-xs font-semibold text-honey uppercase mb-1">Total Beekeepers</p>
            <p className="text-3xl font-serif font-bold text-cream">{data.total_beekeepers}</p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-honey uppercase mb-1">Active Hives</p>
            <p className="text-3xl font-serif font-bold text-cream">{data.total_hives}</p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-honey uppercase mb-1">Total Honey</p>
            <p className="text-3xl font-serif font-bold text-cream">{data.total_honey_kg.toFixed(0)}</p>
            <p className="text-xs text-cream/60">kg</p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-honey uppercase mb-1">Avg Purity</p>
            <p className="text-3xl font-serif font-bold text-cream">
              {data.avg_purity_score.toFixed(1)}
            </p>
            <p className="text-xs text-cream/60">/100</p>
          </div>
        </div>

        {/* Ledger Integrity Status */}
        <div className="mb-8">
          <div className={`card border-2 ${
            data.ledger_integrity.valid ? 'border-sage/50' : 'border-brick/50'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-honey">Ledger Integrity</h2>
                <p className="text-sm text-cream/60 mt-1">
                  Blockchain-style verification of all honey batches in the network
                </p>
              </div>
              <div className={`text-4xl ${
                data.ledger_integrity.valid ? 'text-sage' : 'text-brick'
              }`}>
                {data.ledger_integrity.valid ? '✓' : '✗'}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-cream/60 uppercase font-semibold mb-1">Status</p>
                <p className={`text-lg font-semibold ${
                  data.ledger_integrity.valid ? 'text-sage' : 'text-brick'
                }`}>
                  {data.ledger_integrity.valid ? 'ALL BLOCKS VALID' : 'TAMPERING DETECTED'}
                </p>
              </div>
              <div>
                <p className="text-xs text-cream/60 uppercase font-semibold mb-1">Total Blocks</p>
                <p className="text-lg font-semibold text-cream">
                  {data.ledger_integrity.total_blocks}
                </p>
              </div>
            </div>

            {!data.ledger_integrity.valid && data.ledger_integrity.errors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-brick/20">
                <p className="text-xs font-semibold text-brick mb-2">Integrity Errors:</p>
                <ul className="text-xs text-brick/80 space-y-1">
                  {data.ledger_integrity.errors.slice(0, 3).map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                  {data.ledger_integrity.errors.length > 3 && (
                    <li>... and {data.ledger_integrity.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Batches by Status */}
          {statusChartData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-serif font-bold text-honey mb-4">Batches by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#E3A530"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hive Health Status */}
          {healthChartData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-serif font-bold text-honey mb-4">Hive Health Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={healthChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#666" />
                  <XAxis dataKey="name" stroke="#F3E9D2" />
                  <YAxis stroke="#F3E9D2" />
                  <Tooltip contentStyle={{ backgroundColor: '#241B14', border: '1px solid #E3A530' }} />
                  <Bar dataKey="value" fill="#E3A530" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Cluster Breakdown */}
        {clusterChartData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-serif font-bold text-honey mb-4">Honey by Cluster</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clusterChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#666" />
                <XAxis dataKey="name" stroke="#F3E9D2" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#F3E9D2" label={{ value: 'Batches', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={{ backgroundColor: '#241B14', border: '1px solid #E3A530' }} />
                <Bar dataKey="value" fill="#B6651D" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card mt-6">
          <h3 className="text-lg font-serif font-bold text-honey mb-4">Cooperative Reputation</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-cream">
              <thead className="text-honey text-left"><tr><th>Cluster</th><th>Batches</th><th>Avg purity</th><th>Tamper incidents</th><th>Score</th></tr></thead>
              <tbody>{data.reputation_leaderboard.map((entry) => (
                <tr key={entry.cluster} className="border-t border-honey/20"><td>{entry.cluster}</td><td>{entry.batch_count}</td><td>{entry.avg_purity}</td><td>{entry.tamper_incidents}</td><td>{entry.score}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
