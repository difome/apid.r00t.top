import { CurrencyService } from "../modules/currency/currency.service";
import { CurrencyParserService } from "../modules/currency/currency-parser.service";
import { CommodityService } from "../modules/commodities/commodity.service";
import { CommodityParserService } from "../modules/commodities/commodity-parser.service";
import { HolidayService } from "../modules/holidays/holidays.service";
import { AdminService } from "../modules/admin/admin.service";

declare module 'fastify' {
    interface FastifyInstance {
        currencyService: CurrencyService;
        parserService: CurrencyParserService;
        commodityService: CommodityService;
        commodityParserService: CommodityParserService;
        holidayService: HolidayService;
        adminService: AdminService;
        updateCronSchedule: (schedule: string) => void;
        updateBansCache: () => Promise<void>;
    }
}
