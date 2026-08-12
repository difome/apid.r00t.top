export const TMDB_GENRES: Record<string, Record<number, string>> = {
    ru: {
        28: "Боевик", 12: "Приключения", 16: "Мультфильм", 35: "Комедия", 80: "Криминал",
        99: "Документальный", 18: "Драма", 10751: "Семейный", 14: "Фэнтези", 36: "История",
        27: "Ужасы", 10402: "Музыка", 9648: "Детектив", 10749: "Мелодрама", 878: "Фантастика",
        10770: "Телефильм", 53: "Триллер", 10752: "Военный", 37: "Вестерн"
    },
    uk: {
        28: "Бойовик", 12: "Пригоди", 16: "Мультфільм", 35: "Комедія", 80: "Кримінал",
        99: "Документальний", 18: "Драма", 10751: "Сімейний", 14: "Фентезі", 36: "Історія",
        27: "Жахи", 10402: "Музика", 9648: "Детектив", 10749: "Мелодрама", 878: "Фантастика",
        10770: "Телефільм", 53: "Трилер", 10752: "Військовий", 37: "Вестерн"
    },
    en: {
        28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
        99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
        27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
        10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
    }
};

export const getGenreNames = (genreIds: number[] = [], lang: string = 'ru'): string[] => {
    const cleanLang = (lang || 'ru').toLowerCase();
    const langMap = TMDB_GENRES[cleanLang] || TMDB_GENRES.ru;
    return genreIds
        .map(id => langMap[id])
        .filter((name): name is string => Boolean(name));
};
