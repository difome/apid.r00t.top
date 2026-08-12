import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchParsingLogs } from '@/lib/api'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ChevronDown 
} from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    case 'error': return <XCircle className="w-4 h-4 text-red-500" />
    case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />
    default: return <Clock className="w-4 h-4 text-gray-500" />
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'success': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-1.5 h-5 text-[9px] uppercase font-bold">Success</Badge>
    case 'error': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 px-1.5 h-5 text-[9px] uppercase font-bold">Error</Badge>
    case 'warning': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-1.5 h-5 text-[9px] uppercase font-bold">Warning</Badge>
    default: return <Badge variant="outline" className="px-1.5 h-5 text-[9px] uppercase font-bold">{status}</Badge>
  }
}

export function ParsingTab() {
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({})

  const { data: logs } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: fetchParsingLogs,
    refetchInterval: 10000,
  })

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [`p-${id}`]: !prev[`p-${id}`] }))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Parsing logs</h2>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[180px] font-bold text-xs uppercase tracking-wider">Date</TableHead>
              <TableHead className="w-[120px] font-bold text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-[120px] font-bold text-xs uppercase tracking-wider">Source</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">Summary</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log: any) => {
              const isExpanded = expandedRows[`p-${log.id}`]
              const [summary, ...details] = log.message.split(';')
              
              return (
                <React.Fragment key={log.id}>
                  <TableRow 
                    onClick={() => toggleRow(log.id)}
                    className={`border-border hover:bg-secondary/30 transition-colors cursor-pointer ${isExpanded ? 'bg-secondary/20' : ''}`}
                  >
                    <TableCell>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), 'dd.MM HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded-md border border-border uppercase tracking-tighter">
                        {log.source || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm truncate text-muted-foreground">{summary}</p>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {log.duration ? `${log.duration}ms` : '-'}
                    </TableCell>
                  </TableRow>
                  <AnimatePresence>
                    {isExpanded && (
                      <TableRow className="hover:bg-transparent border-border bg-secondary/20">
                        <TableCell colSpan={6} className="p-0">
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <div className="p-6 pl-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 font-mono text-[11px] leading-relaxed">
                              {details.map((line: string, i: number) => (
                                <div key={i} className={`flex items-start gap-2 py-0.5 ${line.includes('❌') ? 'text-red-400' : 'text-muted-foreground'}`}>
                                  <span className="mt-1 opacity-50">•</span>
                                  <span>{line.trim().replace(/^[✅❌ℹ️]\s*/, '')}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
