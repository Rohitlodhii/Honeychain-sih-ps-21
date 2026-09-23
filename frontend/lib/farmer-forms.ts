/**
 * Farmer dashboard form contracts.
 *
 * Single source of truth on the frontend that mirrors the backend:
 * - backend/app/schemas.py  (HiveCreateRequest, SensorReadingCreateRequest, BatchCreateRequest)
 * - backend/app/main.py      (extra 422 checks: quantity_kg > 0, non-blank strings)
 * - backend/app/config.py    (ApicultureThresholds — used only as UI hints, NOT hard limits)
 *
 * Pattern: controlled inputs keep the raw `string` (so typing/deleting works),
 * but every submit path parses to a `number` and validates BEFORE calling the API.
 * This guarantees the JSON body always carries the type the backend declared
 * (number vs string vs null) and never NaN / '' / undefined.
 *
 * All validators accept a `locale` ('en' | 'hi' | 'mr') so error messages are
 * localised via lib/i18n/dictionaries. Callers pass the locale from useI18n().
 */

import { dictionaries, type Locale } from './i18n/dictionaries'

// ---------------------------------------------------------------------------
// Payload types — field-for-field compatible with backend Pydantic schemas
// ---------------------------------------------------------------------------

export type HiveSpecies =
  | 'apis_mellifera'
  | 'apis_cerana'
  | 'apis_dorsata'
  | 'apis_florea'

export const HIVE_SPECIES_OPTIONS: readonly HiveSpecies[] = [
  'apis_mellifera',
  'apis_cerana',
  'apis_dorsata',
  'apis_florea',
] as const

export function isHiveSpecies(value: string): value is HiveSpecies {
  return (HIVE_SPECIES_OPTIONS as readonly string[]).includes(value)
}

/** Mirrors HiveCreateRequest. latitude/longitude stay optional. */
export interface HiveCreatePayload {
  name: string
  location: string
  species: HiveSpecies
  latitude?: number | null
  longitude?: number | null
}

/** Mirrors SensorReadingCreateRequest. sound_hz is the only optional field. */
export interface SensorReadingPayload {
  temperature_c: number
  humidity_pct: number
  weight_kg: number
  sound_hz?: number | null
}

/** Mirrors BatchCreateRequest. hive_id is required in the UI (backend can
 *  infer it for single-hive owners, but the dashboard always sends it). */
export interface BatchCreatePayload {
  hive_id: string
  honey_type: string
  quantity_kg: number
  apiary_location: string
  moisture_pct: number
}

// ---------------------------------------------------------------------------
// Limits — hard limits mirror backend Field(ge/le) + main.py 422 checks.
// Hints mirror ApicultureThresholds for UX only.
// ---------------------------------------------------------------------------

export const FIELD_LIMITS = {
  hiveName: { minLength: 1, maxLength: 100 },
  hiveLocation: { minLength: 1, maxLength: 200 },
  honeyType: { minLength: 1, maxLength: 100 },
  apiaryLocation: { minLength: 1, maxLength: 200 },
  // Backend: temperature_c is a bare float (no ge/le). Clamp to a physically
  // plausible sensor envelope so typos like 345 don't reach the API.
  temperatureC: { min: -10, max: 50, step: 0.1 },
  // Backend: Field(ge=0, le=100)
  humidityPct: { min: 0, max: 100, step: 0.1 },
  // Backend: Field(ge=0). Upper bound is a UI guard for typos, not backend.
  weightKg: { min: 0, max: 500, step: 0.1 },
  // Backend: Field(ge=0). Healthy band 180-260 Hz is a hint only.
  soundHz: { min: 0, max: 2000, step: 1 },
  // Backend main.py: quantity_kg must be > 0 (422 otherwise).
  quantityKg: { minExclusive: 0, max: 1000, step: 0.1 },
  // Backend: Field(ge=0, le=100). BIS/Codex compliance (<=20%) is a hint.
  moisturePct: { min: 0, max: 100, step: 0.1 },
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 },
} as const

