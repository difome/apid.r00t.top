import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import cron from 'node-cron'

declare module 'fastify' {
    interface FastifyInstance {
        updateCronSchedule: (schedule: string) => void
    }
}

export default fp(async (fastify: FastifyInstance) => {
    let currentCronJob: any = null;

    fastify.decorate('updateCronSchedule', (schedule: string) => {
        if (currentCronJob) {
            currentCronJob.stop();
            fastify.log.info(`🛑 Old currency cron job stopped.`);
        }
        
        currentCronJob = cron.schedule(schedule, () => {
            fastify.log.info('🕒 Running scheduled currency sync...');
            fastify.parserService.run().catch(err => fastify.log.error(err));
        });
        fastify.log.info(`✅ New currency cron job started: ${schedule}`);
    });

    cron.schedule('*/30 * * * *', async () => {
        fastify.log.info('Running scheduled commodity sync...');
        try {
            await fastify.commodityParserService.run();
        } catch (err: any) {
            fastify.log.error(err, 'Commodity sync failed:');
        }
    });

    cron.schedule('5 0 * * *', async () => {
        fastify.log.info('🕒 Running scheduled holiday sync...');
        try {
            await fastify.holidayService.syncHolidays();
            fastify.log.info('✅ Holiday sync completed successfully.');
        } catch (err: any) {
            fastify.log.error(err, '❌ Holiday sync failed:');
        }
    });

    fastify.addHook('onReady', () => {
        const fallbackSchedule = '*/30 * * * *';
        fastify.updateCronSchedule(fallbackSchedule);

        fastify.adminService.getConfig('parser_cron')
            .then((config) => {
                const schedule = config?.value || fallbackSchedule;
                if (schedule !== fallbackSchedule) {
                    fastify.updateCronSchedule(schedule);
                }
            })
            .catch((err: any) => {
                fastify.log.error(err, 'Failed to load cron schedule, using fallback:');
            });
    });
})
