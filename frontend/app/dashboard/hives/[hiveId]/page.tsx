"use client"

import * as React from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { Hive, HiveHealthResponse, SensorReading } from "@/lib/api/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { HealthBadge } from "@/components/dashboard/status-badges"
import { RecordReadingDialog } from "@/components/dashboard/record-reading-dialog"
import { RefreshCw, Plus, ArrowLeft, Thermometer, Droplets, Weight, AudioWaveform } from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts"

function formatDateTime(v?: string | null) {
  if (!v) return "—"
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString()
}

function MetricChart({ data, dataKey, color, unit }: { data: any[]; dataKey: string; color: string; unit: string }) {
  if (!data || data.length < 2) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Not enough readings to display a trend yet.</p>
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={32} />
          <YAxis tick={{ fontSize: 11 }} />
          <RechartsTooltip formatter={(v: any) => [`${v} ${unit}`, dataKey]} labelFormatter={(l) => `Recorded: ${l}`} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function HiveDetailPage({ params }: { params: { hiveId: string } }) {
  const { hiveId } = params
  const [hive, setHive] = React.useState<Hive | null>(null)
  const [health, setHealth] = React.useState<HiveHealthResponse | null>(null)
  const [readings, setReadings] = React.useState<SensorReading[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [healthError, setHealthError] = React.useState<string | null>(null)
  const [recordOpen, setRecordOpen] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setHealthError(null)
    try {
      const [hivesRes, readingsRes] = await Promise.all([
        api.hives.list(),
        api.hives.readings(hiveId).catch(() => ({ data: [] as SensorReading[] })),
      ])
      const found = (hivesRes.data as Hive[]).find((h) => h.id === hiveId) ?? null
      if (!found) {
        setError("Hive not found.")
      } else {
        setHive(found)
      }
      setReadings((readingsRes.data as SensorReading[]) ?? [])
      try {
        const h = await api.hives.health(hiveId)
        setHealth(h.data as HiveHealthResponse)
      } catch (err) {
        setHealthError(normalizeError(err).detail)
        setHealth(null)
      }
    } catch (err) {
      setError(normalizeError(err).detail)
    } finally {
      setLoading(false)
    }
  }, [hiveId])

  React.useEffect(() => { load() }, [load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const chartData = React.useMemo(() => {
    const asc = [...readings].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    return asc.map((r) => ({
      ...r,
      label: new Date(r.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      fullLabel: new Date(r.recorded_at).toLocaleString(),
    }))
  }, [readings])

  const lr = health?.latest_reading ?? readings[0] ?? null

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !hive) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/hives"><ArrowLeft className="mr-1 h-4 w-4" /> Back to hives</Link></Button>
        <Alert variant="destructive">
          <AlertTitle>Unable to load hive</AlertTitle>
          <AlertDescription className="flex items-center gap-2">{error ?? "Hive not found."} <Button size="sm" variant="outline" onClick={load}>Retry</Button></AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="w-fit"><Link href="/dashboard/hives"><ArrowLeft className="mr-1 h-4 w-4" /> Back to hives</Link></Button>

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{hive.name}</h1>
            {health ? <HealthBadge status={health.health.status} /> : <Badge variant="secondary">No readings</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{hive.location} • {hive.species.replace(/_/g, " ")} • Last updated {formatDateTime(lr?.recorded_at)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={refreshing}><RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</Button>
          <Button onClick={() => setRecordOpen(true)}><Plus className="mr-1 h-4 w-4" /> Record Reading</Button>
        </div>
      </div>

      {/* Current metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground"><Thermometer className="h-4 w-4" /> Temperature</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{lr?.temperature_c ?? "—"}°C</div><p className="text-xs text-muted-foreground">Healthy range 33–36°C</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground"><Droplets className="h-4 w-4" /> Humidity</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{lr?.humidity_pct ?? "—"}%</div><p className="text-xs text-muted-foreground">Expected range 50–65%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground"><Weight className="h-4 w-4" /> Weight</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{lr?.weight_kg ?? "—"} kg</div><p className="text-xs text-muted-foreground">Total hive weight</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground"><AudioWaveform className="h-4 w-4" /> Sound Frequency</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{lr?.sound_hz ?? "—"} Hz</div><p className="text-xs text-muted-foreground">Normal band 180–260 Hz</p></CardContent>
        </Card>
      </div>

      {/* Health analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Hive Health</CardTitle>
          <CardDescription>Diagnosis from the latest sensor reading. The backend is the source of truth.</CardDescription>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="space-y-4">
              {(health.health.status === "WATCH" || health.health.status === "HIGH_RISK") && (
                <Alert variant={health.health.status === "HIGH_RISK" ? "destructive" : "default"}>
                  <AlertTitle>{health.health.status === "HIGH_RISK" ? "High risk — action recommended" : "Watch — check this hive soon"}</AlertTitle>
                  <AlertDescription>{health.health.reasons[0] ?? "See diagnosis details below."}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <HealthBadge status={health.health.status} />
                <span className="text-sm text-muted-foreground">Confidence: {Math.round(health.health.confidence * 100)}%</span>
              </div>
              <Progress value={Math.round(health.health.confidence * 100)} className="max-w-md" />
              <ul className="space-y-1 text-sm">
                {health.health.reasons.map((r, i) => <li key={i} className="text-muted-foreground">• {r}</li>)}
              </ul>
              {health.productivity && (
                <div className="rounded-lg border p-4 text-sm">
                  <p className="font-medium">Productivity</p>
                  <p className="text-muted-foreground">
                    Trend: {health.productivity.trend} • Estimated yield: {health.productivity.yield_estimate_kg} kg • Confidence: {Math.round((health.productivity.confidence ?? 0) * 100)}%
                    {health.productivity.next_harvest_days != null && <> • Next harvest in ~{health.productivity.next_harvest_days} days</>}
                  </p>
                  <p className="mt-1 text-muted-foreground">{health.productivity.recommendation}</p>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertTitle>No health analysis yet</AlertTitle>
              <AlertDescription>
                {(healthError?.includes("No sensor readings") || readings.length === 0)
                  ? "No sensor readings yet. Record the first reading to begin hive health analysis."
                  : `Unable to load hive health. ${healthError ?? "Please try again."}`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Sensor History</CardTitle>
          <CardDescription>Latest {readings.length} readings (up to 100 from the backend).</CardDescription>
        </CardHeader>
        <CardContent>
          {readings.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No sensor readings yet. Record the first reading to begin hive health analysis.</p>
          ) : (
            <Tabs defaultValue="temperature">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="temperature">Temperature</TabsTrigger>
                <TabsTrigger value="humidity">Humidity</TabsTrigger>
                <TabsTrigger value="weight">Weight</TabsTrigger>
                <TabsTrigger value="sound">Sound</TabsTrigger>
              </TabsList>
              <TabsContent value="temperature"><MetricChart data={chartData} dataKey="temperature_c" color="var(--color-chart-1)" unit="°C" /></TabsContent>
              <TabsContent value="humidity"><MetricChart data={chartData} dataKey="humidity_pct" color="var(--color-chart-2)" unit="%" /></TabsContent>
              <TabsContent value="weight"><MetricChart data={chartData} dataKey="weight_kg" color="var(--color-chart-3)" unit="kg" /></TabsContent>
              <TabsContent value="sound"><MetricChart data={chartData} dataKey="sound_hz" color="var(--color-chart-4)" unit="Hz" /></TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <RecordReadingDialog open={recordOpen} onOpenChange={setRecordOpen} hiveId={hiveId} hiveName={hive.name} onSuccess={load} />
    </div>
  )
}
