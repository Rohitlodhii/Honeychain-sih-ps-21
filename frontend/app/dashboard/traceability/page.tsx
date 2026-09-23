"use client"

import * as React from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { Batch, VerifyBatchResponse } from "@/lib/api/types"
import { shortId } from "@/lib/api/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { BatchStatusBadge, PurityBadge, VerifyBadge } from "@/components/dashboard/status-badges"
import { DATA_CHANGED_EVENT } from "@/components/dashboard/data-events"
import { ShieldCheck, QrCode, Eye, Link2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

export default function TraceabilityPage() {
  const { t, tag } = useI18n()
  const [batches, setBatches] = React.useState<Batch[]>([])
  const [verifyMap, setVerifyMap] = React.useState<Record<string, VerifyBatchResponse | null>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const bRes = await api.batches.list()
      const list = (bRes.data ?? []) as Batch[]
      setBatches(list)
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

  // Reload when a batch is created from the navbar action.
  React.useEffect(() => {
    const handler = () => load()
    window.addEventListener(DATA_CHANGED_EVENT, handler)
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.traceability.title}</h1>
        <p className="text-sm text-muted-foreground">{t.traceability.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4" /> {t.traceability.howTitle}</CardTitle>
          <CardDescription>
            {t.traceability.howDesc}
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t.traceability.loadFail}</AlertTitle>
          <AlertDescription className="flex items-center gap-2">{error} <Button size="sm" variant="outline" onClick={load}>{t.common.retry}</Button></AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">{t.traceability.yourBatches}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : batches.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.traceability.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.traceability.thBatch}</TableHead>
                    <TableHead>{t.traceability.thStatus}</TableHead>
                    <TableHead>{t.traceability.thPurity}</TableHead>
                    <TableHead>{t.traceability.thHarvest}</TableHead>
                    <TableHead>{t.traceability.thEvents}</TableHead>
                    <TableHead>{t.traceability.thVerify}</TableHead>
                    <TableHead className="text-right">{t.traceability.thActions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => {
                    const v = verifyMap[b.id]
                    return (
                      <TableRow key={b.id}>
                        <TableCell><span className="font-mono font-semibold" title={b.id}>{shortId(b.id)}</span></TableCell>
                        <TableCell><BatchStatusBadge status={b.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{b.purity_score != null ? Number(b.purity_score).toFixed(1) : "—"}</span>
                            {b.moisture_pct != null && (
                              <PurityBadge status={b.moisture_pct <= 20 ? "PASS" : "REJECT"} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(b.harvest_date).toLocaleDateString(tag)}</TableCell>
                        <TableCell>
                          {v ? <Badge variant="outline"><ShieldCheck className="mr-1 h-3 w-3" />{t.traceability.eventsSuffix(v.ledger_timeline.length)}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{v ? <VerifyBadge badge={v.authenticity_badge} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" asChild title={t.common.viewTimelineTitle}><Link href={`/dashboard/batches/${b.id}`}><Eye className="h-4 w-4" /></Link></Button>
                            <Button size="sm" variant="ghost" asChild title={t.common.viewQrTitle}><Link href={`/dashboard/batches/${b.id}#qr`}><QrCode className="h-4 w-4" /></Link></Button>
                            <Button size="sm" variant="ghost" asChild title={t.common.verifyTitle}><Link href={`/verify/${b.id}`} target="_blank"><ShieldCheck className="h-4 w-4" /></Link></Button>
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
    </div>
  )
}
