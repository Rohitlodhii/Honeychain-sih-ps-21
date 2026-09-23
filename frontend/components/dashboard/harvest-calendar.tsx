"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Batch } from "@/lib/api/types"
import { shortId } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AddHarvestButton } from "./add-harvest-button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function shortRange(d: Date, tag: string) {
  return d.toLocaleDateString(tag, { month: "short", day: "numeric", year: "numeric" })
}

// Sunday-first, like a wall calendar.

const MAX_PILLS = 2

export function HarvestCalendar({
  batches,
  loading,
}: {
  batches: Batch[]
  loading?: boolean
}) {
  const { t, tag } = useI18n()
  const WEEKDAYS = t.calendar.weekdays
  const today = React.useMemo(() => new Date(), [])
  const [cursor, setCursor] = React.useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = React.useState<string>(() => dayKey(new Date()))
  const [view, setView] = React.useState<"month" | "agenda">("month")

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

  // Full weeks covering the month, including dimmed adjacent-month days.
  const gridDays = React.useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const offset = first.getDay() // 0 = Sunday
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const total = Math.ceil((offset + daysInMonth) / 7) * 7
    return Array.from(
      { length: total },
      (_, i) => new Date(cursor.year, cursor.month, 1 - offset + i)
    )
  }, [cursor])

  const monthStart = new Date(cursor.year, cursor.month, 1)
  const monthEnd = new Date(cursor.year, cursor.month + 1, 0)
  const monthLabel = monthStart.toLocaleDateString(tag, { month: "long", year: "numeric" })

  const selectedDate = parseDayKey(selected)
  const selectedMonthFirstDow = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  ).getDay()
  const selectedWeek = Math.floor((selectedMonthFirstDow + selectedDate.getDate() - 1) / 7) + 1

  const selectedBatches = byDay[selected] ?? []
  const totalQtySelected = selectedBatches.reduce((s, b) => s + (Number(b.quantity_kg) || 0), 0)

  const agendaDays = React.useMemo(
    () =>
      Object.entries(byDay)
        .filter(([k]) => {
          const d = parseDayKey(k)
          return d.getFullYear() === cursor.year && d.getMonth() === cursor.month
        })
        .sort(([a], [b]) => (a < b ? -1 : 1)),
    [byDay, cursor]
  )

  const go = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() })
    setSelected(dayKey(today))
  }

  return (
    <Card className="overflow-hidden">
      {/* Title area */}
      <div className="bg-secondary px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border bg-background">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {today.toLocaleDateString(tag, { month: "short" })}
            </span>
            <span className="text-xl font-bold leading-none text-primary">{today.getDate()}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{monthLabel}</h2>
              <Badge variant="outline" className="text-[11px]">{t.calendar.weekPrefix} {selectedWeek}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {shortRange(monthStart, tag)} – {shortRange(monthEnd, tag)}
            </p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-md border">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => go(-1)} aria-label={t.calendar.prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 rounded-none border-x px-3" onClick={goToday}>
              {t.calendar.today}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => go(1)} aria-label={t.calendar.nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select value={view} onValueChange={(v) => setView(v as "month" | "agenda")}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t.calendar.monthView}</SelectItem>
              <SelectItem value="agenda">{t.calendar.agendaView}</SelectItem>
            </SelectContent>
          </Select>
          <AddHarvestButton label={t.calendar.addHarvest} size="sm" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4">
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <div>

          {view === "month" ? (
            <div>
              <div className="border-t">
                <div className="grid grid-cols-7 divide-x border-b bg-muted/40">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="py-2 text-center text-xs font-medium text-muted-foreground">{w}</div>
                  ))}
                </div>
                {Array.from({ length: gridDays.length / 7 }, (_, week) => (
                  <div
                    key={week}
                    className="grid grid-cols-7 divide-x border-b last:border-b-0"
                  >
                    {gridDays.slice(week * 7, week * 7 + 7).map((date) => {
                      const k = dayKey(date)
                      const dayBatches = byDay[k] ?? []
                      const has = dayBatches.length > 0
                      const isToday = k === dayKey(today)
                      const isSelected = k === selected
                      const inMonth = date.getMonth() === cursor.month
                      const dayQty = dayBatches.reduce((s, b) => s + (Number(b.quantity_kg) || 0), 0)
                      return (
                        <div
                          key={k}
                          onClick={() => setSelected(k)}
                          className={cn(
                            "min-h-20 cursor-pointer p-1.5 align-top transition-colors md:min-h-24",
                            !inMonth && "bg-muted/30",
                            has && "bg-amber-500/[0.07]",
                            isSelected && "bg-primary/[0.07] shadow-[inset_0_0_0_2px_var(--color-primary)]",
                            !isSelected && "hover:bg-muted/50"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs",
                              isToday
                                ? "bg-primary font-bold text-primary-foreground"
                                : inMonth
                                  ? "font-medium"
                                  : "text-muted-foreground/60"
                            )}
                          >
                            {date.getDate()}
                          </span>
                          <div className="mt-1 space-y-1">
                            {dayBatches.slice(0, MAX_PILLS).map((b) => (
                              <Link
                                key={b.id}
                                href={`/dashboard/batches/${b.id}`}
                                onClick={(e) => e.stopPropagation()}
                                title={`${b.honey_type} • ${b.quantity_kg} kg`}
                                className="block truncate rounded border bg-background px-1.5 py-0.5 text-[11px] hover:border-primary"
                              >
                                {b.honey_type} • {b.quantity_kg}kg
                              </Link>
                            ))}
                            {dayBatches.length > MAX_PILLS && (
                              <span className="block px-1 text-[11px] font-medium text-muted-foreground">
                                {t.calendar.moreSuffix(dayBatches.length - MAX_PILLS)}
                              </span>
                            )}
                          </div>
                          {has && (
                            <span className="sr-only">
                              {dayBatches.length} batch(es), {dayQty.toFixed(1)} kg
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm border border-amber-500/50 bg-amber-500/10" /> {t.calendar.harvestDay}
                </span>
                <span>{t.calendar.harvestDaysIn(agendaDays.length, monthLabel)}</span>
              </div>
            </div>
          ) : (
            <div className="border-t">
              {agendaDays.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t.calendar.noHarvestsIn(monthLabel)}
                </p>
              ) : (
                <ul className="divide-y">
                  {agendaDays.map(([k, dayBatches]) => {
                    const d = parseDayKey(k)
                    const qty = dayBatches.reduce((s, b) => s + (Number(b.quantity_kg) || 0), 0)
                    return (
                      <li key={k} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                        <div className="flex w-36 shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                              k === dayKey(today) ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}
                          >
                            {d.getDate()}
                          </span>
                          <span className="text-sm font-medium">
                            {d.toLocaleDateString(tag, { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-wrap gap-1.5">
                          {dayBatches.map((b) => (
                            <Link
                              key={b.id}
                              href={`/dashboard/batches/${b.id}`}
                              className="truncate rounded border bg-background px-2 py-1 text-xs hover:border-primary"
                            >
                              <span className="font-mono font-semibold" title={b.id}>{shortId(b.id)}</span>
                              <span className="ml-1.5 text-muted-foreground">{b.honey_type} • {b.quantity_kg}kg</span>
                            </Link>
                          ))}
                        </div>
                        <Badge variant="secondary" className="w-fit shrink-0">
                          {t.calendar.batchesKg(dayBatches.length, qty.toFixed(1))}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Selected day detail */}
          <div className="border-t px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {selectedDate.toLocaleDateString(tag, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {selectedBatches.length > 0 && (
                <Badge variant="secondary">
                  {t.calendar.batchesKg(selectedBatches.length, totalQtySelected.toFixed(1))}
                </Badge>
              )}
            </div>
            {selectedBatches.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t.calendar.noHarvestsDay}
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
                      <Link href={`/dashboard/batches/${b.id}`}>{t.calendar.open}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
