import { Fragment, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTrafficLogs, banIpAdmin } from '@/lib/api'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown, 
  Ban,
  Search,
  Code
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const getCountryFlag = (countryCode: string | null) => {
  if (!countryCode || countryCode === 'XX') return '🏳️';
  return countryCode.toUpperCase().replace(/./g, char => 
    String.fromCodePoint(char.charCodeAt(0) + 127397)
  );
}

export function TrafficTab() {
  const queryClient = useQueryClient()
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const { data: logs } = useQuery({
    queryKey: ['traffic-logs'],
    queryFn: fetchTrafficLogs,
    refetchInterval: 5000
  })

  const banMutation = useMutation({
    mutationFn: ({ ip, reason }: { ip: string, reason?: string }) => banIpAdmin(ip, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bans'] })
      queryClient.invalidateQueries({ queryKey: ['traffic-logs'] })
    }
  })

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [`t-${id}`]: !prev[`t-${id}`] }))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Request inspector</h2>
      </div>
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="w-[150px] font-bold text-xs uppercase tracking-wider">Client</TableHead>
            <TableHead className="w-[100px] font-bold text-xs uppercase tracking-wider">Geo</TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider">Method & Path</TableHead>
            <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs?.map((log: any) => {
            const isExpanded = expandedRows[`t-${log.id}`]
            return (
              <Fragment key={log.id}>
                <TableRow onClick={() => toggleRow(log.id)} className={`border-border hover:bg-secondary/30 cursor-pointer ${isExpanded ? 'bg-secondary/20' : ''}`}>
                  <TableCell><motion.div animate={{ rotate: isExpanded ? 180 : 0 }}><ChevronDown className="w-4 h-4 text-muted-foreground" /></motion.div></TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold">{log.ip}</span>
                      <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{log.userAgent}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCountryFlag(log.country)}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{log.country || '??'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="px-1.5 h-4 text-[8px] font-semibold bg-secondary">{log.method}</Badge>
                      <span className="text-xs font-mono text-primary/80 truncate max-w-[200px]">{log.path}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); banMutation.mutate({ ip: log.ip })}}
                      className="text-red-500 hover:bg-red-500/10 rounded-xl"
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <AnimatePresence>
                  {isExpanded && (
                    <TableRow className="hover:bg-transparent border-border bg-secondary/20">
                      <TableCell colSpan={5} className="p-0">
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <div className="p-6 pl-14 space-y-4">
                            {log.query && (
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><Search className="w-3 h-3" /> Query Params</p>
                                <pre className="bg-secondary/40 p-4 rounded-xl text-[10px] font-mono text-foreground overflow-x-auto">
                                  {(() => {
                                    try { return JSON.stringify(JSON.parse(log.query), null, 2); }
                                    catch(e) { return log.query; }
                                  })()}
                                </pre>
                              </div>
                            )}
                            {log.body && (
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><Code className="w-3 h-3" /> Payload (Body)</p>
                                <pre className="bg-secondary/40 p-4 rounded-xl text-[10px] font-mono text-foreground overflow-x-auto">
                                  {(() => {
                                    try { return JSON.stringify(JSON.parse(log.body), null, 2); }
                                    catch(e) { return log.body; }
                                  })()}
                                </pre>
                              </div>
                            )}
                            {!log.query && !log.body && <p className="text-xs text-muted-foreground italic">No extra payload found for this request.</p>}
                          </div>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
