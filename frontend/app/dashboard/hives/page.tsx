"use client"

import * as React from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { Hive, HiveHealthResponse } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HealthBadge } from "@/components/dashboard/status-badges"
import { CreateHiveDialog } from "@/components/dashboard/create-hive-dialog"
import { RecordReadingDialog } from "@/components/dashboard/record-reading-dialog"
import { Plus } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

export default function HivesPage() {
  const { t } = useI18n()
  const [hives, setHives] = React.useState<Hive[]>([])
  const [healthMap, setHealthMap] = React.useState<Record<string, HiveHealthResponse | null>>({})
  const [loading, setLoading] = React.useState(true)
  const [healthLoading, setHealthLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [recordOpen, setRecordOpen] = React.useState(false)
  const [recordHive, setRecordHive] = React.useState<Hive | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.hives.list()
      setHives(res.data)
      if (res.data.length > 0) {
        setHealthLoading(true)
        const results = await Promise.all(
          res.data.map(async (h: Hive) => {
            try {
              const r = await api.hives.health(h.id)
              return { id: h.id, data: r.data as HiveHealthResponse }
            } catch {
              return { id: h.id, data: null }
            }
          })
        )
        const map: Record<string, HiveHealthResponse | null> = {}
        results.forEach((r) => { map[r.id] = r.data })
        setHealthMap(map)
        setHealthLoading(false)
      }
    } catch (err) {
      setError(normalizeError(err).detail)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.hives.title}</h1>
          <p className="text-sm text-muted-foreground">{t.hives.subtitle}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" /> {t.hives.addHive}</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t.hives.loadFail}</AlertTitle>
          <AlertDescription className="flex items-center gap-2">{error} <Button size="sm" variant="outline" onClick={load}>{t.common.retry}</Button></AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.hives.thHive}</TableHead>
                <TableHead>{t.hives.thLocation}</TableHead>
                <TableHead>{t.hives.thSpecies}</TableHead>
                <TableHead>{t.hives.thStatus}</TableHead>
                <TableHead>{t.hives.thConfidence}</TableHead>
                <TableHead>{t.hives.thTemp}</TableHead>
                <TableHead>{t.hives.thHumidity}</TableHead>
                <TableHead>{t.hives.thWeight}</TableHead>
                <TableHead>{t.hives.thSound}</TableHead>
                <TableHead>{t.hives.thTrend}</TableHead>
                <TableHead>{t.hives.thYield}</TableHead>
                <TableHead className="text-right">{t.hives.thActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[0, 1, 2].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : hives.length === 0 ? (
        <div className="rounded-lg border py-12 text-center">
          <p className="font-medium">{t.hives.empty}</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" /> {t.hives.addHive}</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.hives.thHive}</TableHead>
                <TableHead>{t.hives.thLocation}</TableHead>
                <TableHead>{t.hives.thSpecies}</TableHead>
                <TableHead>{t.hives.thStatus}</TableHead>
                <TableHead>{t.hives.thConfidence}</TableHead>
                <TableHead>{t.hives.thTemp}</TableHead>
                <TableHead>{t.hives.thHumidity}</TableHead>
                <TableHead>{t.hives.thWeight}</TableHead>
                <TableHead>{t.hives.thSound}</TableHead>
                <TableHead>{t.hives.thTrend}</TableHead>
                <TableHead>{t.hives.thYield}</TableHead>
                <TableHead className="text-right">{t.hives.thActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hives.map((hive) => {
                const health = healthMap[hive.id]
                const lr = health?.latest_reading
                return (
                  <TableRow key={hive.id}>
                    <TableCell className="font-medium whitespace-nowrap">{hive.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{hive.location}</TableCell>
                    <TableCell className="whitespace-nowrap">{hive.species.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      {healthLoading && !health ? (
                        <Skeleton className="h-6 w-20" />
                      ) : health ? (
                        <HealthBadge status={health.health.status} />
                      ) : (
                        <Badge variant="secondary">{t.common.noReadings}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {health ? `${Math.round(health.health.confidence * 100)}%` : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{lr?.temperature_c != null ? `${lr.temperature_c}°C` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{lr?.humidity_pct != null ? `${lr.humidity_pct}%` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{lr?.weight_kg != null ? `${lr.weight_kg} kg` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{lr?.sound_hz != null ? `${lr.sound_hz} Hz` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{health?.productivity?.trend ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {health?.productivity?.yield_estimate_kg != null ? `${health.productivity.yield_estimate_kg} kg` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" asChild><Link href={`/dashboard/hives/${hive.id}`}>{t.hives.open}</Link></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRecordHive(hive); setRecordOpen(true) }}>{t.hives.record}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateHiveDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
      <RecordReadingDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        hiveId={recordHive?.id ?? ""}
        hiveName={recordHive?.name}
        onSuccess={load}
      />
    </div>
  )
}
