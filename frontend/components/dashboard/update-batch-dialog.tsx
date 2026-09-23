"use client"

import * as React from "react"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { BatchEventType } from "@/lib/api/types"
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
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"

export function UpdateBatchDialog({
  open,
  onOpenChange,
  batchId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  onSuccess?: () => void
}) {
  const [eventType, setEventType] = React.useState<BatchEventType>("QUALITY_TEST")
  const [newOwner, setNewOwner] = React.useState("")
  const [result, setResult] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const { t } = useI18n()

  const EVENT_OPTIONS: { value: BatchEventType; label: string }[] = [
    { value: "QUALITY_TEST", label: t.updateBatch.qualityTest },
    { value: "TRANSFER", label: t.updateBatch.transfer },
    { value: "PACKAGE", label: t.updateBatch.package },
    { value: "SALE", label: t.updateBatch.sale },
  ]

  const reset = () => {
    setEventType("QUALITY_TEST")
    setNewOwner("")
    setResult("")
    setNotes("")
    setLocation("")
    setPrice("")
    setSubmitError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const payload: Record<string, unknown> = {}
    if (eventType === "TRANSFER") {
      if (!newOwner.trim()) {
        setSubmitError(t.updateBatch.errOwner)
        return
      }
      payload.new_owner = newOwner.trim()
    }
    if (eventType === "QUALITY_TEST") {
      if (result.trim()) payload.result = result.trim()
      if (notes.trim()) payload.notes = notes.trim()
    }
    if (eventType === "PACKAGE") {
      if (location.trim()) payload.location = location.trim()
      if (notes.trim()) payload.notes = notes.trim()
    }
    if (eventType === "SALE") {
      if (price.trim()) {
        const v = Number(price.trim())
        if (!Number.isFinite(v) || v < 0) {
          setSubmitError(t.updateBatch.errPrice)
          return
        }
        payload.price = v
      }
      if (newOwner.trim()) payload.new_owner = newOwner.trim()
      if (notes.trim()) payload.notes = notes.trim()
    }
    payload.recorded_via = "beekeeper-dashboard"
    setSaving(true)
    try {
      await api.batches.addEvent(batchId, { event_type: eventType, payload })
      toast.success(t.updateBatch.addedToast(eventType))
      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setSubmitError(normalizeError(err).detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.updateBatch.title}</DialogTitle>
          <DialogDescription>{t.updateBatch.desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.updateBatch.eventType}</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as BatchEventType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {eventType === "QUALITY_TEST" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ub-result">{t.updateBatch.testResult}</Label>
                <Input id="ub-result" placeholder={t.updateBatch.testResultPh} value={result} onChange={(e) => setResult(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ub-notes">{t.updateBatch.notes}</Label>
                <Input id="ub-notes" placeholder={t.updateBatch.labPh} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}

          {eventType === "TRANSFER" && (
            <div className="space-y-2">
              <Label htmlFor="ub-owner">{t.updateBatch.newOwner}</Label>
              <Input id="ub-owner" placeholder={t.updateBatch.newOwnerPh} value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t.updateBatch.ownerHint}</p>
            </div>
          )}

          {eventType === "PACKAGE" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ub-loc">{t.updateBatch.packLoc}</Label>
                <Input id="ub-loc" placeholder={t.updateBatch.packLocPh} value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ub-pnotes">{t.updateBatch.notes}</Label>
                <Input id="ub-pnotes" placeholder={t.updateBatch.jarPh} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}

          {eventType === "SALE" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ub-price">{t.updateBatch.price}</Label>
                <Input id="ub-price" type="number" inputMode="decimal" min={0} step="0.01" placeholder="1200" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ub-sowner">{t.updateBatch.buyer}</Label>
                <Input id="ub-sowner" placeholder={t.updateBatch.buyerPh} value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ub-snotes">{t.updateBatch.notes}</Label>
                <Input id="ub-snotes" placeholder={t.updateBatch.saleNotesPh} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}

          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t.updateBatch.cancel}</Button>
            <Button type="submit" disabled={saving}>{saving ? t.updateBatch.saving : t.updateBatch.addEvent}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
