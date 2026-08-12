import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchBans, unbanIpAdmin } from '@/lib/api'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { 
  ShieldCheck, 
  ShieldAlert 
} from 'lucide-react'
import { format } from 'date-fns'

export function BansTab() {
  const queryClient = useQueryClient()

  const { data: bannedIps } = useQuery({
    queryKey: ['admin-bans'],
    queryFn: fetchBans
  })

  const unbanMutation = useMutation({
    mutationFn: (ip: string) => unbanIpAdmin(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bans'] })
    }
  })

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" /> Banned addresses</h2>
      </div>
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold text-xs uppercase tracking-wider">IP Address</TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider">Reason</TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider">Date</TableHead>
            <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bannedIps?.map((ban: any) => (
            <TableRow key={ban.ip} className="border-border hover:bg-red-500/[0.02]">
              <TableCell className="font-mono text-sm font-bold text-red-500/80">{ban.ip}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{ban.reason || 'Manual ban'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{format(new Date(ban.createdAt), 'dd.MM.yyyy HH:mm')}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => unbanMutation.mutate(ban.ip)} className="text-emerald-500 hover:bg-emerald-500/10 rounded-xl">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Unban
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {bannedIps?.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">No banned IPs found. Everyone is welcome!</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
