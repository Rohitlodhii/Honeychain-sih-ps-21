"use client"

import * as React from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { Batch, Hive, VerifyBatchResponse } from "@/lib/api/types"
import { shortId } from "@/lib/api/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { BatchStatusBadge, PurityBadge } from "@/components/dashboard/status-badges"
import { CreateBatchDialog } from "@/components/dashboard/create-batch-dialog"
import { Plus, QrCode, ShieldCheck, Eye } from "lucide-react"

function purityOf(batch: Batch): string | null {
  const m = batch.moisture_pct
  if (m == null) return null
  // Mirror backend screening hint (BIS/Codex ≤20%) for display only; backend score is authoritative on detail page.
  if (m <= 20) return batch.purity_score != null && batch.purity_score < 70 ? "CAUTION" : "PASS"
  return "REJECT"
}

export default function BatchesPage() {
  const [batches, setBatches] = React.useState<Batch[]>([])
  const [hives, setHives] = React.useState<Hive[]>([])
  const [verifyMap, setVerifyMap] = React.useState<Record<string, VerifyBatchResponse | null>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  const hiveName = React.useCallback((id: string) => hives.find((h) => h.id === id)?.name ?? "—", [hives])

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [bRes, hRes] = await Promise.all([api.batches.list(), api.hives.list().catch(() => ({ data: [] as Hive[] }))])
      setBatches(bRes.data ?? [])
      setHives((hRes.data as Hive[]) ?? [])
      // Best-effort traceability status per batch (event count)
      const list = (bRes.data ?? []) as Batch[]
      const results = await Promise.all(
        list.map(async (b) => {
          try {
            const v = await api.verification.batch(b.id)
            return { id: b.id, data: v.data as VerifyBatchResponse }
          } catch {
            return { id: b.id, data: null }
          }
        })
      )
      const map: Record<string, VerifyBatchResponse | null> = {}
      results.forEach((r) => { map[r.id] = r.data })
      setVerifyMap(map)
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
          <h1 className="text-2xl font-semibold tracking-tight">Honey Batches</h1>
          <p className="text-sm text-muted-foreground">Harvested honey lots and their traceability.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={hives.length === 0 && !loading}>
          <Plus className="mr-1 h-4 w-4" /> Create Harvest Batch
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load batches</AlertTitle>
          <AlertDescription className="flex items-center gap-2">{error} <Button size="sm" variant="outline" onClick={load}>Retry</Button></AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">All Batches</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : batches.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-medium">No honey batches yet. Create a harvest batch after harvesting.</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" /> Create Harvest Batch</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Hive</TableHead>
                    <TableHead>Honey Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Harvest Date</TableHead>
                    <TableHead>Purity Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Traceability</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => {
                    const v = verifyMap[b.id]
                    const eventCount = v?.ledger_timeline?.length ?? null
                    return (
                      <TableRow key={b.id}>
                        <TableCell><span className="font-mono font-semibold" title={b.id}>{shortId(b.id)}</span></TableCell>
                        <TableCell>{hiveName(b.hive_id)}</TableCell>
                        <TableCell>{b.honey_type}</TableCell>
                        <TableCell>{b.quantity_kg} kg</TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(b.harvest_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{b.purity_score != null ? Number(b.purity_score).toFixed(1) : "—"}</span>
                            {purityOf(b) && <PurityBadge status={purityOf(b)} />}
                          </div>
                        </TableCell>
                        <TableCell><BatchStatusBadge status={b.status} /></TableCell>
                        <TableCell>
                          {eventCount == null ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Badge variant="outline" className="whitespace-nowrap">
                              <ShieldCheck className="mr-1 h-3 w-3" /> {eventCount} events
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" asChild title="Open batch"><Link href={`/dashboard/batches/${b.id}`}><Eye className="h-4 w-4" /></Link></Button>
                            <Button size="sm" variant="ghost" asChild title="View QR"><Link href={`/dashboard/batches/${b.id}#qr`}><QrCode className="h-4 w-4" /></Link></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateBatchDialog open={createOpen} onOpenChange={setCreateOpen} hives={hives} onCreated={load} />
    </div>
  )
}
