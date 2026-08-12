import { DEFAULT_USER_AGENT } from '@/lib/http';
import { config } from '@/config';

export class GeneratorOnlineClient {
    private tokenCache: Map<string, { token: string; cookie: string; timestamp: number }> = new Map();
    private readonly cacheTtlMs = 15 * 60 * 1000;
    private readonly baseUrl = config.providers.generatorOnlineUrl;

    private getEndpointUrls(resource: 'facts' | 'movies', lang: string): { pageUrl: string; apiUrl: string } {
        const cleanLang = (lang || 'ru').toLowerCase();
        const prefix = cleanLang === 'uk' || cleanLang === 'ua' ? '' : `/${cleanLang}`;
        return {
            pageUrl: `${this.baseUrl}${prefix}/${resource}`,
            apiUrl: `${this.baseUrl}${prefix}/api/v1/${resource}`
        };
    }

    private async getCsrf(pageUrl: string): Promise<{ token: string; cookie: string }> {
        const cached = this.tokenCache.get(pageUrl);
        if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
            return cached;
        }

        const pageRes = await fetch(pageUrl, {
            headers: {
                'User-Agent': DEFAULT_USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });

        const setCookies = (pageRes.headers as any).getSetCookie 
            ? (pageRes.headers as any).getSetCookie() 
            : [pageRes.headers.get('set-cookie') || ''];
        const cookie = setCookies.map((c: string) => c.split(';')[0]).filter(Boolean).join('; ');
        const html = await pageRes.text();

        const tokenMatch = html.match(/name="CRAFT_CSRF_TOKEN"\s+value="([^"]+)"/) || html.match(/csrfTokenValue\s*=\s*['"]([^'"]+)['"]/);
        let token = tokenMatch ? tokenMatch[1] : '';

        if (!token) {
            const cookieMatch = cookie.match(/CRAFT_CSRF_TOKEN=([^;]+)/);
            if (cookieMatch) token = decodeURIComponent(cookieMatch[1]);
        }

        if (!token) {
            throw new Error(`Failed to extract CSRF token from ${pageUrl}`);
        }

        const authData = { token, cookie, timestamp: Date.now() };
        this.tokenCache.set(pageUrl, authData);
        return authData;
    }

    async post<T = any>(resource: 'facts' | 'movies', lang: string = 'ru', extraParams: Record<string, string> = {}): Promise<T> {
        const { pageUrl, apiUrl } = this.getEndpointUrls(resource, lang);
        let auth = await this.getCsrf(pageUrl);

        const makeRequest = async (authInfo: { token: string; cookie: string }) => {
            const body = new URLSearchParams({
                CRAFT_CSRF_TOKEN: authInfo.token,
                ...extraParams
            });

            return fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'User-Agent': DEFAULT_USER_AGENT,
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'x-csrf-token': authInfo.token,
                    'Cookie': authInfo.cookie,
                    'Referer': pageUrl,
                },
                body: body.toString()
            });
        };

        let response = await makeRequest(auth);

        if (response.status === 400 || response.status === 403) {
            this.tokenCache.delete(pageUrl);
            auth = await this.getCsrf(pageUrl);
            response = await makeRequest(auth);
        }

        if (!response.ok) {
            throw new Error(`${resource} API error: ${response.statusText} (${response.status})`);
        }

        const data = await response.json() as any;
        if (!data || !data.data || !data.data.result) {
            throw new Error(`Invalid response structure from ${resource} API`);
        }

        return data.data;
    }
}

export const generatorOnlineClient = new GeneratorOnlineClient();
