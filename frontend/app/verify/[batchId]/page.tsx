"use client"

import * as React from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { VerifyBatchResponse } from "@/lib/api/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { VerifyBadge } from "@/components/dashboard/status-badges"
import { BatchTimeline } from "@/components/dashboard/batch-timeline"
import { ShieldCheck, ArrowLeft } from "lucide-react"

export default function VerifyBatchIdPage({ params }: { params: { batchId: string } }) {
  const { batchId } = params
  const [data, setData] = React.useState<VerifyBatchResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await api.verification.batch(batchId)
        setData(res.data)
      } catch (err) {
        setError(normalizeError(err).detail || "Batch not found")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [batchId])

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-md p-4 py-16 text-center md:p-8">
        <h1 className="text-2xl font-semibold">Batch Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-6" asChild><Link href="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Home</Link></Button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold">HoneyChain</Link>
        <span className="text-xs text-muted-foreground">Authenticity Verification</span>
      </div>

      {/* Authenticity badge */}
      <div className="text-center">
        <VerifyBadge badge={data.authenticity_badge} className="px-4 py-1.5 text-sm" />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{data.honey_type}</h1>
        <p className="text-sm text-muted-foreground">
          From {data.beekeeper_name}{data.beekeeper_cluster ? ` • ${data.beekeeper_cluster}` : ""}
        </p>
        <p className="mt-2 text-sm font-medium">
          {data.direct_trade
            ? `Direct trade — ${data.transfer_count} recorded transfer(s)`
            : `${data.transfer_count} recorded transfer(s) for this batch`}
        </p>
      </div>

      {!data.chain_verification.valid && (
        <Alert variant="destructive">
          <AlertTitle>Chain integrity issue</AlertTitle>
          <AlertDescription>
            This batch record shows signs of tampering.
            {data.chain_verification.first_tampering_at_index != null && <> First issue at event {data.chain_verification.first_tampering_at_index}.</>}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Batch Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-muted-foreground">Quantity</dt><dd className="text-lg font-semibold">{data.quantity_kg} kg</dd></div>
              <div><dt className="text-muted-foreground">Harvest Date</dt><dd className="text-lg font-semibold">{new Date(data.harvest_date).toLocaleDateString()}</dd></div>
              <div><dt className="text-muted-foreground">Apiary Location</dt><dd className="font-medium">{data.apiary_location}</dd></div>
              <div><dt className="text-muted-foreground">Current Status</dt><dd><Badge variant="outline">{data.status}</Badge></dd></div>
              <div><dt className="text-muted-foreground">Moisture</dt><dd className="font-medium">{data.moisture_pct != null ? `${data.moisture_pct}% (BIS/Codex limit 20%)` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">Transfers</dt><dd className="font-medium">{data.transfer_count} • {data.direct_trade ? "Direct trade" : "Traded"}</dd></div>
            </dl>
            {data.purity_score != null && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Purity screening score</span>
                  <span className="font-semibold">{Number(data.purity_score).toFixed(1)}/100</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, Number(data.purity_score)))} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">Screening based on moisture (BIS/Codex ≤ 20%), not a laboratory certification.</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>From the Beekeeper</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><div className="text-xs text-muted-foreground uppercase">Name</div><div className="font-semibold">{data.beekeeper_name}</div></div>
            {data.beekeeper_cluster && <div><div className="text-xs text-muted-foreground uppercase">Cluster</div><div className="font-semibold">{data.beekeeper_cluster}</div></div>}
            <p className="border-t pt-3 text-xs text-muted-foreground">This beekeeper is part of the HoneyChain network and maintains traceability records for all honey.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traceability Timeline</CardTitle>
          <CardDescription>Chain verification: {data.chain_verification.valid ? "valid" : "tampered"} • {data.chain_verification.total_blocks} events</CardDescription>
        </CardHeader>
        <CardContent>
          <BatchTimeline events={data.ledger_timeline} />
          <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-4 text-sm">
            <div><div className="text-xs text-muted-foreground uppercase">Total Events</div><div className="text-xl font-bold">{data.chain_verification.total_blocks}</div></div>
            <div><div className="text-xs text-muted-foreground uppercase">Chain Status</div><div className={`text-xl font-bold ${data.chain_verification.valid ? "text-emerald-600" : "text-destructive"}`}>{data.chain_verification.valid ? "Valid" : "Tampered"}</div></div>
            <div><div className="text-xs text-muted-foreground uppercase">Batch ID</div><div className="truncate font-mono text-xs" title={data.batch_id}>{data.batch_id}</div></div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" />
          {data.authenticity_badge === "VERIFIED"
            ? "This honey has passed traceability verification."
            : "This honey record shows signs of tampering."}
        </p>
        <Button variant="outline" className="mt-3" asChild><Link href="/">Back to Home</Link></Button>
      </div>
    </main>
  )
}
