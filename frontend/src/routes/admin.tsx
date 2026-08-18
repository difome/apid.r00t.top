import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncCommoditiesRates, syncRates } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Ban, Coins, Database, Lock, RefreshCcw, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'

import { createSeoHead } from '@/lib/seo'
import i18n from '@/i18n'

export const Route = createFileRoute('/admin')({
  head: () => createSeoHead({
    title: i18n.t('admin.title'),
    description: i18n.t('admin.description'),
    path: '/admin',
    noindex: true,
  }),
  component: AdminPage,
})

function AdminPage() {
  const location = useLocation()
  const pathname = location.pathname

  useEffect(() => {
    document.title = 'Admin | Apid'
  }, [])

  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return !!localStorage.getItem('admin_key')
    }
    return false
  })
  const [adminKeyInput, setAdminKeyInput] = useState('')

  useEffect(() => {
    const handleAuthError = () => {
      setIsAuthenticated(false)
      setAdminKeyInput('')
      queryClient.clear()
    }

    window.addEventListener('admin-auth-error', handleAuthError)
    return () => window.removeEventListener('admin-auth-error', handleAuthError)
  }, [queryClient])

  const syncMutation = useMutation({
    mutationFn: async () => {
      await Promise.allSettled([syncRates(), syncCommoditiesRates()])
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  const handleLogin = () => {
    const adminKey = adminKeyInput.trim()
    if (!adminKey) return

    localStorage.setItem('admin_key', adminKey)
    setIsAuthenticated(true)
    queryClient.invalidateQueries()
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_key')
    setIsAuthenticated(false)
    queryClient.clear()
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
          <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter the admin key to manage data sources.</p>

          <div className="mt-6 space-y-3">
            <Input
              type="password"
              placeholder="Admin key"
              value={adminKeyInput}
              onChange={(event) => setAdminKeyInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
              className="h-11 rounded-lg bg-background font-mono"
            />
            <Button onClick={handleLogin} className="h-11 w-full rounded-lg font-medium">
              Sign in
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const navItems = [
    { to: '/admin/parsing', label: 'Parsing', icon: Database },
    { to: '/admin/currencies', label: 'Currencies', icon: Coins },
    { to: '/admin/commodities', label: 'Commodities', icon: Database },
    { to: '/admin/commodities-logs', label: 'Sync logs', icon: Database },
    { to: '/admin/traffic', label: 'Traffic', icon: Activity },
    { to: '/admin/bans', label: 'Bans', icon: Ban },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="rounded-md border-emerald-500/20 bg-emerald-500/10 px-2 py-0 text-[10px] font-medium text-emerald-500">
              Authorized
            </Badge>
            <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground">
              Logout
            </button>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage parsers, markets, access rules and logs.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()} className="rounded-lg font-medium">
            <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="rounded-lg font-medium">
            {syncMutation.isPending ? 'Updating...' : 'Update rates'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 lg:block lg:space-y-1 lg:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.to)

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:w-full ${
                    isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  )
}
