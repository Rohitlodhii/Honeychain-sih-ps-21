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
import { ShieldCheck, QrCode, Eye, Link2 } from "lucide-react"

export default function TraceabilityPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Traceability</h1>
        <p className="text-sm text-muted-foreground">Blockchain-backed honey traceability, explained simply.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4" /> How HoneyChain traceability works</CardTitle>
          <CardDescription>
            Every harvest, quality test, transfer, packaging and sale is written as a traceability event in a tamper-evident ledger.
            Consumers scan the QR code on the jar to verify the journey. You see a simple timeline — technical ledger details are available under an expandable section for advanced users.
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load traceability</AlertTitle>
          <AlertDescription className="flex items-center gap-2">{error} <Button size="sm" variant="outline" onClick={load}>Retry</Button></AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Your Batches</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : batches.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No honey batches yet. Create a harvest batch after harvesting.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead>Purity</TableHead>
                    <TableHead>Harvest Date</TableHead>
                    <TableHead>Lifecycle Events</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell className="whitespace-nowrap">{new Date(b.harvest_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {v ? <Badge variant="outline"><ShieldCheck className="mr-1 h-3 w-3" />{v.ledger_timeline.length} events</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{v ? <VerifyBadge badge={v.authenticity_badge} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" asChild title="View timeline"><Link href={`/dashboard/batches/${b.id}`}><Eye className="h-4 w-4" /></Link></Button>
                            <Button size="sm" variant="ghost" asChild title="View QR"><Link href={`/dashboard/batches/${b.id}#qr`}><QrCode className="h-4 w-4" /></Link></Button>
                            <Button size="sm" variant="ghost" asChild title="Verify"><Link href={`/verify/${b.id}`} target="_blank"><ShieldCheck className="h-4 w-4" /></Link></Button>
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
