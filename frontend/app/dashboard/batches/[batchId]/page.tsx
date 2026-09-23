"use client"

import * as React from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { Batch, Hive, VerifyBatchResponse } from "@/lib/api/types"
import { shortId } from "@/lib/api/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { BatchStatusBadge, PurityBadge, VerifyBadge } from "@/components/dashboard/status-badges"
import { BatchTimeline } from "@/components/dashboard/batch-timeline"
import { ComplianceDownloadButton, QrSection } from "@/components/dashboard/qr-compliance"
import { UpdateBatchDialog } from "@/components/dashboard/update-batch-dialog"
import { ArrowLeft, Pencil } from "lucide-react"

export default function BatchDetailPage({ params }: { params: { batchId: string } }) {
  const { batchId } = params
  const [batch, setBatch] = React.useState<Batch | null>(null)
  const [hives, setHives] = React.useState<Hive[]>([])
  const [verify, setVerify] = React.useState<VerifyBatchResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [updateOpen, setUpdateOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [bRes, hRes] = await Promise.all([
        api.batches.list(),
        api.hives.list().catch(() => ({ data: [] as Hive[] })),
      ])
      const found = ((bRes.data ?? []) as Batch[]).find((b) => b.id === batchId) ?? null
      if (!found) {
        setError("Batch not found.")
      } else {
        setBatch(found)
      }
      setHives((hRes.data as Hive[]) ?? [])
      try {
        const v = await api.verification.batch(batchId)
        setVerify(v.data)
      } catch {
        setVerify(null)
      }
    } catch (err) {
      setError(normalizeError(err).detail)
    } finally {
      setLoading(false)
    }
  }, [batchId])

  React.useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/batches"><ArrowLeft className="mr-1 h-4 w-4" /> Back to batches</Link></Button>
        <Alert variant="destructive">
          <AlertTitle>Unable to load batch</AlertTitle>
          <AlertDescription className="flex items-center gap-2">{error ?? "Batch not found."} <Button size="sm" variant="outline" onClick={load}>Retry</Button></AlertDescription>
        </Alert>
      </div>
    )
  }

  const hiveName = hives.find((h) => h.id === batch.hive_id)?.name ?? "—"
  const purityStatus =
    batch.moisture_pct != null
      ? batch.moisture_pct <= 20
        ? (batch.purity_score != null && batch.purity_score < 70 ? "CAUTION" : "PASS")
        : "REJECT"
      : null

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="w-fit"><Link href="/dashboard/batches"><ArrowLeft className="mr-1 h-4 w-4" /> Back to batches</Link></Button>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold" title={batch.id}>{shortId(batch.id)}</h1>
            <BatchStatusBadge status={batch.status} />
            {verify && <VerifyBadge badge={verify.authenticity_badge} />}
          </div>
          <p className="text-sm text-muted-foreground">{batch.honey_type} • {batch.quantity_kg} kg • Harvested {new Date(batch.harvest_date).toLocaleDateString()}</p>
        </div>
        <Button onClick={() => setUpdateOpen(true)}><Pencil className="mr-1 h-4 w-4" /> Update Batch</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Batch overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Batch Overview</CardTitle>
            <CardDescription>Harvest and purity details for this honey lot.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
              <div><dt className="text-muted-foreground">Batch ID</dt><dd className="font-mono font-semibold" title={batch.id}>{shortId(batch.id)}</dd></div>
              <div><dt className="text-muted-foreground">Honey Type</dt><dd className="font-medium">{batch.honey_type}</dd></div>
              <div><dt className="text-muted-foreground">Quantity</dt><dd className="font-medium">{batch.quantity_kg} kg</dd></div>
              <div><dt className="text-muted-foreground">Hive</dt><dd className="font-medium">{hiveName}</dd></div>
              <div><dt className="text-muted-foreground">Apiary Location</dt><dd className="font-medium">{batch.apiary_location}</dd></div>
              <div><dt className="text-muted-foreground">Harvest Date</dt><dd className="font-medium">{new Date(batch.harvest_date).toLocaleDateString()}</dd></div>
              <div><dt className="text-muted-foreground">Moisture</dt><dd className="font-medium">{batch.moisture_pct != null ? `${batch.moisture_pct}%` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">Purity Score</dt><dd className="font-medium">{batch.purity_score != null ? Number(batch.purity_score).toFixed(1) : "—"}</dd></div>
              <div><dt className="text-muted-foreground">Current Status</dt><dd><BatchStatusBadge status={batch.status} /></dd></div>
            </dl>
            <div className="mt-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">Purity screening</span>
                {purityStatus && <PurityBadge status={purityStatus} />}
              </div>
              {batch.purity_score != null && <Progress value={Math.min(100, Math.max(0, Number(batch.purity_score)))} className="mt-3" />}
              <p className="mt-2 text-xs text-muted-foreground">
                Purity screening uses the BIS/Codex threshold of ≤ 20% moisture. This is a screening check based on backend analysis, not a laboratory certification.
              </p>
            </div>
            <div className="mt-4">
              <ComplianceDownloadButton batchId={batch.id} />
            </div>
          </CardContent>
        </Card>

        {/* Consumer verification / QR */}
        <Card id="qr">
          <CardHeader>
            <CardTitle>Consumer Verification</CardTitle>
            <CardDescription>QR code links to the public verification page.</CardDescription>
          </CardHeader>
          <CardContent>
            <QrSection batchId={batch.id} />
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Lifecycle</CardTitle>
          <CardDescription>Harvest → Quality Test → Transfer → Package → Sale. The harvest event is created automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          {verify ? (
            <BatchTimeline events={verify.ledger_timeline} />
          ) : (
            <Alert>
              <AlertTitle>Timeline unavailable</AlertTitle>
              <AlertDescription>Unable to load traceability events. Please try again.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <UpdateBatchDialog open={updateOpen} onOpenChange={setUpdateOpen} batchId={batch.id} onSuccess={load} />
    </div>
  )
}
