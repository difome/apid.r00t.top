import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchConfig, updateConfig } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Settings, 
  Save, 
  Clock 
} from 'lucide-react'

export function SettingsTab() {
  const queryClient = useQueryClient()
  const [cronInput, setCronInput] = React.useState('*/30 * * * *')

  const { data: cronConfig } = useQuery({
    queryKey: ['config', 'parser_cron'],
    queryFn: () => fetchConfig('parser_cron'),
  })

  React.useEffect(() => {
    if (cronConfig?.value) {
      setCronInput(cronConfig.value)
    }
  }, [cronConfig])

  const configMutation = useMutation({
    mutationFn: (value: string) => updateConfig('parser_cron', value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'parser_cron'] })
    }
  })

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-secondary border border-border"><Settings className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
            <p className="text-muted-foreground text-sm">System behavior and security controls.</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cron Schedule</label>
            <div className="flex gap-2">
              <Input value={cronInput} onChange={e => setCronInput(e.target.value)} className="rounded-lg bg-background border-border h-11" />
              <Button onClick={() => configMutation.mutate(cronInput)} className="rounded-xl px-6 bg-foreground text-background font-bold h-12 uppercase tracking-widest text-[10px]"><Save className="w-3 h-3 mr-2" /> Save</Button>
            </div>
          </div>
          <div className="p-4 bg-secondary/30 border border-border rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Common Intervals
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setCronInput('*/5 * * * *')} className="text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-xs flex justify-between items-center group">
                <span className="text-muted-foreground group-hover:text-foreground">Every 5 min</span>
                <code className="text-[10px] text-primary/50">*/5 * * * *</code>
              </button>
              <button onClick={() => setCronInput('*/15 * * * *')} className="text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-xs flex justify-between items-center group">
                <span className="text-muted-foreground group-hover:text-foreground">Every 15 min</span>
                <code className="text-[10px] text-primary/50">*/15 * * * *</code>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
