"use client"

import * as React from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { Batch, Hive, HiveHealthResponse } from "@/lib/api/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { HealthBadge, BatchStatusBadge } from "@/components/dashboard/status-badges"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "#16a34a",
  WATCH: "#f59e0b",
  HIGH_RISK: "#dc2626",
}

export default function AnalyticsPage() {
  const [hives, setHives] = React.useState<Hive[]>([])
  const [healthList, setHealthList] = React.useState<{ hive: Hive; health: HiveHealthResponse | null }[]>([])
  const [batches, setBatches] = React.useState<Batch[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [hRes, bRes] = await Promise.all([
        api.hives.list(),
        api.batches.list().catch(() => ({ data: [] as Batch[] })),
      ])
      const hiveList = (hRes.data ?? []) as Hive[]
      setHives(hiveList)
      setBatches((bRes.data ?? []) as Batch[])
      const results = await Promise.all(
        hiveList.map(async (h) => {
          try {
            const r = await api.hives.health(h.id)
            return { hive: h, health: r.data as HiveHealthResponse }
          } catch {
            return { hive: h, health: null }
          }
        })
      )
      setHealthList(results)
    } catch (err) {
      setError(normalizeError(err).detail)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const dist = React.useMemo(() => {
    let healthy = 0, watch = 0, high = 0, unknown = 0
    healthList.forEach(({ health }) => {
      if (!health) unknown += 1
      else if (health.health.status === "HEALTHY") healthy += 1
      else if (health.health.status === "WATCH") watch += 1
      else if (health.health.status === "HIGH_RISK") high += 1
      else unknown += 1
    })
    return { healthy, watch, high, unknown }
  }, [healthList])

  const distChart = [
    { name: "Healthy", value: dist.healthy, color: HEALTH_COLORS.HEALTHY },
    { name: "Watch", value: dist.watch, color: HEALTH_COLORS.WATCH },
    { name: "High Risk", value: dist.high, color: HEALTH_COLORS.HIGH_RISK },
  ].filter((d) => d.value > 0)

  const production = React.useMemo(() => {
    const totalQty = batches.reduce((s, b) => s + (Number(b.quantity_kg) || 0), 0)
    const scores = batches.map((b) => Number(b.purity_score)).filter((n) => Number.isFinite(n))
    const avgPurity = scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : null
    const byStatus: Record<string, number> = {}
    batches.forEach((b) => { byStatus[b.status] = (byStatus[b.status] ?? 0) + 1 })
    return { totalQty, avgPurity, byStatus, count: batches.length }
  }, [batches])

  const statusChart = Object.entries(production.byStatus).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Hive health, productivity and historical production. Backend metrics are shown as provided; batch totals are computed in the dashboard and labelled as such.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load analytics</AlertTitle>
          <AlertDescription className="flex items-center gap-2">{error} <Button size="sm" variant="outline" onClick={load}>Retry</Button></AlertDescription>
        </Alert>
      )}

      {/* Health distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hive Health Distribution</CardTitle>
            <CardDescription>From the hive health endpoint for your hives.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-56 w-full" /> : distChart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No sensor readings yet. Record the first reading to begin hive health analysis.</p>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distChart} dataKey="value" nameKey="name" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                        {distChart.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <span>Healthy: <strong>{dist.healthy}</strong></span>
                  <span>Watch: <strong>{dist.watch}</strong></span>
                  <span>High Risk: <strong>{dist.high}</strong></span>
                  {dist.unknown > 0 && <span className="text-muted-foreground">No data: {dist.unknown}</span>}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Honey production (frontend aggregation) */}
        <Card>
          <CardHeader>
            <CardTitle>Honey Production</CardTitle>
            <CardDescription>Dashboard aggregation from your batches (not a backend metric).</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-56 w-full" /> : batches.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No honey batches yet. Create a harvest batch after harvesting.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><div className="text-2xl font-bold">{production.totalQty.toFixed(1)} kg</div><div className="text-xs text-muted-foreground">Total harvested</div></div>
                  <div><div className="text-2xl font-bold">{production.count}</div><div className="text-xs text-muted-foreground">Batches</div></div>
                  <div><div className="text-2xl font-bold">{production.avgPurity != null ? production.avgPurity.toFixed(1) : "—"}</div><div className="text-xs text-muted-foreground">Avg purity score</div></div>
                </div>
                {statusChart.length > 0 && (
                  <div className="mt-4 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">Batch status distribution computed in the dashboard from your batch list.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Productivity (backend source of truth) */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity</CardTitle>
          <CardDescription>Estimated yield, trend, confidence, next harvest and recommendation — provided by the backend health endpoint. Not calculated in the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : hives.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Your apiary is empty. Add your first hive to start monitoring.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hive</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Est. Yield</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Next Harvest</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthList.map(({ hive, health }) => (
                    <TableRow key={hive.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link href={`/dashboard/hives/${hive.id}`} className="hover:underline">{hive.name}</Link>
                      </TableCell>
                      <TableCell>
                        {health ? <HealthBadge status={health.health.status} /> : <span className="text-xs text-muted-foreground">No data</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {health?.productivity?.yield_estimate_kg != null ? `${health.productivity.yield_estimate_kg} kg` : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{health?.productivity?.trend ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {health?.productivity ? `${Math.round(health.productivity.confidence * 100)}%` : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {health?.productivity?.next_harvest_days != null ? `~${health.productivity.next_harvest_days} days` : "—"}
                      </TableCell>
                      <TableCell className="max-w-64 text-xs text-muted-foreground">
                        {health?.productivity?.recommendation ?? "Not enough readings to display a trend yet."}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <BatchStatusBadge status="HARVESTED" />
        <span className="text-xs text-muted-foreground self-center">Batch statuses above reflect backend batch records.</span>
      </div>
    </div>
  )
}
