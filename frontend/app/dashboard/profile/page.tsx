"use client"

import { useAuth } from "@/components/dashboard/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

function initials(name?: string | null) {
  if (!name) return "HC"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfilePage() {
  const { user, loading, error, refresh, logout } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Farmer account information.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load profile</AlertTitle>
          <AlertDescription className="flex items-center gap-2">{error} <Button size="sm" variant="outline" onClick={refresh}>Retry</Button></AlertDescription>
        </Alert>
      )}

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
            </div>
          ) : !user ? (
            <p className="text-sm text-muted-foreground">No profile data.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-lg font-semibold">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.phone}</div>
                </div>
                <Badge variant="secondary" className="ml-auto">{user.role}</Badge>
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Cluster</dt><dd className="font-medium">{user.cluster ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{user.email ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{user.phone}</dd></div>
                <div><dt className="text-muted-foreground">Member since</dt><dd className="font-medium">{new Date(user.created_at).toLocaleDateString()}</dd></div>
              </dl>
              <Button variant="outline" onClick={logout}>Log out</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
