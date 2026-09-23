"use client"

import * as React from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { BatchCreateResponse, Hive } from "@/lib/api/types"
import { shortId } from "@/lib/api/types"
import { validateBatchForm } from "@/lib/farmer-forms"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PurityBadge } from "./status-badges"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"

export function CreateBatchDialog({
  open,
  onOpenChange,
  hives,
  defaultHiveId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  hives: Hive[]
  defaultHiveId?: string
  onCreated?: () => void
}) {
  const [hiveId, setHiveId] = React.useState(defaultHiveId ?? "")
  const [honeyType, setHoneyType] = React.useState("")
  const [quantity, setQuantity] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [moisture, setMoisture] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [created, setCreated] = React.useState<BatchCreateResponse | null>(null)
  const { t, locale } = useI18n()

  React.useEffect(() => {
    if (open) {
      setCreated(null)
      setSubmitError(null)
      if (defaultHiveId) setHiveId(defaultHiveId)
    }
  }, [open, defaultHiveId])

  const reset = () => {
    setHiveId(defaultHiveId ?? "")
    setHoneyType("")
    setQuantity("")
    setLocation("")
    setMoisture("")
    setErrors({})
    setSubmitError(null)
    setCreated(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const { errors: errs, payload } = validateBatchForm({
      hiveId: hiveId.trim(),
      honeyType,
      quantity,
      location,
      moisture,
      ownedHiveIds: hives.map((h) => h.id),
    }, locale)
    setErrors(errs)
    if (!payload) return
    setSaving(true)
    try {
      const res = await api.batches.create(payload)
      setCreated(res.data)
      toast.success(t.createBatch.createdToast)
      onCreated?.()
    } catch (err) {
      setSubmitError(normalizeError(err).detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent>
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.createBatch.title}</DialogTitle>
              <DialogDescription>
                {t.createBatch.desc}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label>{t.createBatch.hive}</Label>
                <Select value={hiveId} onValueChange={setHiveId}>
                  <SelectTrigger><SelectValue placeholder={t.createBatch.hivePh} /></SelectTrigger>
                  <SelectContent>
                    {hives.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.name} — {h.location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.hiveId && <p className="text-xs text-destructive">{errors.hiveId}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cb-type">{t.createBatch.honeyType}</Label>
                  <Input id="cb-type" placeholder={t.createBatch.honeyTypePh} value={honeyType} onChange={(e) => setHoneyType(e.target.value)} />
                  {errors.honeyType && <p className="text-xs text-destructive">{errors.honeyType}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cb-qty">{t.createBatch.qty}</Label>
                  <Input id="cb-qty" type="number" inputMode="decimal" step="0.1" min={0} placeholder={t.createBatch.qtyPh} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb-loc">{t.createBatch.location}</Label>
                <Input id="cb-loc" placeholder={t.createBatch.locationPh} value={location} onChange={(e) => setLocation(e.target.value)} />
                {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb-moist">{t.createBatch.moisture}</Label>
                <Input id="cb-moist" type="number" inputMode="decimal" step="0.1" min={0} max={100} placeholder={t.createBatch.moisturePh} value={moisture} onChange={(e) => setMoisture(e.target.value)} />
                {errors.moisture && <p className="text-xs text-destructive">{errors.moisture}</p>}
                <p className="text-xs text-muted-foreground">{t.createBatch.moistureHint}</p>
              </div>
              {submitError && (
                <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t.createBatch.cancel}</Button>
                <Button type="submit" disabled={saving}>{saving ? t.createBatch.creating : t.createBatch.create}</Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.createBatch.doneTitle}</DialogTitle>
              <DialogDescription>{t.createBatch.doneDesc}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.createBatch.fBatchId}</span>
                <span className="font-mono font-semibold" title={created.batch_id}>{shortId(created.batch_id)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.createBatch.fPurity}</span>
                <span className="font-semibold">{created.purity_score}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.createBatch.fScreening}</span>
                <PurityBadge status={created.purity_status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.createBatch.fStatus}</span>
                <span className="text-sm font-medium">{created.status}</span>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" asChild>
                <Link href={`/verify/${created.batch_id}`} target="_blank">{t.createBatch.viewVerification}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/batches/${created.batch_id}`}>{t.createBatch.openBatch}</Link>
              </Button>
              <Button onClick={() => onOpenChange(false)}>{t.createBatch.done}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
