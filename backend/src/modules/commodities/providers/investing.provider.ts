import * as cheerio from "cheerio";

export interface CommodityPriceResult {
    price: number;
    change24h: number | null;
    changePercent24h: number | null;
    high24h: number | null;
    low24h: number | null;
}

const INVESTING_BASE = "https://www.investing.com/commodities";
const INVESTING_INDICES_BASE = "https://www.investing.com/indices";

export const COMMODITY_SLUGS: Record<string, string> = {
    XAU: "/gold", XAG: "/silver", XPT: "/platinum", XPD: "/palladium",
    HG: "/copper", ALI: "/aluminum", NI: "/nickel", ZN: "/zinc",
    PB: "/lead", SN: "/tin", JBP: "/us-steel-coil-futures", LC: "/lithium", UXA: "/uranium-futures",
    CL1: "/crude-oil", CO1: "/brent-oil", "NG/USD": "/natural-gas", XB1: "/gasoline-rbob",
    W_1: "/us-wheat", C_1: "/us-corn", S_1: "/us-soybeans", O_1: "/oats",
    KC1: "/us-coffee-c", CC1: "/us-cocoa", SB1: "/us-sugar-no11", CT1: "/us-cotton-no.2",
    LH1: "/lean-hogs", LC1: "/live-cattle", FC1: "/feed-cattle",
    RR1: "/rough-rice", JO1: "/orange-juice", RS1: "/rapeseed",
    LB1: "/lumber", DL1: "/ethanol-futures",
    DA: "/class-iii-milk-futures",
    CHE: "/cme-cash-settled-cheese-electronic-futures",
};

const INDICES_SYMBOLS = new Set(["CHE"]);

export class CommodityInvestingProvider {
    async fetchPrice(symbol: string): Promise<CommodityPriceResult> {
        const slug = COMMODITY_SLUGS[symbol];
        if (!slug) throw new Error("No investing.com slug for: " + symbol);
        const base = INDICES_SYMBOLS.has(symbol) ? INVESTING_INDICES_BASE : INVESTING_BASE;
        const url = base + slug;
        const html = await this.fetch(url);
        return this.parsePriceHtml(html);
    }

    async fetchPrices(symbols: string[]): Promise<Record<string, CommodityPriceResult>> {
        const results: Record<string, CommodityPriceResult> = {};
        for (const symbol of symbols) {
            try {
                results[symbol] = await this.fetchPrice(symbol);
                if (symbols.length > 1) await new Promise(r => setTimeout(r, 400));
            } catch (err: any) {
                console.error(
                    "[CommodityInvestingProvider] Failed " + symbol + ":",
                    (err.message || "").slice(0, 100)
                );
                results[symbol] = {
                    price: 0, change24h: null, changePercent24h: null,
                    high24h: null, low24h: null
                };
            }
        }
        return results;
    }

    private async fetch(url: string): Promise<string> {
        const resp = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml",
            },
            signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status + " for " + url);
        return resp.text();
    }

    private parsePriceHtml(html: string): CommodityPriceResult {
        const $ = cheerio.load(html);

        let price = 0;

        // 1. data-testid
        const priceEl = $("[data-testid=\"last-price\"]");
        if (priceEl.length > 0) {
            price = parseFloat(priceEl.first().text().trim().replace(/,/g, "")) || 0;
        }

        // 2. Fallback: instrument-price class
        if (price === 0) {
            const el = $(".instrument-price_instrument-price__3sKJk .text-2xl").first();
            if (el.length > 0) {
                price = parseFloat(el.text().trim().replace(/,/g, "")) || 0;
            }
        }

        // 3. Fallback: instrument-price-last (used by indices pages like CHE)
        if (price === 0) {
            const el = $(".instrument-price-last").first();
            if (el.length > 0) {
                price = parseFloat(el.text().trim().replace(/,/g, "")) || 0;
            }
        }

        // 4. Fallback: any large price-like number near the top
        if (price === 0) {
            $("span").each((_: any, el: any) => {
                const text = $(el).text().trim().replace(/,/g, "");
                if (/^\d+\.\d+$/.test(text) && parseFloat(text) > 0) {
                    price = parseFloat(text);
                    return false;
                }
            });
        }

        // 24h change
        let change24h: number | null = null;
        const changeEl = $("[data-testid=\"change-abs\"]");
        if (changeEl.length > 0) {
            const t = changeEl.first().text().trim().replace(/,/g, "");
            if (t) change24h = parseFloat(t) || null;
        }

        // 24h change percent
        let changePercent24h: number | null = null;
        const pctEl = $("[data-testid=\"change-percent\"]");
        if (pctEl.length > 0) {
            const t = pctEl.first().text().trim().replace("%", "").replace(/,/g, "");
            if (t) changePercent24h = parseFloat(t) || null;
        }

        return { price, change24h, changePercent24h, high24h: null, low24h: null };
    }
}
