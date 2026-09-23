"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AuthProvider } from "./auth-provider"
import { AppSidebar } from "./app-sidebar"

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
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
              {breadcrumb ?? "HoneyChain"}
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