/** Optimal-band hints from backend/app/config.py ApicultureThresholds. */
export const APIARY_HINTS = {
  temperatureC: 'Optimal brood nest 33–36 °C',
  humidityPct: 'Optimal 50–65 %',
  soundHz: 'Healthy worker-bee signature 180–260 Hz (optional)',
  weightKg: 'Total hive weight in kg',
  moisturePct: 'BIS/Codex compliant ≤ 20 %',
} as const

// ---------------------------------------------------------------------------
// Parsing helpers — raw string -> number | null (never NaN)
// ---------------------------------------------------------------------------

/** Parse a controlled-input string strictly. Returns null for '', whitespace,
 *  or anything that is not a finite number (never returns NaN). */
export function parseNumberInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return value
}

/** Trim + collapse internal whitespace for text payloads. */
export function cleanText(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

// ---------------------------------------------------------------------------
// Field validators — each returns an error message or null when valid.
// Messages match backend 422 wording where the backend has an explicit check.
// ---------------------------------------------------------------------------

export function validateRequiredText(
  raw: string,
  fieldLabel: string,
  maxLength: number,
  locale: Locale = 'en',
): string | null {
  const v = dictionaries[locale].validation
  const value = cleanText(raw)
  if (value.length === 0) return v.required(fieldLabel)
  if (value.length > maxLength)
    return v.maxChars(fieldLabel, maxLength)
  return null
}

export function validateRequiredNumber(
  raw: string,
  fieldLabel: string,
  opts: { min?: number; max?: number; minExclusive?: number },
  locale: Locale = 'en',
): string | null {
  const v = dictionaries[locale].validation
  const value = parseNumberInput(raw)
  if (value === null) return v.mustBeNumber(fieldLabel)
  if (opts.min !== undefined && value < opts.min)
    return v.minVal(fieldLabel, opts.min)
  if (opts.max !== undefined && value > opts.max)
    return v.maxVal(fieldLabel, opts.max)
  if (opts.minExclusive !== undefined && value <= opts.minExclusive)
    return v.greaterThan(fieldLabel, opts.minExclusive)
  return null
}

export function validateOptionalNumber(
  raw: string,
  fieldLabel: string,
  opts: { min?: number; max?: number },
  locale: Locale = 'en',
): string | null {
  if (raw.trim() === '') return null // empty = omitted (sent as null/omitted)
  return validateRequiredNumber(raw, fieldLabel, opts, locale)
}

// ---------------------------------------------------------------------------
// Form-level validators — return per-field errors + typed payload when valid
// ---------------------------------------------------------------------------

export type FormErrors<T extends string> = Partial<Record<T, string>>

export function validateHiveForm(input: {
  name: string
  location: string
  species: string
}, locale: Locale = 'en'): {
  errors: FormErrors<'name' | 'location' | 'species'>
  payload: HiveCreatePayload | null
} {
  const v = dictionaries[locale].validation
  const errors: FormErrors<'name' | 'location' | 'species'> = {}
  const nameErr = validateRequiredText(
    input.name,
    v.hiveName,
    FIELD_LIMITS.hiveName.maxLength,
    locale,
  )
  if (nameErr) errors.name = nameErr
  const locErr = validateRequiredText(
    input.location,
    v.location,
    FIELD_LIMITS.hiveLocation.maxLength,
    locale,
  )
  if (locErr) errors.location = locErr
  if (!isHiveSpecies(input.species))
    errors.species = v.speciesErr

  if (Object.keys(errors).length > 0) return { errors, payload: null }
  return {
    errors,
    payload: {
      name: cleanText(input.name),
      location: cleanText(input.location),
      species: input.species as HiveSpecies,
    },
  }
}

export function validateReadingForm(input: {
  temperature: string
  humidity: string
  weight: string
  sound: string
}, locale: Locale = 'en'): {
  errors: FormErrors<'temperature' | 'humidity' | 'weight' | 'sound'>
  payload: SensorReadingPayload | null
} {
  const v = dictionaries[locale].validation
  const errors: FormErrors<'temperature' | 'humidity' | 'weight' | 'sound'> =
    {}
  const tErr = validateRequiredNumber(input.temperature, v.temperature, {
    min: FIELD_LIMITS.temperatureC.min,
    max: FIELD_LIMITS.temperatureC.max,
  }, locale)
  if (tErr) errors.temperature = tErr
  const hErr = validateRequiredNumber(input.humidity, v.humidity, {
    min: FIELD_LIMITS.humidityPct.min,
    max: FIELD_LIMITS.humidityPct.max,
  }, locale)
  if (hErr) errors.humidity = hErr
  const wErr = validateRequiredNumber(input.weight, v.weight, {
    min: FIELD_LIMITS.weightKg.min,
    max: FIELD_LIMITS.weightKg.max,
  }, locale)
  if (wErr) errors.weight = wErr
  const sErr = validateOptionalNumber(input.sound, v.sound, {
    min: FIELD_LIMITS.soundHz.min,
    max: FIELD_LIMITS.soundHz.max,
  }, locale)
  if (sErr) errors.sound = sErr

  if (Object.keys(errors).length > 0) return { errors, payload: null }
  const sound = parseNumberInput(input.sound)
  return {
    errors,
    payload: {
      // parseNumberInput already returned non-null (validators passed)
      temperature_c: parseNumberInput(input.temperature) as number,
      humidity_pct: parseNumberInput(input.humidity) as number,
      weight_kg: parseNumberInput(input.weight) as number,
      sound_hz: sound, // null when left blank -> backend Optional[float]
    },
  }
}

export function validateBatchForm(input: {
  hiveId: string
  honeyType: string
  quantity: string
  location: string
  moisture: string
  ownedHiveIds: readonly string[]
}, locale: Locale = 'en'): {
  errors: FormErrors<'hiveId' | 'honeyType' | 'quantity' | 'location' | 'moisture'>
  payload: BatchCreatePayload | null
} {
  const v = dictionaries[locale].validation
  const errors: FormErrors<
    'hiveId' | 'honeyType' | 'quantity' | 'location' | 'moisture'
  > = {}
  const hiveId = input.hiveId.trim()
  if (hiveId === '') {
    errors.hiveId = v.selectHive
  } else if (
    input.ownedHiveIds.length > 0 &&
    !input.ownedHiveIds.includes(hiveId)
  ) {
    errors.hiveId = v.hiveNotYours
  }
  const typeErr = validateRequiredText(
    input.honeyType,
    v.honeyType,
    FIELD_LIMITS.honeyType.maxLength,
    locale,
  )
  if (typeErr) errors.honeyType = typeErr
  // Mirrors main.py: "quantity_kg must be greater than 0"
  const qtyErr = validateRequiredNumber(input.quantity, v.quantity, {
    minExclusive: FIELD_LIMITS.quantityKg.minExclusive,
    max: FIELD_LIMITS.quantityKg.max,
  }, locale)
  if (qtyErr) errors.quantity = qtyErr
  const locErr = validateRequiredText(
    input.location,
    v.apiaryLocation,
    FIELD_LIMITS.apiaryLocation.maxLength,
    locale,
  )
  if (locErr) errors.location = locErr
  const moistErr = validateRequiredNumber(input.moisture, v.moisture, {
    min: FIELD_LIMITS.moisturePct.min,
    max: FIELD_LIMITS.moisturePct.max,
  }, locale)
  if (moistErr) errors.moisture = moistErr

  if (Object.keys(errors).length > 0) return { errors, payload: null }
  return {
    errors,
    payload: {
      hive_id: hiveId,
      honey_type: cleanText(input.honeyType),
      quantity_kg: parseNumberInput(input.quantity) as number,
      apiary_location: cleanText(input.location),
      moisture_pct: parseNumberInput(input.moisture) as number,
    },
  }
}
