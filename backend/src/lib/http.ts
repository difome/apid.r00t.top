export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const DEFAULT_HEADERS = {
    'User-Agent': DEFAULT_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,uk-UA,uk;q=0.8,en-US,en;q=0.7',
};

export const fetchHtml = async (url: string, extraHeaders: Record<string, string> = {}): Promise<string> => {
    const res = await fetch(url, {
        headers: {
            ...DEFAULT_HEADERS,
            ...extraHeaders
        }
    });
    if (!res.ok) {
        throw new Error(`HTTP error ${res.status} for ${url}`);
    }
    return res.text();
};
