export const config = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    apiUrl: process.env.API_URL || 'https://apid.r00t.top',
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    providers: {
        generatorOnlineUrl: (process.env.GENERATOR_ONLINE_URL || 'https://generator-online.com').replace(/\/$/, ''),
        celebratodayUrl: (process.env.CELEBRATODAY_URL || 'https://celebratoday.com').replace(/\/$/, ''),
        tmdbImageUrl: process.env.TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p/w500/',
        memesAnekdotmeUrl: process.env.MEMES_ANEKDOTME_URL || 'https://www.memify.ru/highfive/',
        memesSpacesimUrl: process.env.MEMES_SPACESIM_URL || 'https://spaces.im/sz/foto-i-kartinki/jumor-prikoly/',
        memesTopmemasApiUrl: process.env.MEMES_TOPMEMAS_API_URL || 'https://topmemas.top/app/load.php',
        memesTopmemasImgUrl: process.env.MEMES_TOPMEMAS_IMG_URL || 'https://topmemas.top/img/img',
        cbrApiUrl: process.env.CBR_API_URL || 'https://www.cbr.ru/scripts/XML_daily.asp',
        coinbaseApiUrl: process.env.COINBASE_API_URL || 'https://api.coinbase.com/v2',
        minfinUrl: process.env.MINFIN_URL || 'https://minfin.com.ua/currency/',
        metalchartsApiUrl: process.env.METALCHARTS_API_URL || 'https://metalcharts.org/api/prices',
        spacesCookie: process.env.SPACES_COOKIE || "theme=dark; spacesactive=true",
    }
};
