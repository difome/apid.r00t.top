import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { CurrencyService } from '@/modules/currency/currency.service'
import { CurrencyParserService } from '@/modules/currency/currency-parser.service'
import { AdminService } from '@/modules/admin/admin.service'
import { HolidayService } from '@/modules/holidays/holidays.service'
import { MovieService } from '@/modules/movies/movies.service'
import { MemeService } from '@/modules/memes/memes.service'
import { FactService } from '@/modules/facts/facts.service'
import { CommodityService } from '@/modules/commodities/commodity.service'
import { CommodityParserService } from '@/modules/commodities/commodity-parser.service'

declare module 'fastify' {
    interface FastifyInstance {
        currencyService: CurrencyService
        parserService: CurrencyParserService
        adminService: AdminService
        holidayService: HolidayService
        movieService: MovieService
        memeService: MemeService
        factService: FactService
        commodityService: CommodityService
        commodityParserService: CommodityParserService
    }
}

export default fp(async (fastify: FastifyInstance) => {
    fastify.decorate('currencyService', new CurrencyService())
    fastify.decorate('parserService', new CurrencyParserService())
    fastify.decorate('adminService', new AdminService())
    fastify.decorate('holidayService', new HolidayService())
    fastify.decorate('movieService', new MovieService())
    fastify.decorate('memeService', new MemeService(fastify.redis))
    fastify.decorate('factService', new FactService())
    fastify.decorate('commodityService', new CommodityService())
    fastify.decorate('commodityParserService', new CommodityParserService())
})
