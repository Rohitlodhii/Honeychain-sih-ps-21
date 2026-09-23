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

const EVENT_OPTIONS: { value: BatchEventType; label: string }[] = [
  { value: "QUALITY_TEST", label: "Quality Test" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "PACKAGE", label: "Package" },
  { value: "SALE", label: "Sale" },
]

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
        setSubmitError("New owner is required for a transfer.")
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
          setSubmitError("Price must be a non-negative number.")
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
      toast.success(`${eventType.replace("_", " ").toLowerCase()} record added`)
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
          <DialogTitle>Update Batch</DialogTitle>
          <DialogDescription>Add a new traceability event to this honey batch.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Event Type</Label>
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
                <Label htmlFor="ub-result">Test Result (optional)</Label>
                <Input id="ub-result" placeholder="e.g. PASS, moisture 18.2%" value={result} onChange={(e) => setResult(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ub-notes">Notes (optional)</Label>
                <Input id="ub-notes" placeholder="Lab or field observations" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}

          {eventType === "TRANSFER" && (
            <div className="space-y-2">
              <Label htmlFor="ub-owner">New Owner</Label>
              <Input id="ub-owner" placeholder="Buyer / cooperative name" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
              <p className="text-xs text-muted-foreground">The batch current owner is updated from this field.</p>
            </div>
          )}

          {eventType === "PACKAGE" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ub-loc">Packaging Location (optional)</Label>
                <Input id="ub-loc" placeholder="Packing unit" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ub-pnotes">Notes (optional)</Label>
                <Input id="ub-pnotes" placeholder="Jar size, lot notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}

          {eventType === "SALE" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ub-price">Price (optional)</Label>
                <Input id="ub-price" type="number" inputMode="decimal" min={0} step="0.01" placeholder="1200" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ub-sowner">Buyer (optional)</Label>
                <Input id="ub-sowner" placeholder="Buyer name" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ub-snotes">Notes (optional)</Label>
                <Input id="ub-snotes" placeholder="Sale notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </>
          )}

          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
