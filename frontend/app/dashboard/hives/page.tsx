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

export default function HivesPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight">My Hives</h1>
          <p className="text-sm text-muted-foreground">Hive monitoring and hive management.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Hive</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load hives</AlertTitle>
          <AlertDescription className="flex items-center gap-2">{error} <Button size="sm" variant="outline" onClick={load}>Retry</Button></AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hive</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>Humidity</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Sound</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Est. Yield</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
          <p className="font-medium">Your apiary is empty. Add your first hive to start monitoring.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Hive</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hive</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>Humidity</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Sound</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Est. Yield</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                        <Badge variant="secondary">No readings</Badge>
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
                        <Button size="sm" variant="ghost" asChild><Link href={`/dashboard/hives/${hive.id}`}>Open</Link></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRecordHive(hive); setRecordOpen(true) }}>Record</Button>
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
