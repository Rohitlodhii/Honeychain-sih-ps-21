"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AuthProvider } from "./auth-provider"
import { AppSidebar } from "./app-sidebar"
import { AddHarvestButton } from "./add-harvest-button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useI18n } from "@/lib/i18n/context"

function ShellHeader({
  children,
  breadcrumb,
}: {
  children: React.ReactNode
  breadcrumb?: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-muted-foreground">
        {breadcrumb ?? t.shell.breadcrumb}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <LanguageSwitcher />
        <AddHarvestButton label={t.batches.createBtn} />
      </div>
    </header>
  )
}

export function DashboardShell({
  children,
  breadcrumb,
}: {
  children: React.ReactNode
  breadcrumb?: React.ReactNode
}) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-x-clip">
          <ShellHeader breadcrumb={breadcrumb}>{null}</ShellHeader>
          <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
