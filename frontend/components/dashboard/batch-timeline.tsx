"use client"

import * as React from "react"
import { Package, FlaskConical, Truck, ShoppingCart, Sprout, ChevronDown } from "lucide-react"
import type { LedgerBlock } from "@/lib/api/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EVENT_META: Record<string, { label: string; icon: React.ElementType }> = {
  HARVEST: { label: "Harvest", icon: Sprout },
  QUALITY_TEST: { label: "Quality Test", icon: FlaskConical },
  TRANSFER: { label: "Transfer", icon: Truck },
  PACKAGE: { label: "Package", icon: Package },
  SALE: { label: "Sale", icon: ShoppingCart },
}

function formatTs(ts?: string | null) {
  if (!ts) return "—"
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString()
}

function payloadSummary(payload?: Record<string, any>): string | null {
  if (!payload || Object.keys(payload).length === 0) return null
  const preferred = ["quantity_kg", "honey_type", "apiary_location", "moisture_pct", "purity_score", "result", "new_owner", "price", "notes", "location"]
  for (const k of preferred) {
    if (payload[k] !== undefined && payload[k] !== null && payload[k] !== "") {
      return `${k.replace(/_/g, " ")}: ${String(payload[k])}`
    }
  }
  const [k, v] = Object.entries(payload)[0]
  return `${k.replace(/_/g, " ")}: ${String(v)}`
}

export function BatchTimeline({ events }: { events: LedgerBlock[] }) {
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({})
  const sorted = React.useMemo(
    () => [...(events ?? [])].sort((a, b) => a.index - b.index),
    [events]
  )

  if (!sorted.length) {
    return <p className="text-sm text-muted-foreground">No traceability events yet.</p>
  }

  return (
    <ol className="relative ml-2 space-y-0 border-l pl-0">
      {sorted.map((block, idx) => {
        const meta = EVENT_META[block.event_type] ?? { label: block.event_type.replace(/_/g, " "), icon: Package }
        const Icon = meta.icon
        const isLast = idx === sorted.length - 1
        const isOpen = Boolean(expanded[block.index])
        const summary = payloadSummary(block.payload)
        return (
          <li key={block.index} className={cn("relative pl-10", !isLast && "pb-8")}>
            <span className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background">
              <Icon className="h-4 w-4 text-primary" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold capitalize">{meta.label}</h4>
              <Badge variant="outline" className="text-[11px]">Event {block.index}</Badge>
              <span className="text-xs text-muted-foreground">{formatTs(block.timestamp_str)}</span>
            </div>
            {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
            {block.payload && Object.keys(block.payload).length > 0 && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setExpanded((p) => ({ ...p, [block.index]: !p[block.index] }))}
                >
                  {isOpen ? "Hide" : "View"} traceability record
                  <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", isOpen && "rotate-180")} />
                </Button>
                {isOpen && (
                  <div className="mt-2 space-y-1 rounded-md border bg-muted/40 p-3 text-xs">
                    {Object.entries(block.payload).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="min-w-28 font-medium">{k.replace(/_/g, " ")}:</span>
                        <span className="break-all text-muted-foreground">{String(v)}</span>
                      </div>
                    ))}
                    <details className="pt-1">
                      <summary className="cursor-pointer font-medium">Ledger details (advanced)</summary>
                      <div className="mt-1 space-y-1 font-mono text-[11px] text-muted-foreground">
                        <div className="break-all">hash: {block.hash}</div>
                        <div className="break-all">prev: {block.prev_hash}</div>
                        <div>nonce: {block.nonce}</div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
