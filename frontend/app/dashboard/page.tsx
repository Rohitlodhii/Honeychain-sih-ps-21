"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { Batch, Hive, HiveHealthResponse } from "@/lib/api/types"
import { useAuth } from "@/components/dashboard/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { HealthBadge } from "@/components/dashboard/status-badges"
import { RecordReadingDialog } from "@/components/dashboard/record-reading-dialog"
import { CreateBatchDialog } from "@/components/dashboard/create-batch-dialog"
import { CreateHiveDialog } from "@/components/dashboard/create-hive-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Hexagon, Package, Plus } from "lucide-react"
import { HarvestCalendar } from "@/components/dashboard/harvest-calendar"

interface HiveWithHealth {
  hive: Hive
  health?: HiveHealthResponse | null
  healthError?: string | null
}

export default function OverviewPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [hives, setHives] = React.useState<Hive[]>([])
  const [batches, setBatches] = React.useState<Batch[]>([])
  const [batchesLoading, setBatchesLoading] = React.useState(true)
  const [healthMap, setHealthMap] = React.useState<Record<string, HiveHealthResponse | null>>({})
  const [healthErrors, setHealthErrors] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(true)
  const [healthLoading, setHealthLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [recordOpen, setRecordOpen] = React.useState(false)
  const [recordHiveId, setRecordHiveId] = React.useState("")
  const [batchOpen, setBatchOpen] = React.useState(false)
  const [hiveOpen, setHiveOpen] = React.useState(false)

  const loadAll = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [hivesRes, batchesRes] = await Promise.all([
        api.hives.list(),
        api.batches.list().catch(() => ({ data: [] as Batch[] })),
      ])
      setHives(hivesRes.data)
      setBatches((batchesRes.data as Batch[]) ?? [])
      if (hivesRes.data.length > 0 && !recordHiveId) setRecordHiveId(hivesRes.data[0].id)
    } catch (err) {
      setError(normalizeError(err).detail)
    } finally {
      setLoading(false)
      setBatchesLoading(false)
    }
  }, [recordHiveId])

  const loadHealth = React.useCallback(async (list: Hive[]) => {
    if (list.length === 0) return
    setHealthLoading(true)
    const results = await Promise.all(
      list.map(async (h) => {
        try {
          const r = await api.hives.health(h.id)
          return { id: h.id, data: r.data as HiveHealthResponse, error: null as string | null }
        } catch (err) {
          return { id: h.id, data: null, error: normalizeError(err).detail }
        }
      })
    )
    const map: Record<string, HiveHealthResponse | null> = {}
    const errs: Record<string, string> = {}
    results.forEach((r) => {
      map[r.id] = r.data
      if (r.error && r.data === null) {
        // Only keep meaningful errors; "No sensor readings" is an empty state
        errs[r.id] = r.error
      }
    })
    setHealthMap(map)
    setHealthErrors(errs)
    setHealthLoading(false)
  }, [])

  React.useEffect(() => {
    loadAll()
  }, [loadAll])

  React.useEffect(() => {
    if (hives.length > 0) loadHealth(hives)
  }, [hives, loadHealth])

  const refresh = React.useCallback(async () => {
    try {
      const [hivesRes, batchesRes] = await Promise.all([
        api.hives.list(),
        api.batches.list().catch(() => ({ data: [] as Batch[] })),
      ])
      setHives(hivesRes.data)
      setBatches((batchesRes.data as Batch[]) ?? [])
      await loadHealth(hivesRes.data)
    } catch {
      /* ignore */
    } finally {
      setBatchesLoading(false)
    }
  }, [loadHealth])

  const counts = React.useMemo(() => {
    let healthy = 0
    let watch = 0
    let high = 0
    Object.values(healthMap).forEach((h) => {
      if (!h) return
      if (h.health.status === "HEALTHY") healthy += 1
      else if (h.health.status === "WATCH") watch += 1
      else if (h.health.status === "HIGH_RISK") high += 1
    })
    return { healthy, watch, high }
  }, [healthMap])

  const rows: HiveWithHealth[] = hives.map((h) => ({
    hive: h,
    health: healthMap[h.id] ?? null,
    healthError: healthErrors[h.id] ?? null,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Welcome back, {user?.name ?? "Beekeeper"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor your apiaries, honey production and traceability from one place.
          </p>
        </div>
      <HarvestCalendar batches={batches} loading={loading || batchesLoading} />

      <div className="flex flex-wrap gap-2">
          <Button
            disabled={hives.length === 0}
            onClick={() => {
              if (!recordHiveId && hives[0]) setRecordHiveId(hives[0].id)
              setRecordOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Record Reading
          </Button>
          <Button variant="outline" disabled={hives.length === 0} onClick={() => setBatchOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Create Harvest Batch
          </Button>
        </div>
      </div>

      {hives.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Record reading for:</span>
          <Select value={recordHiveId} onValueChange={setRecordHiveId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select hive" /></SelectTrigger>
            <SelectContent>
              {hives.map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load hives</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            {error}
            <Button size="sm" variant="outline" onClick={loadAll}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Hives</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{hives.length}</div>}
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Hexagon className="h-3 w-3" /> Registered in your apiary</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Healthy Hives</CardTitle></CardHeader>
          <CardContent>
            {loading || healthLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-emerald-600">{counts.healthy}</div>}
            <p className="mt-1 text-xs text-muted-foreground">Status HEALTHY</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Hives to Watch</CardTitle></CardHeader>
          <CardContent>
            {loading || healthLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-amber-600">{counts.watch}</div>}
            <p className="mt-1 text-xs text-muted-foreground">Status WATCH</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">High Risk</CardTitle></CardHeader>
          <CardContent>
            {loading || healthLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-destructive">{counts.high}</div>}
            <p className="mt-1 text-xs text-muted-foreground">Status HIGH_RISK</p>
          </CardContent>
        </Card>
      </div>

      {/* Hive Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Hive Health</CardTitle>
          <Button variant="ghost" size="sm" asChild><Link href="/dashboard/hives">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hive</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Temp</TableHead>
                    <TableHead>Humidity</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Sound</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Est. Yield</TableHead>
                    <TableHead>Next Harvest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : hives.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-medium">Your apiary is empty. Add your first hive to start monitoring.</p>
              <Button className="mt-4" onClick={() => setHiveOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Hive</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hive</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Temp</TableHead>
                    <TableHead>Humidity</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Sound</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Est. Yield</TableHead>
                    <TableHead>Next Harvest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ hive, health, healthError }) => {
                    const lr = health?.latest_reading
                    return (
                      <TableRow
                        key={hive.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/hives/${hive.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium whitespace-nowrap">{hive.name}</div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {hive.location} • {hive.species.replace(/_/g, " ")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {healthLoading && !health ? (
                            <Skeleton className="h-6 w-20" />
                          ) : health ? (
                            <HealthBadge status={health.health.status} />
                          ) : (
                            <Badge variant="secondary">No readings</Badge>
                          )}
                        </TableCell>
                        {health ? (
                          <>
                            <TableCell className="whitespace-nowrap">{Math.round(health.health.confidence * 100)}%</TableCell>
                            <TableCell className="whitespace-nowrap">{lr?.temperature_c ?? "—"}°C</TableCell>
                            <TableCell className="whitespace-nowrap">{lr?.humidity_pct ?? "—"}%</TableCell>
                            <TableCell className="whitespace-nowrap">{lr?.weight_kg ?? "—"} kg</TableCell>
                            <TableCell className="whitespace-nowrap">{lr?.sound_hz ?? "—"} Hz</TableCell>
                            <TableCell className="whitespace-nowrap">{health.productivity?.trend ?? "—"}</TableCell>
                            <TableCell className="whitespace-nowrap">{health.productivity?.yield_estimate_kg ?? "—"} kg</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {health.productivity?.next_harvest_days != null
                                ? `${health.productivity.next_harvest_days} days`
                                : "—"}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell colSpan={8} className="text-xs text-muted-foreground">
                              {healthError?.includes("No sensor readings")
                                ? "No sensor readings yet. Record the first reading to begin hive health analysis."
                                : healthError ?? "Health unavailable."}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {(counts.watch > 0 || counts.high > 0) && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Attention needed</AlertTitle>
              <AlertDescription>
                {counts.watch > 0 && `${counts.watch} hive(s) need watching. `}
                {counts.high > 0 && `${counts.high} hive(s) at high risk. `}
                Open the hive detail page for diagnosis and recommendations.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild><Link href="/dashboard/batches"><Package className="mr-1 h-4 w-4" /> Go to Honey Batches</Link></Button>
        <Button variant="outline" asChild><Link href="/dashboard/traceability">View Traceability</Link></Button>
      </div>

      <RecordReadingDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        hiveId={recordHiveId}
        hiveName={hives.find((h) => h.id === recordHiveId)?.name}
        onSuccess={refresh}
      />
      <CreateBatchDialog open={batchOpen} onOpenChange={setBatchOpen} hives={hives} defaultHiveId={recordHiveId} onCreated={refresh} />
      <CreateHiveDialog open={hiveOpen} onOpenChange={setHiveOpen} onCreated={refresh} />
    </div>
  )
}
