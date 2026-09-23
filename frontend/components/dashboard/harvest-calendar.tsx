"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Batch } from "@/lib/api/types"
import { shortId } from "@/lib/api/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function HarvestCalendar({
  batches,
  loading,
}: {
  batches: Batch[]
  loading?: boolean
}) {
  const today = React.useMemo(() => new Date(), [])
  const [cursor, setCursor] = React.useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = React.useState<string>(() => dayKey(new Date()))

  const byDay = React.useMemo(() => {
    const map: Record<string, Batch[]> = {}
    batches.forEach((b) => {
      const d = new Date(b.harvest_date)
      if (isNaN(d.getTime())) return
      const k = dayKey(d)
      if (!map[k]) map[k] = []
      map[k].push(b)
    })
    return map
  }, [batches])

  const cells = React.useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    // Monday-first offset: JS getDay() 0=Sun..6=Sat -> offset (day+6)%7
    const offset = (first.getDay() + 6) % 7
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const list: (Date | null)[] = []
    for (let i = 0; i < offset; i++) list.push(null)
    for (let d = 1; d <= daysInMonth; d++) list.push(new Date(cursor.year, cursor.month, d))
    return list
  }, [cursor])

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })

  const selectedBatches = byDay[selected] ?? []
  const harvestDaysThisMonth = cells.filter((d) => d && byDay[dayKey(d)]).length
  const totalQtySelected = selectedBatches.reduce((s, b) => s + (Number(b.quantity_kg) || 0), 0)

  const go = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Harvest Calendar</CardTitle>
          <CardDescription>
            Days you created harvest batches. Select a day to see what was harvested.
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => go(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">{monthLabel}</span>
          <Button variant="ghost" size="icon" onClick={() => go(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-1"
            onClick={() => {
              setCursor({ year: today.getFullYear(), month: today.getMonth() })
              setSelected(dayKey(today))
            }}
          >
            Today
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : batches.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No harvest batches yet — the calendar will mark each day you add a batch.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Month grid */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => {
                  if (!date) return <div key={`blank-${i}`} />
                  const k = dayKey(date)
                  const dayBatches = byDay[k] ?? []
                  const has = dayBatches.length > 0
                  const isToday = k === dayKey(today)
                  const isSelected = k === selected
                  const dayQty = dayBatches.reduce((s, b) => s + (Number(b.quantity_kg) || 0), 0)
                  return (
                    <button
                      key={k}
                      onClick={() => setSelected(k)}
                      title={has ? `${dayBatches.length} batch(es), ${dayQty.toFixed(1)} kg` : "No batches"}
                      className={cn(
                        "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md border p-1 text-sm transition-colors sm:min-h-14",
                        isSelected
                          ? "border-primary bg-primary/10 font-semibold"
                          : "hover:bg-muted/60",
                        isToday && !isSelected && "border-primary/50"
                      )}
                    >
                      <span className={cn(isToday && "font-bold text-primary")}>{date.getDate()}</span>
                      {has ? (
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {dayBatches.length} • {dayQty.toFixed(0)}kg
                          </span>
                        </span>
                      ) : (
                        <span className="h-3" />
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Harvest day
                </span>
                <span>{harvestDaysThisMonth} harvest day(s) in {monthLabel}</span>
              </div>
            </div>
            {/* Selected day detail */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {parseDayKey(selected).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {selectedBatches.length > 0 && (
                    <Badge variant="secondary">
                      {selectedBatches.length} batch(es) • {totalQtySelected.toFixed(1)} kg
                    </Badge>
                  )}
                </div>
                {selectedBatches.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No harvest batches on this day.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {selectedBatches.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm">
                        <div className="min-w-0">
                          <span className="font-mono font-semibold" title={b.id}>{shortId(b.id)}</span>
                          <span className="ml-2 truncate text-muted-foreground">
                            {b.honey_type} • {b.quantity_kg} kg
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" asChild className="shrink-0">
                          <Link href={`/dashboard/batches/${b.id}`}>Open</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
