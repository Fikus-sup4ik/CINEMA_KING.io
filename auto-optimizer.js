(function () {
    'use strict';

    // Защита от повторной инициализации
    if (window.cinema_king_plugin) return;
    window.cinema_king_plugin = true;

    var PLUGIN_ID = 'cinema_king';
    var STORAGE_KEY = 'cinema_king_state_v1';
    var STYLE_ID = 'cinema-king-styles';

    // Справочник жанров TMDB (фильмы и сериалы)
    var GENRES_MAP = {
        28: 'Боевик',
        12: 'Приключения',
        16: 'Мультфильм',
        35: 'Комедия',
        80: 'Криминал',
        99: 'Документальный',
        18: 'Драма',
        10751: 'Семейный',
        14: 'Фэнтези',
        36: 'История',
        27: 'Ужасы',
        10402: 'Музыка',
        9648: 'Детектив',
        10749: 'Мелодрама',
        878: 'Фантастика',
        10770: 'ТВ-фильм',
        53: 'Триллер',
        10752: 'Военный',
        37: 'Вестерн',
        10759: 'Боевик и приключения',
        10762: 'Детский',
        10765: 'Фантастика и фэнтези',
        10768: 'Война и политика'
    };

    var SELECTABLE_GENRES = [
        28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 9648, 10749, 878, 53, 10752, 37
    ];

    var PERIOD_OPTIONS = [
        { id: 'all', label: 'Любой период', from: null, to: null },
        { id: '2020s', label: '2020-е', from: '2020-01-01', to: '2029-12-31' },
        { id: '2010s', label: '2010-е', from: '2010-01-01', to: '2019-12-31' },
        { id: '2000s', label: '2000-е', from: '2000-01-01', to: '2009-12-31' },
        { id: '1990s', label: '1990-е', from: '1990-01-01', to: '1999-12-31' },
        { id: 'classic', label: 'Классика (до 1990)', from: '1950-01-01', to: '1989-12-31' }
    ];

    var RATING_OPTIONS = [
        { value: 0, label: 'Любой' },
        { value: 6.0, label: '6.0+' },
        { value: 7.0, label: '7.0+' },
        { value: 7.5, label: '7.5+' },
        { value: 8.0, label: '8.0+' }
    ];

    var CONTENT_OPTIONS = [
        { id: 'movie', label: 'Только фильмы' },
        { id: 'tv', label: 'Только сериалы' },
        { id: 'all', label: 'Фильмы и сериалы' }
    ];

    // Кэш продолжительности (runtime) в оперативной памяти на сессию
    var runtimeCache = {};

    // =========================================================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // =========================================================================

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function isReducedMotion() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    }

    function getGenreName(id) {
        return GENRES_MAP[id] || '';
    }

    function cardKey(card) {
        return (card.media_type || 'movie') + '_' + card.id;
    }

    function formatRuntime(mins) {
        if (!mins || isNaN(mins) || mins <= 0) return '';
        var h = Math.floor(mins / 60);
        var m = mins % 60;
        if (h > 0 && m > 0) return h + ' ч ' + m + ' мин';
        if (h > 0) return h + ' ч';
        return m + ' мин';
    }

    function getDecadeFromYear(year) {
        var y = parseInt(year, 10);
        if (!y || isNaN(y)) return null;
        if (y < 1990) return 'classic';
        return String(Math.floor(y / 10) * 10) + 's';
    }

    function decadeLabel(dec) {
        if (dec === 'classic') return 'классика до 1990';
        if (dec === '1990s') return '1990-е';
        if (dec === '2000s') return '2000-е';
        if (dec === '2010s') return '2010-е';
        if (dec === '2020s') return '2020-е';
        return dec || '';
    }

    function getInitials(title) {
        if (!title) return 'CK';
        var parts = String(title).trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        }
        return String(title).substring(0, 2).toUpperCase();
    }

    // =========================================================================
    // ХРАНИЛИЩЕ И ЗАЩИТА ОТ ПОВРЕЖДЁННЫХ ДАННЫХ
    // =========================================================================

    function createDefaultState() {
        return {
            stats: {
                comparisons: 0,
                wins: 0
            },
            genreScores: {},
            decadeScores: {},
            typeScores: {
                movie: 0,
                tv: 0
            },
            ratingSum: 0,
            ratingCount: 0,
            winners: [],
            history: [],
            settings: {
                contentType: 'movie',
                excludedGenres: [],
                minRating: 6.0,
                period: 'all'
            },
            koth: {
                champion: null,
                streak: 0,
                round: 1,
                hallOfFame: []
            }
        };
    }

    var StorageManager = {
        sanitize: function (raw) {
            var def = createDefaultState();
            if (!raw || typeof raw !== 'object') return def;

            try {
                if (raw.stats && typeof raw.stats === 'object') {
                    def.stats.comparisons = Math.max(0, parseInt(raw.stats.comparisons, 10) || 0);
                    def.stats.wins = Math.max(0, parseInt(raw.stats.wins, 10) || 0);
                }
                if (raw.genreScores && typeof raw.genreScores === 'object') {
                    for (var g in raw.genreScores) {
                        if (raw.genreScores.hasOwnProperty(g) && !isNaN(parseFloat(raw.genreScores[g]))) {
                            def.genreScores[g] = parseFloat(raw.genreScores[g]);
                        }
                    }
                }
                if (raw.decadeScores && typeof raw.decadeScores === 'object') {
                    for (var d in raw.decadeScores) {
                        if (raw.decadeScores.hasOwnProperty(d) && !isNaN(parseFloat(raw.decadeScores[d]))) {
                            def.decadeScores[d] = parseFloat(raw.decadeScores[d]);
                        }
                    }
                }
                if (raw.typeScores && typeof raw.typeScores === 'object') {
                    def.typeScores.movie = parseFloat(raw.typeScores.movie) || 0;
                    def.typeScores.tv = parseFloat(raw.typeScores.tv) || 0;
                }
                def.ratingSum = parseFloat(raw.ratingSum) || 0;
                def.ratingCount = Math.max(0, parseInt(raw.ratingCount, 10) || 0);

                if (Object.prototype.toString.call(raw.winners) === '[object Array]') {
                    def.winners = raw.winners.filter(function (w) {
                        return w && w.id && w.title;
                    }).slice(0, 200);
                }
                if (Object.prototype.toString.call(raw.history) === '[object Array]') {
                    def.history = raw.history.filter(function (h) {
                        return h && h.winnerTitle && h.loserTitle;
                    }).slice(0, 60);
                }
                if (raw.settings && typeof raw.settings === 'object') {
                    if (['movie', 'tv', 'all'].indexOf(raw.settings.contentType) !== -1) {
                        def.settings.contentType = raw.settings.contentType;
                    }
                    if (Object.prototype.toString.call(raw.settings.excludedGenres) === '[object Array]') {
                        def.settings.excludedGenres = raw.settings.excludedGenres.map(function (id) {
                            return parseInt(id, 10);
                        }).filter(function (id) {
                            return !isNaN(id);
                        });
                    }
                    if (!isNaN(parseFloat(raw.settings.minRating))) {
                        def.settings.minRating = parseFloat(raw.settings.minRating);
                    }
                    if (typeof raw.settings.period === 'string') {
                        def.settings.period = raw.settings.period;
                    }
                }
                if (raw.koth && typeof raw.koth === 'object') {
                    if (raw.koth.champion && raw.koth.champion.id && raw.koth.champion.title) {
                        def.koth.champion = raw.koth.champion;
                    }
                    def.koth.streak = Math.max(0, parseInt(raw.koth.streak, 10) || 0);
                    def.koth.round = Math.max(1, parseInt(raw.koth.round, 10) || 1);
                    if (Object.prototype.toString.call(raw.koth.hallOfFame) === '[object Array]') {
                        def.koth.hallOfFame = raw.koth.hallOfFame.filter(function (item) {
                            return item && item.card && item.card.id;
                        }).slice(0, 30);
                    }
                }
            } catch (e) {
                return createDefaultState();
            }
            return def;
        },

        load: function () {
            try {
                var saved = Lampa.Storage.get(STORAGE_KEY, null);
                if (typeof saved === 'string') {
                    saved = JSON.parse(saved);
                }
                return this.sanitize(saved);
            } catch (e) {
                return createDefaultState();
            }
        },

        save: function (state) {
            try {
                Lampa.Storage.set(STORAGE_KEY, state);
            } catch (e) {
                // Игнорируем переполнение localStorage на ТВ
            }
        }
    };

    // =========================================================================
    // КАТАЛОГ TMDB (ШТАТНЫЕ API LAMPA)
    // =========================================================================

    var CatalogService = {
        getLang: function () {
            try {
                return Lampa.Storage.get('language', 'ru') || 'ru';
            } catch (e) {
                return 'ru';
            }
        },

        getImageUrl: function (path, size) {
            if (!path) return '';
            var clean = path.charAt(0) === '/' ? path : '/' + path;
            try {
                if (Lampa.TMDB && typeof Lampa.TMDB.image === 'function') {
                    return Lampa.TMDB.image('t/p/' + (size || 'w500') + clean);
                }
            } catch (e) {}
            return 'https://image.tmdb.org/t/p/' + (size || 'w500') + clean;
        },

        buildApiUrl: function (endpoint, params) {
            var query = [];
            var lang = this.getLang();
            var key = '';
            try {
                if (Lampa.TMDB && typeof Lampa.TMDB.key === 'function') {
                    key = Lampa.TMDB.key();
                }
            } catch (e) {}

            params = params || {};
            if (key) params.api_key = key;
            if (!params.language) params.language = lang;

            for (var k in params) {
                if (params.hasOwnProperty(k) && params[k] !== null && params[k] !== undefined && params[k] !== '') {
                    query.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
                }
            }

            var path = endpoint + (query.length ? '?' + query.join('&') : '');
            try {
                if (Lampa.TMDB && typeof Lampa.TMDB.api === 'function') {
                    return Lampa.TMDB.api(path);
                }
            } catch (e) {}
            return 'https://api.themoviedb.org/3/' + path;
        },

        normalizeCard: function (raw, forcedType) {
            if (!raw || !raw.id) return null;
            var mediaType = forcedType || raw.media_type || (raw.first_air_date ? 'tv' : 'movie');
            var title = raw.title || raw.name || raw.original_title || raw.original_name || 'Без названия';
            var dateStr = raw.release_date || raw.first_air_date || '';
            var year = dateStr ? dateStr.substring(0, 4) : '';
            var genres = [];

            if (Object.prototype.toString.call(raw.genre_ids) === '[object Array]') {
                genres = raw.genre_ids.slice();
            } else if (Object.prototype.toString.call(raw.genres) === '[object Array]') {
                for (var i = 0; i < raw.genres.length; i++) {
                    if (raw.genres[i] && raw.genres[i].id) genres.push(raw.genres[i].id);
                }
            }

            var rating = parseFloat(raw.vote_average);
            if (isNaN(rating) || rating <= 0) rating = 0;

            return {
                id: raw.id,
                media_type: mediaType,
                title: title,
                original_title: raw.original_title || raw.original_name || title,
                year: year,
                poster_path: raw.poster_path || '',
                backdrop_path: raw.backdrop_path || '',
                poster: this.getImageUrl(raw.poster_path, 'w500'),
                backdrop: this.getImageUrl(raw.backdrop_path, 'w780'),
                rating: rating ? Math.round(rating * 10) / 10 : 0,
                vote_count: parseInt(raw.vote_count, 10) || 0,
                genres: genres,
                overview: raw.overview ? String(raw.overview).trim() : '',
                runtime: runtimeCache[mediaType + '_' + raw.id] || 0,
                // Сохраняем поля для открытия нативной карточки Lampa
                release_date: raw.release_date || '',
                first_air_date: raw.first_air_date || '',
                name: raw.name || '',
                vote_average: raw.vote_average || 0
            };
        },

        fetchDiscover: function (network, opts, onSuccess, onError) {
            var type = opts.mediaType === 'tv' ? 'tv' : 'movie';
            var params = {
                page: opts.page || 1,
                sort_by: opts.sortBy || 'popularity.desc',
                'vote_count.gte': opts.minVotes !== undefined ? opts.minVotes : 120
            };

            if (opts.minRating && opts.minRating > 0) {
                params['vote_average.gte'] = opts.minRating;
            }
            if (opts.withGenres) {
                params.with_genres = opts.withGenres;
            }
            if (opts.excludedGenres && opts.excludedGenres.length) {
                params.without_genres = opts.excludedGenres.join(',');
            }

            if (opts.period && opts.period !== 'all') {
                for (var i = 0; i < PERIOD_OPTIONS.length; i++) {
                    if (PERIOD_OPTIONS[i].id === opts.period) {
                        var p = PERIOD_OPTIONS[i];
                        if (type === 'movie') {
                            if (p.from) params['primary_release_date.gte'] = p.from;
                            if (p.to) params['primary_release_date.lte'] = p.to;
                        } else {
                            if (p.from) params['first_air_date.gte'] = p.from;
                            if (p.to) params['first_air_date.lte'] = p.to;
                        }
                        break;
                    }
                }
            }

            var url = this.buildApiUrl('discover/' + type, params);
            var self = this;

            network.silent(url, function (data) {
                if (!data || Object.prototype.toString.call(data.results) !== '[object Array]') {
                    onSuccess([]);
                    return;
                }
                var list = [];
                for (var j = 0; j < data.results.length; j++) {
                    var norm = self.normalizeCard(data.results[j], type);
                    if (norm) list.push(norm);
                }
                onSuccess(list);
            }, function (err) {
                if (onError) onError(err);
            });
        },

        fetchRuntime: function (network, card, callback) {
            var key = cardKey(card);
            if (runtimeCache[key]) {
                card.runtime = runtimeCache[key];
                if (callback) callback(card.runtime);
                return;
            }
            var endpoint = (card.media_type === 'tv' ? 'tv/' : 'movie/') + card.id;
            var url = this.buildApiUrl(endpoint, {});
            network.silent(url, function (data) {
                var mins = 0;
                if (data) {
                    if (data.runtime) mins = parseInt(data.runtime, 10) || 0;
                    else if (data.episode_run_time && data.episode_run_time.length) {
                        mins = parseInt(data.episode_run_time[0], 10) || 0;
                    }
                }
                if (mins > 0) {
                    runtimeCache[key] = mins;
                    card.runtime = mins;
                    if (callback) callback(mins);
                }
            }, function () {});
        }
    };

    // =========================================================================
    // АЛГОРИТМ АНАЛИЗА ПРЕДПОЧТЕНИЙ И РЕКОМЕНДАЦИЙ (БЕЗ «МАГИИ ИИ»)
    // =========================================================================

    var TasteEngine = {
        recordBattleChoice: function (state, winner, loser) {
            state.stats.comparisons += 1;
            state.stats.wins += 1;

            // Положительные баллы жанрам победителя
            var winGenres = winner.genres || [];
            var loseGenres = loser.genres || [];
            var i, gid;

            for (i = 0; i < winGenres.length; i++) {
                gid = String(winGenres[i]);
                state.genreScores[gid] = (state.genreScores[gid] || 0) + 3;
            }

            // Небольшой штраф уникальным жанрам проигравшего для точности профиля
            for (i = 0; i < loseGenres.length; i++) {
                gid = String(loseGenres[i]);
                if (winGenres.indexOf(loseGenres[i]) === -1) {
                    state.genreScores[gid] = (state.genreScores[gid] || 0) - 0.6;
                }
            }

            // Эпоха / год выпуска
            var dec = getDecadeFromYear(winner.year);
            if (dec) {
                state.decadeScores[dec] = (state.decadeScores[dec] || 0) + 2;
            }

            // Тип контента
            var mtype = winner.media_type === 'tv' ? 'tv' : 'movie';
            state.typeScores[mtype] = (state.typeScores[mtype] || 0) + 1;

            // Предпочитаемый рейтинг
            if (winner.rating && winner.rating > 0) {
                state.ratingSum += winner.rating;
                state.ratingCount += 1;
            }

            // Сохранение в список «Мои победители»
            var existing = null;
            for (i = 0; i < state.winners.length; i++) {
                if (state.winners[i].id === winner.id && state.winners[i].media_type === winner.media_type) {
                    existing = state.winners[i];
                    break;
                }
            }
            if (existing) {
                existing.wins = (existing.wins || 1) + 1;
                existing.lastWon = Date.now();
            } else {
                state.winners.unshift({
                    id: winner.id,
                    media_type: winner.media_type,
                    title: winner.title,
                    year: winner.year,
                    poster_path: winner.poster_path,
                    backdrop_path: winner.backdrop_path,
                    poster: winner.poster,
                    rating: winner.rating,
                    genres: winner.genres || [],
                    overview: winner.overview || '',
                    wins: 1,
                    lastWon: Date.now()
                });
                if (state.winners.length > 200) state.winners.pop();
            }

            // История сравнений
            state.history.unshift({
                winnerId: winner.id,
                media_type: winner.media_type,
                winnerTitle: winner.title,
                loserTitle: loser.title,
                date: Date.now()
            });
            if (state.history.length > 60) state.history.pop();

            StorageManager.save(state);
        },

        getTopGenres: function (state, limit) {
            var arr = [];
            var maxScore = 0;

            for (var gid in state.genreScores) {
                if (state.genreScores.hasOwnProperty(gid)) {
                    var score = state.genreScores[gid];
                    var name = getGenreName(parseInt(gid, 10));
                    if (name && score > 0) {
                        arr.push({ id: parseInt(gid, 10), name: name, score: score });
                        if (score > maxScore) maxScore = score;
                    }
                }
            }

            arr.sort(function (a, b) {
                return b.score - a.score;
            });

            var result = arr.slice(0, limit || 6);
            for (var i = 0; i < result.length; i++) {
                result[i].percent = maxScore > 0 ? Math.max(12, Math.round((result[i].score / maxScore) * 100)) : 0;
            }
            return result;
        },

        getTopDecade: function (state) {
            var best = null;
            var bestVal = 0;
            for (var d in state.decadeScores) {
                if (state.decadeScores.hasOwnProperty(d) && state.decadeScores[d] > bestVal) {
                    bestVal = state.decadeScores[d];
                    best = d;
                }
            }
            return best;
        },

        getAveragePreferredRating: function (state) {
            if (!state.ratingCount) return 0;
            return Math.round((state.ratingSum / state.ratingCount) * 10) / 10;
        },

        getTasteSummary: function (state) {
            var top = this.getTopGenres(state, 3);
            if (!top.length || state.stats.comparisons < 2) {
                return 'Сыграй пару раундов, чтобы система определила твои любимые жанры и эпоху.';
            }
            var names = top.map(function (g) { return g.name.toLowerCase(); });
            var text = 'Твои фавориты: ' + names.join(', ');
            var dec = this.getTopDecade(state);
            if (dec) {
                text += ' • Эпоха: ' + decadeLabel(dec);
            }
            return text;
        },

        scoreCard: function (state, card) {
            var score = 0;
            var genres = card.genres || [];
            var topGenres = this.getTopGenres(state, 5);
            var maxGenreScore = topGenres.length ? topGenres[0].score : 1;

            // Жанровый вклад (до 60 баллов)
            var genreSum = 0;
            for (var i = 0; i < genres.length; i++) {
                var gs = state.genreScores[String(genres[i])] || 0;
                if (gs > 0) genreSum += (gs / maxGenreScore);
            }
            score += Math.min(60, Math.round(genreSum * 32));

            // Вклад эпохи (до 15 баллов)
            var dec = getDecadeFromYear(card.year);
            var topDec = this.getTopDecade(state);
            if (dec && topDec && dec === topDec) {
                score += 15;
            } else if (dec && state.decadeScores[dec] > 0) {
                score += 8;
            }

            // Вклад рейтинга (до 20 баллов)
            if (card.rating >= 7.5) score += 20;
            else if (card.rating >= 6.8) score += 14;
            else if (card.rating >= 6.0) score += 8;

            // Тип контента (до 5 баллов)
            if (state.typeScores[card.media_type] > 0) {
                score += 5;
            }

            return Math.min(99, Math.max(40, score));
        },

        explainRecommendation: function (state, card) {
            var matched = [];
            var genres = card.genres || [];
            for (var i = 0; i < genres.length; i++) {
                var gid = genres[i];
                if ((state.genreScores[String(gid)] || 0) > 1.5) {
                    var nm = getGenreName(gid);
                    if (nm) matched.push(nm.toLowerCase());
                }
            }

            var dec = getDecadeFromYear(card.year);
            var topDec = this.getTopDecade(state);

            if (matched.length >= 2) {
                return 'Рекомендуем, потому что ты часто выбирал жанры: ' + matched.slice(0, 2).join(' и ') + '.';
            }
            if (matched.length === 1) {
                if (dec && topDec && dec === topDec) {
                    return 'Подходит под твой интерес к жанру «' + matched[0] + '» и кино эпохи ' + decadeLabel(dec) + '.';
                }
                return 'Рекомендуем, потому что среди твоих выборов часто встречается «' + matched[0] + '».';
            }
            if (card.rating >= 7.8) {
                return 'Высоко оценённая картина (' + card.rating + ') для расширения твоего киновкуса.';
            }
            return 'Свежее предложение из каталога, чтобы разнообразить подборку и проверить новые жанры.';
        },

        pickNextPair: function (state, pool, sessionSeen) {
            var available = [];
            var i;
            for (i = 0; i < pool.length; i++) {
                var c = pool[i];
                if (!sessionSeen[cardKey(c)]) {
                    available.push(c);
                }
            }
            if (available.length < 2) return null;

            // Холодный старт: разнообразные популярные фильмы
            if (state.stats.comparisons < 4) {
                var idx1 = Math.floor(Math.random() * Math.min(available.length, 10));
                var first = available[idx1];
                var second = null;

                // Ищем второго кандидата с другим основным жанром
                for (i = 0; i < available.length; i++) {
                    if (i === idx1) continue;
                    if (!first.genres.length || !available[i].genres.length || first.genres[0] !== available[i].genres[0]) {
                        second = available[i];
                        break;
                    }
                }
                if (!second) {
                    second = available[idx1 === 0 ? 1 : 0];
                }
                return [first, second];
            }

            // Тёплый режим: 70% по профилю вкуса, 30% разведка новых жанров
            var scored = available.map(function (item) {
                return {
                    card: item,
                    score: TasteEngine.scoreCard(state, item) + (Math.random() * 12)
                };
            });
            scored.sort(function (a, b) {
                return b.score - a.score;
            });

            var cardA = scored[0].card;
            var cardB = null;
            var explore = Math.random() < 0.30;

            if (explore && scored.length > 4) {
                // Берём неожиданного соперника из нижней половины пула для разнообразия
                var mid = Math.floor(scored.length / 2);
                var pick = mid + Math.floor(Math.random() * (scored.length - mid));
                cardB = scored[pick].card;
            } else {
                // Берём сильного соперника с отличающимся ID
                var candidateIdx = 1 + Math.floor(Math.random() * Math.min(4, scored.length - 1));
                cardB = scored[candidateIdx].card;
            }

            if (!cardB || cardKey(cardA) === cardKey(cardB)) {
                cardB = scored[1].card;
            }

            return Math.random() < 0.5 ? [cardA, cardB] : [cardB, cardA];
        }
    };

    // =========================================================================
    // ВСТРОЕННЫЕ СТИЛИ (КИНЕМАТОГРАФИЧНАЯ ТЁМНАЯ ТЕМА)
    // =========================================================================

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var css = '' +
            '.ck-root { position: relative; min-height: 100%; padding: 1.2em 2.2em 3em; color: #f1f5f9; background: radial-gradient(circle at 18% 0%, rgba(37,99,235,0.22) 0%, rgba(7,11,18,0.96) 52%, #05080f 100%); box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }' +
            '.ck-root * { box-sizing: border-box; }' +

            /* Шапка и навигация */
            '.ck-topbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1em; margin-bottom: 1.6em; padding-bottom: 1em; border-bottom: 1px solid rgba(56,189,248,0.16); }' +
            '.ck-brand { display: flex; align-items: center; gap: 0.7em; }' +
            '.ck-brand-icon { width: 2.3em; height: 2.3em; border-radius: 0.65em; background: linear-gradient(135deg, #2563eb, #06b6d4); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 18px rgba(56,189,248,0.38); flex-shrink: 0; }' +
            '.ck-brand-title { font-size: 1.35em; font-weight: 800; letter-spacing: 0.03em; background: linear-gradient(90deg, #ffffff 0%, #7dd3fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #fff; }' +
            '.ck-nav { display: flex; align-items: center; flex-wrap: wrap; gap: 0.45em; }' +
            '.ck-tab { padding: 0.52em 1.05em; border-radius: 999px; background: rgba(15,23,42,0.78); border: 1px solid rgba(148,163,184,0.18); color: #cbd5e1; font-size: 0.92em; font-weight: 600; cursor: pointer; transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }' +
            '.ck-tab.is-active { background: linear-gradient(135deg, rgba(37,99,235,0.85), rgba(14,165,233,0.78)); border-color: rgba(125,211,252,0.7); color: #ffffff; box-shadow: 0 0 16px rgba(14,165,233,0.35); }' +
            '.ck-tab.focus { transform: scale(1.06); border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56,189,248,0.75), 0 6px 18px rgba(14,165,233,0.35); color: #fff; }' +

            /* Контейнер контента и анимация переходов */
            '.ck-view { animation: ckFadeUp 0.28s ease both; }' +
            '@keyframes ckFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }' +

            /* Главный экран */
            '.ck-hero { position: relative; padding: 2.4em 2.4em; border-radius: 1.25em; background: linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(12,26,51,0.88) 55%, rgba(8,47,73,0.72) 100%); border: 1px solid rgba(56,189,248,0.25); box-shadow: 0 18px 45px rgba(0,0,0,0.45); overflow: hidden; margin-bottom: 1.6em; }' +
            '.ck-hero-badge { display: inline-block; padding: 0.32em 0.9em; border-radius: 999px; background: rgba(56,189,248,0.16); border: 1px solid rgba(56,189,248,0.35); color: #7dd3fc; font-size: 0.82em; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.9em; }' +
            '.ck-hero-title { font-size: 2.35em; font-weight: 800; line-height: 1.15; margin: 0 0 0.45em; color: #ffffff; }' +
            '.ck-hero-sub { font-size: 1.08em; line-height: 1.5; color: #cbd5e1; max-width: 44em; margin: 0 0 1.6em; }' +
            '.ck-actions { display: flex; flex-wrap: wrap; gap: 0.9em; }' +
            '.ck-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.55em; padding: 0.85em 1.65em; border-radius: 0.8em; font-size: 1em; font-weight: 700; cursor: pointer; border: 1px solid transparent; transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }' +
            '.ck-btn--primary { background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%); color: #ffffff; box-shadow: 0 8px 24px rgba(14,165,233,0.35); }' +
            '.ck-btn--secondary { background: rgba(15,23,42,0.85); border-color: rgba(56,189,248,0.35); color: #e2e8f0; }' +
            '.ck-btn--danger { background: rgba(127,29,29,0.55); border-color: rgba(248,113,113,0.45); color: #fecaca; }' +
            '.ck-btn--sm { padding: 0.55em 1.05em; font-size: 0.88em; border-radius: 0.65em; }' +
            '.ck-btn.focus { transform: scale(1.05); box-shadow: 0 0 0 2px #7dd3fc, 0 10px 26px rgba(14,165,233,0.5); border-color: #ffffff; }' +

            /* Статистика на главной */
            '.ck-kpi-grid { display: flex; flex-wrap: wrap; gap: 1.1em; }' +
            '.ck-kpi-card { flex: 1 1 14em; padding: 1.35em 1.5em; border-radius: 1em; background: rgba(13,20,34,0.88); border: 1px solid rgba(148,163,184,0.16); }' +
            '.ck-kpi-label { font-size: 0.84em; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.45em; }' +
            '.ck-kpi-value { font-size: 2em; font-weight: 800; color: #38bdf8; line-height: 1.1; }' +
            '.ck-kpi-text { font-size: 0.96em; color: #e2e8f0; line-height: 1.45; margin-top: 0.35em; }' +

            /* Битва и Царь горы */
            '.ck-arena-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.8em; margin-bottom: 1.2em; }' +
            '.ck-arena-title { font-size: 1.35em; font-weight: 800; color: #fff; }' +
            '.ck-arena-meta { font-size: 0.92em; color: #7dd3fc; font-weight: 600; }' +
            '.ck-battle-wrap { position: relative; display: flex; align-items: stretch; gap: 1.6em; }' +
            '.ck-vs-badge { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 5; width: 3.4em; height: 3.4em; border-radius: 50%; background: linear-gradient(135deg, #1d4ed8, #06b6d4); border: 2px solid rgba(255,255,255,0.75); box-shadow: 0 0 26px rgba(14,165,233,0.65); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.05em; color: #fff; pointer-events: none; }' +

            '.ck-card { flex: 1 1 48%; position: relative; display: flex; flex-direction: row; border-radius: 1.15em; overflow: hidden; background: linear-gradient(160deg, rgba(15,23,42,0.96) 0%, rgba(9,14,26,0.98) 100%); border: 1px solid rgba(56,189,248,0.22); box-shadow: 0 14px 36px rgba(0,0,0,0.45); cursor: pointer; min-height: 21em; transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, opacity 0.35s ease; }' +
            '.ck-card.focus { transform: translateY(-4px) scale(1.015); border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56,189,248,0.85), 0 18px 42px rgba(14,165,233,0.35); }' +
            '.ck-card--champion { border-color: rgba(250,204,21,0.55); box-shadow: 0 0 24px rgba(250,204,21,0.16); }' +

            /* Анимации карточек битвы */
            '.ck-card--enter-left { animation: ckEnterLeft 0.34s ease both; }' +
            '.ck-card--enter-right { animation: ckEnterRight 0.34s ease both; }' +
            '.ck-card--win { border-color: #38bdf8 !important; box-shadow: 0 0 0 3px #38bdf8, 0 0 38px rgba(56,189,248,0.68) !important; transform: scale(1.03) !important; z-index: 4; }' +
            '.ck-card--lose-left { transform: translateX(-50px) scale(0.92) !important; opacity: 0 !important; }' +
            '.ck-card--lose-right { transform: translateX(50px) scale(0.92) !important; opacity: 0 !important; }' +
            '@keyframes ckEnterLeft { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }' +
            '@keyframes ckEnterRight { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }' +

            '.ck-card-poster { position: relative; width: 13.5em; min-width: 13.5em; background: linear-gradient(135deg, #0f172a, #1e293b); overflow: hidden; flex-shrink: 0; }' +
            '.ck-card-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }' +
            '.ck-poster-fallback { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(145deg, #1e3a8a, #0f172a); color: #7dd3fc; font-size: 2.6em; font-weight: 800; letter-spacing: 0.05em; }' +
            '.ck-card-ribbon { position: absolute; top: 0.75em; left: 0.75em; padding: 0.28em 0.72em; border-radius: 0.5em; font-size: 0.78em; font-weight: 800; letter-spacing: 0.03em; background: rgba(7,11,18,0.85); color: #facc15; border: 1px solid rgba(250,204,21,0.55); }' +
            '.ck-card-ribbon--challenger { color: #7dd3fc; border-color: rgba(56,189,248,0.55); }' +

            '.ck-card-info { flex: 1; padding: 1.35em 1.45em; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }' +
            '.ck-card-title { font-size: 1.42em; font-weight: 800; line-height: 1.22; color: #ffffff; margin: 0 0 0.45em; }' +
            '.ck-meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.55em; margin-bottom: 0.75em; font-size: 0.88em; color: #94a3b8; }' +
            '.ck-rating-pill { display: inline-flex; align-items: center; gap: 0.28em; padding: 0.2em 0.6em; border-radius: 0.45em; background: rgba(56,189,248,0.16); color: #7dd3fc; font-weight: 700; }' +
            '.ck-genres { display: flex; flex-wrap: wrap; gap: 0.4em; margin-bottom: 0.85em; }' +
            '.ck-genre-chip { padding: 0.22em 0.65em; border-radius: 999px; background: rgba(30,41,59,0.85); border: 1px solid rgba(148,163,184,0.2); font-size: 0.78em; color: #cbd5e1; }' +
            '.ck-overview { font-size: 0.9em; line-height: 1.48; color: #cbd5e1; margin: 0 0 1em; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }' +
            '.ck-card-cta { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 0.72em 1em; border-radius: 0.7em; background: linear-gradient(135deg, rgba(37,99,235,0.9), rgba(14,165,233,0.85)); color: #fff; font-weight: 700; font-size: 0.94em; text-align: center; }' +

            '.ck-battle-footer { display: flex; justify-content: center; flex-wrap: wrap; gap: 0.8em; margin-top: 1.3em; }' +

            /* Сетка карточек (Победители и Рекомендации) */
            '.ck-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.8em; margin-bottom: 1.25em; }' +
            '.ck-grid { display: flex; flex-wrap: wrap; gap: 1.15em; }' +
            '.ck-item-card { width: calc(33.333% - 0.77em); display: flex; flex-direction: column; border-radius: 1em; overflow: hidden; background: rgba(13,20,34,0.92); border: 1px solid rgba(56,189,248,0.18); transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }' +
            '.ck-item-top { display: flex; gap: 0.95em; padding: 1em; cursor: pointer; flex: 1; }' +
            '.ck-item-top.focus { background: rgba(30,58,138,0.28); outline: 2px solid #38bdf8; outline-offset: -2px; }' +
            '.ck-item-thumb { width: 5.5em; height: 8.2em; border-radius: 0.6em; overflow: hidden; flex-shrink: 0; background: #1e293b; }' +
            '.ck-item-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }' +
            '.ck-item-body { flex: 1; min-width: 0; }' +
            '.ck-item-title { font-size: 1.04em; font-weight: 700; color: #fff; margin: 0 0 0.3em; }' +
            '.ck-item-reason { font-size: 0.84em; line-height: 1.4; color: #93c5fd; margin-top: 0.45em; }' +
            '.ck-item-actions { display: flex; border-top: 1px solid rgba(148,163,184,0.12); }' +
            '.ck-item-act { flex: 1; padding: 0.65em; text-align: center; font-size: 0.84em; font-weight: 600; color: #cbd5e1; cursor: pointer; background: rgba(15,23,42,0.65); }' +
            '.ck-item-act + .ck-item-act { border-left: 1px solid rgba(148,163,184,0.12); }' +
            '.ck-item-act--del { color: #fca5a5; }' +
            '.ck-item-act.focus { background: #2563eb; color: #ffffff; }' +

            /* Мой вкус (графики и история) */
            '.ck-panel { padding: 1.4em 1.6em; border-radius: 1em; background: rgba(13,20,34,0.9); border: 1px solid rgba(56,189,248,0.18); margin-bottom: 1.25em; }' +
            '.ck-panel-title { font-size: 1.15em; font-weight: 800; color: #fff; margin: 0 0 1em; }' +
            '.ck-bar-row { margin-bottom: 0.85em; }' +
            '.ck-bar-head { display: flex; justify-content: space-between; font-size: 0.92em; margin-bottom: 0.35em; color: #e2e8f0; }' +
            '.ck-bar-track { height: 0.68em; border-radius: 999px; background: rgba(30,41,59,0.9); overflow: hidden; }' +
            '.ck-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #2563eb, #38bdf8); transition: width 0.6s ease; }' +
            '.ck-history-row { display: flex; align-items: center; justify-content: space-between; padding: 0.65em 0; border-bottom: 1px solid rgba(148,163,184,0.1); font-size: 0.92em; }' +
            '.ck-history-win { color: #7dd3fc; font-weight: 700; }' +
            '.ck-history-lose { color: #94a3b8; }' +

            /* Настройки */
            '.ck-setting-group { margin-bottom: 1.4em; }' +
            '.ck-setting-label { font-size: 0.96em; font-weight: 700; color: #e2e8f0; margin-bottom: 0.65em; }' +
            '.ck-chips { display: flex; flex-wrap: wrap; gap: 0.55em; }' +
            '.ck-chip { padding: 0.5em 0.95em; border-radius: 0.65em; background: rgba(15,23,42,0.85); border: 1px solid rgba(148,163,184,0.22); color: #cbd5e1; font-size: 0.88em; font-weight: 600; cursor: pointer; transition: transform 0.15s ease, background 0.15s ease; }' +
            '.ck-chip.is-selected { background: rgba(37,99,235,0.85); border-color: #7dd3fc; color: #fff; }' +
            '.ck-chip.is-excluded { background: rgba(153,27,27,0.75); border-color: #f87171; color: #fee2e2; text-decoration: line-through; }' +
            '.ck-chip.focus { transform: scale(1.06); box-shadow: 0 0 0 2px #38bdf8; color: #fff; }' +

            /* Зал славы Царя горы */
            '.ck-hof-list { display: flex; flex-wrap: wrap; gap: 0.8em; }' +
            '.ck-hof-item { flex: 1 1 16em; display: flex; align-items: center; gap: 0.8em; padding: 0.8em 1em; border-radius: 0.85em; background: rgba(15,23,42,0.85); border: 1px solid rgba(250,204,21,0.24); cursor: pointer; }' +
            '.ck-hof-item.focus { border-color: #38bdf8; box-shadow: 0 0 0 2px #38bdf8; }' +
            '.ck-hof-rank { font-size: 1.3em; font-weight: 900; color: #facc15; width: 1.8em; text-align: center; }' +

            /* Состояния загрузки, пустоты и уведомлений */
            '.ck-state-box { text-align: center; padding: 3em 1.5em; border-radius: 1em; background: rgba(13,20,34,0.85); border: 1px solid rgba(56,189,248,0.18); }' +
            '.ck-spinner { width: 2.6em; height: 2.6em; border: 3px solid rgba(56,189,248,0.22); border-top-color: #38bdf8; border-radius: 50%; margin: 0 auto 1em; animation: ckSpin 0.8s linear infinite; }' +
            '@keyframes ckSpin { to { transform: rotate(360deg); } }' +
            '.ck-toast { position: fixed; right: 2em; bottom: 2em; z-index: 9999; max-width: 24em; padding: 0.9em 1.3em; border-radius: 0.85em; background: linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,58,138,0.95)); border: 1px solid #38bdf8; box-shadow: 0 12px 32px rgba(0,0,0,0.55); color: #fff; font-weight: 700; font-size: 0.94em; opacity: 0; transform: translateY(14px); transition: opacity 0.25s ease, transform 0.25s ease; pointer-events: none; }' +
            '.ck-toast.is-visible { opacity: 1; transform: translateY(0); }' +

            /* Адаптивность под мобильные и узкие экраны */
            '@media (max-width: 960px) {' +
                '.ck-battle-wrap { flex-direction: column; }' +
                '.ck-vs-badge { width: 2.8em; height: 2.8em; font-size: 0.9em; }' +
                '.ck-item-card { width: calc(50% - 0.6em); }' +
            '}' +
            '@media (max-width: 640px) {' +
                '.ck-root { padding: 0.9em 1em 2.5em; }' +
                '.ck-hero { padding: 1.5em 1.2em; }' +
                '.ck-hero-title { font-size: 1.65em; }' +
                '.ck-card { flex-direction: column; min-height: auto; }' +
                '.ck-card-poster { width: 100%; min-width: 100%; height: 15em; }' +
                '.ck-item-card { width: 100%; }' +
            '}' +

            /* Учёт системной настройки prefers-reduced-motion */
            '@media (prefers-reduced-motion: reduce) {' +
                '.ck-view, .ck-card--enter-left, .ck-card--enter-right, .ck-spinner { animation: none !important; }' +
                '.ck-card, .ck-btn, .ck-tab, .ck-bar-fill, .ck-toast { transition: none !important; }' +
            '}';

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // =========================================================================
    // КОМПОНЕНТ LAMPA: CINEMA KING
    // =========================================================================

    function CinemaKingComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var html = $('<div class="ck-root"></div>');
        var topbar = $('<div class="ck-topbar"></div>');
        var body = $('<div class="ck-body"></div>');
        var toastEl = $('<div class="ck-toast"></div>');

        var state = StorageManager.load();
        var activeTab = 'home';
        var lastFocused = null;
        var toastTimer = null;

        // Сессионное состояние битвы
        var battlePool = [];
        var battleSeen = {};
        var battlePage = 1;
        var currentPair = null;
        var isBattleLoading = false;
        var isAnimating = false;

        // Сессионное состояние «Царя горы»
        var kothPool = [];
        var kothSeen = {};
        var kothPage = 1;
        var currentChallenger = null;
        var isKothLoading = false;

        // Сессионное состояние рекомендаций и сортировки победителей
        var recsList = [];
        var recsPage = 1;
        var isRecsLoading = false;
        var winnersSort = 'date'; // 'date' | 'wins' | 'rating' | 'title'

        function showToast(message) {
            if (!message) return;
            clearTimeout(toastTimer);
            toastEl.text(message).addClass('is-visible');
            toastTimer = setTimeout(function () {
                toastEl.removeClass('is-visible');
            }, 3200);
        }

        function openLampaCard(item) {
            if (!item || !item.id) return;
            Lampa.Activity.push({
                url: '',
                component: 'full',
                id: item.id,
                method: item.media_type === 'tv' ? 'tv' : 'movie',
                card: {
                    id: item.id,
                    title: item.title,
                    name: item.title,
                    poster_path: item.poster_path || '',
                    backdrop_path: item.backdrop_path || '',
                    vote_average: item.rating || 0,
                    release_date: item.year ? item.year + '-01-01' : '',
                    first_air_date: item.year ? item.year + '-01-01' : '',
                    overview: item.overview || ''
                },
                source: 'tmdb'
            });
        }

        function bindScrollFocus(container) {
            container.find('.selector').on('hover:focus', function () {
                lastFocused = this;
                scroll.update($(this), true);
            });
        }

        function refreshFocus(preferredEl) {
            setTimeout(function () {
                bindScrollFocus(html);
                Lampa.Controller.collectionSet(html);
                var target = preferredEl && preferredEl.length ? preferredEl[0] : null;
                if (!target) {
                    var firstBodySelector = body.find('.selector').first();
                    target = firstBodySelector.length ? firstBodySelector[0] : html.find('.selector').first()[0];
                }
                if (target) {
                    lastFocused = target;
                    Lampa.Controller.collectionFocus(target, html);
                }
            }, 30);
        }

        // ---------------------------------------------------------------------
        // ВЕРХНЯЯ НАВИГАЦИЯ
        // ---------------------------------------------------------------------

        function renderTopbar() {
            var tabs = [
                { id: 'home', label: 'Главная' },
                { id: 'battle', label: 'Игра' },
                { id: 'koth', label: 'Царь горы' },
                { id: 'winners', label: 'Мои победители' },
                { id: 'recs', label: 'Рекомендации' },
                { id: 'taste', label: 'Мой вкус' },
                { id: 'settings', label: 'Настройки' }
            ];

            var crownSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20L20 7l-5 4-3-6-3 6-5-4-2 11z"/></svg>';

            topbar.empty();
            var brand = $('<div class="ck-brand"><div class="ck-brand-icon">' + crownSvg + '</div><div class="ck-brand-title">CINEMA KING</div></div>');
            var nav = $('<div class="ck-nav"></div>');

            for (var i = 0; i < tabs.length; i++) {
                (function (tab) {
                    var cls = 'ck-tab selector' + (activeTab === tab.id ? ' is-active' : '');
                    var btn = $('<div class="' + cls + '">' + esc(tab.label) + '</div>');
                    btn.on('hover:enter', function () {
                        switchTab(tab.id);
                    });
                    nav.append(btn);
                })(tabs[i]);
            }

            topbar.append(brand).append(nav);
        }

        function switchTab(tabId) {
            activeTab = tabId;
            renderTopbar();
            scroll.reset();

            if (tabId === 'home') renderHome();
            else if (tabId === 'battle') renderBattle();
            else if (tabId === 'koth') renderKoth();
            else if (tabId === 'winners') renderWinners();
            else if (tabId === 'recs') renderRecs();
            else if (tabId === 'taste') renderTaste();
            else if (tabId === 'settings') renderSettings();
        }

        // ---------------------------------------------------------------------
        // РАЗДЕЛ 1: ГЛАВНЫЙ ЭКРАН
        // ---------------------------------------------------------------------

        function renderHome() {
            var summary = TasteEngine.getTasteSummary(state);
            var view = $('<div class="ck-view"></div>');

            var hero = $(
                '<div class="ck-hero">' +
                    '<div class="ck-hero-badge">Интерактивный подбор кино</div>' +
                    '<h1 class="ck-hero-title">Найди свой идеальный фильм</h1>' +
                    '<p class="ck-hero-sub">Выбирай между двумя фильмами. Мы изучим твои предпочтения и подберём кино специально для тебя.</p>' +
                    '<div class="ck-actions"></div>' +
                '</div>'
            );

            var startBtn = $('<div class="ck-btn ck-btn--primary selector">Начать игру</div>');
            startBtn.on('hover:enter', function () {
                switchTab('battle');
            });

            var kothBtn = $('<div class="ck-btn ck-btn--secondary selector">Режим «Царь горы»</div>');
            kothBtn.on('hover:enter', function () {
                switchTab('koth');
            });

            var recsBtn = $('<div class="ck-btn ck-btn--secondary selector">Мои рекомендации</div>');
            recsBtn.on('hover:enter', function () {
                switchTab('recs');
            });

            hero.find('.ck-actions').append(startBtn).append(kothBtn).append(recsBtn);

            var kpi = $(
                '<div class="ck-kpi-grid">' +
                    '<div class="ck-kpi-card">' +
                        '<div class="ck-kpi-label">Проведено сравнений</div>' +
                        '<div class="ck-kpi-value">' + state.stats.comparisons + '</div>' +
                    '</div>' +
                    '<div class="ck-kpi-card">' +
                        '<div class="ck-kpi-label">Выбрано фильмов</div>' +
                        '<div class="ck-kpi-value">' + state.winners.length + '</div>' +
                    '</div>' +
                    '<div class="ck-kpi-card">' +
                        '<div class="ck-kpi-label">Твой киновкус</div>' +
                        '<div class="ck-kpi-text">' + esc(summary) + '</div>' +
                    '</div>' +
                '</div>'
            );

            view.append(hero).append(kpi);
            body.empty().append(view);
            refreshFocus(startBtn);
        }

        // ---------------------------------------------------------------------
        // ВСПОМОГАТЕЛЬНЫЙ РЕНДЕР БОЛЬШОЙ КАРТОЧКИ БИТВЫ
        // ---------------------------------------------------------------------

        function buildBattleCard(card, side, opts) {
            opts = opts || {};
            var enterCls = side === 'left' ? 'ck-card--enter-left' : 'ck-card--enter-right';
            var champCls = opts.isChampion ? ' ck-card--champion' : '';
            var el = $('<div class="ck-card selector ' + enterCls + champCls + '"></div>');

            var posterHtml;
            if (card.poster) {
                posterHtml = '<img src="' + esc(card.poster) + '" alt="' + esc(card.title) + '">';
            } else {
                posterHtml = '<div class="ck-poster-fallback">' + esc(getInitials(card.title)) + '</div>';
            }

            var ribbonHtml = '';
            if (opts.ribbonText) {
                ribbonHtml = '<div class="ck-card-ribbon' + (opts.ribbonChallenger ? ' ck-card-ribbon--challenger' : '') + '">' + esc(opts.ribbonText) + '</div>';
            }

            var genresHtml = '';
            var gList = (card.genres || []).slice(0, 3);
            for (var i = 0; i < gList.length; i++) {
                var gName = getGenreName(gList[i]);
                if (gName) genresHtml += '<span class="ck-genre-chip">' + esc(gName) + '</span>';
            }

            var ratingText = card.rating ? '★ ' + card.rating : 'Нет оценки';
            var yearText = card.year ? card.year : 'Год неизвестен';
            var runtimeText = card.runtime ? formatRuntime(card.runtime) : '';
            var overviewText = card.overview || 'Описание отсутствует в каталоге.';

            el.html(
                '<div class="ck-card-poster">' + posterHtml + ribbonHtml + '</div>' +
                '<div class="ck-card-info">' +
                    '<div>' +
                        '<h2 class="ck-card-title">' + esc(card.title) + '</h2>' +
                        '<div class="ck-meta-row">' +
                            '<span class="ck-rating-pill">' + esc(ratingText) + '</span>' +
                            '<span>' + esc(yearText) + '</span>' +
                            '<span class="ck-runtime-slot">' + esc(runtimeText) + '</span>' +
                        '</div>' +
                        '<div class="ck-genres">' + genresHtml + '</div>' +
                        '<p class="ck-overview">' + esc(overviewText) + '</p>' +
                    '</div>' +
                    '<div class="ck-card-cta">' + esc(opts.ctaText || 'Выбрать этот фильм') + '</div>' +
                '</div>'
            );

            // Обработка ошибки загрузки постера
            el.find('img').on('error', function () {
                $(this).replaceWith('<div class="ck-poster-fallback">' + esc(getInitials(card.title)) + '</div>');
            });

            // Подгрузка продолжительности в фоне без задержки интерфейса
            if (!card.runtime) {
                CatalogService.fetchRuntime(network, card, function (mins) {
                    el.find('.ck-runtime-slot').text('• ' + formatRuntime(mins));
                });
            } else {
                el.find('.ck-runtime-slot').text('• ' + runtimeText);
            }

            return el;
        }

        // ---------------------------------------------------------------------
        // ЗАГРУЗКА ПУЛА ФИЛЬМОВ ДЛЯ ИГРЫ
        // ---------------------------------------------------------------------

        function loadPoolBatch(targetPool, pageNum, useTasteBoost, onDone, onFail) {
            var s = state.settings;
            var mediaType = s.contentType === 'all' ? (pageNum % 2 === 0 ? 'tv' : 'movie') : s.contentType;
            var withGenres = '';

            // Когда набрана статистика, чередуем персонализированный и общий пул
            if (useTasteBoost && state.stats.comparisons >= 4 && pageNum % 2 === 0) {
                var topG = TasteEngine.getTopGenres(state, 2);
                if (topG.length) {
                    withGenres = topG.map(function (g) { return g.id; }).join('|');
                }
            }

            CatalogService.fetchDiscover(network, {
                mediaType: mediaType,
                page: pageNum,
                minRating: s.minRating,
                period: s.period,
                excludedGenres: s.excludedGenres,
                withGenres: withGenres,
                sortBy: pageNum % 3 === 0 ? 'vote_average.desc' : 'popularity.desc'
            }, function (items) {
                // Если строгие фильтры дали мало результатов, смягчаем запрос
                if (items.length < 4 && (s.minRating > 0 || s.period !== 'all' || withGenres)) {
                    CatalogService.fetchDiscover(network, {
                        mediaType: mediaType,
                        page: pageNum,
                        minRating: 0,
                        period: 'all',
                        excludedGenres: s.excludedGenres,
                        sortBy: 'popularity.desc',
                        minVotes: 50
                    }, function (fallbackItems) {
                        mergeUnique(targetPool, fallbackItems);
                        onDone(targetPool.length);
                    }, onFail);
                    return;
                }
                mergeUnique(targetPool, items);
                onDone(targetPool.length);
            }, onFail);
        }

        function mergeUnique(pool, items) {
            var existing = {};
            var i;
            for (i = 0; i < pool.length; i++) existing[cardKey(pool[i])] = true;
            for (i = 0; i < items.length; i++) {
                var k = cardKey(items[i]);
                if (!existing[k]) {
                    existing[k] = true;
                    pool.push(items[i]);
                }
            }
        }

        // ---------------------------------------------------------------------
        // РАЗДЕЛ 2: ОСНОВНОЙ РЕЖИМ — БИТВА ФИЛЬМОВ
        // ---------------------------------------------------------------------

        function renderBattle() {
            if (!currentPair) {
                var next = TasteEngine.pickNextPair(state, battlePool, battleSeen);
                if (next) {
                    currentPair = next;
                } else {
                    fetchMoreForBattle();
                    return;
                }
            }

            var leftCard = currentPair[0];
            var rightCard = currentPair[1];
            battleSeen[cardKey(leftCard)] = true;
            battleSeen[cardKey(rightCard)] = true;

            var view = $('<div class="ck-view"></div>');
            view.append(
                '<div class="ck-arena-head">' +
                    '<div class="ck-arena-title">Битва фильмов • Раунд ' + (state.stats.comparisons + 1) + '</div>' +
                    '<div class="ck-arena-meta">Выбери лучший вариант, чтобы обучить подборку</div>' +
                '</div>'
            );

            var wrap = $('<div class="ck-battle-wrap"><div class="ck-vs-badge">VS</div></div>');
            var elLeft = buildBattleCard(leftCard, 'left', { ctaText: 'Выбрать фильм №1' });
            var elRight = buildBattleCard(rightCard, 'right', { ctaText: 'Выбрать фильм №2' });

            function handlePick(winner, loser, winEl, loseEl, loseSide) {
                if (isAnimating) return;
                isAnimating = true;

                winEl.addClass('ck-card--win');
                loseEl.addClass(loseSide === 'left' ? 'ck-card--lose-left' : 'ck-card--lose-right');

                TasteEngine.recordBattleChoice(state, winner, loser);

                // Эффекты при достижении вех
                var c = state.stats.comparisons;
                if (c === 5) showToast('Отличный старт! 5 сравнений — профиль вкуса начал формироваться.');
                else if (c === 10) showToast('Достижение: 10 битв! Персональные рекомендации стали точнее.');
                else if (c === 25) showToast('Киноман: 25 сравнений пройдено!');
                else if (c === 50) showToast('Мастер Cinema King: 50 битв позади!');

                var delay = isReducedMotion() ? 90 : 480;
                setTimeout(function () {
                    isAnimating = false;
                    currentPair = null;
                    if (activeTab === 'battle') renderBattle();
                }, delay);
            }

            elLeft.on('hover:enter', function () {
                handlePick(leftCard, rightCard, elLeft, elRight, 'right');
            });
            elRight.on('hover:enter', function () {
                handlePick(rightCard, leftCard, elRight, elLeft, 'left');
            });

            wrap.append(elLeft).append(elRight);

            var footer = $('<div class="ck-battle-footer"></div>');
            var skipBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Пропустить пару</div>');
            skipBtn.on('hover:enter', function () {
                if (isAnimating) return;
                currentPair = null;
                renderBattle();
            });

            var openLeftBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Подробнее о №1</div>');
            openLeftBtn.on('hover:enter', function () { openLampaCard(leftCard); });

            var openRightBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Подробнее о №2</div>');
            openRightBtn.on('hover:enter', function () { openLampaCard(rightCard); });

            footer.append(openLeftBtn).append(skipBtn).append(openRightBtn);

            view.append(wrap).append(footer);
            body.empty().append(view);
            refreshFocus(elLeft);

            // Заранее подгружаем следующую страницу, если пул подходит к концу
            var unseenCount = 0;
            for (var i = 0; i < battlePool.length; i++) {
                if (!battleSeen[cardKey(battlePool[i])]) unseenCount++;
            }
            if (unseenCount < 6 && !isBattleLoading) {
                isBattleLoading = true;
                battlePage += 1;
                loadPoolBatch(battlePool, battlePage, true, function () {
                    isBattleLoading = false;
                }, function () {
                    isBattleLoading = false;
                });
            }
        }

        function fetchMoreForBattle() {
            body.html('<div class="ck-state-box"><div class="ck-spinner"></div><div>Подбираем фильмы из каталога...</div></div>');
            isBattleLoading = true;

            loadPoolBatch(battlePool, battlePage, true, function () {
                isBattleLoading = false;
                battlePage += 1;
                var pair = TasteEngine.pickNextPair(state, battlePool, battleSeen);
                if (pair) {
                    currentPair = pair;
                    if (activeTab === 'battle') renderBattle();
                } else {
                    renderErrorState('Не удалось найти достаточно уникальных фильмов по текущим фильтрам.', function () {
                        battleSeen = {};
                        battlePool = [];
                        battlePage = 1;
                        renderBattle();
                    });
                }
            }, function () {
                isBattleLoading = false;
                renderErrorState('Ошибка сети при загрузке каталога TMDB. Проверьте соединение или прокси в настройках Lampa.', function () {
                    renderBattle();
                });
            });
        }

        // ---------------------------------------------------------------------
        // РАЗДЕЛ 3: РЕЖИМ «ЦАРЬ ГОРЫ» (ОТДЕЛЬНАЯ МЕХАНИКА)
        // ---------------------------------------------------------------------

        function getNextKothCard() {
            for (var i = 0; i < kothPool.length; i++) {
                var c = kothPool[i];
                var k = cardKey(c);
                var isChamp = state.koth.champion && cardKey(state.koth.champion) === k;
                if (!kothSeen[k] && !isChamp) {
                    kothSeen[k] = true;
                    return c;
                }
            }
            return null;
        }

        function updateHallOfFame(card, streak) {
            if (!card || streak < 1) return;
            var hof = state.koth.hallOfFame;
            var found = null;
            for (var i = 0; i < hof.length; i++) {
                if (hof[i].card.id === card.id && hof[i].card.media_type === card.media_type) {
                    found = hof[i];
                    break;
                }
            }
            if (found) {
                if (streak > found.maxStreak) found.maxStreak = streak;
                found.date = Date.now();
            } else {
                hof.push({
                    card: {
                        id: card.id,
                        media_type: card.media_type,
                        title: card.title,
                        year: card.year,
                        poster_path: card.poster_path,
                        backdrop_path: card.backdrop_path,
                        poster: card.poster,
                        rating: card.rating,
                        overview: card.overview
                    },
                    maxStreak: streak,
                    date: Date.now()
                });
            }
            hof.sort(function (a, b) {
                return b.maxStreak - a.maxStreak;
            });
            if (hof.length > 20) state.koth.hallOfFame = hof.slice(0, 20);
        }

        function renderKoth() {
            if (!state.koth.champion) {
                var firstChamp = getNextKothCard();
                if (!firstChamp) {
                    fetchMoreForKoth();
                    return;
                }
                state.koth.champion = firstChamp;
                state.koth.streak = 0;
                state.koth.round = 1;
                StorageManager.save(state);
            }

            if (!currentChallenger) {
                currentChallenger = getNextKothCard();
                if (!currentChallenger) {
                    fetchMoreForKoth();
                    return;
                }
            }

            var champ = state.koth.champion;
            var chal = currentChallenger;

            var view = $('<div class="ck-view"></div>');
            view.append(
                '<div class="ck-arena-head">' +
                    '<div class="ck-arena-title">Царь горы • Раунд ' + state.koth.round + '</div>' +
                    '<div class="ck-arena-meta">Победитель остаётся на троне (не влияет на обычные рекомендации)</div>' +
                '</div>'
            );

            var wrap = $('<div class="ck-battle-wrap"><div class="ck-vs-badge">VS</div></div>');
            var elChamp = buildBattleCard(champ, 'left', {
                isChampion: true,
                ribbonText: 'ЧЕМПИОН • Побед: ' + state.koth.streak,
                ctaText: 'Оставить чемпиона'
            });
            var elChal = buildBattleCard(chal, 'right', {
                ribbonText: 'ПРЕТЕНДЕНТ',
                ribbonChallenger: true,
                ctaText: 'Свергнуть чемпиона'
            });

            function pickKoth(winnerIsChamp) {
                if (isAnimating) return;
                isAnimating = true;

                if (winnerIsChamp) {
                    elChamp.addClass('ck-card--win');
                    elChal.addClass('ck-card--lose-right');
                    state.koth.streak += 1;
                    state.koth.round += 1;
                    updateHallOfFame(champ, state.koth.streak);

                    if (state.koth.streak === 3) showToast('Серия из 3 побед! «' + champ.title + '» держит вершину.');
                    else if (state.koth.streak === 5) showToast('Непобедимый чемпион: 5 побед подряд!');
                    else if (state.koth.streak === 10) showToast('Легенда Cinema King: 10 побед подряд!');
                } else {
                    elChal.addClass('ck-card--win');
                    elChamp.addClass('ck-card--lose-left');
                    if (state.koth.streak >= 1) {
                        updateHallOfFame(champ, state.koth.streak);
                    }
                    state.koth.champion = chal;
                    state.koth.streak = 1;
                    state.koth.round += 1;
                    updateHallOfFame(chal, 1);
                    showToast('Новый чемпион: «' + chal.title + '»!');
                }

                StorageManager.save(state);

                var delay = isReducedMotion() ? 90 : 480;
                setTimeout(function () {
                    isAnimating = false;
                    currentChallenger = null;
                    if (activeTab === 'koth') renderKoth();
                }, delay);
            }

            elChamp.on('hover:enter', function () { pickKoth(true); });
            elChal.on('hover:enter', function () { pickKoth(false); });

            wrap.append(elChamp).append(elChal);

            var footer = $('<div class="ck-battle-footer"></div>');
            var newTourneyBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Начать новый турнир</div>');
            newTourneyBtn.on('hover:enter', function () {
                state.koth.champion = null;
                state.koth.streak = 0;
                state.koth.round = 1;
                currentChallenger = null;
                StorageManager.save(state);
                renderKoth();
            });
            footer.append(newTourneyBtn);

            view.append(wrap).append(footer);

            // Личный рейтинг победителей «Царя горы»
            if (state.koth.hallOfFame.length) {
                var hofPanel = $('<div class="ck-panel" style="margin-top: 1.5em;"><div class="ck-panel-title">Личный рейтинг «Царя горы»</div><div class="ck-hof-list"></div></div>');
                var hofList = hofPanel.find('.ck-hof-list');
                var limit = Math.min(6, state.koth.hallOfFame.length);

                for (var i = 0; i < limit; i++) {
                    (function (entry, rank) {
                        var row = $(
                            '<div class="ck-hof-item selector">' +
                                '<div class="ck-hof-rank">#' + rank + '</div>' +
                                '<div>' +
                                    '<div style="font-weight:700;color:#fff;">' + esc(entry.card.title) + '</div>' +
                                    '<div style="font-size:0.84em;color:#7dd3fc;">Серия побед: ' + entry.maxStreak + (entry.card.year ? ' • ' + esc(entry.card.year) : '') + '</div>' +
                                '</div>' +
                            '</div>'
                        );
                        row.on('hover:enter', function () {
                            openLampaCard(entry.card);
                        });
                        hofList.append(row);
                    })(state.koth.hallOfFame[i], i + 1);
                }
                view.append(hofPanel);
            }

            body.empty().append(view);
            refreshFocus(elChamp);
        }

        function fetchMoreForKoth() {
            body.html('<div class="ck-state-box"><div class="ck-spinner"></div><div>Готовим претендентов для «Царя горы»...</div></div>');
            if (isKothLoading) return;
            isKothLoading = true;

            loadPoolBatch(kothPool, kothPage, false, function () {
                isKothLoading = false;
                kothPage += 1;
                if (kothPool.length >= 2) {
                    if (activeTab === 'koth') renderKoth();
                } else {
                    renderErrorState('Недостаточно фильмов для запуска режима «Царь горы».', function () {
                        kothSeen = {};
                        kothPool = [];
                        kothPage = 1;
                        renderKoth();
                    });
                }
            }, function () {
                isKothLoading = false;
                renderErrorState('Не удалось загрузить претендентов из каталога.', function () {
                    renderKoth();
                });
            });
        }

        // ---------------------------------------------------------------------
        // РАЗДЕЛ 4: МОИ ПОБЕДИТЕЛИ
        // ---------------------------------------------------------------------

        function renderWinners() {
            var view = $('<div class="ck-view"></div>');

            if (!state.winners.length) {
                var empty = $(
                    '<div class="ck-state-box">' +
                        '<h3 style="margin:0 0 0.5em;">Список победителей пока пуст</h3>' +
                        '<p style="color:#94a3b8;margin:0 0 1.2em;">Сыграй в «Битву фильмов», и все выбранные тобой картины появятся здесь.</p>' +
                    '</div>'
                );
                var goBtn = $('<div class="ck-btn ck-btn--primary selector">Перейти к игре</div>');
                goBtn.on('hover:enter', function () { switchTab('battle'); });
                empty.append(goBtn);
                view.append(empty);
                body.empty().append(view);
                refreshFocus(goBtn);
                return;
            }

            var toolbar = $('<div class="ck-toolbar"><div class="ck-arena-title">Мои победители (' + state.winners.length + ')</div><div class="ck-chips"></div></div>');
            var sorts = [
                { id: 'date', label: 'По дате' },
                { id: 'wins', label: 'По победам' },
                { id: 'rating', label: 'По рейтингу' },
                { id: 'title', label: 'По названию' }
            ];

            for (var s = 0; s < sorts.length; s++) {
                (function (opt) {
                    var chip = $('<div class="ck-chip selector' + (winnersSort === opt.id ? ' is-selected' : '') + '">' + esc(opt.label) + '</div>');
                    chip.on('hover:enter', function () {
                        winnersSort = opt.id;
                        renderWinners();
                    });
                    toolbar.find('.ck-chips').append(chip);
                })(sorts[s]);
            }

            var list = state.winners.slice();
            list.sort(function (a, b) {
                if (winnersSort === 'wins') return (b.wins || 1) - (a.wins || 1);
                if (winnersSort === 'rating') return (b.rating || 0) - (a.rating || 0);
                if (winnersSort === 'title') return String(a.title).localeCompare(String(b.title));
                return (b.lastWon || 0) - (a.lastWon || 0);
            });

            var grid = $('<div class="ck-grid"></div>');
            for (var i = 0; i < list.length; i++) {
                (function (item) {
                    var thumb = item.poster
                        ? '<img src="' + esc(item.poster) + '" alt="' + esc(item.title) + '">'
                        : '<div class="ck-poster-fallback" style="font-size:1.4em;">' + esc(getInitials(item.title)) + '</div>';

                    var cardEl = $(
                        '<div class="ck-item-card">' +
                            '<div class="ck-item-top selector">' +
                                '<div class="ck-item-thumb">' + thumb + '</div>' +
                                '<div class="ck-item-body">' +
                                    '<div class="ck-item-title">' + esc(item.title) + '</div>' +
                                    '<div class="ck-meta-row" style="margin-bottom:0.4em;">' +
                                        '<span class="ck-rating-pill">' + (item.rating ? '★ ' + item.rating : '—') + '</span>' +
                                        '<span>' + esc(item.year || '') + '</span>' +
                                    '</div>' +
                                    '<div style="font-size:0.84em;color:#7dd3fc;">Побед в битвах: ' + (item.wins || 1) + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="ck-item-actions">' +
                                '<div class="ck-item-act selector ck-act-open">Открыть в Lampa</div>' +
                                '<div class="ck-item-act ck-item-act--del selector ck-act-del">Удалить</div>' +
                            '</div>' +
                        '</div>'
                    );

                    cardEl.find('img').on('error', function () {
                        $(this).replaceWith('<div class="ck-poster-fallback" style="font-size:1.4em;">' + esc(getInitials(item.title)) + '</div>');
                    });
                    cardEl.find('.ck-item-top, .ck-act-open').on('hover:enter', function () {
                        openLampaCard(item);
                    });
                    cardEl.find('.ck-act-del').on('hover:enter', function () {
                        state.winners = state.winners.filter(function (w) {
                            return !(w.id === item.id && w.media_type === item.media_type);
                        });
                        StorageManager.save(state);
                        showToast('Удалено из списка победителей.');
                        renderWinners();
                    });

                    grid.append(cardEl);
                })(list[i]);
            }

            view.append(toolbar).append(grid);
            body.empty().append(view);
            refreshFocus(grid.find('.selector').first());
        }

        // ---------------------------------------------------------------------
        // РАЗДЕЛ 5: ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ
        // ---------------------------------------------------------------------

        function renderRecs(forceReload) {
            if (!forceReload && recsList.length) {
                drawRecsList();
                return;
            }
            if (isRecsLoading) return;
            isRecsLoading = true;

            body.html('<div class="ck-state-box"><div class="ck-spinner"></div><div>Подбираем персональные рекомендации на основе твоих выборов...</div></div>');

            var topGenres = TasteEngine.getTopGenres(state, 2);
            var withGenres = topGenres.length ? topGenres.map(function (g) { return g.id; }).join('|') : '';
            var preferredType = state.settings.contentType;
            if (preferredType === 'all') {
                preferredType = state.typeScores.tv > state.typeScores.movie ? 'tv' : 'movie';
            }

            CatalogService.fetchDiscover(network, {
                mediaType: preferredType,
                page: recsPage,
                minRating: Math.max(6.2, state.settings.minRating || 0),
                period: state.settings.period,
                excludedGenres: state.settings.excludedGenres,
                withGenres: withGenres,
                sortBy: 'popularity.desc',
                minVotes: 150
            }, function (items) {
                isRecsLoading = false;

                // Исключаем уже выигравшие фильмы
                var wonMap = {};
                var i;
                for (i = 0; i < state.winners.length; i++) {
                    wonMap[cardKey(state.winners[i])] = true;
                }

                var filtered = [];
                for (i = 0; i < items.length; i++) {
                    if (!wonMap[cardKey(items[i])]) {
                        filtered.push({
                            card: items[i],
                            match: TasteEngine.scoreCard(state, items[i]),
                            reason: TasteEngine.explainRecommendation(state, items[i])
                        });
                    }
                }

                filtered.sort(function (a, b) {
                    return b.match - a.match;
                });

                recsList = filtered.slice(0, 12);
                if (activeTab === 'recs') {
                    if (recsList.length) drawRecsList();
                    else {
                        renderErrorState('По текущим фильтрам рекомендаций не найдено. Попробуй обновить подборку или смягчить фильтры.', function () {
                            recsPage = 1;
                            renderRecs(true);
                        });
                    }
                }
            }, function () {
                isRecsLoading = false;
                renderErrorState('Ошибка загрузки рекомендаций из TMDB.', function () {
                    renderRecs(true);
                });
            });
        }

        function drawRecsList() {
            var view = $('<div class="ck-view"></div>');

            var toolbar = $('<div class="ck-toolbar"><div class="ck-arena-title">Персональные рекомендации</div></div>');
            var refreshBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Обновить подборку</div>');
            refreshBtn.on('hover:enter', function () {
                recsPage = recsPage >= 5 ? 1 : recsPage + 1;
                recsList = [];
                renderRecs(true);
            });
            toolbar.append(refreshBtn);
            view.append(toolbar);

            if (state.stats.comparisons < 3) {
                view.append('<div class="ck-panel" style="padding:1em 1.2em;color:#93c5fd;">Пока собрано мало данных (' + state.stats.comparisons + ' сравнений). Сыграй ещё пару раундов, чтобы рекомендации точнее отражали твой вкус.</div>');
            }

            var grid = $('<div class="ck-grid"></div>');
            for (var i = 0; i < recsList.length; i++) {
                (function (entry) {
                    var c = entry.card;
                    var thumb = c.poster
                        ? '<img src="' + esc(c.poster) + '" alt="' + esc(c.title) + '">'
                        : '<div class="ck-poster-fallback" style="font-size:1.4em;">' + esc(getInitials(c.title)) + '</div>';

                    var gNames = [];
                    for (var g = 0; g < Math.min(3, (c.genres || []).length); g++) {
                        var nm = getGenreName(c.genres[g]);
                        if (nm) gNames.push(nm);
                    }

                    var cardEl = $(
                        '<div class="ck-item-card">' +
                            '<div class="ck-item-top selector">' +
                                '<div class="ck-item-thumb">' + thumb + '</div>' +
                                '<div class="ck-item-body">' +
                                    '<div class="ck-item-title">' + esc(c.title) + '</div>' +
                                    '<div class="ck-meta-row" style="margin-bottom:0.35em;">' +
                                        '<span class="ck-rating-pill">' + (c.rating ? '★ ' + c.rating : '—') + '</span>' +
                                        '<span>' + esc(c.year || '') + '</span>' +
                                        '<span style="color:#38bdf8;font-weight:700;">' + entry.match + '%</span>' +
                                    '</div>' +
                                    '<div style="font-size:0.78em;color:#94a3b8;">' + esc(gNames.join(' • ')) + '</div>' +
                                    '<div class="ck-item-reason">' + esc(entry.reason) + '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>'
                    );

                    cardEl.find('img').on('error', function () {
                        $(this).replaceWith('<div class="ck-poster-fallback" style="font-size:1.4em;">' + esc(getInitials(c.title)) + '</div>');
                    });
                    cardEl.find('.ck-item-top').on('hover:enter', function () {
                        openLampaCard(c);
                    });
                    grid.append(cardEl);
                })(recsList[i]);
            }

            view.append(grid);
            body.empty().append(view);
            refreshFocus(grid.find('.selector').first());
        }

        // ---------------------------------------------------------------------
        // РАЗДЕЛ 6: МОЙ ВКУС (СТАТИСТИКА И ГРАФИКИ)
        // ---------------------------------------------------------------------

        function renderTaste() {
            var view = $('<div class="ck-view"></div>');
            var topGenres = TasteEngine.getTopGenres(state, 7);
            var avgRating = TasteEngine.getAveragePreferredRating(state);
            var topDec = TasteEngine.getTopDecade(state);

            var kpi = $(
                '<div class="ck-kpi-grid" style="margin-bottom:1.25em;">' +
                    '<div class="ck-kpi-card"><div class="ck-kpi-label">Всего сравнений</div><div class="ck-kpi-value">' + state.stats.comparisons + '</div></div>' +
                    '<div class="ck-kpi-card"><div class="ck-kpi-label">Уникальных побед</div><div class="ck-kpi-value">' + state.winners.length + '</div></div>' +
                    '<div class="ck-kpi-card"><div class="ck-kpi-label">Средний рейтинг выбора</div><div class="ck-kpi-value">' + (avgRating ? '★ ' + avgRating : '—') + '</div></div>' +
                    '<div class="ck-kpi-card"><div class="ck-kpi-label">Любимая эпоха</div><div class="ck-kpi-value" style="font-size:1.4em;">' + esc(topDec ? decadeLabel(topDec) : '—') + '</div></div>' +
                '</div>'
            );
            view.append(kpi);

            // Горизонтальные индикаторы любимых жанров
            var genrePanel = $('<div class="ck-panel"><div class="ck-panel-title">Любимые жанры</div></div>');
            if (!topGenres.length) {
                genrePanel.append('<div style="color:#94a3b8;">Пока нет данных. Проведи несколько сравнений в игре!</div>');
            } else {
                for (var i = 0; i < topGenres.length; i++) {
                    var g = topGenres[i];
                    genrePanel.append(
                        '<div class="ck-bar-row">' +
                            '<div class="ck-bar-head"><span>' + esc(g.name) + '</span><span style="color:#7dd3fc;font-weight:700;">' + g.percent + '%</span></div>' +
                            '<div class="ck-bar-track"><div class="ck-bar-fill" style="width:' + g.percent + '%;"></div></div>' +
                        '</div>'
                    );
                }
            }
            view.append(genrePanel);

            // История последних выборов
            var histPanel = $('<div class="ck-panel"><div class="ck-panel-title">Последние выборы</div></div>');
            if (!state.history.length) {
                histPanel.append('<div style="color:#94a3b8;">История сравнений пуста.</div>');
            } else {
                var maxH = Math.min(12, state.history.length);
                for (var h = 0; h < maxH; h++) {
                    var row = state.history[h];
                    histPanel.append(
                        '<div class="ck-history-row">' +
                            '<span class="ck-history-win">✓ ' + esc(row.winnerTitle) + '</span>' +
                            '<span class="ck-history-lose">против «' + esc(row.loserTitle) + '»</span>' +
                        '</div>'
                    );
                }
            }
            view.append(histPanel);

            body.empty().append(view);
            refreshFocus(topbar.find('.is-active'));
        }

        // ---------------------------------------------------------------------
        // РАЗДЕЛ 7: НАСТРОЙКИ
        // ---------------------------------------------------------------------

        function renderSettings() {
            var view = $('<div class="ck-view"></div>');
            var panel = $('<div class="ck-panel"><div class="ck-panel-title">Настройки подбора</div></div>');

            function invalidatePools() {
                battlePool = [];
                battlePage = 1;
                currentPair = null;
                kothPool = [];
                kothPage = 1;
                currentChallenger = null;
                recsList = [];
                recsPage = 1;
                StorageManager.save(state);
            }

            // 1. Тип контента
            var typeGroup = $('<div class="ck-setting-group"><div class="ck-setting-label">Тип контента</div><div class="ck-chips"></div></div>');
            for (var i = 0; i < CONTENT_OPTIONS.length; i++) {
                (function (opt) {
                    var chip = $('<div class="ck-chip selector' + (state.settings.contentType === opt.id ? ' is-selected' : '') + '">' + esc(opt.label) + '</div>');
                    chip.on('hover:enter', function () {
                        state.settings.contentType = opt.id;
                        invalidatePools();
                        renderSettings();
                    });
                    typeGroup.find('.ck-chips').append(chip);
                })(CONTENT_OPTIONS[i]);
            }
            panel.append(typeGroup);

            // 2. Минимальный рейтинг
            var ratGroup = $('<div class="ck-setting-group"><div class="ck-setting-label">Минимальный рейтинг</div><div class="ck-chips"></div></div>');
            for (var r = 0; r < RATING_OPTIONS.length; r++) {
                (function (opt) {
                    var chip = $('<div class="ck-chip selector' + (state.settings.minRating === opt.value ? ' is-selected' : '') + '">' + esc(opt.label) + '</div>');
                    chip.on('hover:enter', function () {
                        state.settings.minRating = opt.value;
                        invalidatePools();
                        renderSettings();
                    });
                    ratGroup.find('.ck-chips').append(chip);
                })(RATING_OPTIONS[r]);
            }
            panel.append(ratGroup);

            // 3. Предпочтительный период выпуска
            var perGroup = $('<div class="ck-setting-group"><div class="ck-setting-label">Период выпуска</div><div class="ck-chips"></div></div>');
            for (var p = 0; p < PERIOD_OPTIONS.length; p++) {
                (function (opt) {
                    var chip = $('<div class="ck-chip selector' + (state.settings.period === opt.id ? ' is-selected' : '') + '">' + esc(opt.label) + '</div>');
                    chip.on('hover:enter', function () {
                        state.settings.period = opt.id;
                        invalidatePools();
                        renderSettings();
                    });
                    perGroup.find('.ck-chips').append(chip);
                })(PERIOD_OPTIONS[p]);
            }
            panel.append(perGroup);

            // 4. Исключение жанров
            var exGroup = $('<div class="ck-setting-group"><div class="ck-setting-label">Исключить жанры (нажми, чтобы скрыть из игры)</div><div class="ck-chips"></div></div>');
            for (var g = 0; g < SELECTABLE_GENRES.length; g++) {
                (function (gid) {
                    var isEx = state.settings.excludedGenres.indexOf(gid) !== -1;
                    var chip = $('<div class="ck-chip selector' + (isEx ? ' is-excluded' : '') + '">' + esc(getGenreName(gid)) + '</div>');
                    chip.on('hover:enter', function () {
                        var idx = state.settings.excludedGenres.indexOf(gid);
                        if (idx === -1) state.settings.excludedGenres.push(gid);
                        else state.settings.excludedGenres.splice(idx, 1);
                        invalidatePools();
                        renderSettings();
                    });
                    exGroup.find('.ck-chips').append(chip);
                })(SELECTABLE_GENRES[g]);
            }
            panel.append(exGroup);

            // 5. Сброс данных
            var resetPanel = $('<div class="ck-panel"><div class="ck-panel-title">Управление данными</div><div class="ck-actions"></div></div>');

            var resetTasteBtn = $('<div class="ck-btn ck-btn--danger selector">Сбросить статистику и вкусы</div>');
            resetTasteBtn.on('hover:enter', function () {
                state.stats = { comparisons: 0, wins: 0 };
                state.genreScores = {};
                state.decadeScores = {};
                state.typeScores = { movie: 0, tv: 0 };
                state.ratingSum = 0;
                state.ratingCount = 0;
                recsList = [];
                StorageManager.save(state);
                showToast('Статистика и профиль предпочтений сброшены.');
            });

            var resetHistBtn = $('<div class="ck-btn ck-btn--danger selector">Сбросить историю и победителей</div>');
            resetHistBtn.on('hover:enter', function () {
                state.winners = [];
                state.history = [];
                state.koth = { champion: null, streak: 0, round: 1, hallOfFame: [] };
                battleSeen = {};
                kothSeen = {};
                StorageManager.save(state);
                showToast('История сравнений, победители и Зал славы очищены.');
            });

            resetPanel.find('.ck-actions').append(resetTasteBtn).append(resetHistBtn);

            view.append(panel).append(resetPanel);
            body.empty().append(view);
            refreshFocus(panel.find('.selector').first());
        }

        // ---------------------------------------------------------------------
        // ЭКРАН ОШИБКИ
        // ---------------------------------------------------------------------

        function renderErrorState(message, onRetry) {
            var box = $('<div class="ck-state-box"><div style="margin-bottom:1.1em;color:#fca5a5;">' + esc(message) + '</div></div>');
            var retryBtn = $('<div class="ck-btn ck-btn--primary selector">Повторить</div>');
            retryBtn.on('hover:enter', function () {
                if (onRetry) onRetry();
            });
            box.append(retryBtn);
            body.empty().append(box);
            refreshFocus(retryBtn);
        }

        // ---------------------------------------------------------------------
        // ЖИЗНЕННЫЙ ЦИКЛ КОМПОНЕНТА LAMPA
        // ---------------------------------------------------------------------

        this.create = function () {
            injectStyles();
            html.append(topbar).append(body);
            scroll.append(html);
            $('body').append(toastEl);

            renderTopbar();
            renderHome();
            return this.render();
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(lastFocused || false, html);
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: function () {
                    if (activeTab !== 'home') {
                        switchTab('home');
                    } else {
                        Lampa.Activity.backward();
                    }
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};

        this.render = function () {
            return scroll.render();
        };

        this.destroy = function () {
            clearTimeout(toastTimer);
            network.clear();
            scroll.destroy();
            toastEl.remove();
            html.remove();
        };
    }

    // =========================================================================
    // РЕГИСТРАЦИЯ ПЛАГИНА И КНОПКИ В МЕНЮ LAMPA
    // =========================================================================

    function addMenuButton() {
        var menuList = $('.menu .menu__list').eq(0);
        if (!menuList.length || menuList.find('.ck-menu-item').length) return;

        var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20L20 7l-5 4-3-6-3 6-5-4-2 11z"/></svg>';

        var item = $(
            '<li class="menu__item selector ck-menu-item">' +
                '<div class="menu__ico">' + icon + '</div>' +
                '<div class="menu__text">Cinema King</div>' +
            '</li>'
        );

        item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'Cinema King',
                component: PLUGIN_ID,
                page: 1
            });
        });

        menuList.append(item);
    }

    function initPlugin() {
        Lampa.Component.add(PLUGIN_ID, CinemaKingComponent);
        addMenuButton();
    }

    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initPlugin();
        });
    }
})();
