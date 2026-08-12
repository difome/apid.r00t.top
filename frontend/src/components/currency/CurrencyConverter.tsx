import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowDownIcon, ArrowDownUp, ArrowLeftRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { CurrencyMeta } from "@/types/currency"
import { useState, useDeferredValue } from "react"
import { CurrencySelector } from "./CurrencySelector"
import { useQuery } from "@tanstack/react-query"
import { convertCurrency } from "@/lib/api"

interface CurrencyConverterProps {
  converterMap: Record<string, number>
  symbolsMap: Record<string, CurrencyMeta>
}

export function CurrencyConverter({ symbolsMap }: CurrencyConverterProps) {
  const [amount, setAmount] = useState<number>(1)
  const deferredAmount = useDeferredValue(amount)
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('RUB')
  
  const { data: conversionResult } = useQuery({
    queryKey: ['convert', deferredAmount, from, to],
    queryFn: () => convertCurrency(deferredAmount, from, [to]),
    enabled: deferredAmount > 0,
  })

  const converted = conversionResult?.success ? conversionResult.data[to.toLowerCase()]?.value : null
  
  const handleSwap = () => {
    const temp = from
    setFrom(to)
    setTo(temp)
  }

  const fromMeta = symbolsMap[from]
  const toMeta = symbolsMap[to]
  const currentRate = converted !== null && amount !== 0 ? (converted / amount).toFixed(4) : null

  return (
    <div className="relative">
      <Card className="content-card overflow-hidden relative">
        <CardContent className="p-3 sm:p-4 md:p-5 relative">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-center">
            
            {/* From */}
            <div className="space-y-3 flex-1">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground ml-1">Сума</Label>
                <Input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="bg-background h-11 text-xl font-semibold tracking-tight border-border rounded-lg px-4 focus-visible:ring-primary/50"
                />
              </div>
               
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground ml-1">Валюта</Label>
                <CurrencySelector 
                  onSelect={setFrom}
                  symbolsMap={symbolsMap}
                  selectedCode={from}
                >
                  <button className="w-full bg-background border border-border h-13 rounded-lg px-3 hover:bg-secondary transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-3 text-left">
                       <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground font-semibold text-xs">
                          {from.slice(0,2)}
                       </div>
                       <div className="flex flex-col gap-0.5">
                           <span className="text-sm font-semibold text-foreground tracking-tight">{from}</span>
                           <span className="text-xs font-medium text-muted-foreground">{fromMeta?.name}</span>
                       </div>
                    </div>
                    <ArrowDownIcon className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-all group-hover:translate-y-0.5" />
                  </button>
                </CurrencySelector>
              </div>
            </div>

            {/* Swap */}
            <div className="flex justify-center items-center h-full md:pt-5 -my-1 md:my-0">
               <motion.button
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSwap}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center z-10"
                >
                  <ArrowDownUp className="h-4.5 w-4.5 md:hidden" />
                  <ArrowLeftRight className="hidden h-4.5 w-4.5 md:block" />
                </motion.button>
            </div>

            {/* To */}
            <div className="space-y-3 flex-1">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground ml-1">Конвертувати в</Label>
                <div className="h-11 bg-background border border-border rounded-lg px-4 flex items-center text-xl font-semibold tracking-tight text-foreground truncate">
                   <AnimatePresence mode="wait">
                     <motion.span
                       key={converted}
                       initial={{ opacity: 0, y: 5 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -5 }}
                     >
                       {converted?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                     </motion.span>
                   </AnimatePresence>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground ml-1">Валюта</Label>
                <CurrencySelector 
                  onSelect={setTo}
                  symbolsMap={symbolsMap}
                  selectedCode={to}
                >
                  <button className="w-full bg-background border border-border h-13 rounded-lg px-3 hover:bg-secondary transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-3 text-left">
                       <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground font-semibold text-xs">
                          {to.slice(0,2)}
                       </div>
                       <div className="flex flex-col gap-0.5">
                           <span className="text-sm font-semibold text-foreground tracking-tight">{to}</span>
                           <span className="text-xs font-medium text-muted-foreground">{toMeta?.name}</span>
                       </div>
                    </div>
                    <ArrowDownIcon className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-all group-hover:translate-y-0.5" />
                  </button>
                </CurrencySelector>
              </div>
            </div>

          </div>

          <div className="mt-5 flex justify-center">
             <div className="bg-secondary px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground">
                1 {from} = <span className="text-foreground">{currentRate || '...'}</span> {to}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
