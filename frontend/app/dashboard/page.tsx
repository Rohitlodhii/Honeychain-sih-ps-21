"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { Batch, Hive, HiveHealthResponse } from "@/lib/api/types"
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
import { CreateHiveDialog } from "@/components/dashboard/create-hive-dialog"
import { AlertTriangle, Hexagon, Plus } from "lucide-react"
import { HarvestCalendar } from "@/components/dashboard/harvest-calendar"
import { DATA_CHANGED_EVENT } from "@/components/dashboard/data-events"
import { useI18n } from "@/lib/i18n/context"

interface HiveWithHealth {
  hive: Hive
  health?: HiveHealthResponse | null
  healthError?: string | null
}

export default function OverviewPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [hives, setHives] = React.useState<Hive[]>([])
  const [batches, setBatches] = React.useState<Batch[]>([])
  const [batchesLoading, setBatchesLoading] = React.useState(true)
  const [healthMap, setHealthMap] = React.useState<Record<string, HiveHealthResponse | null>>({})
  const [healthErrors, setHealthErrors] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(true)
  const [healthLoading, setHealthLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
    } catch (err) {
      setError(normalizeError(err).detail)
    } finally {
      setLoading(false)
      setBatchesLoading(false)
    }
  }, [])

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

  // Reload when a batch is created from the navbar action.
  React.useEffect(() => {
    const handler = () => refresh()
    window.addEventListener(DATA_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler)
  }, [refresh])

  const rows: HiveWithHealth[] = hives.map((h) => ({
    hive: h,
    health: healthMap[h.id] ?? null,
    healthError: healthErrors[h.id] ?? null,
  }))

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t.overview.loadFail}</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            {error}
            <Button size="sm" variant="outline" onClick={loadAll}>{t.common.retry}</Button>
          </AlertDescription>
        </Alert>
      )}

      <HarvestCalendar batches={batches} loading={loading || batchesLoading} />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t.overview.totalHives}</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{hives.length}</div>}
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Hexagon className="h-3 w-3" /> {t.overview.registeredHint}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t.overview.healthyHives}</CardTitle></CardHeader>
          <CardContent>
            {loading || healthLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-emerald-600">{counts.healthy}</div>}
            <p className="mt-1 text-xs text-muted-foreground">{t.overview.healthyHint}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t.overview.watchHives}</CardTitle></CardHeader>
          <CardContent>
            {loading || healthLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-amber-600">{counts.watch}</div>}
            <p className="mt-1 text-xs text-muted-foreground">{t.overview.watchHint}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t.overview.highRisk}</CardTitle></CardHeader>
          <CardContent>
            {loading || healthLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-destructive">{counts.high}</div>}
            <p className="mt-1 text-xs text-muted-foreground">{t.overview.highRiskHint}</p>
          </CardContent>
        </Card>
      </div>

      {/* Hive Health */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-semibold tracking-tight">{t.overview.hiveHealth}</h2>
          <Button variant="ghost" size="sm" asChild><Link href="/dashboard/hives">{t.overview.viewAll}</Link></Button>
        </div>
          {loading ? (
            <div className="overflow-x-auto rounded-lg border p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-secondary">{t.overview.thHive}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thStatus}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thConfidence}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thTemp}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thHumidity}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thWeight}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thSound}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thTrend}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thYield}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thNext}</TableHead>
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
              <p className="font-medium">{t.overview.empty}</p>
              <Button className="mt-4" onClick={() => setHiveOpen(true)}><Plus className="mr-1 h-4 w-4" /> {t.overview.addHive}</Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-secondary">{t.overview.thHive}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thStatus}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thConfidence}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thTemp}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thHumidity}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thWeight}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thSound}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thTrend}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thYield}</TableHead>
                    <TableHead className="bg-secondary">{t.overview.thNext}</TableHead>
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
                            <Badge variant="secondary">{t.common.noReadings}</Badge>
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
                                ? `${health.productivity.next_harvest_days} ${t.overview.daysSuffix}`
                                : "—"}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell colSpan={8} className="text-xs text-muted-foreground">
                              {healthError?.includes("No sensor readings")
                                ? t.overview.noReadingsHint
                                : healthError ?? t.overview.healthUnavailable}
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
              <AlertTitle>{t.overview.attention}</AlertTitle>
              <AlertDescription>
                {counts.watch > 0 && `${t.overview.watchMsg(counts.watch)} `}
                {counts.high > 0 && `${t.overview.highMsg(counts.high)} `}
                {t.overview.openDetailHint}
              </AlertDescription>
            </Alert>
          )}
      </div>

      <CreateHiveDialog open={hiveOpen} onOpenChange={setHiveOpen} onCreated={refresh} />
    </div>
  )
}
