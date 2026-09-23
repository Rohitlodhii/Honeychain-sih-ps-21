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
    })
    setErrors(errs)
    if (!payload) return
    setSaving(true)
    try {
      const res = await api.batches.create(payload)
      setCreated(res.data)
      toast.success("Harvest batch created")
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
              <DialogTitle>Create Harvest Batch</DialogTitle>
              <DialogDescription>
                Register a harvested honey lot. Purity screening and the harvest traceability record are created automatically.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label>Hive</Label>
                <Select value={hiveId} onValueChange={setHiveId}>
                  <SelectTrigger><SelectValue placeholder="Select a hive" /></SelectTrigger>
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
                  <Label htmlFor="cb-type">Honey Type</Label>
                  <Input id="cb-type" placeholder="Wildflower" value={honeyType} onChange={(e) => setHoneyType(e.target.value)} />
                  {errors.honeyType && <p className="text-xs text-destructive">{errors.honeyType}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cb-qty">Quantity (kg)</Label>
                  <Input id="cb-qty" type="number" inputMode="decimal" step="0.1" min={0} placeholder="25" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb-loc">Apiary Location</Label>
                <Input id="cb-loc" placeholder="Village, District" value={location} onChange={(e) => setLocation(e.target.value)} />
                {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb-moist">Moisture (%)</Label>
                <Input id="cb-moist" type="number" inputMode="decimal" step="0.1" min={0} max={100} placeholder="18" value={moisture} onChange={(e) => setMoisture(e.target.value)} />
                {errors.moisture && <p className="text-xs text-destructive">{errors.moisture}</p>}
                <p className="text-xs text-muted-foreground">Purity screening uses the BIS/Codex threshold of ≤ 20% moisture. This is a screening check, not a laboratory certification.</p>
              </div>
              {submitError && (
                <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create Batch"}</Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Harvest batch created</DialogTitle>
              <DialogDescription>Your honey lot is registered with an initial harvest traceability record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Batch ID</span>
                <span className="font-mono font-semibold" title={created.batch_id}>{shortId(created.batch_id)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Purity Score</span>
                <span className="font-semibold">{created.purity_score}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Purity Screening</span>
                <PurityBadge status={created.purity_status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium">{created.status}</span>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" asChild>
                <Link href={`/verify/${created.batch_id}`} target="_blank">View Verification</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/batches/${created.batch_id}`}>Open Batch</Link>
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
