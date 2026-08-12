/**
 * Сидер для получения исторических данных через investing.com API
 * для символов, которых нет в Yahoo Finance: NI, ZN, PB, SN, JBP, UXA, DL1
 *
 * Запуск: npx tsx seed-investing-history.ts
 */

const INVESTING_PAIRS: Record<string, { pairId: number; name: string; slug: string }> = {
  NI: { pairId: 959208, name: 'Nickel Futures', slug: 'nickel' },
  ZN: { pairId: 956470, name: 'Zinc Futures', slug: 'zinc' },
  PB: { pairId: 959207, name: 'Lead Futures', slug: 'lead' },
  SN: { pairId: 959209, name: 'Tin Futures', slug: 'tin' },
  JBP: { pairId: 961730, name: 'Steel HRC Futures', slug: 'steel-futures' },
  UXA: { pairId: 961731, name: 'Uranium Futures', slug: 'uranium' },
  DL1: { pairId: 961732, name: 'Ethanol Futures', slug: 'ethanol-futures' },
}

interface HistoricalRow {
  date: Date
  price: number
  open: number
  high: number
  low: number
}

function parseInvestingHtml(html: string): HistoricalRow[] {
  const rows: HistoricalRow[] = []
  
  const trRegex = /<tr>[\s\S]*?<\/tr>/g
  const trMatches = html.match(trRegex)
  
  if (!trMatches) return rows

  for (const tr of trMatches) {
    const dateMatch = tr.match(/data-real-value="(\d+)"/)
    if (!dateMatch) continue
    
    const timestamp = parseInt(dateMatch[1]) * 1000 // seconds to ms
    const date = new Date(timestamp)
    
    const tdRegex = /<td[^>]*data-real-value="([^"]*)"[^>]*>([^<]*)<\/td>/g
    let tdMatch
    const values: string[] = []
    while ((tdMatch = tdRegex.exec(tr)) !== null) {
      values.push(tdMatch[1].replace(/,/g, ''))
    }
    
    if (values.length >= 5) {
      const price = parseFloat(values[1])
      const open = parseFloat(values[2])
      const high = parseFloat(values[3])
      const low = parseFloat(values[4])
      
      if (!isNaN(price) && price > 0) {
        rows.push({ date, price, open, high, low })
      }
    }
  }
  
  return rows
}

async function fetchInvestingHistory(pairId: number, slug: string): Promise<HistoricalRow[]> {
  const allRows: HistoricalRow[] = []
  
  const chunks = [
    { start: '01/01/2018', end: '31/12/2019' },
    { start: '01/01/2020', end: '31/12/2021' },
    { start: '01/01/2022', end: '31/12/2023' },
    { start: '01/01/2024', end: '22/06/2026' },
  ]
  
  for (const chunk of chunks) {
    console.log(`  Fetching ${slug} ${chunk.start} - ${chunk.end}...`)
    
    const resp = await fetch('https://www.investing.com/instruments/HistoricalDataAjax', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://www.investing.com/commodities/${slug}`,
      },
      body: new URLSearchParams({
        curr_id: String(pairId),
        smlID: '3000047',
        header: '',
        st_date: chunk.start,
        end_date: chunk.end,
        sort_col: 'date',
        sort_ord: 'DESC',
        action: 'historical_data',
      }),
      signal: AbortSignal.timeout(20000),
    })
    
    if (!resp.ok) {
      console.log(`  HTTP ${resp.status} for ${slug} ${chunk.start}`)
      continue
    }
    
    const html = await resp.text()
    const rows = parseInvestingHtml(html)
    console.log(`  Got ${rows.length} rows`)
    allRows.push(...rows)
    
    await new Promise(r => setTimeout(r, 800))
  }
  
  return allRows
}

async function main() {
  const specificSymbol = process.argv[2]
  const symbolsToProcess = specificSymbol 
    ? [specificSymbol] 
    : Object.keys(INVESTING_PAIRS)

  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  let totalNew = 0

  for (const sym of symbolsToProcess) {
    const info = INVESTING_PAIRS[sym]
    if (!info) {
      console.log(`\n[SKIP] ${sym} — no investing pair defined`)
      continue
    }

    const commodity = await prisma.commodity.findUnique({ where: { symbol: sym } })
    if (!commodity) {
      console.log(`\n[SKIP] ${sym} — not in DB`)
      continue
    }

    const existingCount = await prisma.commodityRate.count({ where: { commodityId: commodity.id } })
    if (existingCount > 300) {
      console.log(`\n[SKIP] ${sym} — already has ${existingCount} rows`)
      continue
    }

    console.log(`\n[${sym}] ${info.name} (pairId=${info.pairId}) — ${existingCount} existing rows`)
    
    try {
      const rows = await fetchInvestingHistory(info.pairId, info.slug)
      console.log(`  Total rows from investing: ${rows.length}`)
      
      const existingDates = new Set<number>()
      const existingRates = await prisma.commodityRate.findMany({
        where: { commodityId: commodity.id },
        select: { createdAt: true },
      })
      for (const r of existingRates) {
        const day = new Date(r.createdAt)
        day.setHours(0, 0, 0, 0)
        existingDates.add(day.getTime())
      }
      
      let inserted = 0
      const batch: any[] = []
      
      for (const row of rows) {
        const day = new Date(row.date)
        day.setHours(0, 0, 0, 0)
        if (existingDates.has(day.getTime())) continue
        
        batch.push({
          commodityId: commodity.id,
          price: row.price,
          high24h: row.high,
          low24h: row.low,
          createdAt: row.date,
        })
        
        if (batch.length >= 100) {
          await prisma.commodityRate.createMany({ data: batch, skipDuplicates: true })
          inserted += batch.length
          batch.length = 0
        }
      }
      
      if (batch.length > 0) {
        await prisma.commodityRate.createMany({ data: batch, skipDuplicates: true })
        inserted += batch.length
      }
      
      console.log(`  INSERTED: ${inserted} new rows (${rows.length - inserted} duplicates skipped)`)
      totalNew += inserted
      
    } catch (err: any) {
      console.log(`  ERROR: ${err.message?.slice(0, 150) || err}`)
    }

    await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`\n=== DONE: ${totalNew} total new rows ===`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
