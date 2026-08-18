import * as cheerio from 'cheerio';
import type Redis from 'ioredis';
import { config } from '@/config';
import { DEFAULT_HEADERS, DEFAULT_USER_AGENT } from '@/lib/http';

interface MemeData {
    image: string;
    description: string;
    source: string;
}

type TopmemasMeme = {
    id: number | string;
    name: string;
    text?: string;
    post_date?: string;
    source?: string;
    post_id?: string | number;
    type?: "img" | "gif" | "video" | string;
    player?: string;
}

export class MemeService {
    private readonly topmemasSeenKey = 'memes:topmemas:seen';
    private readonly topmemasSeenTtlSeconds = 60 * 60 * 24;
    private readonly localTopmemasSeen = new Set<string>();

    constructor(private readonly redis?: Redis) {}

    private sources = [
        {
            name: "anekdotme",
            baseUrl: config.providers.memesAnekdotmeUrl,
            type: "anekdotme"
        },
        {
            name: "spacesim",
            baseUrl: config.providers.memesSpacesimUrl,
            totalPages: 2084,
            type: "spacesim"
        },
        {
            name: "topmemas",
            apiUrl: config.providers.memesTopmemasApiUrl,
            imgUrl: config.providers.memesTopmemasImgUrl,
            type: "topmemas"
        }
    ] as const;

    private headers = DEFAULT_HEADERS;

