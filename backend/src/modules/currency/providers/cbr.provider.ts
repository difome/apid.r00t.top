import { load } from "cheerio";
import { ICurrencyProvider } from "./base.provider";
import { config } from "@/config";
import { DEFAULT_USER_AGENT } from "@/lib/http";

export class CBRProvider implements ICurrencyProvider {
    name = 'cbr';
    private url = "https://www.cbr.ru/currency_base/daily/";
    private cache: Map<string, number> | null = null;

    clearCache() {
        this.cache = null;
    }

    async fetchRate(base: string, target: string): Promise<number> {
        if (!this.cache) {
            const response = await fetch(this.url, {
                headers: {
                    "User-Agent": DEFAULT_USER_AGENT
                }
            });
            if (!response.ok) throw new Error(`CBR scraping error: ${response.statusText}`);
            
            const html = await response.text();
            const $ = load(html);
            const rates = new Map<string, number>();
            rates.set('RUB', 1);

            $('table.data tr').each((i, el) => {
                const cells = $(el).find('td');
                if (cells.length >= 5) {
                    const code = $(cells[1]).text().trim().toUpperCase();
                    const nominal = parseInt($(cells[2]).text().trim());
                    const valueStr = $(cells[4]).text().trim().replace(',', '.');
                    const value = parseFloat(valueStr);

                    if (code && !isNaN(nominal) && !isNaN(value)) {
                        rates.set(code, value / nominal);
                    }
                }
            });

            this.cache = rates;
        }

        const baseUpper = base.toUpperCase();
        const targetUpper = target.toUpperCase();

        const baseVal = this.cache.get(baseUpper);
        const targetVal = this.cache.get(targetUpper);

        if (baseVal !== undefined && targetVal !== undefined) {
            return baseVal / targetVal;
        }

        throw new Error(`CBR: Currency ${baseUpper} or ${targetUpper} not found in scraped table`);
    }
}

