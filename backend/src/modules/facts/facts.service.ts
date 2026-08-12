import { GeneratorOnlineClient, generatorOnlineClient } from '@/lib/generator-online.client';

export class FactService {
    constructor(private client: GeneratorOnlineClient = generatorOnlineClient) {}

    async getRandomFact(language: string = 'ru') {
        const data = await this.client.post('facts', language, { category: '' });
        return {
            success: true,
            data: {
                result: data.result,
                message: data.message || ''
            }
        };
    }
}