    private spacesHeaders = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "ru,en-US;q=0.9,en;q=0.8,uk;q=0.7",
        "cookie": config.providers.spacesCookie,
        "user-agent": DEFAULT_USER_AGENT
    };

    private async getMemeFromAnekdotMe(): Promise<MemeData> {
        const response = await fetch(this.sources[0].baseUrl, {
            headers: this.headers,
            signal: AbortSignal.timeout(3500)
        });
        if (!response.ok) {
            throw new Error(`AnekdotMe parse error: ${response.statusText}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);

        const jsonLdScript = $('script[type="application/ld+json"]').first();
        if (jsonLdScript.length) {
            try {
                const data = JSON.parse(jsonLdScript.html() || '{}');
                const items = data.itemListElement || [];
                if (items.length > 0) {
                    const randomIndex = Math.floor(Math.random() * items.length);
                    const item = items[randomIndex];

                    if (item.image) {
                        let description = item.description || item.name || '';
                        if (!description || description === 'Funny meme' || description.startsWith('Прикольный мем #')) {
                            const idMatch = item.url ? item.url.match(/\/meme\/(\d+)/) : null;
                            if (idMatch) {
                                description = `Картинка с мемом #${idMatch[1]}`;
                            } else {
                                description = item.name || 'Funny meme';
                            }
                        }

                        return {
                            image: item.image,
                            description: description,
                            source: "anekdot.me"
                        };
                    }
                }
            } catch (jsonError) {
                console.warn('Failed to parse application/ld+json from anekdot.me, falling back to CSS parsing:', jsonError);
            }
        }

        const firstMeme = $('.infinite-item.card').first();
        if (!firstMeme.length) {
            throw new Error("Meme not found on anekdot.me");
        }

        const imgTag = firstMeme.find('img');
        const imageUrl = imgTag.attr('src') || imgTag.attr('data-src') || firstMeme.find('a').attr('href');
        if (!imageUrl) {
            throw new Error("Image URL not found on anekdot.me");
        }

        let description = firstMeme.find('.card-text').text().trim();
        if (!description) {
            description = imgTag.attr('alt') || "Funny meme";
        }

        return {
            image: imageUrl,
            description: description,
            source: "anekdot.me"
        };
    }

    private async getMemeFromSpacesIm(): Promise<MemeData> {
        const randomPage = Math.floor(Math.random() * this.sources[1].totalPages) + 1;
        const url = randomPage === 1
            ? this.sources[1].baseUrl
            : `${this.sources[1].baseUrl}p${randomPage}/`;

        const response = await fetch(url, {
            headers: this.spacesHeaders,
            signal: AbortSignal.timeout(3500)
        });
        if (!response.ok) {
            throw new Error(`SpacesIm parse error: ${response.statusText}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);

        const memeItems = $('.js-file_item.tiled_item');
        if (!memeItems.length) {
            throw new Error("Memes not found on spaces.im");
        }

        const randomIndex = Math.floor(Math.random() * memeItems.length);
        const randomMeme = $(memeItems.get(randomIndex));

        const imgTag = randomMeme.find('img.preview');
        let listImageUrl = imgTag.attr('data-s') || imgTag.attr('src') || '';

        if (listImageUrl.startsWith('data:image')) {
            const srcset = imgTag.attr('srcset') || '';
            if (srcset) {
                listImageUrl = srcset.split(',')[0].trim().split(' ')[0];
            }
        }

        let description = randomMeme.attr('title') || '';
        if (!description) {
            const descrAttr = randomMeme.attr('data-descr') || '';
            if (descrAttr) {
                description = descrAttr.replace('::descr(', '').replace(')::', '');
            }
        }
        if (!description) {
            description = imgTag.attr('alt') || '';
        }
        if (!description) {
            description = "Прикольная картинка";
        }

        let largeImageUrl = '';
        const detailUrl = randomMeme.find('a').attr('href');
        if (detailUrl) {
            try {
                const detailResponse = await fetch(detailUrl, {
                    headers: this.spacesHeaders,
                    signal: AbortSignal.timeout(3500)
                });
                if (detailResponse.ok) {
                    const detailHtml = await detailResponse.text();
                    const $detail = cheerio.load(detailHtml);
                    let detailImg = $detail('img.preview.s600_600').first();
                    if (!detailImg.length) {
                        detailImg = $detail('img.preview').filter((i, el) => {
                            const className = $detail(el).attr('class') || '';
                            return !className.includes('s41_40');
                        }).first();
                    }
                    if (detailImg.length) {
                        largeImageUrl = detailImg.attr('src') || '';
                        const detailAlt = detailImg.attr('alt') || '';
                        if (detailAlt && (!description || description === 'Прикольная картинка' || description.startsWith('picture_'))) {
                            description = detailAlt;
                        }
                    }
                }
            } catch (detailError) {
                console.warn('Error fetching spaces.im detail page, falling back to thumbnail:', detailError);
            }
        }

        const imageUrl = largeImageUrl || listImageUrl;

        if (!imageUrl || imageUrl.startsWith('data:image')) {
            throw new Error("Image URL not found on spaces.im");
        }

        let memeId = '';
        if (detailUrl) {
            const idMatch = detailUrl.match(/view\/(\d+)/);
            if (idMatch) memeId = idMatch[1];
        }
        if (!memeId && imageUrl) {
            const fileMatch = imageUrl.match(/(\d+)\.p\./);
            if (fileMatch) memeId = fileMatch[1];
        }

        if (description) {
            const isGeneric = description.startsWith('picture_') ||
                /^[a-fA-F0-9]{16,}$/.test(description) ||
                (memeId && description.includes(memeId));
            if (isGeneric && memeId) {
                description = `Картинка с мемом #${memeId}`;
            }
        } else if (memeId) {
            description = `Картинка с мемом #${memeId}`;
        } else {
            description = "Прикольная картинка";
        }

        return {
            image: imageUrl,
            description: description,
            source: `spaces.im (страница ${randomPage})`
        };
    }

    private async fetchTopmemasPage(last: number = 0): Promise<TopmemasMeme[]> {
        const body = new URLSearchParams({ num: "30", type: "all", last: String(last) });
        const response = await fetch(this.sources[2].apiUrl!, {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0",
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Origin": "https://topmemas.top",
                "Referer": "https://topmemas.top/",
                "X-Requested-With": "XMLHttpRequest",
            },
            body,
            signal: AbortSignal.timeout(3500)
        });
        if (!response.ok) {
            throw new Error(`Topmemas API error: ${response.statusText}`);
        }
        const memes = await response.json();
        if (!Array.isArray(memes) || memes.length === 0) {
            throw new Error("No memes from topmemas.top");
        }
        return memes;
    }

    private shuffleTopmemas(memes: TopmemasMeme[]) {
        return [...memes].sort(() => Math.random() - 0.5);
    }

    private async markTopmemasSeen(id: string) {
        if (this.redis?.status === 'ready') {
            const added = await this.redis.sadd(this.topmemasSeenKey, id);
            await this.redis.expire(this.topmemasSeenKey, this.topmemasSeenTtlSeconds);
            return added === 1;
        }

        if (this.localTopmemasSeen.has(id)) return false;
        this.localTopmemasSeen.add(id);
        return true;
    }

    private async getMemeFromTopmemas(): Promise<MemeData> {
        let last = 0;
        const maxPages = 5;

        for (let page = 0; page < maxPages; page++) {
            const memes = await this.fetchTopmemasPage(last);

            const imageMemes = memes.filter((m): m is TopmemasMeme => Boolean(m.id && m.name && m.type !== "video"));
            if (imageMemes.length === 0) {
                last = Number(memes[memes.length - 1]?.id || last);
                continue;
            }

            last = Number(memes[memes.length - 1]?.id || last);

            for (const meme of this.shuffleTopmemas(imageMemes)) {
                const id = String(meme.id);
                const isFresh = await this.markTopmemasSeen(id);
                if (!isFresh) continue;

                const ext = meme.type === "gif" ? "gif" : "jpg";
                const imageUrl = `${this.sources[2].imgUrl}/${meme.name}.${ext}`;

                let description = (meme.text || "").trim();
                if (!description) {
                    description = `Мем #${meme.id} от ${meme.post_date || "неизвестно"}`;
                }

                return {
                    image: imageUrl,
                    description,
                    source: `topmemas.top${page > 0 ? ` (страница ${page + 1})` : ''}`
                };
            }
        }

        throw new Error("No fresh topmemas.top memes after pagination");
    }

    async getRandomMeme() {
        try {
            const sourceChoice = Math.floor(Math.random() * 3);
            let memeData: MemeData | undefined;

            const fetchers = [
                () => this.getMemeFromAnekdotMe(),
                () => this.getMemeFromSpacesIm(),
                () => this.getMemeFromTopmemas(),
            ];
            const sourceNames = ["anekdot.me", "spaces.im", "topmemas.top"];

            try {
                console.log(`Selected source: ${sourceNames[sourceChoice]}`);
                memeData = await fetchers[sourceChoice]();
            } catch (error) {
                console.warn(`Error with source ${sourceChoice}: ${error}. Trying fallback sources.`);
                const fallbacks = [0, 1, 2].filter(i => i !== sourceChoice);
                for (const fb of fallbacks) {
                    try {
                        console.log(`Switching to ${sourceNames[fb]}`);
                        memeData = await fetchers[fb]();
                        break;
                    } catch (fbError) {
                        console.warn(`Fallback ${fb} also failed: ${fbError}`);
                    }
                }
                if (!memeData) {
                    throw new Error("All meme sources failed");
                }
            }

            console.log(`Meme successfully fetched from ${memeData.source}`);

            return {
                success: true,
                data: {
                    result: memeData
                }
            };
        } catch (error: any) {
            console.error('Error fetching meme:', error.message);
            throw error;
        }
    }
}
