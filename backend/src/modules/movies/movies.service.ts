import { GeneratorOnlineClient, generatorOnlineClient } from '@/lib/generator-online.client';
import { getGenreNames } from '@/constants/tmdb-genres';
import { config } from '@/config';

export class MovieService {
    private readonly imagePrefix = config.providers.tmdbImageUrl;

    constructor(private client: GeneratorOnlineClient = generatorOnlineClient) {}

    async getRandomMovie(language: string = 'ru') {
        const data = await this.client.post('movies', language, {
            type: 'movie',
            with_genres: '',
            primary_release_year: ''
        });

        const movie = data.result;
        if (movie.poster_path && !movie.poster_path.startsWith('http')) {
            movie.poster_path = `${this.imagePrefix}${movie.poster_path.replace(/^\//, '')}`;
        }

        movie.genres = getGenreNames(movie.genre_ids, language);

        return {
            success: true,
            data: {
                result: movie,
                message: data.message || ''
            }
        };
    }
}
