import { ICurrencyProvider } from "./base.provider";
import { config } from "@/config";

export class CoinbaseProvider implements ICurrencyProvider {
    name = 'coinbase';
    private graphqlUrl = "https://www.coinbase.com/graphql/query";
    private restUrl = config.providers.coinbaseApiUrl || "https://api.coinbase.com/v2";

    async fetchRate(base: string, target: string, params?: any): Promise<number> {
        const baseUpper = base.toUpperCase();
        const targetUpper = target.toUpperCase();
        let slug = params?.slug || base.toLowerCase();
        if (slug === 'ton') {
            slug = 'toncoin';
        }

        if (slug === 'toncoin' || baseUpper === 'TON') {
            return this.fetchGraphQL(slug, targetUpper);
        }

        return this.fetchRest(baseUpper, targetUpper);
    }

    private async fetchGraphQL(slug: string, target: string): Promise<number> {
        const payload = {
            operationName: "useGetPriceChartDataQuery",
            variables: { skip: false, slug, currency: target },
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: "2f667e92bca631b26ec8179b1e484b24553daaaf690b94ef251fa4aed988ea34"
                }
            }
        };

        const response = await fetch(this.graphqlUrl, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "x-apollo-operation-name": "useGetPriceChartDataQuery"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Coinbase GraphQL error: ${response.statusText}`);
        const data = await response.json() as any;
        
        const latestPrice = data?.data?.assetBySlug?.latestPrice?.price;
        if (latestPrice) return parseFloat(latestPrice);

        const quotes = data?.data?.assetBySlug?.hour?.quotes;
        if (!quotes || quotes.length === 0) throw new Error(`Coinbase GraphQL empty price for ${slug}`);
        return parseFloat(quotes[0].price);
    }


    private async fetchRest(base: string, target: string): Promise<number> {
        const response = await fetch(`${this.restUrl}/prices/${base}-${target}/spot`);
        if (!response.ok) throw new Error(`Coinbase REST error: ${response.statusText}`);
        const json = await response.json() as any;
        return parseFloat(json.data.amount);
    }

}

