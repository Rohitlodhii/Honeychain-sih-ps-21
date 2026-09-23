"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { api } from "@/lib/api"
import type { Hive } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { CreateBatchDialog } from "./create-batch-dialog"
import { notifyDataChanged } from "./data-events"
import { useI18n } from "@/lib/i18n/context"

type Size = "sm" | "default" | "lg" | "icon"
type Variant = "default" | "outline" | "ghost" | "secondary"

/** Shared "+ Add harvest" action: loads hives on open, notifies pages on create. */
export function AddHarvestButton({
  label,
  size = "sm",
  variant = "default",
  className,
}: {
  label?: React.ReactNode
  size?: Size
  variant?: Variant
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [hives, setHives] = React.useState<Hive[]>([])
  const { t } = useI18n()
  const resolvedLabel = label ?? t.batches.createBtn

  React.useEffect(() => {
    if (!open) return
    api.hives
      .list()
      .then((r) => setHives(r.data ?? []))
      .catch(() => {})
  }, [open ])

  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> {resolvedLabel}
      </Button>
      <CreateBatchDialog
        open={open}
        onOpenChange={setOpen}
        hives={hives}
        onCreated={notifyDataChanged}
      />
    </>
  )
}
