import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useState, type ReactNode } from "react"
import type { CurrencyMeta } from "@/types/currency"

interface CurrencySelectorProps {
  onSelect: (code: string) => void
  symbolsMap: Record<string, CurrencyMeta>
  selectedCode: string
  children: ReactNode
}

export function CurrencySelector({ 
  onSelect, 
  symbolsMap, 
  selectedCode,
  children
}: CurrencySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filteredCurrencies = Object.entries(symbolsMap).filter(([code, meta]) => 
    code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    meta.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="z-[100] w-[min(calc(100vw-2rem),320px)] p-0 bg-popover border border-border rounded-xl shadow-xl shadow-background/30 overflow-hidden" 
        align="start"
      >
        <div className="p-3 border-b border-border bg-card">
          <div className="relative">
            <Input 
              placeholder="Пошук валюти" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border-border h-10 rounded-lg pl-9 focus-visible:ring-primary/50 text-sm placeholder:text-muted-foreground/50"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          </div>
        </div>
        
        <div className="max-h-[350px] overflow-y-auto p-1 custom-scrollbar">
           {filteredCurrencies.map(([code, meta]) => (
             <button
               key={code}
               onClick={() => {
                 onSelect(code)
                 setOpen(false)
               }}
               className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all group mb-0.5 will-change-transform ${
                  selectedCode === code ? 'bg-secondary' : 'hover:bg-secondary/60'
               }`}
             >
               <div className="flex items-center gap-3">
                   <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                     {meta.emoji}
                  </div>
                  <div className="text-left">
                     <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{meta.name}</p>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{code}</p>
                  </div>
               </div>
               {selectedCode === code && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
               )}
             </button>
           ))}
           {filteredCurrencies.length === 0 && (
             <div className="p-8 text-center text-muted-foreground text-sm italic">Не знайдено.</div>
           )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
