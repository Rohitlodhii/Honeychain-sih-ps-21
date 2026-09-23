"use client"

import * as React from "react"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import { validateReadingForm } from "@/lib/farmer-forms"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"

export function RecordReadingDialog({
  open,
  onOpenChange,
  hiveId,
  hiveName,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  hiveId: string
  hiveName?: string
  onSuccess?: () => void
}) {
  const [temp, setTemp] = React.useState("")
  const [humidity, setHumidity] = React.useState("")
  const [weight, setWeight] = React.useState("")
  const [sound, setSound] = React.useState("")
  const [recordedAt, setRecordedAt] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const { t, locale } = useI18n()

  const reset = () => {
    setTemp("")
    setHumidity("")
    setWeight("")
    setSound("")
    setRecordedAt("")
    setErrors({})
    setSubmitError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const { errors: errs, payload } = validateReadingForm({
      temperature: temp,
      humidity,
      weight,
      sound,
    }, locale)
    setErrors(errs)
    if (!payload) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { ...payload }
      if (recordedAt) {
        const d = new Date(recordedAt)
        if (!isNaN(d.getTime())) body.recorded_at = d.toISOString()
      }
      await api.hives.createReading(hiveId, body as any)
      toast.success(t.recordReading.savedToast)
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
          <DialogTitle>{t.recordReading.titlePrefix}{hiveName ? ` — ${hiveName}` : ""}</DialogTitle>
          <DialogDescription>
            {t.recordReading.desc}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rr-temp">{t.recordReading.temp}</Label>
              <Input id="rr-temp" type="number" inputMode="decimal" step="0.1" placeholder="34.5" value={temp} onChange={(e) => setTemp(e.target.value)} aria-invalid={Boolean(errors.temperature)} />
              {errors.temperature && <p className="text-xs text-destructive">{errors.temperature}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rr-hum">{t.recordReading.hum}</Label>
              <Input id="rr-hum" type="number" inputMode="decimal" step="0.1" min={0} max={100} placeholder="58" value={humidity} onChange={(e) => setHumidity(e.target.value)} aria-invalid={Boolean(errors.humidity)} />
              {errors.humidity && <p className="text-xs text-destructive">{errors.humidity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rr-weight">{t.recordReading.weight}</Label>
              <Input id="rr-weight" type="number" inputMode="decimal" step="0.1" min={0} placeholder="25" value={weight} onChange={(e) => setWeight(e.target.value)} aria-invalid={Boolean(errors.weight)} />
              {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rr-sound">{t.recordReading.sound}</Label>
              <Input id="rr-sound" type="number" inputMode="decimal" step="1" min={0} placeholder="220" value={sound} onChange={(e) => setSound(e.target.value)} aria-invalid={Boolean(errors.sound)} />
              {errors.sound && <p className="text-xs text-destructive">{errors.sound}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-at">{t.recordReading.recordedAt}</Label>
            <Input id="rr-at" type="datetime-local" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
          </div>
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t.recordReading.cancel}
            </Button>
            <Button type="submit" disabled={saving || !hiveId}>
              {saving ? t.recordReading.saving : t.recordReading.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
