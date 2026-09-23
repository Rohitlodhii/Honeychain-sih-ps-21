"use client"

import * as React from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"

export function QrSection({ batchId }: { batchId: string }) {
  const qrUrl = api.batches.qrUrl(batchId)
  const [failed, setFailed] = React.useState(false)
  const { t } = useI18n()

  const download = async () => {
    try {
      const res = await fetch(qrUrl)
      if (!res.ok) throw new Error(t.qr.downloadQrFail)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `honeychain-${batchId}-qr.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      toast.error(normalizeError(err).detail)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl}
          alt={t.qr.imgAlt}
          className="h-44 w-44 rounded-lg border bg-white p-2"
          onError={() => setFailed(true)}
        />
      ) : (
        <Skeleton className="h-44 w-44" />
      )}
      {failed && (
        <Alert variant="destructive">
          <AlertDescription>{t.qr.qrFail}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="outline" onClick={download}>
          <Download className="mr-1 h-3.5 w-3.5" /> {t.qr.downloadPrint}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/verify/${batchId}`} target="_blank">
            <ExternalLink className="mr-1 h-3.5 w-3.5" /> {t.qr.viewVerification}
          </Link>
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {t.qr.scanHint}
      </p>
    </div>
  )
}

export function ComplianceDownloadButton({ batchId }: { batchId: string }) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { t } = useI18n()

  const handle = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.batches.downloadComplianceReport(batchId)
      toast.success(t.qr.complianceDownloaded)
    } catch (err) {
      const msg = normalizeError(err).detail
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handle} disabled={loading} className="w-full sm:w-auto">
        <Download className="mr-2 h-4 w-4" />
        {loading ? t.qr.preparing : t.qr.complianceBtn}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-muted-foreground">
        {t.qr.complianceNote}
      </p>
    </div>
  )
}
