(function () {
    'use strict';

    // Защита от повторной инициализации
    if (window.cinema_king_plugin) return;
    window.cinema_king_plugin = true;

    var PLUGIN_ID = 'cinema_king';
    var STORAGE_KEY = 'cinema_king_state_v2';
    var STYLE_ID = 'cinema-king-styles-v2';

    // Полный справочник жанров TMDB
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

    // 13 жанров для мастера «Подобрать под мой вкус» с проверенными backdrop-кадрами TMDB
    var TASTE_WIZARD_GENRES = [
        { id: 878, name: 'Фантастика', tvId: 10765, backdrop: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg', accent: '#1d4ed8' },
        { id: 28, name: 'Боевик', tvId: 10759, backdrop: '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg', accent: '#0369a1' },
        { id: 35, name: 'Комедия', tvId: 35, backdrop: '/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg', accent: '#0284c7' },
        { id: 18, name: 'Драма', tvId: 18, backdrop: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', accent: '#1e40af' },
        { id: 27, name: 'Ужасы', tvId: 9648, backdrop: '/roYyPiQDQKmIKUEhO912693tSja.jpg', accent: '#1e3a8a' },
        { id: 53, name: 'Триллер', tvId: 80, backdrop: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', accent: '#0f172a' },
        { id: 9648, name: 'Детектив', tvId: 9648, backdrop: '/pbrkL804c8yAv3zBZR4QPEafpAR.jpg', accent: '#1d4ed8' },
        { id: 12, name: 'Приключения', tvId: 10759, backdrop: '/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg', accent: '#0369a1' },
        { id: 10749, name: 'Мелодрама', tvId: 10749, backdrop: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', accent: '#1e40af' },
        { id: 14, name: 'Фэнтези', tvId: 10765, backdrop: '/vVpEOvdxVBP2aV166j5Xlvb5Cdc.jpg', accent: '#1d4ed8' },
        { id: 80, name: 'Криминал', tvId: 80, backdrop: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg', accent: '#0f172a' },
        { id: 10752, name: 'Военный', tvId: 10768, backdrop: '/ddIkmH3fnspJyRJPjf410765.jpg', accent: '#1e3a8a' },
        { id: 36, name: 'Исторический', tvId: 18, backdrop: '/zb6fM1CX41D9rF9hdgclu0peUmy.jpg', accent: '#0369a1' }
    ];

    // Культовые резервные фоны для плавного слайдшоу на главном экране (если каталог ещё не загружен)
    var DEFAULT_HERO_BACKDROPS = [
        { title: 'Интерстеллар', backdrop: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg' },
        { title: 'Начало', backdrop: '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg' },
        { title: 'Дюна', backdrop: '/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg' },
        { title: 'Бегущий по лезвию 2049', backdrop: '/ilRyazdMJwN05exqhwK4tMKBYZs.jpg' },
        { title: 'Тёмный рыцарь', backdrop: '/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg' }
    ];

    var SELECTABLE_GENRES = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 9648, 10749, 878, 53, 10752, 37];

    var PERIOD_OPTIONS = [
        { id: 'all', label: 'Любые годы', from: null, to: null },
        { id: 'modern', label: 'Современные (2015+)', from: '2015-01-01', to: '2029-12-31' },
        { id: '2020s', label: '2020-е', from: '2020-01-01', to: '2029-12-31' },
        { id: '2010s', label: '2010-е', from: '2010-01-01', to: '2019-12-31' },
        { id: '2000s', label: '2000-е', from: '2000-01-01', to: '2009-12-31' },
        { id: 'classic', label: 'Классика (до 2000)', from: '1950-01-01', to: '1999-12-31' }
    ];

    var RATING_OPTIONS = [
        { value: 0, label: 'Любой' },
        { value: 6.0, label: '6.0+' },
        { value: 7.0, label: '7.0+' },
        { value: 7.5, label: '7.5+' },
        { value: 8.0, label: '8.0+' }
    ];

    var CONTENT_OPTIONS = [
        { id: 'movie', label: 'Фильмы' },
        { id: 'tv', label: 'Сериалы' },
        { id: 'all', label: 'Фильмы и сериалы' }
    ];

    var ROUNDS_OPTIONS = [10, 15, 20, 30];

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

    function isReducedMotion(state) {
        if (state && state.settings && state.settings.liteAnimations) return true;
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
        if (y < 2000) return 'classic';
        return String(Math.floor(y / 10) * 10) + 's';
    }

    function decadeLabel(dec) {
        if (dec === 'classic') return 'классика до 2000';
        if (dec === '2000s') return '2000-е';
        if (dec === '2010s') return '2010-е';
        if (dec === '2020s') return '2020-е';
        if (dec === 'modern') return 'современное кино (2015+)';
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
    // ХРАНИЛИЩЕ И МИГРАЦИЯ ДАННЫХ
    // =========================================================================

    function createDefaultState() {
        return {
            stats: {
                comparisons: 0,
                wins: 0,
                skips: 0
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
            tasteTimeline: [],
            settings: {
                contentType: 'movie',
                excludedGenres: [],
                minRating: 6.0,
                period: 'all',
                battleRounds: 20,
                liteAnimations: false
            },
            koth: {
                champion: null,
                streak: 0,
                round: 1,
                hallOfFame: []
            },
            wizard: {
                genres: [878, 12],
                contentType: 'movie',
                period: 'all',
                minRating: 7.0,
                sortStyle: 'popular'
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
                    def.stats.skips = Math.max(0, parseInt(raw.stats.skips, 10) || 0);
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
                if (Object.prototype.toString.call(raw.tasteTimeline) === '[object Array]') {
                    def.tasteTimeline = raw.tasteTimeline.slice(0, 12);
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
                    if (ROUNDS_OPTIONS.indexOf(parseInt(raw.settings.battleRounds, 10)) !== -1) {
                        def.settings.battleRounds = parseInt(raw.settings.battleRounds, 10);
                    }
                    def.settings.liteAnimations = !!raw.settings.liteAnimations;
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
                if (raw.wizard && typeof raw.wizard === 'object') {
                    if (Object.prototype.toString.call(raw.wizard.genres) === '[object Array]') {
                        def.wizard.genres = raw.wizard.genres.slice(0, 13);
                    }
                    if (['movie', 'tv', 'all'].indexOf(raw.wizard.contentType) !== -1) {
                        def.wizard.contentType = raw.wizard.contentType;
                    }
                    if (typeof raw.wizard.period === 'string') {
                        def.wizard.period = raw.wizard.period;
                    }
                    if (!isNaN(parseFloat(raw.wizard.minRating))) {
                        def.wizard.minRating = parseFloat(raw.wizard.minRating);
                    }
                    if (['popular', 'acclaimed'].indexOf(raw.wizard.sortStyle) !== -1) {
                        def.wizard.sortStyle = raw.wizard.sortStyle;
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
                if (!saved) {
                    saved = Lampa.Storage.get('cinema_king_state_v1', null);
                }
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
            } catch (e) {}
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
                backdrop: this.getImageUrl(raw.backdrop_path, 'w1280'),
                rating: rating ? Math.round(rating * 10) / 10 : 0,
                vote_count: parseInt(raw.vote_count, 10) || 0,
                genres: genres,
                overview: raw.overview ? String(raw.overview).trim() : '',
                runtime: runtimeCache[mediaType + '_' + raw.id] || 0,
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
    // СИСТЕМА ФОНОВЫХ КИНОПОСТЕРОВ С ПРЕДЗАГРУЗКОЙ И CROSSFADE
    // =========================================================================

    function BackdropManager(container, getStateFn) {
        var layerA = $('<div class="ck-bg-layer is-active"></div>');
        var layerB = $('<div class="ck-bg-layer"></div>');
        var vignette = $('<div class="ck-bg-vignette"></div>');
        var caption = $('<div class="ck-bg-caption"></div>');

        container.append(layerA).append(layerB).append(vignette).append(caption);

        var activeLayer = 0; // 0 -> A, 1 -> B
        var currentUrl = '';
        var requestToken = 0;
        var slideshowTimer = null;
        var slideshowPool = [];
        var slideshowIndex = 0;

        function setBackdrop(url, titleText) {
            if (!url || url === currentUrl) return;
            requestToken += 1;
            var token = requestToken;

            var img = new Image();
            img.onload = function () {
                if (token !== requestToken) return;
                currentUrl = url;

                var incoming = activeLayer === 0 ? layerB : layerA;
                var outgoing = activeLayer === 0 ? layerA : layerB;

                incoming.css('background-image', 'url("' + url + '")');
                // Принудительный reflow для плавного CSS-перехода
                if (incoming[0]) {
                    void incoming[0].offsetWidth;
                }
                incoming.addClass('is-active');
                outgoing.removeClass('is-active');
                activeLayer = activeLayer === 0 ? 1 : 0;

                if (titleText) {
                    caption.text('В кадре: ' + titleText).addClass('is-visible');
                } else {
                    caption.removeClass('is-visible');
                }
            };
            img.onerror = function () {
                // При ошибке загрузки оставляем предыдущий фон без мерцания
            };
            img.src = url;
        }

        function stopSlideshow() {
            if (slideshowTimer) {
                clearInterval(slideshowTimer);
                slideshowTimer = null;
            }
        }

        function startSlideshow(items) {
            stopSlideshow();
            slideshowPool = (items && items.length) ? items : DEFAULT_HERO_BACKDROPS;
            slideshowIndex = 0;

            function step() {
                if (!slideshowPool.length) return;
                var item = slideshowPool[slideshowIndex % slideshowPool.length];
                slideshowIndex += 1;
                var url = item.backdrop || CatalogService.getImageUrl(item.backdrop_path, 'w1280');
                if (url) {
                    setBackdrop(url, item.title || '');
                }
            }

            step();
            var st = getStateFn ? getStateFn() : null;
            var intervalMs = isReducedMotion(st) ? 14000 : 8500;
            slideshowTimer = setInterval(step, intervalMs);
        }

        function destroy() {
            stopSlideshow();
        }

        return {
            setBackdrop: setBackdrop,
            startSlideshow: startSlideshow,
            stopSlideshow: stopSlideshow,
            destroy: destroy
        };
    }

    // =========================================================================
    // ЕДИНЫЙ ДВИЖОК ИЗУЧЕНИЯ ПРЕДПОЧТЕНИЙ И РЕКОМЕНДАЦИЙ
    // =========================================================================

    var TasteEngine = {
        recordBattleChoice: function (state, winner, loser) {
            state.stats.comparisons += 1;
            state.stats.wins += 1;

            var winGenres = winner.genres || [];
            var loseGenres = loser.genres || [];
            var i, gid;

            for (i = 0; i < winGenres.length; i++) {
                gid = String(winGenres[i]);
                state.genreScores[gid] = (state.genreScores[gid] || 0) + 3.0;
            }

            // Мягкая корректировка: одиночный отказ не перечёркивает жанр
            for (i = 0; i < loseGenres.length; i++) {
                gid = String(loseGenres[i]);
                if (winGenres.indexOf(loseGenres[i]) === -1) {
                    state.genreScores[gid] = (state.genreScores[gid] || 0) - 0.45;
                }
            }

            var dec = getDecadeFromYear(winner.year);
            if (dec) {
                state.decadeScores[dec] = (state.decadeScores[dec] || 0) + 2.0;
            }

            var mtype = winner.media_type === 'tv' ? 'tv' : 'movie';
            state.typeScores[mtype] = (state.typeScores[mtype] || 0) + 1.0;

            if (winner.rating && winner.rating > 0) {
                state.ratingSum += winner.rating;
                state.ratingCount += 1;
            }

            // Сохранение в «Мои победители»
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
                    backdrop: winner.backdrop,
                    rating: winner.rating,
                    genres: winner.genres || [],
                    overview: winner.overview || '',
                    wins: 1,
                    lastWon: Date.now()
                });
                if (state.winners.length > 200) state.winners.pop();
            }

            // История выбора
            state.history.unshift({
                winnerId: winner.id,
                media_type: winner.media_type,
                winnerTitle: winner.title,
                loserTitle: loser.title,
                date: Date.now()
            });
            if (state.history.length > 60) state.history.pop();

            // Снимок эволюции вкуса каждые 5 сравнений
            if (state.stats.comparisons % 5 === 0) {
                var topNow = this.getTopGenres(state, 2);
                if (topNow.length) {
                    state.tasteTimeline.unshift({
                        step: state.stats.comparisons,
                        genres: topNow.map(function (g) { return g.name; }).join(', ')
                    });
                    if (state.tasteTimeline.length > 12) state.tasteTimeline.pop();
                }
            }

            StorageManager.save(state);
        },

        recordSkip: function (state, cardA, cardB) {
            state.stats.skips = (state.stats.skips || 0) + 1;
            var genres = (cardA.genres || []).concat(cardB.genres || []);
            for (var i = 0; i < genres.length; i++) {
                var gid = String(genres[i]);
                state.genreScores[gid] = (state.genreScores[gid] || 0) - 0.15;
            }
            StorageManager.save(state);
        },

        applyWizardPreferences: function (state, wizard) {
            var i;
            for (i = 0; i < wizard.genres.length; i++) {
                var gid = String(wizard.genres[i]);
                state.genreScores[gid] = (state.genreScores[gid] || 0) + 2.5;
            }
            if (wizard.period && wizard.period !== 'all') {
                state.decadeScores[wizard.period] = (state.decadeScores[wizard.period] || 0) + 2.0;
            }
            if (wizard.contentType === 'movie' || wizard.contentType === 'tv') {
                state.typeScores[wizard.contentType] = (state.typeScores[wizard.contentType] || 0) + 2.0;
            }
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
            if (!top.length) {
                return 'Выбери фильмы в битве или настрой вкус вручную — система сразу подстроится под тебя.';
            }
            var names = top.map(function (g) { return g.name.toLowerCase(); });
            var text = 'Твои фавориты: ' + names.join(', ');
            var dec = this.getTopDecade(state);
            if (dec) {
                text += ' • Эпоха: ' + decadeLabel(dec);
            }
            return text;
        },

        scoreCard: function (state, card, customGenreIds, customMinRating) {
            var score = 0;
            var genres = card.genres || [];
            var topGenres = this.getTopGenres(state, 5);
            var maxGenreScore = topGenres.length ? topGenres[0].score : 1;

            var genreSum = 0;
            for (var i = 0; i < genres.length; i++) {
                var gid = genres[i];
                var gs = state.genreScores[String(gid)] || 0;
                if (gs > 0) genreSum += (gs / maxGenreScore);
                if (customGenreIds && customGenreIds.indexOf(gid) !== -1) {
                    genreSum += 0.85;
                }
            }
            score += Math.min(62, Math.round(genreSum * 30));

            var dec = getDecadeFromYear(card.year);
            var topDec = this.getTopDecade(state);
            if (dec && topDec && dec === topDec) {
                score += 14;
            } else if (dec && state.decadeScores[dec] > 0) {
                score += 8;
            }

            var targetRating = customMinRating || 7.2;
            if (card.rating >= targetRating + 0.6) score += 19;
            else if (card.rating >= targetRating) score += 14;
            else if (card.rating >= 6.0) score += 8;

            if (state.typeScores[card.media_type] > 0) {
                score += 5;
            }

            return Math.min(99, Math.max(45, score));
        },

        explainRecommendation: function (state, card, selectedGenreIds, minRating) {
            var matched = [];
            var genres = card.genres || [];
            var i, gid, nm;

            if (selectedGenreIds && selectedGenreIds.length) {
                for (i = 0; i < genres.length; i++) {
                    gid = genres[i];
                    if (selectedGenreIds.indexOf(gid) !== -1) {
                        nm = getGenreName(gid);
                        if (nm && matched.indexOf(nm.toLowerCase()) === -1) {
                            matched.push(nm.toLowerCase());
                        }
                    }
                }
                if (matched.length) {
                    var base = 'Мы рекомендуем этот фильм, потому что ты выбрал ' + matched.slice(0, 2).join(' и ');
                    if (minRating && card.rating >= minRating) {
                        base += ', а также предпочитаешь картины с высоким рейтингом (' + card.rating + ').';
                    } else {
                        base += '.';
                    }
                    return base;
                }
            }

            for (i = 0; i < genres.length; i++) {
                gid = genres[i];
                if ((state.genreScores[String(gid)] || 0) > 1.5) {
                    nm = getGenreName(gid);
                    if (nm && matched.indexOf(nm.toLowerCase()) === -1) {
                        matched.push(nm.toLowerCase());
                    }
                }
            }

            var dec = getDecadeFromYear(card.year);
            var topDec = this.getTopDecade(state);

            if (matched.length >= 2) {
                return 'Рекомендуем, потому что в твоих выборах лидируют ' + matched.slice(0, 2).join(' и ') + '.';
            }
            if (matched.length === 1) {
                if (dec && topDec && dec === topDec) {
                    return 'Совпадает с твоим интересом к жанру «' + matched[0] + '» и кино эпохи ' + decadeLabel(dec) + '.';
                }
                return 'Рекомендуем, потому что ты часто отдаёшь предпочтение жанру «' + matched[0] + '».';
            }
            if (card.rating >= 7.8) {
                return 'Высоко оценённая картина (' + card.rating + ') для расширения твоей коллекции.';
            }
            return 'Свежий вариант из каталога для открытия новых жанров.';
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

            if (state.stats.comparisons < 3) {
                var idx1 = Math.floor(Math.random() * Math.min(available.length, 10));
                var first = available[idx1];
                var second = null;

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

            var scored = available.map(function (item) {
                return {
                    card: item,
                    score: TasteEngine.scoreCard(state, item) + (Math.random() * 14)
                };
            });
            scored.sort(function (a, b) {
                return b.score - a.score;
            });

            var cardA = scored[0].card;
            var cardB = null;
            var explore = Math.random() < 0.28;

            if (explore && scored.length > 4) {
                var mid = Math.floor(scored.length / 2);
                var pick = mid + Math.floor(Math.random() * (scored.length - mid));
                cardB = scored[pick].card;
            } else {
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
    // ВСТРОЕННЫЕ СТИЛИ (СТРИМИНГОВЫЙ КИНЕМАТОГРАФИЧНЫЙ ИНТЕРФЕЙС)
    // =========================================================================

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var css = '' +
            '.ck-root { position: relative; min-height: 100%; background: #070a10; color: #f8fafc; overflow: hidden; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }' +
            '.ck-root * { box-sizing: border-box; }' +

            /* Фоновая система кинопостеров (Crossfade) */
            '.ck-bg-stage { position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 0; pointer-events: none; overflow: hidden; background: #070a10; }' +
            '.ck-bg-layer { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background-size: cover; background-position: center 22%; background-repeat: no-repeat; opacity: 0; transition: opacity 1.35s ease-in-out; will-change: opacity; }' +
            '.ck-bg-layer.is-active { opacity: 0.44; }' +
            '.ck-bg-vignette { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(90deg, rgba(7,10,16,0.96) 0%, rgba(7,10,16,0.82) 48%, rgba(7,10,16,0.68) 100%), linear-gradient(180deg, rgba(7,10,16,0.84) 0%, rgba(7,10,16,0.35) 45%, rgba(7,10,16,0.98) 100%); }' +
            '.ck-bg-caption { position: fixed; right: 2.2em; bottom: 1.2em; z-index: 1; font-size: 0.82em; font-weight: 600; letter-spacing: 0.04em; color: rgba(203,213,225,0.65); opacity: 0; transition: opacity 0.6s ease; pointer-events: none; }' +
            '.ck-bg-caption.is-visible { opacity: 1; }' +

            /* Основной слой контента */
            '.ck-content { position: relative; z-index: 2; padding: 1.2em 2.2em 3.2em; }' +

            /* Навигация */
            '.ck-topbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.9em; margin-bottom: 1.6em; padding-bottom: 0.95em; border-bottom: 1px solid rgba(148,163,184,0.14); }' +
            '.ck-brand { display: flex; align-items: center; gap: 0.65em; flex-shrink: 0; }' +
            '.ck-brand-mark { width: 2.15em; height: 2.15em; border-radius: 0.55em; background: #1d4ed8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }' +
            '.ck-brand-title { font-size: 1.25em; font-weight: 800; letter-spacing: 0.04em; color: #ffffff; }' +
            '.ck-nav { display: flex; align-items: center; flex-wrap: wrap; gap: 0.4em; }' +
            '.ck-tab { padding: 0.48em 0.95em; border-radius: 0.55em; background: rgba(17,24,39,0.78); border: 1px solid rgba(148,163,184,0.16); color: #cbd5e1; font-size: 0.88em; font-weight: 600; cursor: pointer; transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease; }' +
            '.ck-tab.is-active { background: #1d4ed8; border-color: #3b82f6; color: #ffffff; }' +
            '.ck-tab.focus { transform: scale(1.05); border-color: #60a5fa; box-shadow: 0 0 0 2px #3b82f6; color: #ffffff; }' +

            /* Переход между разделами */
            '.ck-view { animation: ckSectionIn 0.28s ease both; }' +
            '@keyframes ckSectionIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }' +

            /* Главный экран */
            '.ck-hero { padding: 2.2em 0 1.8em; max-width: 48em; }' +
            '.ck-hero-kicker { display: inline-block; font-size: 0.8em; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #60a5fa; margin-bottom: 0.7em; }' +
            '.ck-hero-title { font-size: 2.55em; font-weight: 800; line-height: 1.12; letter-spacing: -0.01em; margin: 0 0 0.45em; color: #ffffff; }' +
            '.ck-hero-sub { font-size: 1.06em; line-height: 1.55; color: #cbd5e1; margin: 0 0 1.6em; }' +
            '.ck-actions { display: flex; flex-wrap: wrap; gap: 0.85em; }' +

            '.ck-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5em; padding: 0.82em 1.55em; border-radius: 0.65em; font-size: 0.96em; font-weight: 700; cursor: pointer; border: 1px solid transparent; transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease; }' +
            '.ck-btn--primary { background: #2563eb; color: #ffffff; }' +
            '.ck-btn--secondary { background: rgba(17,24,39,0.88); border-color: rgba(148,163,184,0.25); color: #f1f5f9; }' +
            '.ck-btn--danger { background: rgba(127,29,29,0.65); border-color: rgba(248,113,113,0.4); color: #fecaca; }' +
            '.ck-btn--sm { padding: 0.55em 1.05em; font-size: 0.86em; border-radius: 0.55em; }' +
            '.ck-btn.focus { transform: scale(1.04); border-color: #93c5fd; box-shadow: 0 0 0 2px #3b82f6; }' +

            '.ck-kpi-grid { display: flex; flex-wrap: wrap; gap: 1em; margin-top: 1.2em; }' +
            '.ck-kpi-card { flex: 1 1 14em; padding: 1.25em 1.4em; border-radius: 0.85em; background: rgba(15,20,30,0.86); border: 1px solid rgba(148,163,184,0.14); }' +
            '.ck-kpi-label { font-size: 0.8em; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4em; }' +
            '.ck-kpi-value { font-size: 1.9em; font-weight: 800; color: #ffffff; line-height: 1.1; }' +
            '.ck-kpi-text { font-size: 0.94em; color: #cbd5e1; line-height: 1.45; margin-top: 0.25em; }' +

            /* Прогресс-бар раундов и шапка арены */
            '.ck-arena-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.8em; margin-bottom: 0.75em; }' +
            '.ck-arena-title { font-size: 1.35em; font-weight: 800; color: #ffffff; }' +
            '.ck-arena-meta { font-size: 0.9em; color: #93c5fd; font-weight: 600; }' +
            '.ck-progress-track { width: 100%; height: 0.36em; border-radius: 999px; background: rgba(30,41,59,0.85); overflow: hidden; margin-bottom: 1.3em; }' +
            '.ck-progress-fill { height: 100%; background: #2563eb; transition: width 0.35s ease; }' +

            /* Карточки сравнения (Битва и Царь горы) */
            '.ck-battle-wrap { position: relative; display: flex; align-items: stretch; gap: 1.5em; }' +
            '.ck-vs-badge { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 5; width: 3.1em; height: 3.1em; border-radius: 50%; background: #111827; border: 2px solid #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95em; color: #ffffff; pointer-events: none; }' +

            '.ck-card { flex: 1 1 48%; position: relative; display: flex; flex-direction: row; border-radius: 0.95em; overflow: hidden; background: rgba(15,20,30,0.92); border: 1px solid rgba(148,163,184,0.18); cursor: pointer; min-height: 20.5em; transition: transform 0.22s ease, border-color 0.22s ease, opacity 0.35s ease; }' +
            '.ck-card.focus { transform: translateY(-3px) scale(1.012); border-color: #3b82f6; box-shadow: 0 0 0 2px #3b82f6; }' +
            '.ck-card--champion { border-color: rgba(234,179,8,0.55); }' +

            '.ck-card--enter-left { animation: ckSlideInLeft 0.34s ease both; }' +
            '.ck-card--enter-right { animation: ckSlideInRight 0.34s ease both; }' +
            '.ck-card--win { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px #3b82f6 !important; transform: scale(1.025) !important; z-index: 4; }' +
            '.ck-card--lose-left { transform: translateX(-42px) scale(0.94) !important; opacity: 0 !important; }' +
            '.ck-card--lose-right { transform: translateX(42px) scale(0.94) !important; opacity: 0 !important; }' +
            '@keyframes ckSlideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }' +
            '@keyframes ckSlideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }' +

            '.ck-card-poster { position: relative; width: 13.2em; min-width: 13.2em; background: #111827; overflow: hidden; flex-shrink: 0; }' +
            '.ck-card-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }' +
            '.ck-poster-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #1e293b; color: #93c5fd; font-size: 2.3em; font-weight: 800; }' +
            '.ck-card-ribbon { position: absolute; top: 0.7em; left: 0.7em; padding: 0.25em 0.65em; border-radius: 0.4em; font-size: 0.76em; font-weight: 800; background: rgba(7,10,16,0.88); color: #facc15; border: 1px solid rgba(250,204,21,0.45); }' +
            '.ck-card-ribbon--challenger { color: #93c5fd; border-color: rgba(59,130,246,0.45); }' +

            '.ck-card-info { flex: 1; padding: 1.3em 1.4em; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }' +
            '.ck-card-title { font-size: 1.38em; font-weight: 800; line-height: 1.22; color: #ffffff; margin: 0 0 0.4em; }' +
            '.ck-meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.55em; margin-bottom: 0.7em; font-size: 0.88em; color: #94a3b8; }' +
            '.ck-rating-pill { display: inline-flex; align-items: center; padding: 0.18em 0.55em; border-radius: 0.38em; background: rgba(37,99,235,0.22); color: #93c5fd; font-weight: 700; }' +
            '.ck-genres { display: flex; flex-wrap: wrap; gap: 0.38em; margin-bottom: 0.8em; }' +
            '.ck-genre-chip { padding: 0.2em 0.6em; border-radius: 0.4em; background: rgba(30,41,59,0.85); font-size: 0.78em; color: #cbd5e1; }' +
            '.ck-overview { font-size: 0.89em; line-height: 1.46; color: #cbd5e1; margin: 0 0 1em; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }' +
            '.ck-card-cta { display: flex; align-items: center; justify-content: center; width: 100%; padding: 0.7em 1em; border-radius: 0.55em; background: #1d4ed8; color: #ffffff; font-weight: 700; font-size: 0.92em; }' +
            '.ck-battle-footer { display: flex; justify-content: center; flex-wrap: wrap; gap: 0.75em; margin-top: 1.2em; }' +

            /* Мастер «Подобрать под мой вкус» (13 жанров и 3 шага) */
            '.ck-wizard-steps { display: flex; gap: 0.6em; margin-bottom: 1.2em; }' +
            '.ck-step-pill { padding: 0.35em 0.85em; border-radius: 0.45em; font-size: 0.82em; font-weight: 700; background: rgba(15,20,30,0.85); color: #64748b; border: 1px solid rgba(148,163,184,0.14); }' +
            '.ck-step-pill.is-active { background: #1d4ed8; color: #ffffff; border-color: #3b82f6; }' +
            '.ck-genre-grid { display: flex; flex-wrap: wrap; gap: 0.85em; margin-bottom: 1.4em; }' +
            '.ck-genre-tile { position: relative; width: calc(20% - 0.68em); height: 6.2em; border-radius: 0.75em; overflow: hidden; background: #111827; border: 2px solid rgba(148,163,184,0.18); cursor: pointer; display: flex; align-items: flex-end; padding: 0.75em 0.85em; transition: transform 0.16s ease, border-color 0.16s ease; }' +
            '.ck-genre-tile-bg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.48; transition: opacity 0.2s ease, transform 0.25s ease; }' +
            '.ck-genre-tile-grad { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(180deg, rgba(7,10,16,0.2) 0%, rgba(7,10,16,0.9) 100%); }' +
            '.ck-genre-tile-label { position: relative; z-index: 2; font-size: 0.96em; font-weight: 700; color: #f1f5f9; display: flex; align-items: center; justify-content: space-between; width: 100%; }' +
            '.ck-genre-tile-check { width: 1.35em; height: 1.35em; border-radius: 50%; background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 0.8em; color: transparent; }' +
            '.ck-genre-tile.is-selected { border-color: #3b82f6; background: #172554; }' +
            '.ck-genre-tile.is-selected .ck-genre-tile-bg { opacity: 0.68; }' +
            '.ck-genre-tile.is-selected .ck-genre-tile-check { background: #2563eb; border-color: #93c5fd; color: #ffffff; }' +
            '.ck-genre-tile.focus { transform: scale(1.04); border-color: #93c5fd; box-shadow: 0 0 0 2px #3b82f6; }' +

            /* Сетка карточек (13 рекомендаций и Мои победители) */
            '.ck-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.8em; margin-bottom: 1.2em; }' +
            '.ck-search-box { display: inline-flex; align-items: center; gap: 0.5em; padding: 0.48em 0.9em; border-radius: 0.55em; background: rgba(15,20,30,0.9); border: 1px solid rgba(148,163,184,0.24); color: #e2e8f0; font-size: 0.88em; cursor: pointer; }' +
            '.ck-search-box.focus { border-color: #3b82f6; box-shadow: 0 0 0 2px #3b82f6; }' +
            '.ck-grid { display: flex; flex-wrap: wrap; gap: 1.1em; }' +
            '.ck-item-card { width: calc(33.333% - 0.74em); display: flex; flex-direction: column; border-radius: 0.85em; overflow: hidden; background: rgba(15,20,30,0.92); border: 1px solid rgba(148,163,184,0.16); animation: ckCardPop 0.32s ease both; }' +
            '@keyframes ckCardPop { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }' +
            '.ck-item-top { display: flex; gap: 0.95em; padding: 0.95em; cursor: pointer; flex: 1; }' +
            '.ck-item-top.focus { background: rgba(29,78,216,0.22); outline: 2px solid #3b82f6; outline-offset: -2px; }' +
            '.ck-item-thumb { width: 5.4em; height: 8.1em; border-radius: 0.5em; overflow: hidden; flex-shrink: 0; background: #1e293b; }' +
            '.ck-item-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }' +
            '.ck-item-body { flex: 1; min-width: 0; }' +
            '.ck-item-title { font-size: 1.02em; font-weight: 700; color: #ffffff; margin: 0 0 0.28em; }' +
            '.ck-item-desc { font-size: 0.82em; line-height: 1.38; color: #94a3b8; margin-top: 0.35em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }' +
            '.ck-item-reason { font-size: 0.82em; line-height: 1.38; color: #93c5fd; margin-top: 0.45em; padding-top: 0.4em; border-top: 1px solid rgba(148,163,184,0.12); }' +
            '.ck-item-actions { display: flex; border-top: 1px solid rgba(148,163,184,0.12); }' +
            '.ck-item-act { flex: 1; padding: 0.62em; text-align: center; font-size: 0.83em; font-weight: 600; color: #cbd5e1; cursor: pointer; background: rgba(11,15,25,0.75); }' +
            '.ck-item-act + .ck-item-act { border-left: 1px solid rgba(148,163,184,0.12); }' +
            '.ck-item-act--del { color: #fca5a5; }' +
            '.ck-item-act.focus { background: #1d4ed8; color: #ffffff; }' +

            /* Панели статистики и настроек */
            '.ck-panel { padding: 1.35em 1.5em; border-radius: 0.85em; background: rgba(15,20,30,0.9); border: 1px solid rgba(148,163,184,0.15); margin-bottom: 1.2em; }' +
            '.ck-panel-title { font-size: 1.12em; font-weight: 800; color: #ffffff; margin: 0 0 0.95em; }' +
            '.ck-bar-row { margin-bottom: 0.8em; }' +
            '.ck-bar-head { display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 0.32em; color: #e2e8f0; }' +
            '.ck-bar-track { height: 0.58em; border-radius: 999px; background: rgba(30,41,59,0.9); overflow: hidden; }' +
            '.ck-bar-fill { height: 100%; border-radius: 999px; background: #2563eb; transition: width 0.55s ease; }' +
            '.ck-history-row { display: flex; align-items: center; justify-content: space-between; padding: 0.6em 0; border-bottom: 1px solid rgba(148,163,184,0.1); font-size: 0.9em; }' +
            '.ck-history-win { color: #93c5fd; font-weight: 700; }' +
            '.ck-history-lose { color: #94a3b8; }' +

            '.ck-setting-group { margin-bottom: 1.35em; }' +
            '.ck-setting-label { font-size: 0.94em; font-weight: 700; color: #e2e8f0; margin-bottom: 0.6em; }' +
            '.ck-chips { display: flex; flex-wrap: wrap; gap: 0.5em; }' +
            '.ck-chip { padding: 0.48em 0.92em; border-radius: 0.55em; background: rgba(17,24,39,0.88); border: 1px solid rgba(148,163,184,0.22); color: #cbd5e1; font-size: 0.86em; font-weight: 600; cursor: pointer; transition: transform 0.15s ease, background 0.15s ease; }' +
            '.ck-chip.is-selected { background: #1d4ed8; border-color: #60a5fa; color: #ffffff; }' +
            '.ck-chip.is-excluded { background: rgba(153,27,27,0.75); border-color: #f87171; color: #fee2e2; text-decoration: line-through; }' +
            '.ck-chip.focus { transform: scale(1.05); box-shadow: 0 0 0 2px #3b82f6; color: #ffffff; }' +

            '.ck-hof-list { display: flex; flex-wrap: wrap; gap: 0.75em; }' +
            '.ck-hof-item { flex: 1 1 16em; display: flex; align-items: center; gap: 0.8em; padding: 0.75em 0.95em; border-radius: 0.75em; background: rgba(17,24,39,0.88); border: 1px solid rgba(234,179,8,0.28); cursor: pointer; }' +
            '.ck-hof-item.focus { border-color: #3b82f6; box-shadow: 0 0 0 2px #3b82f6; }' +
            '.ck-hof-rank { font-size: 1.25em; font-weight: 800; color: #facc15; width: 1.8em; text-align: center; }' +

            '.ck-state-box { text-align: center; padding: 2.8em 1.5em; border-radius: 0.85em; background: rgba(15,20,30,0.88); border: 1px solid rgba(148,163,184,0.16); }' +
            '.ck-spinner { width: 2.4em; height: 2.4em; border: 3px solid rgba(59,130,246,0.22); border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto 1em; animation: ckSpin 0.8s linear infinite; }' +
            '@keyframes ckSpin { to { transform: rotate(360deg); } }' +
            '.ck-toast { position: fixed; right: 2em; bottom: 2em; z-index: 9999; max-width: 24em; padding: 0.85em 1.25em; border-radius: 0.7em; background: #111827; border: 1px solid #3b82f6; color: #ffffff; font-weight: 700; font-size: 0.92em; opacity: 0; transform: translateY(12px); transition: opacity 0.24s ease, transform 0.24s ease; pointer-events: none; }' +
            '.ck-toast.is-visible { opacity: 1; transform: translateY(0); }' +

            /* Адаптивность */
            '@media (max-width: 1080px) {' +
                '.ck-genre-tile { width: calc(25% - 0.64em); }' +
            '}' +
            '@media (max-width: 960px) {' +
                '.ck-battle-wrap { flex-direction: column; }' +
                '.ck-vs-badge { width: 2.7em; height: 2.7em; font-size: 0.88em; }' +
                '.ck-item-card { width: calc(50% - 0.55em); }' +
                '.ck-genre-tile { width: calc(33.333% - 0.57em); }' +
            '}' +
            '@media (max-width: 640px) {' +
                '.ck-content { padding: 0.9em 1em 2.5em; }' +
                '.ck-hero-title { font-size: 1.75em; }' +
                '.ck-card { flex-direction: column; min-height: auto; }' +
                '.ck-card-poster { width: 100%; min-width: 100%; height: 14.5em; }' +
                '.ck-item-card { width: 100%; }' +
                '.ck-genre-tile { width: calc(50% - 0.43em); height: 5.4em; }' +
            '}' +

            /* Режим сниженной нагрузки на анимации */
            '.ck-lite-motion .ck-view, .ck-lite-motion .ck-card--enter-left, .ck-lite-motion .ck-card--enter-right, .ck-lite-motion .ck-item-card, .ck-lite-motion .ck-spinner { animation: none !important; }' +
            '.ck-lite-motion .ck-bg-layer, .ck-lite-motion .ck-card, .ck-lite-motion .ck-btn, .ck-lite-motion .ck-tab, .ck-lite-motion .ck-bar-fill { transition: none !important; }' +
            '@media (prefers-reduced-motion: reduce) {' +
                '.ck-view, .ck-card--enter-left, .ck-card--enter-right, .ck-item-card, .ck-spinner { animation: none !important; }' +
                '.ck-bg-layer, .ck-card, .ck-btn, .ck-tab, .ck-bar-fill, .ck-toast { transition: none !important; }' +
            '}';

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // =========================================================================
    // ОСНОВНОЙ КОМПОНЕНТ LAMPA: CINEMA KING
    // =========================================================================

    function CinemaKingComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var html = $('<div class="ck-root"></div>');
        var bgStage = $('<div class="ck-bg-stage"></div>');
        var contentWrap = $('<div class="ck-content"></div>');
        var topbar = $('<div class="ck-topbar"></div>');
        var body = $('<div class="ck-body"></div>');
        var toastEl = $('<div class="ck-toast"></div>');

        var state = StorageManager.load();
        var backdropMgr = BackdropManager(bgStage, function () { return state; });

        var activeTab = 'home';
        var lastFocused = null;
        var toastTimer = null;

        // Сессионное состояние «Битвы фильмов»
        var battlePool = [];
        var battleSeen = {};
        var battlePage = 1;
        var sessionRound = 1;
        var currentPair = null;
        var isBattleLoading = false;
        var isAnimating = false;

        // Сессионное состояние «Царя горы»
        var kothPool = [];
        var kothSeen = {};
        var kothPage = 1;
        var currentChallenger = null;
        var isKothLoading = false;

        // Сессионное состояние «Подобрать под мой вкус» (13 фильмов)
        var wizardStep = 1; // 1 = 13 жанров, 2 = параметры, 3 = 13 результатов
        var wizardResults = [];
        var wizardSeenIds = {};
        var wizardPage = 1;
        var isWizardLoading = false;

        // Сессионное состояние «Рекомендации» и «Мои победители»
        var recsList = [];
        var recsPage = 1;
        var isRecsLoading = false;
        var winnersSort = 'date';
        var winnersQuery = '';

        function applyMotionClass() {
            if (state.settings.liteAnimations) html.addClass('ck-lite-motion');
            else html.removeClass('ck-lite-motion');
        }

        function showToast(message) {
            if (!message) return;
            clearTimeout(toastTimer);
            toastEl.text(message).addClass('is-visible');
            toastTimer = setTimeout(function () {
                toastEl.removeClass('is-visible');
            }, 3200);
        }

        function updateCardBackdrop(card) {
            if (!card) return;
            var url = card.backdrop || CatalogService.getImageUrl(card.backdrop_path, 'w1280');
            if (url) {
                backdropMgr.stopSlideshow();
                backdropMgr.setBackdrop(url, card.title || '');
            }
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
        // ВЕРХНЯЯ ПАНЕЛЬ НАВИГАЦИИ (8 РАЗДЕЛОВ)
        // ---------------------------------------------------------------------

        function renderTopbar() {
            var tabs = [
                { id: 'home', label: 'Главная' },
                { id: 'battle', label: 'Битва фильмов' },
                { id: 'koth', label: 'Царь горы' },
                { id: 'wizard', label: 'Подобрать под мой вкус' },
                { id: 'recs', label: 'Рекомендации' },
                { id: 'winners', label: 'Мои победители' },
                { id: 'taste', label: 'Мой вкус' },
                { id: 'settings', label: 'Настройки' }
            ];

            var crownSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20L20 7l-5 4-3-6-3 6-5-4-2 11z"/></svg>';

            topbar.empty();
            var brand = $('<div class="ck-brand"><div class="ck-brand-mark">' + crownSvg + '</div><div class="ck-brand-title">CINEMA KING</div></div>');
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
            else if (tabId === 'wizard') renderWizard();
            else if (tabId === 'recs') renderRecs();
            else if (tabId === 'winners') renderWinners();
            else if (tabId === 'taste') renderTaste();
            else if (tabId === 'settings') renderSettings();
        }

        // ---------------------------------------------------------------------
        // 1. ГЛАВНАЯ (С ФОНОВЫМ СЛАЙДШОУ КИНОПОСТЕРОВ)
        // ---------------------------------------------------------------------

        function startHomeSlideshow() {
            var pool = [];
            var i;
            for (i = 0; i < state.winners.length; i++) {
                if (state.winners[i].backdrop_path || state.winners[i].backdrop) {
                    pool.push(state.winners[i]);
                }
            }
            for (i = 0; i < DEFAULT_HERO_BACKDROPS.length; i++) {
                pool.push(DEFAULT_HERO_BACKDROPS[i]);
            }
            backdropMgr.startSlideshow(pool);
        }

        function renderHome() {
            startHomeSlideshow();
            var summary = TasteEngine.getTasteSummary(state);
            var view = $('<div class="ck-view"></div>');

            var hero = $(
                '<div class="ck-hero">' +
                    '<div class="ck-hero-kicker">Кинематографический подбор • Lampa</div>' +
                    '<h1 class="ck-hero-title">Найди свой идеальный фильм</h1>' +
                    '<p class="ck-hero-sub">Сравнивай фильмы в дуэлях, удерживай трон в «Царе горы» или выбери любимые жанры — система изучит твой вкус и соберёт точную коллекцию.</p>' +
                    '<div class="ck-actions"></div>' +
                '</div>'
            );

            var startBtn = $('<div class="ck-btn ck-btn--primary selector">Битва фильмов</div>');
            startBtn.on('hover:enter', function () { switchTab('battle'); });

            var wizardBtn = $('<div class="ck-btn ck-btn--secondary selector">Подобрать под мой вкус</div>');
            wizardBtn.on('hover:enter', function () {
                wizardStep = 1;
                switchTab('wizard');
            });

            var kothBtn = $('<div class="ck-btn ck-btn--secondary selector">Царь горы</div>');
            kothBtn.on('hover:enter', function () { switchTab('koth'); });

            hero.find('.ck-actions').append(startBtn).append(wizardBtn).append(kothBtn);

            var kpi = $(
                '<div class="ck-kpi-grid">' +
                    '<div class="ck-kpi-card">' +
                        '<div class="ck-kpi-label">Проведено сравнений</div>' +
                        '<div class="ck-kpi-value">' + state.stats.comparisons + '</div>' +
                    '</div>' +
                    '<div class="ck-kpi-card">' +
                        '<div class="ck-kpi-label">Выбрано победителей</div>' +
                        '<div class="ck-kpi-value">' + state.winners.length + '</div>' +
                    '</div>' +
                    '<div class="ck-kpi-card">' +
                        '<div class="ck-kpi-label">Профиль вкуса</div>' +
                        '<div class="ck-kpi-text">' + esc(summary) + '</div>' +
                    '</div>' +
                '</div>'
            );

            view.append(hero).append(kpi);
            body.empty().append(view);
            refreshFocus(startBtn);
        }

        // ---------------------------------------------------------------------
        // КОНСТРУКТОР КАРТОЧКИ ДЛЯ АРЕНЫ
        // ---------------------------------------------------------------------

        function buildBattleCard(card, side, opts) {
            opts = opts || {};
            var enterCls = side === 'left' ? 'ck-card--enter-left' : 'ck-card--enter-right';
            var champCls = opts.isChampion ? ' ck-card--champion' : '';
            var el = $('<div class="ck-card selector ' + enterCls + champCls + '"></div>');

            var posterHtml = card.poster
                ? '<img src="' + esc(card.poster) + '" alt="' + esc(card.title) + '">'
                : '<div class="ck-poster-fallback">' + esc(getInitials(card.title)) + '</div>';

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

            var ratingText = card.rating ? '★ ' + card.rating : 'Без оценки';
            var yearText = card.year ? card.year : 'Год неизвестен';
            var runtimeText = card.runtime ? '• ' + formatRuntime(card.runtime) : '';
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
                    '<div class="ck-card-cta">' + esc(opts.ctaText || 'Выбрать фильм') + '</div>' +
                '</div>'
            );

            el.find('img').on('error', function () {
                $(this).replaceWith('<div class="ck-poster-fallback">' + esc(getInitials(card.title)) + '</div>');
            });

            // При фокусе пультом фон плавно меняется на кадр текущего фильма
            el.on('hover:focus', function () {
                updateCardBackdrop(card);
            });

            if (!card.runtime) {
                CatalogService.fetchRuntime(network, card, function (mins) {
                    el.find('.ck-runtime-slot').text('• ' + formatRuntime(mins));
                });
            }

            return el;
        }

        function loadPoolBatch(targetPool, pageNum, useTasteBoost, onDone, onFail) {
            var s = state.settings;
            var mediaType = s.contentType === 'all' ? (pageNum % 2 === 0 ? 'tv' : 'movie') : s.contentType;
            var withGenres = '';

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
        // 2. РЕЖИМ «БИТВА ФИЛЬМОВ» (С ПРОГРЕССОМ РАУНДОВ)
        // ---------------------------------------------------------------------

        function renderBattle() {
            var maxRounds = state.settings.battleRounds || 20;

            if (sessionRound > maxRounds) {
                renderBattleComplete(maxRounds);
                return;
            }

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
            updateCardBackdrop(leftCard);

            var pct = Math.min(100, Math.round(((sessionRound - 1) / maxRounds) * 100));

            var view = $('<div class="ck-view"></div>');
            view.append(
                '<div class="ck-arena-head">' +
                    '<div class="ck-arena-title">Раунд ' + sessionRound + ' из ' + maxRounds + '</div>' +
                    '<div class="ck-arena-meta">Всего битв: ' + state.stats.comparisons + '</div>' +
                '</div>' +
                '<div class="ck-progress-track"><div class="ck-progress-fill" style="width:' + pct + '%;"></div></div>'
            );

            var wrap = $('<div class="ck-battle-wrap"><div class="ck-vs-badge">VS</div></div>');
            var elLeft = buildBattleCard(leftCard, 'left', { ctaText: 'Выбрать фильм' });
            var elRight = buildBattleCard(rightCard, 'right', { ctaText: 'Выбрать фильм' });

            function handlePick(winner, loser, winEl, loseEl, loseSide) {
                if (isAnimating) return;
                isAnimating = true;

                updateCardBackdrop(winner);
                winEl.addClass('ck-card--win');
                loseEl.addClass(loseSide === 'left' ? 'ck-card--lose-left' : 'ck-card--lose-right');

                TasteEngine.recordBattleChoice(state, winner, loser);
                sessionRound += 1;

                var delay = isReducedMotion(state) ? 80 : 450;
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
                TasteEngine.recordSkip(state, leftCard, rightCard);
                currentPair = null;
                renderBattle();
            });

            var openLeftBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Карточка №1</div>');
            openLeftBtn.on('hover:enter', function () { openLampaCard(leftCard); });

            var openRightBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Карточка №2</div>');
            openRightBtn.on('hover:enter', function () { openLampaCard(rightCard); });

            footer.append(openLeftBtn).append(skipBtn).append(openRightBtn);

            view.append(wrap).append(footer);
            body.empty().append(view);
            refreshFocus(elLeft);

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

        function renderBattleComplete(maxRounds) {
            var summary = TasteEngine.getTasteSummary(state);
            var view = $('<div class="ck-view"></div>');
            var box = $(
                '<div class="ck-state-box">' +
                    '<div class="ck-hero-kicker">Серия завершена</div>' +
                    '<h2 style="font-size:1.85em;margin:0 0 0.5em;">Пройдено раундов: ' + maxRounds + ' из ' + maxRounds + '</h2>' +
                    '<p style="color:#cbd5e1;max-width:38em;margin:0 auto 1.5em;">' + esc(summary) + '</p>' +
                    '<div class="ck-actions" style="justify-content:center;"></div>' +
                '</div>'
            );

            var recsBtn = $('<div class="ck-btn ck-btn--primary selector">Открыть рекомендации</div>');
            recsBtn.on('hover:enter', function () {
                recsList = [];
                switchTab('recs');
            });

            var moreBtn = $('<div class="ck-btn ck-btn--secondary selector">Ещё ' + maxRounds + ' раундов</div>');
            moreBtn.on('hover:enter', function () {
                sessionRound = 1;
                renderBattle();
            });

            box.find('.ck-actions').append(recsBtn).append(moreBtn);
            view.append(box);
            body.empty().append(view);
            refreshFocus(recsBtn);
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
                    renderErrorState('Не удалось найти достаточно фильмов по текущим фильтрам.', function () {
                        battleSeen = {};
                        battlePool = [];
                        battlePage = 1;
                        renderBattle();
                    });
                }
            }, function () {
                isBattleLoading = false;
                renderErrorState('Ошибка сети при загрузке каталога TMDB.', function () {
                    renderBattle();
                });
            });
        }

        // ---------------------------------------------------------------------
        // 3. РЕЖИМ «ЦАРЬ ГОРЫ»
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
                        backdrop: card.backdrop,
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
            updateCardBackdrop(champ);

            var view = $('<div class="ck-view"></div>');
            view.append(
                '<div class="ck-arena-head">' +
                    '<div class="ck-arena-title">Царь горы • Раунд ' + state.koth.round + '</div>' +
                    '<div class="ck-arena-meta">Победитель остаётся на вершине • Серия чемпиона: ' + state.koth.streak + '</div>' +
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
                    updateCardBackdrop(champ);
                    elChamp.addClass('ck-card--win');
                    elChal.addClass('ck-card--lose-right');
                    state.koth.streak += 1;
                    state.koth.round += 1;
                    updateHallOfFame(champ, state.koth.streak);

                    if (state.koth.streak === 3) showToast('3 победы подряд! «' + champ.title + '» удерживает вершину.');
                    else if (state.koth.streak === 5) showToast('Серия из 5 побед! Непобедимый чемпион.');
                } else {
                    updateCardBackdrop(chal);
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

                var delay = isReducedMotion(state) ? 80 : 450;
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
            var newTourneyBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Начать новую игру</div>');
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

            if (state.koth.hallOfFame.length) {
                var hofPanel = $('<div class="ck-panel" style="margin-top: 1.4em;"><div class="ck-panel-title">История чемпионов «Царя горы»</div><div class="ck-hof-list"></div></div>');
                var hofList = hofPanel.find('.ck-hof-list');
                var limit = Math.min(6, state.koth.hallOfFame.length);

                for (var i = 0; i < limit; i++) {
                    (function (entry, rank) {
                        var row = $(
                            '<div class="ck-hof-item selector">' +
                                '<div class="ck-hof-rank">#' + rank + '</div>' +
                                '<div>' +
                                    '<div style="font-weight:700;color:#fff;">' + esc(entry.card.title) + '</div>' +
                                    '<div style="font-size:0.83em;color:#93c5fd;">Серия побед: ' + entry.maxStreak + (entry.card.year ? ' • ' + esc(entry.card.year) : '') + '</div>' +
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
                renderErrorState('Ошибка загрузки претендентов из каталога.', function () {
                    renderKoth();
                });
            });
        }

        // ---------------------------------------------------------------------
        // 4. РЕЖИМ «ПОДОБРАТЬ ПОД МОЙ ВКУС» (13 ЖАНРОВ → РОВНО 13 ФИЛЬМОВ)
        // ---------------------------------------------------------------------

        function renderWizard() {
            if (wizardStep === 1) renderWizardGenres();
            else if (wizardStep === 2) renderWizardParams();
            else renderWizardResults();
        }

        function renderWizardGenres() {
            var view = $('<div class="ck-view"></div>');
            view.append(
                '<div class="ck-wizard-steps">' +
                    '<div class="ck-step-pill is-active">Шаг 1. Выбор жанров</div>' +
                    '<div class="ck-step-pill">Шаг 2. Параметры</div>' +
                    '<div class="ck-step-pill">Шаг 3. Подборка из 13 фильмов</div>' +
                '</div>' +
                '<div class="ck-arena-head">' +
                    '<div class="ck-arena-title">Выбери интересующие жанры</div>' +
                    '<div class="ck-arena-meta">Выбрано: ' + state.wizard.genres.length + '</div>' +
                '</div>'
            );

            var grid = $('<div class="ck-genre-grid"></div>');
            for (var i = 0; i < TASTE_WIZARD_GENRES.length; i++) {
                (function (g) {
                    var isSel = state.wizard.genres.indexOf(g.id) !== -1;
                    var bgUrl = CatalogService.getImageUrl(g.backdrop, 'w780');
                    var tile = $(
                        '<div class="ck-genre-tile selector' + (isSel ? ' is-selected' : '') + '">' +
                            '<div class="ck-genre-tile-bg" style="background-image:url(\'' + esc(bgUrl) + '\');"></div>' +
                            '<div class="ck-genre-tile-grad"></div>' +
                            '<div class="ck-genre-tile-label">' +
                                '<span>' + esc(g.name) + '</span>' +
                                '<span class="ck-genre-tile-check">✓</span>' +
                            '</div>' +
                        '</div>'
                    );

                    tile.on('hover:focus', function () {
                        if (bgUrl) {
                            backdropMgr.stopSlideshow();
                            backdropMgr.setBackdrop(bgUrl, g.name);
                        }
                    });

                    tile.on('hover:enter', function () {
                        var idx = state.wizard.genres.indexOf(g.id);
                        if (idx === -1) state.wizard.genres.push(g.id);
                        else state.wizard.genres.splice(idx, 1);
                        StorageManager.save(state);
                        renderWizardGenres();
                    });

                    grid.append(tile);
                })(TASTE_WIZARD_GENRES[i]);
            }

            var actions = $('<div class="ck-actions"></div>');
            var nextBtn = $('<div class="ck-btn ck-btn--primary selector">Далее: настроить параметры →</div>');
            nextBtn.on('hover:enter', function () {
                if (!state.wizard.genres.length) {
                    showToast('Выбери хотя бы один жанр для подбора.');
                    return;
                }
                wizardStep = 2;
                renderWizard();
            });

            var clearBtn = $('<div class="ck-btn ck-btn--secondary selector">Очистить выбор</div>');
            clearBtn.on('hover:enter', function () {
                state.wizard.genres = [];
                StorageManager.save(state);
                renderWizardGenres();
            });

            actions.append(nextBtn).append(clearBtn);
            view.append(grid).append(actions);
            body.empty().append(view);
            refreshFocus(grid.find('.selector').first());
        }

        function renderWizardParams() {
            var w = state.wizard;
            var view = $('<div class="ck-view"></div>');
            view.append(
                '<div class="ck-wizard-steps">' +
                    '<div class="ck-step-pill">Шаг 1. Выбор жанров</div>' +
                    '<div class="ck-step-pill is-active">Шаг 2. Параметры</div>' +
                    '<div class="ck-step-pill">Шаг 3. Подборка из 13 фильмов</div>' +
                '</div>'
            );

            var panel = $('<div class="ck-panel"><div class="ck-panel-title">Уточни предпочтения</div></div>');

            // 1. Формат
            var gType = $('<div class="ck-setting-group"><div class="ck-setting-label">Что подбираем</div><div class="ck-chips"></div></div>');
            for (var i = 0; i < CONTENT_OPTIONS.length; i++) {
                (function (opt) {
                    var chip = $('<div class="ck-chip selector' + (w.contentType === opt.id ? ' is-selected' : '') + '">' + esc(opt.label) + '</div>');
                    chip.on('hover:enter', function () {
                        w.contentType = opt.id;
                        StorageManager.save(state);
                        renderWizardParams();
                    });
                    gType.find('.ck-chips').append(chip);
                })(CONTENT_OPTIONS[i]);
            }
            panel.append(gType);

            // 2. Годы выпуска / Современные или классика
            var gPer = $('<div class="ck-setting-group"><div class="ck-setting-label">Эпоха и годы выпуска</div><div class="ck-chips"></div></div>');
            for (var p = 0; p < PERIOD_OPTIONS.length; p++) {
                (function (opt) {
                    var chip = $('<div class="ck-chip selector' + (w.period === opt.id ? ' is-selected' : '') + '">' + esc(opt.label) + '</div>');
                    chip.on('hover:enter', function () {
                        w.period = opt.id;
                        StorageManager.save(state);
                        renderWizardParams();
                    });
                    gPer.find('.ck-chips').append(chip);
                })(PERIOD_OPTIONS[p]);
            }
            panel.append(gPer);

            // 3. Минимальный рейтинг
            var gRat = $('<div class="ck-setting-group"><div class="ck-setting-label">Минимальный рейтинг</div><div class="ck-chips"></div></div>');
            for (var r = 0; r < RATING_OPTIONS.length; r++) {
                (function (opt) {
                    var chip = $('<div class="ck-chip selector' + (w.minRating === opt.value ? ' is-selected' : '') + '">' + esc(opt.label) + '</div>');
                    chip.on('hover:enter', function () {
                        w.minRating = opt.value;
                        StorageManager.save(state);
                        renderWizardParams();
                    });
                    gRat.find('.ck-chips').append(chip);
                })(RATING_OPTIONS[r]);
            }
            panel.append(gRat);

            // 4. Акцент подборки (Хиты или Высшая оценка)
            var sortOpts = [
                { id: 'popular', label: 'Популярные хиты' },
                { id: 'acclaimed', label: 'Максимальная оценка зрителей' }
            ];
            var gSort = $('<div class="ck-setting-group"><div class="ck-setting-label">Характер подборки</div><div class="ck-chips"></div></div>');
            for (var s = 0; s < sortOpts.length; s++) {
                (function (opt) {
                    var chip = $('<div class="ck-chip selector' + (w.sortStyle === opt.id ? ' is-selected' : '') + '">' + esc(opt.label) + '</div>');
                    chip.on('hover:enter', function () {
                        w.sortStyle = opt.id;
                        StorageManager.save(state);
                        renderWizardParams();
                    });
                    gSort.find('.ck-chips').append(chip);
                })(sortOpts[s]);
            }
            panel.append(gSort);

            var actions = $('<div class="ck-actions"></div>');
            var backBtn = $('<div class="ck-btn ck-btn--secondary selector">← Назад к жанрам</div>');
            backBtn.on('hover:enter', function () {
                wizardStep = 1;
                renderWizard();
            });

            var buildBtn = $('<div class="ck-btn ck-btn--primary selector">Подобрать 13 фильмов</div>');
            buildBtn.on('hover:enter', function () {
                TasteEngine.applyWizardPreferences(state, w);
                wizardSeenIds = {};
                wizardPage = 1;
                wizardResults = [];
                wizardStep = 3;
                generateThirteenPicks();
            });

            actions.append(backBtn).append(buildBtn);
            view.append(panel).append(actions);
            body.empty().append(view);
            refreshFocus(buildBtn);
        }

        function mapGenresForMediaType(genreIds, mediaType) {
            if (mediaType !== 'tv') return genreIds.join('|');
            var mapped = [];
            for (var i = 0; i < genreIds.length; i++) {
                var gid = genreIds[i];
                var found = gid;
                for (var j = 0; j < TASTE_WIZARD_GENRES.length; j++) {
                    if (TASTE_WIZARD_GENRES[j].id === gid) {
                        found = TASTE_WIZARD_GENRES[j].tvId;
                        break;
                    }
                }
                if (mapped.indexOf(found) === -1) mapped.push(found);
            }
            return mapped.join('|');
        }

        function generateThirteenPicks() {
            if (isWizardLoading) return;
            isWizardLoading = true;

            body.html('<div class="ck-state-box"><div class="ck-spinner"></div><div>Формируем персональную подборку из 13 фильмов...</div></div>');

            var w = state.wizard;
            var collected = [];
            var attempts = 0;
            var maxAttempts = 4;

            function collectStep() {
                attempts += 1;
                var mType = w.contentType === 'all' ? (attempts % 2 === 0 ? 'tv' : 'movie') : w.contentType;
                var withGenres = mapGenresForMediaType(w.genres, mType);
                var sortBy = w.sortStyle === 'acclaimed' ? 'vote_average.desc' : 'popularity.desc';

                CatalogService.fetchDiscover(network, {
                    mediaType: mType,
                    page: wizardPage,
                    minRating: attempts <= 2 ? w.minRating : Math.max(0, w.minRating - 1.5),
                    period: attempts <= 3 ? w.period : 'all',
                    withGenres: withGenres,
                    sortBy: sortBy,
                    minVotes: w.sortStyle === 'acclaimed' ? 250 : 90
                }, function (items) {
                    wizardPage += 1;
                    var i;
                    for (i = 0; i < items.length; i++) {
                        var k = cardKey(items[i]);
                        if (!wizardSeenIds[k]) {
                            wizardSeenIds[k] = true;
                            collected.push(items[i]);
                            if (collected.length >= 13) break;
                        }
                    }

                    // Если показаны все уникальные фильмы по запросу — сбрасываем кэш повторов и добираем до 13
                    if (collected.length < 13 && items.length === 0 && Object.keys(wizardSeenIds).length > 13) {
                        wizardSeenIds = {};
                        wizardPage = 1;
                    }

                    if (collected.length >= 13 || attempts >= maxAttempts) {
                        isWizardLoading = false;
                        wizardResults = collected.slice(0, 13);
                        if (activeTab === 'wizard') renderWizardResults();
                    } else {
                        collectStep();
                    }
                }, function () {
                    isWizardLoading = false;
                    renderErrorState('Не удалось сформировать подборку из каталога TMDB.', function () {
                        generateThirteenPicks();
                    });
                });
            }

            collectStep();
        }

        function renderWizardResults() {
            if (!wizardResults.length) {
                generateThirteenPicks();
                return;
            }

            updateCardBackdrop(wizardResults[0]);

            var view = $('<div class="ck-view"></div>');
            var toolbar = $(
                '<div class="ck-toolbar">' +
                    '<div class="ck-arena-title">Твоя подборка (' + wizardResults.length + ' фильмов)</div>' +
                    '<div class="ck-actions"></div>' +
                '</div>'
            );

            var refreshBtn = $('<div class="ck-btn ck-btn--primary ck-btn--sm selector">Обновить подборку</div>');
            refreshBtn.on('hover:enter', function () {
                generateThirteenPicks();
            });

            var editBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Изменить параметры</div>');
            editBtn.on('hover:enter', function () {
                wizardStep = 1;
                renderWizard();
            });

            toolbar.find('.ck-actions').append(refreshBtn).append(editBtn);
            view.append(toolbar);

            var grid = $('<div class="ck-grid"></div>');
            for (var i = 0; i < wizardResults.length; i++) {
                (function (c, idx) {
                    var thumb = c.poster
                        ? '<img src="' + esc(c.poster) + '" alt="' + esc(c.title) + '">'
                        : '<div class="ck-poster-fallback" style="font-size:1.35em;">' + esc(getInitials(c.title)) + '</div>';

                    var gNames = [];
                    for (var g = 0; g < Math.min(3, (c.genres || []).length); g++) {
                        var nm = getGenreName(c.genres[g]);
                        if (nm) gNames.push(nm);
                    }

                    var reason = TasteEngine.explainRecommendation(state, c, state.wizard.genres, state.wizard.minRating);
                    var delayStyle = isReducedMotion(state) ? '' : 'animation-delay:' + (idx * 35) + 'ms;';

                    var cardEl = $(
                        '<div class="ck-item-card" style="' + delayStyle + '">' +
                            '<div class="ck-item-top selector">' +
                                '<div class="ck-item-thumb">' + thumb + '</div>' +
                                '<div class="ck-item-body">' +
                                    '<div class="ck-item-title">' + (idx + 1) + '. ' + esc(c.title) + '</div>' +
                                    '<div class="ck-meta-row" style="margin-bottom:0.3em;">' +
                                        '<span class="ck-rating-pill">' + (c.rating ? '★ ' + c.rating : '—') + '</span>' +
                                        '<span>' + esc(c.year || '') + '</span>' +
                                    '</div>' +
                                    '<div style="font-size:0.78em;color:#cbd5e1;">' + esc(gNames.join(' • ')) + '</div>' +
                                    '<div class="ck-item-desc">' + esc(c.overview || 'Описание отсутствует.') + '</div>' +
                                    '<div class="ck-item-reason">' + esc(reason) + '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>'
                    );

                    cardEl.find('img').on('error', function () {
                        $(this).replaceWith('<div class="ck-poster-fallback" style="font-size:1.35em;">' + esc(getInitials(c.title)) + '</div>');
                    });
                    cardEl.find('.ck-item-top').on('hover:focus', function () {
                        updateCardBackdrop(c);
                    });
                    cardEl.find('.ck-item-top').on('hover:enter', function () {
                        openLampaCard(c);
                    });

                    grid.append(cardEl);
                })(wizardResults[i], i);
            }

            view.append(grid);
            body.empty().append(view);
            refreshFocus(grid.find('.selector').first());
        }

        // ---------------------------------------------------------------------
        // 5. РАЗДЕЛ «РЕКОМЕНДАЦИИ»
        // ---------------------------------------------------------------------

        function renderRecs(forceReload) {
            if (!forceReload && recsList.length) {
                drawRecsList();
                return;
            }
            if (isRecsLoading) return;
            isRecsLoading = true;

            body.html('<div class="ck-state-box"><div class="ck-spinner"></div><div>Формируем персональные рекомендации на основе твоего профиля...</div></div>');

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
                            reason: TasteEngine.explainRecommendation(state, items[i], null, null)
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
                        renderErrorState('По текущим фильтрам рекомендаций не найдено.', function () {
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
            updateCardBackdrop(recsList[0].card);
            var view = $('<div class="ck-view"></div>');

            var toolbar = $('<div class="ck-toolbar"><div class="ck-arena-title">Персональные рекомендации</div></div>');
            var refreshBtn = $('<div class="ck-btn ck-btn--secondary ck-btn--sm selector">Обновить список</div>');
            refreshBtn.on('hover:enter', function () {
                recsPage = recsPage >= 5 ? 1 : recsPage + 1;
                recsList = [];
                renderRecs(true);
            });
            toolbar.append(refreshBtn);
            view.append(toolbar);

            var grid = $('<div class="ck-grid"></div>');
            for (var i = 0; i < recsList.length; i++) {
                (function (entry) {
                    var c = entry.card;
                    var thumb = c.poster
                        ? '<img src="' + esc(c.poster) + '" alt="' + esc(c.title) + '">'
                        : '<div class="ck-poster-fallback" style="font-size:1.35em;">' + esc(getInitials(c.title)) + '</div>';

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
                                    '<div class="ck-meta-row" style="margin-bottom:0.3em;">' +
                                        '<span class="ck-rating-pill">' + (c.rating ? '★ ' + c.rating : '—') + '</span>' +
                                        '<span>' + esc(c.year || '') + '</span>' +
                                        '<span style="color:#60a5fa;font-weight:700;">' + entry.match + '%</span>' +
                                    '</div>' +
                                    '<div style="font-size:0.78em;color:#cbd5e1;">' + esc(gNames.join(' • ')) + '</div>' +
                                    '<div class="ck-item-desc">' + esc(c.overview || 'Описание отсутствует.') + '</div>' +
                                    '<div class="ck-item-reason">' + esc(entry.reason) + '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>'
                    );

                    cardEl.find('img').on('error', function () {
                        $(this).replaceWith('<div class="ck-poster-fallback" style="font-size:1.35em;">' + esc(getInitials(c.title)) + '</div>');
                    });
                    cardEl.find('.ck-item-top').on('hover:focus', function () {
                        updateCardBackdrop(c);
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
        // 6. РАЗДЕЛ «МОИ ПОБЕДИТЕЛИ» (С ПОИСКОМ И СОРТИРОВКОЙ)
        // ---------------------------------------------------------------------

        function openWinnersSearch() {
            if (Lampa.Input && typeof Lampa.Input.edit === 'function') {
                Lampa.Input.edit({
                    title: 'Поиск среди победителей',
                    value: winnersQuery,
                    free: true,
                    nosave: true
                }, function (val) {
                    winnersQuery = String(val || '').trim();
                    renderWinners();
                });
            } else {
                var q = window.prompt('Введите название фильма:', winnersQuery);
                if (q !== null) {
                    winnersQuery = String(q).trim();
                    renderWinners();
                }
            }
        }

        function renderWinners() {
            var view = $('<div class="ck-view"></div>');

            if (!state.winners.length) {
                var empty = $(
                    '<div class="ck-state-box">' +
                        '<h3 style="margin:0 0 0.5em;">Список победителей пока пуст</h3>' +
                        '<p style="color:#94a3b8;margin:0 0 1.2em;">Выбирай фильмы в «Битве фильмов», и они сохранятся в этой коллекции.</p>' +
                    '</div>'
                );
                var goBtn = $('<div class="ck-btn ck-btn--primary selector">Начать битву</div>');
                goBtn.on('hover:enter', function () { switchTab('battle'); });
                empty.append(goBtn);
                view.append(empty);
                body.empty().append(view);
                refreshFocus(goBtn);
                return;
            }

            var toolbar = $('<div class="ck-toolbar"><div class="ck-arena-title">Мои победители (' + state.winners.length + ')</div><div class="ck-chips"></div></div>');

            var searchBtn = $('<div class="ck-search-box selector">Поиск: ' + esc(winnersQuery || 'все фильмы') + '</div>');
            searchBtn.on('hover:enter', openWinnersSearch);
            toolbar.find('.ck-chips').append(searchBtn);

            if (winnersQuery) {
                var resetSearchBtn = $('<div class="ck-chip selector">Сбросить поиск</div>');
                resetSearchBtn.on('hover:enter', function () {
                    winnersQuery = '';
                    renderWinners();
                });
                toolbar.find('.ck-chips').append(resetSearchBtn);
            }

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
            if (winnersQuery) {
                var qLower = winnersQuery.toLowerCase();
                list = list.filter(function (item) {
                    return String(item.title || '').toLowerCase().indexOf(qLower) !== -1;
                });
            }

            list.sort(function (a, b) {
                if (winnersSort === 'wins') return (b.wins || 1) - (a.wins || 1);
                if (winnersSort === 'rating') return (b.rating || 0) - (a.rating || 0);
                if (winnersSort === 'title') return String(a.title).localeCompare(String(b.title));
                return (b.lastWon || 0) - (a.lastWon || 0);
            });

            var grid = $('<div class="ck-grid"></div>');
            if (!list.length) {
                grid.append('<div class="ck-state-box" style="width:100%;">По запросу «' + esc(winnersQuery) + '» ничего не найдено.</div>');
            } else {
                updateCardBackdrop(list[0]);
                for (var i = 0; i < list.length; i++) {
                    (function (item) {
                        var thumb = item.poster
                            ? '<img src="' + esc(item.poster) + '" alt="' + esc(item.title) + '">'
                            : '<div class="ck-poster-fallback" style="font-size:1.35em;">' + esc(getInitials(item.title)) + '</div>';

                        var cardEl = $(
                            '<div class="ck-item-card">' +
                                '<div class="ck-item-top selector">' +
                                    '<div class="ck-item-thumb">' + thumb + '</div>' +
                                    '<div class="ck-item-body">' +
                                        '<div class="ck-item-title">' + esc(item.title) + '</div>' +
                                        '<div class="ck-meta-row" style="margin-bottom:0.35em;">' +
                                            '<span class="ck-rating-pill">' + (item.rating ? '★ ' + item.rating : '—') + '</span>' +
                                            '<span>' + esc(item.year || '') + '</span>' +
                                        '</div>' +
                                        '<div style="font-size:0.84em;color:#93c5fd;">Побед в битвах: ' + (item.wins || 1) + '</div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="ck-item-actions">' +
                                    '<div class="ck-item-act selector ck-act-open">Открыть</div>' +
                                    '<div class="ck-item-act ck-item-act--del selector ck-act-del">Удалить</div>' +
                                '</div>' +
                            '</div>'
                        );

                        cardEl.find('img').on('error', function () {
                            $(this).replaceWith('<div class="ck-poster-fallback" style="font-size:1.35em;">' + esc(getInitials(item.title)) + '</div>');
                        });
                        cardEl.find('.ck-item-top').on('hover:focus', function () {
                            updateCardBackdrop(item);
                        });
                        cardEl.find('.ck-item-top, .ck-act-open').on('hover:enter', function () {
                            openLampaCard(item);
                        });
                        cardEl.find('.ck-act-del').on('hover:enter', function () {
                            state.winners = state.winners.filter(function (w) {
                                return !(w.id === item.id && w.media_type === item.media_type);
                            });
                            StorageManager.save(state);
                            showToast('Удалено из победителей.');
                            renderWinners();
                        });

                        grid.append(cardEl);
                    })(list[i]);
                }
            }

            view.append(toolbar).append(grid);
            body.empty().append(view);
            refreshFocus(grid.find('.selector').first().length ? grid.find('.selector').first() : searchBtn);
        }

        // ---------------------------------------------------------------------
        // 7. РАЗДЕЛ «МОЙ ВКУС»
        // ---------------------------------------------------------------------

        function renderTaste() {
            var view = $('<div class="ck-view"></div>');
            var topGenres = TasteEngine.getTopGenres(state, 8);
            var avgRating = TasteEngine.getAveragePreferredRating(state);
            var topDec = TasteEngine.getTopDecade(state);

            var kpi = $(
                '<div class="ck-kpi-grid" style="margin-bottom:1.25em;">' +
                    '<div class="ck-kpi-card"><div class="ck-kpi-label">Количество сравнений</div><div class="ck-kpi-value">' + state.stats.comparisons + '</div></div>' +
                    '<div class="ck-kpi-card"><div class="ck-kpi-label">Количество побед</div><div class="ck-kpi-value">' + state.winners.length + '</div></div>' +
                    '<div class="ck-kpi-card"><div class="ck-kpi-label">Средний рейтинг выбора</div><div class="ck-kpi-value">' + (avgRating ? '★ ' + avgRating : '—') + '</div></div>' +
                    '<div class="ck-kpi-card"><div class="ck-kpi-label">Ведущая эпоха</div><div class="ck-kpi-value" style="font-size:1.35em;">' + esc(topDec ? decadeLabel(topDec) : '—') + '</div></div>' +
                '</div>'
            );
            view.append(kpi);

            var genrePanel = $('<div class="ck-panel"><div class="ck-panel-title">Любимые жанры и категории</div></div>');
            if (!topGenres.length) {
                genrePanel.append('<div style="color:#94a3b8;">Пока недостаточно данных. Сыграй в битву или используй «Подобрать под мой вкус».</div>');
            } else {
                for (var i = 0; i < topGenres.length; i++) {
                    var g = topGenres[i];
                    genrePanel.append(
                        '<div class="ck-bar-row">' +
                            '<div class="ck-bar-head"><span>' + esc(g.name) + '</span><span style="color:#93c5fd;font-weight:700;">' + g.percent + '%</span></div>' +
                            '<div class="ck-bar-track"><div class="ck-bar-fill" style="width:' + g.percent + '%;"></div></div>' +
                        '</div>'
                    );
                }
            }
            view.append(genrePanel);

            if (state.tasteTimeline && state.tasteTimeline.length) {
                var timePanel = $('<div class="ck-panel"><div class="ck-panel-title">Изменение предпочтений со временем</div></div>');
                for (var t = 0; t < state.tasteTimeline.length; t++) {
                    var snap = state.tasteTimeline[t];
                    timePanel.append(
                        '<div class="ck-history-row">' +
                            '<span style="color:#94a3b8;">После ' + snap.step + ' сравнений</span>' +
                            '<span class="ck-history-win">' + esc(snap.genres) + '</span>' +
                        '</div>'
                    );
                }
                view.append(timePanel);
            }

            var histPanel = $('<div class="ck-panel"><div class="ck-panel-title">История выбора</div></div>');
            if (!state.history.length) {
                histPanel.append('<div style="color:#94a3b8;">История сравнений пока пуста.</div>');
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
        // 8. РАЗДЕЛ «НАСТРОЙКИ»
        // ---------------------------------------------------------------------

        function renderSettings() {
            var view = $('<div class="ck-view"></div>');
            var panel = $('<div class="ck-panel"><div class="ck-panel-title">Параметры игры и каталога</div></div>');

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

            // 1. Количество раундов в Битве фильмов
            var rndGroup = $('<div class="ck-setting-group"><div class="ck-setting-label">Количество раундов в сессии «Битвы фильмов»</div><div class="ck-chips"></div></div>');
            for (var rIdx = 0; rIdx < ROUNDS_OPTIONS.length; rIdx++) {
                (function (cnt) {
                    var chip = $('<div class="ck-chip selector' + (state.settings.battleRounds === cnt ? ' is-selected' : '') + '">' + cnt + ' раундов</div>');
                    chip.on('hover:enter', function () {
                        state.settings.battleRounds = cnt;
                        sessionRound = 1;
                        StorageManager.save(state);
                        renderSettings();
                    });
                    rndGroup.find('.ck-chips').append(chip);
                })(ROUNDS_OPTIONS[rIdx]);
            }
            panel.append(rndGroup);

            // 2. Тип контента
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

            // 3. Минимальный рейтинг
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

            // 4. Период выпуска
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

            // 5. Исключение жанров
            var exGroup = $('<div class="ck-setting-group"><div class="ck-setting-label">Исключить жанры из каталога</div><div class="ck-chips"></div></div>');
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

            // 6. Производительность на слабых ТВ
            var perfGroup = $('<div class="ck-setting-group"><div class="ck-setting-label">Производительность (для слабых ТВ)</div><div class="ck-chips"></div></div>');
            var liteChip = $('<div class="ck-chip selector' + (state.settings.liteAnimations ? ' is-selected' : '') + '">' + (state.settings.liteAnimations ? 'Упрощённые анимации: ВКЛ' : 'Упрощённые анимации: ВЫКЛ') + '</div>');
            liteChip.on('hover:enter', function () {
                state.settings.liteAnimations = !state.settings.liteAnimations;
                applyMotionClass();
                StorageManager.save(state);
                renderSettings();
            });
            perfGroup.find('.ck-chips').append(liteChip);
            panel.append(perfGroup);

            // 7. Сброс данных
            var resetPanel = $('<div class="ck-panel"><div class="ck-panel-title">Управление сохранёнными данными</div><div class="ck-actions"></div></div>');

            var resetTasteBtn = $('<div class="ck-btn ck-btn--danger selector">Сбросить профиль вкусов</div>');
            resetTasteBtn.on('hover:enter', function () {
                state.stats = { comparisons: 0, wins: 0, skips: 0 };
                state.genreScores = {};
                state.decadeScores = {};
                state.typeScores = { movie: 0, tv: 0 };
                state.ratingSum = 0;
                state.ratingCount = 0;
                state.tasteTimeline = [];
                recsList = [];
                StorageManager.save(state);
                showToast('Профиль предпочтений сброшен.');
            });

            var resetHistBtn = $('<div class="ck-btn ck-btn--danger selector">Очистить победителей и историю</div>');
            resetHistBtn.on('hover:enter', function () {
                state.winners = [];
                state.history = [];
                state.koth = { champion: null, streak: 0, round: 1, hallOfFame: [] };
                battleSeen = {};
                kothSeen = {};
                StorageManager.save(state);
                showToast('Список победителей и история очищены.');
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
            applyMotionClass();
            contentWrap.append(topbar).append(body);
            html.append(bgStage).append(contentWrap);
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
                    if (activeTab === 'wizard' && wizardStep > 1) {
                        wizardStep -= 1;
                        renderWizard();
                    } else if (activeTab !== 'home') {
                        switchTab('home');
                    } else {
                        Lampa.Activity.backward();
                    }
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.pause = function () {
            backdropMgr.stopSlideshow();
        };

        this.stop = function () {
            backdropMgr.stopSlideshow();
        };

        this.render = function () {
            return scroll.render();
        };

        this.destroy = function () {
            clearTimeout(toastTimer);
            backdropMgr.destroy();
            network.clear();
            scroll.destroy();
            toastEl.remove();
            html.remove();
        };
    }

    // =========================================================================
    // РЕГИСТРАЦИЯ ПЛАГИНА В LAMPA
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
