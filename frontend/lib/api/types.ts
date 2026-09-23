export interface User {
  id: string
  name: string
  phone: string
  email?: string | null
  role: string
  cluster?: string | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export type HealthStatus = 'HEALTHY' | 'WATCH' | 'HIGH_RISK'

export interface Hive {
  id: string
  name: string
  location: string
  species: string
  latitude?: number | null
  longitude?: number | null
  created_at: string
}

export interface SensorReading {
  id: string
  hive_id: string
  temperature_c: number
  humidity_pct: number
  weight_kg: number
  sound_hz?: number | null
  recorded_at: string
}

export interface HiveHealth {
  status: HealthStatus
  confidence: number
  reasons: string[]
  metrics: Record<string, any>
}

export interface Productivity {
  yield_estimate_kg: number
  trend: string
  confidence: number
  next_harvest_days?: number | null
  recommendation: string
}

export interface HiveHealthResponse {
  hive_id: string
  health: HiveHealth
  productivity: Productivity
  latest_reading?: SensorReading | null
}

export type PurityStatus = 'PASS' | 'CAUTION' | 'REJECT'

export interface Batch {
  id: string
  beekeeper_id: string
  hive_id: string
  honey_type: string
  quantity_kg: number
  harvest_date: string
  apiary_location: string
  moisture_pct?: number | null
  purity_score?: number | null
  status: string
  current_owner: string
  created_at: string
}

export interface BatchCreateResponse {
  batch_id: string
  status: string
  verify_url: string
  purity_score: number
  purity_status: PurityStatus | string
}

export type BatchEventType = 'QUALITY_TEST' | 'TRANSFER' | 'PACKAGE' | 'SALE'

export interface LedgerBlock {
  index: number
  batch_id: string
  event_type: string
  payload: Record<string, any>
  actor: string
  timestamp_str: string
  prev_hash: string
  hash: string
  nonce: number
}

export interface BatchEventResponse {
  batch_id: string
  status: string
  event: LedgerBlock
}

export interface ChainVerification {
  valid: boolean
  errors: string[]
  first_tampering_at_index?: number | null
  total_blocks: number
}

export interface VerifyBatchResponse {
  batch_id: string
  beekeeper_name: string
  beekeeper_cluster?: string | null
  honey_type: string
  quantity_kg: number
  harvest_date: string
  apiary_location: string
  moisture_pct?: number | null
  purity_score?: number | null
  status: string
  ledger_timeline: LedgerBlock[]
  chain_verification: ChainVerification
  authenticity_badge: 'VERIFIED' | 'TAMPERED' | string
  transfer_count: number
  direct_trade: boolean
}

/** Short display ID like #8F3A21 — full UUID retained internally. */
export function shortId(id: string): string {
  if (!id) return '—'
  const hex = id.replace(/-/g, '')
  return `#${hex.slice(0, 6).toUpperCase()}`
}

export function shortBatchId(id: string): string {
  return shortId(id)
}
