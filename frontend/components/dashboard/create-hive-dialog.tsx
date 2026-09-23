"use client"

import * as React from "react"
import { api } from "@/lib/api"
import { normalizeError } from "@/lib/api/client"
import type { Hive } from "@/lib/api/types"
import { HIVE_SPECIES_OPTIONS, isHiveSpecies, validateHiveForm, type HiveSpecies } from "@/lib/farmer-forms"
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

const SPECIES_LABEL: Record<string, string> = {
  apis_mellifera: "Apis Mellifera",
  apis_cerana: "Apis Cerana",
  apis_dorsata: "Apis Dorsata",
  apis_florea: "Apis Florea",
}

export function CreateHiveDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (hive: Hive) => void
}) {
  const [name, setName] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [species, setSpecies] = React.useState<HiveSpecies>("apis_mellifera")
  const [latitude, setLatitude] = React.useState("")
  const [longitude, setLongitude] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const { t, locale } = useI18n()

  const reset = () => {
    setName("")
    setLocation("")
    setSpecies("apis_mellifera")
    setLatitude("")
    setLongitude("")
    setErrors({})
    setSubmitError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const { errors: errs, payload } = validateHiveForm({ name, location, species }, locale)
    const nextErrors: Record<string, string> = { ...errs }
    let lat: number | null | undefined = undefined
    let lng: number | null | undefined = undefined
    if (latitude.trim() !== "") {
      const v = Number(latitude.trim())
      if (!Number.isFinite(v) || v < -90 || v > 90) nextErrors.latitude = t.createHive.latErr
      else lat = v
    }
    if (longitude.trim() !== "") {
      const v = Number(longitude.trim())
      if (!Number.isFinite(v) || v < -180 || v > 180) nextErrors.longitude = t.createHive.lngErr
      else lng = v
    }
    setErrors(nextErrors)
    if (!payload || Object.keys(nextErrors).length > 0) return
    setSaving(true)
    try {
      const res = await api.hives.create({
        ...payload,
        ...(lat !== undefined ? { latitude: lat } : {}),
        ...(lng !== undefined ? { longitude: lng } : {}),
      })
      toast.success(t.createHive.addedToast(res.data.name))
      reset()
      onOpenChange(false)
      onCreated?.(res.data)
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
          <DialogTitle>{t.createHive.title}</DialogTitle>
          <DialogDescription>{t.createHive.desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="ch-name">{t.createHive.name}</Label>
            <Input id="ch-name" placeholder={t.createHive.namePh} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-loc">{t.createHive.location}</Label>
            <Input id="ch-loc" placeholder={t.createHive.locationPh} value={location} onChange={(e) => setLocation(e.target.value)} aria-invalid={Boolean(errors.location)} />
            {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t.createHive.species}</Label>
            <Select value={species} onValueChange={(v) => { if (isHiveSpecies(v)) setSpecies(v) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HIVE_SPECIES_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{SPECIES_LABEL[s] ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.species && <p className="text-xs text-destructive">{errors.species}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ch-lat">{t.createHive.lat}</Label>
              <Input id="ch-lat" type="number" inputMode="decimal" step="any" placeholder={t.createHive.latPh} value={latitude} onChange={(e) => setLatitude(e.target.value)} />
              {errors.latitude && <p className="text-xs text-destructive">{errors.latitude}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-lng">{t.createHive.lng}</Label>
              <Input id="ch-lng" type="number" inputMode="decimal" step="any" placeholder={t.createHive.lngPh} value={longitude} onChange={(e) => setLongitude(e.target.value)} />
              {errors.longitude && <p className="text-xs text-destructive">{errors.longitude}</p>}
            </div>
          </div>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t.createHive.cancel}</Button>
            <Button type="submit" disabled={saving}>{saving ? t.createHive.adding : t.createHive.add}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
