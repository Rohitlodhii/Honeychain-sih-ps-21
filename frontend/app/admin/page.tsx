'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, adminAPI } from '@/lib/api'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useI18n } from '@/lib/i18n/context'
import {
  ArrowLeft,
  FlaskConical,
  Hexagon,
  LogOut,
  Package,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

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

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

function AdminHeader() {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Hexagon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{t.admin.mission}</h1>
            <p className="text-xs text-muted-foreground">{t.admin.dashboard}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t.admin.backToHives}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem('token')
              router.push('/')
            }}
          >
            <LogOut className="mr-1 h-4 w-4" />
            {t.admin.logout}
          </Button>
        </div>
      </div>
    </header>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const { t } = useI18n()
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
      <main className="min-h-screen bg-background">
        <AdminHeader />
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-56 w-full" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </main>
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

  const ledgerValid = data.ledger_integrity.valid

  return (
    <main className="min-h-screen bg-background">
      <AdminHeader />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {/* Key metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.admin.totalBeekeepers}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.total_beekeepers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.admin.activeHives}
              </CardTitle>
              <Hexagon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.total_hives}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.admin.totalHoney}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data.total_honey_kg.toFixed(0)}
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  {t.admin.kg}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.admin.avgPurity}
              </CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data.avg_purity_score.toFixed(1)}
                <span className="ml-1 text-base font-medium text-muted-foreground">/100</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ledger integrity */}
        <Card className={ledgerValid ? 'border-emerald-500/60' : 'border-destructive'}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    ledgerValid
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {ledgerValid ? (
                    <ShieldCheck className="h-6 w-6" />
                  ) : (
                    <ShieldAlert className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <CardTitle>{t.admin.ledger}</CardTitle>
                  <CardDescription>{t.admin.ledgerDesc}</CardDescription>
                </div>
              </div>
              {ledgerValid ? (
                <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90">
                  {t.admin.allValid}
                </Badge>
              ) : (
                <Badge variant="destructive">{t.admin.tampered}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.admin.status}
                </p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    ledgerValid ? 'text-emerald-600' : 'text-destructive'
                  }`}
                >
                  {ledgerValid ? t.admin.allValid : t.admin.tampered}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.admin.totalBlocks}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {data.ledger_integrity.total_blocks}
                </p>
              </div>
            </div>

            {!ledgerValid && data.ledger_integrity.errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-xs font-semibold text-destructive">
                  {t.admin.integrityErrors}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {data.ledger_integrity.errors.slice(0, 3).map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                  {data.ledger_integrity.errors.length > 3 && (
                    <li>{t.admin.moreErrors(data.ledger_integrity.errors.length - 3)}</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {statusChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t.admin.batchesByStatus}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {healthChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t.admin.hiveHealthDist}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={healthChartData}
                      margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Bar
                        dataKey="value"
                        fill="var(--color-chart-2)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {clusterChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.admin.honeyByCluster}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={clusterChartData}
                    margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      angle={-30}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      label={{
                        value: t.admin.batchesAxis,
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <RechartsTooltip />
                    <Bar
                      dataKey="value"
                      fill="var(--color-chart-1)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reputation */}
        {data.reputation_leaderboard.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.admin.reputation}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.admin.thCluster}</TableHead>
                      <TableHead>{t.admin.thBatches}</TableHead>
                      <TableHead>{t.admin.thAvgPurity}</TableHead>
                      <TableHead>{t.admin.thTamper}</TableHead>
                      <TableHead className="text-right">{t.admin.thScore}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.reputation_leaderboard.map((entry) => (
                      <TableRow key={entry.cluster}>
                        <TableCell className="font-medium">{entry.cluster}</TableCell>
                        <TableCell>{entry.batch_count}</TableCell>
                        <TableCell>{entry.avg_purity}</TableCell>
                        <TableCell>
                          {entry.tamper_incidents > 0 ? (
                            <Badge variant="destructive">{entry.tamper_incidents}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {entry.score}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
