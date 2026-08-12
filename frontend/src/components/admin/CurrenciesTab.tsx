import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllCurrencies, updateCurrencyAdmin, createCurrencyAdmin, deleteCurrencyAdmin, syncCurrencyHistoryAdmin } from '@/lib/api'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Edit2, History } from 'lucide-react'

export function CurrenciesTab() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [formData, setFormData] = React.useState({
    key: '',
    name: '',
    type: 'crypto',
    source: 'coinbase',
    baseCurrency: '',
    targetCurrency: 'USD',
    symbol: '',
    emoji: '',
    enabled: true,
    order: 0,
    baseRu: '',
    baseUk: '',
    targetRu: '',
    targetUk: '',
    valId: '',
    slug: '',
    product: ''
  })

  const { data: currencies } = useQuery({
    queryKey: ['admin-currencies'],
    queryFn: fetchAllCurrencies
  })

  const toggleCurrencyMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string, enabled: boolean }) => 
      updateCurrencyAdmin(key, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] })
    }
  })

  const saveCurrencyMutation = useMutation({
    mutationFn: (data: any) => {
      if (isEditMode) {
        // Exclude key from payload as it is in path parameter
        const { key, ...payload } = data;
        return updateCurrencyAdmin(key, payload);
      } else {
        return createCurrencyAdmin(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: (err: any) => {
      alert(`Error saving pair: ${err?.response?.data?.message || err.message}`)
    }
  })

  const deleteCurrencyMutation = useMutation({
    mutationFn: (key: string) => deleteCurrencyAdmin(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] })
    },
    onError: (err: any) => {
      alert(`Error deleting pair: ${err?.response?.data?.message || err.message}`)
    }
  })

  const syncHistoryMutation = useMutation({
    mutationFn: (key: string) => syncCurrencyHistoryAdmin(key),
    onSuccess: (_, key) => {
      alert(`History sync started for ${key} in the background!`)
      // Refresh list to see count update or status
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-currencies'] })
      }, 1000)
    },
    onError: (err: any) => {
      alert(`Error starting sync: ${err?.response?.data?.message || err.message}`)
    }
  })

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      type: 'crypto',
      source: 'coinbase',
      baseCurrency: '',
      targetCurrency: 'USD',
      symbol: '',
      emoji: '',
      enabled: true,
      order: 0,
      baseRu: '',
      baseUk: '',
      targetRu: '',
      targetUk: '',
      valId: '',
      slug: '',
      product: ''
    })
  }

  const handleOpenAdd = () => {
    setIsEditMode(false)
    resetForm()
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (cur: any) => {
    setIsEditMode(true)
    setFormData({
      key: cur.key,
      name: cur.name || '',
      type: cur.type || 'crypto',
      source: cur.source || 'coinbase',
      baseCurrency: cur.baseCurrency || '',
      targetCurrency: cur.targetCurrency || '',
      symbol: cur.symbol || '',
      emoji: cur.emoji || '',
      enabled: cur.enabled ?? true,
      order: cur.order ?? 0,
      baseRu: cur.params?.translation?.base?.ru || '',
      baseUk: cur.params?.translation?.base?.uk || '',
      targetRu: cur.params?.translation?.target?.ru || '',
      targetUk: cur.params?.translation?.target?.uk || '',
      valId: cur.params?.valId || '',
      slug: cur.params?.slug || '',
      product: cur.params?.product || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (key: string) => {
    if (confirm(`Are you sure you want to delete ${key}? This will also delete all parsed rates for this pair.`)) {
      deleteCurrencyMutation.mutate(key)
    }
  }

  const handleSave = () => {
    const params: Record<string, any> = {
      translation: {
        base: { ru: formData.baseRu, uk: formData.baseUk },
        target: { ru: formData.targetRu, uk: formData.targetUk }
      }
    }
    if (formData.valId) params.valId = formData.valId
    if (formData.slug) params.slug = formData.slug
    if (formData.product) params.product = formData.product
    
    const { baseRu, baseUk, targetRu, targetUk, valId, slug, product, ...rest } = formData;
    const data = {
      ...rest,
      params
    }
    saveCurrencyMutation.mutate(data)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Currencies</h2>
        <Button onClick={handleOpenAdd} size="sm" className="rounded-xl font-bold uppercase tracking-widest text-[10px] bg-foreground text-background hover:bg-foreground/90">
          <Plus className="w-3 h-3 mr-2" /> Add Pair
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-background border border-border rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {isEditMode ? `Edit Pair: ${formData.key}` : 'Add New Pair'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-left">
            {!isEditMode && (
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unique Key (e.g. doge_to_usd)</label>
                <Input value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} className="rounded-lg bg-card border-border" placeholder="doge_to_usd" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name (e.g. DOGE/USD)</label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-lg bg-card border-border" placeholder="DOGE/USD" />
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})} 
                  className="rounded-lg bg-card border border-border p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="crypto">Crypto</option>
                  <option value="fiat">Fiat</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-secondary/30 border border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">🌐 Translations (Base Currency)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">RU</label>
                  <Input value={formData.baseRu} onChange={e => setFormData({...formData, baseRu: e.target.value})} className="rounded-lg bg-card border-border h-8 text-xs" placeholder="Биткоин" />
                </div>
                <div className="grid gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">UK</label>
                  <Input value={formData.baseUk} onChange={e => setFormData({...formData, baseUk: e.target.value})} className="rounded-lg bg-card border-border h-8 text-xs" placeholder="Біткоїн" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 mt-3">🌐 Translations (Target Currency)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">RU</label>
                  <Input value={formData.targetRu} onChange={e => setFormData({...formData, targetRu: e.target.value})} className="rounded-lg bg-card border-border h-8 text-xs" placeholder="Доллар США" />
                </div>
                <div className="grid gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">UK</label>
                  <Input value={formData.targetUk} onChange={e => setFormData({...formData, targetUk: e.target.value})} className="rounded-lg bg-card border-border h-8 text-xs" placeholder="Долар США" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Base Currency (e.g. DOGE)</label>
                <Input value={formData.baseCurrency} onChange={e => setFormData({...formData, baseCurrency: e.target.value})} className="rounded-lg bg-card border-border" placeholder="DOGE" />
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Currency (e.g. USD)</label>
                <Input value={formData.targetCurrency} onChange={e => setFormData({...formData, targetCurrency: e.target.value})} className="rounded-lg bg-card border-border" placeholder="USD" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Symbol (e.g. Ð)</label>
                <Input value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} className="rounded-lg bg-card border-border" placeholder="Ð" />
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Emoji (e.g. 🐕)</label>
                <Input value={formData.emoji} onChange={e => setFormData({...formData, emoji: e.target.value})} className="rounded-lg bg-card border-border" placeholder="🐕" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source</label>
                <select 
                  value={formData.source} 
                  onChange={e => setFormData({...formData, source: e.target.value})} 
                  className="rounded-lg bg-card border border-border p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
                >
                  <option value="coinbase">Coinbase</option>
                  <option value="cbr">CBR (Центральный Банк РФ)</option>
                  <option value="minfin">Minfin (Украина)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sorting Order</label>
                <Input type="number" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})} className="rounded-lg bg-card border-border" placeholder="0" />
              </div>
            </div>

            {formData.source === 'cbr' && (
              <div className="grid gap-2 p-3 rounded-xl bg-secondary/30 border border-border">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between">
                  <span>CBR Val ID</span>
                  <span className="text-primary/70">Optional (Auto-detected)</span>
                </label>
                <Input value={formData.valId} onChange={e => setFormData({...formData, valId: e.target.value})} className="rounded-lg bg-card border-border font-mono text-xs" placeholder="Оставьте пустым (система найдет сама)" />
              </div>
            )}

            {formData.source === 'coinbase' && (
              <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-secondary/30 border border-border">
                <div className="grid gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex flex-col">
                    <span>Coinbase Slug</span>
                    <span className="text-[8px] text-primary/70">Optional</span>
                  </label>
                  <Input value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className="rounded-lg bg-card border-border font-mono text-xs" placeholder="Оставьте пустым" />
                </div>
                <div className="grid gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex flex-col">
                    <span>Product (REST)</span>
                    <span className="text-[8px] text-primary/70">Optional</span>
                  </label>
                  <Input value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} className="rounded-lg bg-card border-border font-mono text-xs" placeholder="Оставьте пустым" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="rounded-xl w-full bg-foreground text-background font-bold uppercase tracking-widest text-[10px]">
              {isEditMode ? 'Save Changes' : 'Create Pair'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold text-xs uppercase tracking-wider">Key</TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Enabled</TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currencies?.map((cur: any) => (
            <TableRow key={cur.key} className="border-border hover:bg-secondary/30">
              <TableCell className="font-bold text-sm">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cur.emoji}</span>
                    <span>{cur.key}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                      cur.ratesCount > 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {cur.ratesCount > 0 ? `${cur.ratesCount} pts` : 'no history'}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest pl-6">
                    {cur.name || `${cur.baseCurrency} → ${cur.targetCurrency}`} ({cur.source})
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Switch checked={cur.enabled} onCheckedChange={(checked) => toggleCurrencyMutation.mutate({ key: cur.key, enabled: checked })} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    onClick={() => syncHistoryMutation.mutate(cur.key)}
                    variant="ghost"
                    size="sm"
                    className="text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl"
                    title="Sync history"
                    disabled={syncHistoryMutation.isPending}
                  >
                    <History className="w-3.5 h-3.5" />
                  </Button>
                  <Button onClick={() => handleOpenEdit(cur)} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button onClick={() => handleDelete(cur.key)} variant="ghost" size="sm" className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
