import { Badge } from "@/components/ui/badge"
import { shortId } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export function HealthBadge({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return <Badge variant="secondary" className={className}>Unknown</Badge>
  if (status === "HEALTHY")
    return <Badge className={cn("bg-emerald-600 text-white hover:bg-emerald-600/90 border-transparent", className)}>HEALTHY</Badge>
  if (status === "WATCH")
    return <Badge className={cn("bg-amber-500 text-black hover:bg-amber-500/90 border-transparent", className)}>WATCH</Badge>
  if (status === "HIGH_RISK")
    return <Badge variant="destructive" className={className}>HIGH_RISK</Badge>
  return <Badge variant="secondary" className={className}>{status}</Badge>
}

export function PurityBadge({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return <Badge variant="secondary" className={className}>—</Badge>
  if (status === "PASS")
    return <Badge className={cn("bg-emerald-600 text-white hover:bg-emerald-600/90 border-transparent", className)}>PASS</Badge>
  if (status === "CAUTION")
    return <Badge className={cn("bg-amber-500 text-black hover:bg-amber-500/90 border-transparent", className)}>CAUTION</Badge>
  if (status === "REJECT") return <Badge variant="destructive" className={className}>REJECT</Badge>
  return <Badge variant="outline" className={className}>{status}</Badge>
}

export function BatchStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return <Badge variant="secondary" className={className}>—</Badge>
  const normalized = status.toUpperCase()
  if (normalized === "SOLD") return <Badge className={cn("bg-emerald-600 text-white border-transparent", className)}>{status}</Badge>
  if (normalized === "PACKAGED" || normalized === "TRANSFERRED" || normalized === "QUALITY_TEST")
    return <Badge variant="secondary" className={className}>{status}</Badge>
  return <Badge variant="outline" className={className}>{status}</Badge>
}

export function VerifyBadge({ badge, className }: { badge?: string | null; className?: string }) {
  if (badge === "VERIFIED")
    return <Badge className={cn("bg-emerald-600 text-white hover:bg-emerald-600/90 border-transparent", className)}>VERIFIED</Badge>
  if (badge === "TAMPERED") return <Badge variant="destructive" className={className}>TAMPERED</Badge>
  return <Badge variant="secondary" className={className}>{badge ?? "—"}</Badge>
}

export function ShortBatchId({ id, className }: { id: string; className?: string }) {
  return (
    <span className={cn("font-mono font-semibold", className)} title={id}>
      {shortId(id)}
    </span>
  )
}
