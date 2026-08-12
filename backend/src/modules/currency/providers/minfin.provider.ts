import { ICurrencyProvider } from "./base.provider";
import { config } from "@/config";

export class MinfinProvider implements ICurrencyProvider {
    name = 'minfin';
    private url = config.providers.minfinUrl || "https://api.minfin.com.ua/currency/rates/nbu?locale=uk";
    private cache: any = null;

    clearCache() {
        this.cache = null;
    }

    async fetchRate(base: string, target: string): Promise<number> {
        if (!this.cache) {
            const response = await fetch(this.url);
            if (!response.ok) throw new Error(`Minfin error: ${response.statusText}`);
            this.cache = await response.json();
        }
        
        const responseData = this.cache;

        const data = responseData.data || [];
        
        const baseUpper = base.toUpperCase();
        
        const currencyData = data.find((item: any) => item.code === baseUpper);
        
        if (!currencyData || !currencyData.rate) {
            throw new Error(`Minfin: Rate for ${baseUpper} not found`);
        }

        return parseFloat(currencyData.rate);
    }
}
