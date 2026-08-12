import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';
import { DATE_LOCALES } from '@/constants/date-locales';
import { fetchHtml } from '@/lib/http';
import { config } from '@/config';

export class HolidayService {
    private celebraUrl = config.providers.celebratodayUrl;

    private cleanHolidayName(name: string): string {
        let cleaned = name.trim();
        cleaned = cleaned.replace(/<[^>]+>/g, '');
        cleaned = cleaned.replace(/&[a-zA-Z0-9#]+;/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ');
        return cleaned.trim();
    }

    private extractShortName(name: string, shortLevel: number = 1): string {
        if (shortLevel === 3) {
            return name;
        } else if (shortLevel === 2) {
            if (/\([^)]*\)\s*$/.test(name)) {
                let shortName = name.replace(/\s*\([^)]*\)\s*$/, '');
                return shortName.replace(/\s+/g, ' ').trim();
            } else {
                return name;
            }
        } else {
            if (/\([^)]*\)\s*$/.test(name) && !/\([^)]*\)\s*-\s*[^-]+$/.test(name)) {
                let shortName = name.replace(/\s*\([^)]*\)\s*$/, '');
                return shortName.replace(/\s+/g, ' ').trim();
            } else {
                return name;
            }
        }
    }

    private getTodayUTC3(): Date {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const local = new Date(utc + (3600000 * 3));
        return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
    }

    private getTargetDateUTC3(month: number, day: number): Date {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const local = new Date(utc + (3600000 * 3));
        return new Date(Date.UTC(local.getFullYear(), month, day));
    }

    /**
     * Получить праздники на сегодня (сначала из БД, если нет - парсим)
     */
    async getHolidays(language: string = 'ru', forceRefresh: boolean = false) {
        const today = this.getTodayUTC3();

        const cached = forceRefresh ? null : await prisma.holiday.findFirst({
            where: {
                date: today,
                language: language
            }
        });

        const record = cached || await this.syncHolidays(language, today);
        return this.formatResponse(record, language);
    }

    /**
     * Получить праздники по конкретной дате (сначала из БД, если нет - парсим)
     */
    async getHolidaysByDate(month: number, day: number, language: string = 'ru', forceRefresh: boolean = false) {
        const targetDate = this.getTargetDateUTC3(month - 1, day); // month is 0-indexed in JS Date
        
        const cached = forceRefresh ? null : await prisma.holiday.findFirst({
            where: {
                date: targetDate,
                language: language
            }
        });

        const record = cached || await this.syncHolidays(language, targetDate);
        return this.formatResponse(record, language);
    }

    private formatResponse(record: any, language: string) {
        const date = new Date(record.date);
        const daysList = DATE_LOCALES.days[language as 'ru' | 'uk'] || DATE_LOCALES.days.ru;
        const monthsList = DATE_LOCALES.months[language as 'ru' | 'uk'] || DATE_LOCALES.months.ru;
        const dayName = daysList[date.getUTCDay()];
        const monthName = monthsList[date.getUTCMonth()];
        
        const holidays = ((record.events as string[]) || []).map(name => ({ name }));
        const history = (record.history as any[]) || [];
        const birthdays = (record.birthdays as any[]) || [];
        const signs = (record.signs as string[]) || [];
        const prohibitions = (record.prohibitions as string[]) || [];

        const cachedAt = new Date(record.updatedAt || record.createdAt);
        const d = String(cachedAt.getDate()).padStart(2, '0');
        const m = String(cachedAt.getMonth() + 1).padStart(2, '0');
        const y = cachedAt.getFullYear();
        const H = String(cachedAt.getHours()).padStart(2, '0');
        const M = String(cachedAt.getMinutes()).padStart(2, '0');
        const S = String(cachedAt.getSeconds()).padStart(2, '0');
        const cachedAtStr = `${d}.${m}.${y} ${H}:${M}:${S}`;

        return {
            status: 'success',
            date: date.toISOString().split('T')[0],
            date_formatted: `${date.getUTCDate()} ${monthName} ${date.getUTCFullYear()}`,
            day: dayName,
            language: language,
            description: record.description || null,
            holidays: holidays,
            historical_events: history.map(h => ({ year: parseInt(h.year), description: h.text })),
            birthdays: birthdays.map(b => ({ year: parseInt(b.year), description: b.text })),
            signs: signs.map(s => ({ text: s })),
            prohibitions: prohibitions.map(p => ({ text: p })),
            count: holidays.length + history.length,
            cached_at: cachedAtStr
        };
    }

    /**
     * Синхронизация данных исключительно с celebratoday.com
     */
    async syncHolidays(language: string = 'ru', targetDate?: Date) {
        const today = targetDate || this.getTodayUTC3();
        
        let holidays: string[] = [];
        let history: any[] = [];
        let birthdays: any[] = [];
        let signs: string[] = [];
        let prohibitions: string[] = [];
        let dayDescription = '';

        try {
            const month = today.getUTCMonth();
            const day = today.getUTCDate();
            const celebraDateUrl = `${this.celebraUrl}/${language}/events/${DATE_LOCALES.monthNamesEn[month]}/${day < 10 ? '0' + day : day}`;
            
            console.log(`[Holidays] Fetching ${language} from ${celebraDateUrl}`);
            const html = await fetchHtml(celebraDateUrl);
            const $ = cheerio.load(html);

                $('#all-celebrations ul, #all-celebrations ol').each((_, ul) => {
                    $(ul).find('li').each((_, el) => {
                        const link = $(el).find('a');
                        let text = '';
                        if (link.length > 0) {
                            const underlineSpan = link.find('span.underline');
                            if (underlineSpan.length > 0) {
                                text = underlineSpan.text().trim();
                            }
                        } else {
                            const tooltip = $(el).find('div.tooltip');
                            if (tooltip.length > 0) {
                                tooltip.remove();
                            }
                            text = $(el).text().trim();
                        }
                        
                        if (text && text.length > 3) {
                            const cleanedName = this.cleanHolidayName(text);
                            if (cleanedName && !holidays.includes(cleanedName)) {
                                const shortName = this.extractShortName(cleanedName, 1);
                                if (!holidays.includes(shortName)) {
                                    holidays.push(shortName);
                                }
                            }
                        }
                    });
                });

                dayDescription = '';
                $('h2').each((_, el) => {
                    const text = $(el).text();
                    if (text.includes('Какой день') || text.includes('Який день')) {
                        const article = $(el).parent().next('article');
                        if (article.length > 0) {
                            const pTexts: string[] = [];
                            article.find('p').each((_, p) => {
                                pTexts.push($(p).text().trim());
                            });
                            dayDescription = pTexts.join('\n\n');
                        }
                    }
                });
                dayDescription = dayDescription.trim();

                $('#historical-events li').each((_, el) => {
                    const text = $(el).text().trim();
                    const separators = [' – ', ' - ', ' — '];
                    for (const separator of separators) {
                        if (text.includes(separator)) {
                            const parts = text.split(separator);
                            if (parts.length >= 2) {
                                const year = parseInt(parts[0].trim());
                                const description = parts.slice(1).join(separator).trim();
                                if (!isNaN(year)) {
                                    history.push({ year, text: description });
                                }
                            }
                            break;
                        }
                    }
                });

                $('#birthdays li').each((_, el) => {
                    const text = $(el).text().trim();
                    const separators = [' – ', ' - ', ' — '];
                    for (const separator of separators) {
                        if (text.includes(separator)) {
                            const parts = text.split(separator);
                            if (parts.length >= 2) {
                                const year = parseInt(parts[0].trim());
                                const description = parts.slice(1).join(separator).trim();
                                if (!isNaN(year)) {
                                    birthdays.push({ year, text: description });
                                }
                            }
                            break;
                        }
                    }
                });

                $('script').each((_, el) => {
                    const content = $(el).html() || '';
                    if (content.includes('signs') || content.includes('prohibitions')) {
                        try {
                            const jsonStart = content.indexOf('{');
                            if (jsonStart !== -1) {
                                const jsonEnd = content.lastIndexOf('}') + 1;
                                if (jsonEnd > jsonStart) {
                                    const jsonStr = content.substring(jsonStart, jsonEnd);
                                    const data = JSON.parse(jsonStr);
                                    const pageProps = data.props?.pageProps?.day || data.pageProps?.day;
                                    if (pageProps) {
                                        if (pageProps.signs) signs = pageProps.signs.map((s: any) => s.text || s);
                                        if (pageProps.prohibitions) prohibitions = pageProps.prohibitions.map((p: any) => p.text || p);
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                });

            const monthsList = DATE_LOCALES.months[language as 'ru' | 'uk'] || DATE_LOCALES.months.ru;
            const dateFormatted = `${today.getUTCDate()} ${monthsList[today.getUTCMonth()]} ${today.getUTCFullYear()}`;

            const existing = await prisma.holiday.findFirst({
                where: { date: today, language }
            });

            if (existing) {
                return await prisma.holiday.update({
                    where: { id: existing.id },
                    data: {
                        name: dateFormatted,
                        events: holidays,
                        description: dayDescription,
                        history: history,
                        birthdays: birthdays,
                        signs: signs,
                        prohibitions: prohibitions,
                        updatedAt: new Date()
                    }
                });
            } else {
                return await prisma.holiday.create({
                    data: {
                        date: today,
                        language,
                        name: dateFormatted,
                        description: dayDescription,
                        events: holidays,
                        history: history,
                        birthdays: birthdays,
                        signs: signs,
                        prohibitions: prohibitions
                    }
                });
            }
        } catch (error: any) {
            console.error(`[Holidays] Sync error for ${language}:`, error.message);
            throw error;
        }
    }

    async getUpcomingHolidays(limit: number = 5, language: string = 'ru') {
        const result = await this.getHolidays(language);
        const list = ((result.holidays as any[]) || []).slice(0, limit);
        return {
            status: 'success',
            data: list.map(h => ({ name: h.name, is_primary: true, description: h.name }))
        };
    }
}
