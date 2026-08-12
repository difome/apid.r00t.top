export interface ICurrencyProvider {
    name: string;
    fetchRate(base: string, target: string, params?: any): Promise<number>;
    clearCache?(): void;
}

