/*!
 * AUTO OPTIMIZER 1.0.0 для Lampa
 *
 * Что плагин реально делает (и только это):
 *  - собирает данные об устройстве из доступных браузерных API;
 *  - измеряет: скорость выполнения JS, плавность отрисовки (синтетический тест),
 *    длинные задачи, размер DOM, незавершённые изображения, память JS (если API есть),
 *    время ответа сетевых хостов, которые использует Lampa;
 *  - считает Performance Score 0-100 по описанной формуле;
 *  - применяет обратимые настройки СВОЕГО профиля: async-декодирование и lazy-загрузка
 *    изображений, отключение backdrop-filter, отключение CSS-анимаций, preconnect;
 *  - ведёт журнал ошибок, чистит только собственные данные (ключи ao_*);
 *  - после оптимизации измеряет снова и откатывает изменения, если стало хуже.
 *
 * Чего плагин НЕ делает: не чистит кэш ТВ, не меняет DNS/Wi-Fi/системные настройки,
 * не трогает данные, историю и аккаунты Lampa, не определяет CPU и физическую RAM.
 *
 * Написан на ES5 ради старых браузеров телевизоров.
 */
(function () {
    'use strict';

    if (window.auto_optimizer_plugin) return;
    window.auto_optimizer_plugin = true;

    var VERSION = '1.0.0';
    var COMPONENT = 'auto_optimizer';
    var TITLE = 'AUTO OPTIMIZER';
    var K = { settings: 'ao_settings', snap: 'ao_snapshots', log: 'ao_log', net: 'ao_net', last: 'ao_last', clean: 'ao_last_clean' };
    var TMP_PREFIX = 'ao_tmp_';
    var OWN_LIMIT = 200 * 1024;
    var DAY = 86400000;

    var SELF_SRC = '';
    try { SELF_SRC = (document.currentScript && document.currentScript.src) || ''; } catch (e) { SELF_SRC = ''; }

    /* ======================= утилиты ======================= */

    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
    function clone(v) { return JSON.parse(JSON.stringify(v)); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function lin(x, best, worst) { return clamp((worst - x) / (worst - best) * 100, 0, 100); }
    function round(x, d) { var p = Math.pow(10, d || 0); return Math.round(x * p) / p; }
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function fmtTime(t) { var d = new Date(t); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function fmtBytes(b) { return b < 1024 ? b + ' Б' : b < 1048576 ? round(b / 1024, 1) + ' КБ' : round(b / 1048576, 1) + ' МБ'; }
    function median(a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
    function noty(t) { try { Lampa.Noty.show(t); } catch (e) { /* ignore */ } }
    function dbg() { try { console.log.apply(console, ['[AUTO OPTIMIZER]'].concat([].slice.call(arguments))); } catch (e) { /* ignore */ } }

    /* ======================= собственное хранилище (localStorage, ключи ao_*) ======================= */

    var corruptKeys = [];

    function jget(k, def) {
        var s;
        try { s = localStorage.getItem(k); } catch (e) { return def; }
        if (s === null || s === undefined) return def;
        try { return JSON.parse(s); } catch (e2) { if (corruptKeys.indexOf(k) < 0) corruptKeys.push(k); return def; }
    }

    function jset(k, v) {
        try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    }

    /* ======================= журнал ======================= */

    var logBuf = null;
    var persistTimer = null;

    function loadLog() {
        if (logBuf === null) { var v = jget(K.log, []); logBuf = Array.isArray(v) ? v : []; }
        return logBuf;
    }

    function persistLog() {
        persistTimer = null;
        jset(K.log, loadLog());
    }

    function addLog(type, msg, own) {
        var l = loadLog();
        var t = Date.now();
        var text = String(msg).slice(0, 200);
        var last = l[l.length - 1];
        if (last && last.type === type && last.msg === text && t - last.t < 60000) { last.n = (last.n || 1) + 1; last.t = t; }
        else { l.push({ t: t, type: type, msg: text, n: 1, own: own ? 1 : 0 }); if (l.length > 150) l.splice(0, l.length - 150); }
        if (!persistTimer) persistTimer = setTimeout(persistLog, 5000);
    }

    function logCount(types, ms, ownOnly) {
        var l = loadLog();
        var from = Date.now() - ms;
        var c = 0;
        for (var i = 0; i < l.length; i++) {
            if (l[i].t >= from && types.indexOf(l[i].type) >= 0 && (!ownOnly || l[i].own)) c += l[i].n || 1;
        }
        return c;
    }

    /* ======================= настройки и снимки ======================= */

    var PROFILES = {
        eco: { imgAsync: true, imgLazy: true, noBackdrop: true, noAnim: true, preconnect: false },
        balanced: { imgAsync: true, imgLazy: true, noBackdrop: true, noAnim: false, preconnect: true },
        performance: { imgAsync: true, imgLazy: false, noBackdrop: false, noAnim: false, preconnect: true }
    };
    var FEATURE_NAMES = {
        imgAsync: 'Асинхронное декодирование изображений',
        imgLazy: 'Отложенная загрузка изображений (lazy)',
        noBackdrop: 'Отключение backdrop-filter (размытие)',
        noAnim: 'Отключение CSS-анимаций и переходов',
        preconnect: 'Предварительное соединение с хостами Lampa'
    };
    var PROFILE_NAMES = { none: 'не выбран', eco: 'ECO MODE', balanced: 'BALANCED MODE', performance: 'PERFORMANCE MODE' };

    function defaults() {
        return { v: 1, profile: 'none', autoClean: true, features: { imgAsync: false, imgLazy: false, noBackdrop: false, noAnim: false, preconnect: false } };
    }

    function validSettings(s) {
        if (!s || typeof s !== 'object' || !s.features || typeof s.features !== 'object') return false;
        if (!PROFILE_NAMES.hasOwnProperty(s.profile)) return false;
        for (var f in FEATURE_NAMES) { if (typeof s.features[f] !== 'boolean') return false; }
        return true;
    }

    var S = (function () { var s = jget(K.settings, null); return validSettings(s) ? s : defaults(); })();
    var settingsWereInvalid = (function () { var s = jget(K.settings, null); return s !== null && !validSettings(s); })();

    function saveSettings() { return jset(K.settings, S); }

    function getSnaps() { var a = jget(K.snap, []); return Array.isArray(a) ? a : []; }

    function pushSnapshot(reason) {
        var a = getSnaps();
        var snap = { id: Date.now(), t: Date.now(), reason: reason, settings: clone(S) };
        a.unshift(snap);
        jset(K.snap, a.slice(0, 5));
        return snap;
    }

    function restoreSnapshot(id) {
        var a = getSnaps();
        for (var i = 0; i < a.length; i++) {
            if (a[i].id === id && validSettings(a[i].settings)) {
                pushSnapshot('Перед откатом');
                S = clone(a[i].settings);
                saveSettings();
                applyFeatures();
                addLog('repair', 'Восстановлен профиль из снимка ' + fmtTime(a[i].t));
                return true;
            }
        }
        return false;
    }

    /* ======================= Lag Killer: применение функций ======================= */

    var F = { observer: null, pending: [], timer: null };
    var IMG_DECODING = typeof HTMLImageElement !== 'undefined' && ('decoding' in HTMLImageElement.prototype);
    var IMG_LOADING = typeof HTMLImageElement !== 'undefined' && ('loading' in HTMLImageElement.prototype);

    function setStyle(id, css, on) {
        var el = document.getElementById(id);
        if (on) {
            if (!el) {
                el = document.createElement('style');
                el.id = id;
                el.appendChild(document.createTextNode(css));
                document.head.appendChild(el);
            }
        } else if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }

    function markImg(img, c) {
        var m = img.getAttribute('data-ao-img') || '';
        if (m.indexOf(c) < 0) img.setAttribute('data-ao-img', m + c);
    }

    function tuneImg(img) {
        try {
            if (IMG_DECODING && S.features.imgAsync && !img.hasAttribute('decoding')) { img.setAttribute('decoding', 'async'); markImg(img, 'd'); }
            if (IMG_LOADING && S.features.imgLazy && !img.hasAttribute('loading') && !img.complete) { img.setAttribute('loading', 'lazy'); markImg(img, 'l'); }
        } catch (e) { /* ignore */ }
    }

    function revertImgs() {
        var list = document.querySelectorAll('img[data-ao-img]');
        for (var i = 0; i < list.length; i++) {
            var m = list[i].getAttribute('data-ao-img') || '';
            if (m.indexOf('d') >= 0) list[i].removeAttribute('decoding');
            if (m.indexOf('l') >= 0) list[i].removeAttribute('loading');
            list[i].removeAttribute('data-ao-img');
        }
    }

    function flushImgs() {
        F.timer = null;
        var batch = F.pending.splice(0, 150);
        for (var i = 0; i < batch.length; i++) {
            var n = batch[i];
            if (!n || n.nodeType !== 1) continue;
            if (n.tagName === 'IMG') tuneImg(n);
            else if (n.querySelectorAll) {
                var im = n.querySelectorAll('img');
                for (var j = 0; j < im.length && j < 100; j++) tuneImg(im[j]);
            }
        }
        if (F.pending.length) F.timer = setTimeout(flushImgs, 50);
    }

    function stopImgObserver() {
        if (F.observer) { try { F.observer.disconnect(); } catch (e) { /* ignore */ } F.observer = null; }
        if (F.timer) { clearTimeout(F.timer); F.timer = null; }
        F.pending = [];
    }

    function applyImages() {
        stopImgObserver();
        revertImgs();
        if (!S.features.imgAsync && !S.features.imgLazy) return;
        if (typeof MutationObserver === 'undefined' || !document.body) return;
        var existing = document.getElementsByTagName('img');
        for (var i = 0; i < existing.length && i < 2000; i++) F.pending.push(existing[i]);
        F.observer = new MutationObserver(function (muts) {
            for (var a = 0; a < muts.length; a++) {
                var added = muts[a].addedNodes;
                for (var b = 0; b < added.length; b++) F.pending.push(added[b]);
            }
            if (F.pending.length > 2000) F.pending.splice(0, F.pending.length - 2000);
            if (!F.timer) F.timer = setTimeout(flushImgs, 80);
        });
        F.observer.observe(document.body, { childList: true, subtree: true });
        if (!F.timer) F.timer = setTimeout(flushImgs, 50);
    }

    function hostOf(u) { var m = /^(https?:\/\/[^\/?#]+)/i.exec(u || ''); return m ? m[1] : null; }

    // Хосты, которые использует сама Lampa (через её API). Если определить нельзя — сообщаем об этом.
    function discoverHosts() {
        var out = [];
        var seen = {};
        function add(u) { var h = hostOf(u); if (h && !seen[h]) { seen[h] = 1; out.push(h); } }
        try {
            if (window.Lampa && Lampa.TMDB) {
                if (typeof Lampa.TMDB.api === 'function') add(Lampa.TMDB.api('configuration'));
                if (typeof Lampa.TMDB.image === 'function') add(Lampa.TMDB.image('t/p/w92/x.jpg'));
            }
        } catch (e) { /* ignore */ }
        try { if (Lampa.Manifest && Lampa.Manifest.cub_domain) add('https://' + Lampa.Manifest.cub_domain); } catch (e2) { /* ignore */ }
        return out;
    }

    function applyPreconnect(on) {
        var olds = document.querySelectorAll('link[data-ao-pc]');
        for (var i = 0; i < olds.length; i++) if (olds[i].parentNode) olds[i].parentNode.removeChild(olds[i]);
        if (!on) return;
        var hosts = discoverHosts();
        for (var j = 0; j < hosts.length; j++) {
            var l = document.createElement('link');
            l.rel = 'preconnect';
            l.href = hosts[j];
            l.setAttribute('data-ao-pc', '1');
            document.head.appendChild(l);
        }
    }

    // Идемпотентно приводит страницу в соответствие с S.features.
    function applyFeatures() {
        var res = { unsupported: [] };
        if (typeof document === 'undefined' || !document.head) return res;
        try {
            if (S.features.imgAsync && !IMG_DECODING) res.unsupported.push('imgAsync');
            if (S.features.imgLazy && !IMG_LOADING) res.unsupported.push('imgLazy');
            applyImages();
            setStyle('ao-style-backdrop', '*{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}', S.features.noBackdrop);
            setStyle('ao-style-anim', 'body *{-webkit-animation-duration:.001s!important;animation-duration:.001s!important;-webkit-animation-delay:0s!important;animation-delay:0s!important;-webkit-transition-duration:.001s!important;transition-duration:.001s!important;-webkit-transition-delay:0s!important;transition-delay:0s!important}', S.features.noAnim);
            applyPreconnect(S.features.preconnect);
        } catch (e) {
            addLog('own', 'Ошибка применения функций: ' + (e && e.message), true);
        }
        return res;
    }

    function setProfile(name) {
        var f = clone(S.features);
        if (PROFILES[name]) { for (var k in PROFILES[name]) f[k] = PROFILES[name][k]; }
        else { for (var k2 in f) f[k2] = false; }
        S.profile = name;
        S.features = f;
        saveSettings();
        return applyFeatures();
    }

    function featureDiff(before, after) {
        var out = [];
        for (var f in FEATURE_NAMES) {
            if (before[f] !== after[f]) out.push((after[f] ? 'Включено: ' : 'Выключено: ') + FEATURE_NAMES[f]);
        }
        return out;
    }

    /* ======================= Bug Detector ======================= */

    var LT = [];
    var LT_OK = false;
    var detectorOn = false;

    function onWinError(e) {
        try {
            var t = e && e.target;
            if (t && t !== window && t.tagName) {
                var tag = t.tagName;
                if (tag === 'IMG' || tag === 'SCRIPT' || tag === 'LINK') addLog('resource', tag + ' не загрузился: ' + (t.src || t.href || '?'));
                return;
            }
            var own = !!(SELF_SRC && e && e.filename && String(e.filename).split('?')[0] === SELF_SRC.split('?')[0]);
            addLog('js', (e && e.message ? e.message : 'Ошибка') + (e && e.filename ? ' @' + String(e.filename).split('/').pop() + ':' + e.lineno : ''), own);
        } catch (x) { /* ignore */ }
    }

    function onRejection(e) {
        try { addLog('promise', 'Необработанный promise: ' + (e && e.reason && (e.reason.message || e.reason))); } catch (x) { /* ignore */ }
    }

    function startDetector() {
        if (detectorOn) return;
        detectorOn = true;
        window.addEventListener('error', onWinError, true);
        window.addEventListener('unhandledrejection', onRejection);
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                var po = new PerformanceObserver(function (list) {
                    var en = list.getEntries();
                    for (var i = 0; i < en.length; i++) LT.push({ t: Date.now(), d: en[i].duration });
                    if (LT.length > 100) LT.splice(0, LT.length - 100);
                });
                po.observe({ entryTypes: ['longtask'] });
                LT_OK = true;
            }
        } catch (e) { LT_OK = false; }
    }

    function recentLong(ms) {
        var from = Date.now() - ms;
        var c = 0;
        for (var i = 0; i < LT.length; i++) if (LT[i].t >= from) c++;
        return c;
    }

    /* ======================= Device Scanner ======================= */

    function lampaPlatforms() {
        var out = [];
        var names = ['tizen', 'webos', 'android', 'browser', 'orsay', 'netcast', 'nw', 'apple', 'apple_tv', 'macos', 'windows'];
        try {
            if (window.Lampa && Lampa.Platform && typeof Lampa.Platform.is === 'function') {
                for (var i = 0; i < names.length; i++) { try { if (Lampa.Platform.is(names[i])) out.push(names[i]); } catch (e) { /* ignore */ } }
            }
        } catch (e2) { /* ignore */ }
        return out;
    }

    function webglInfo() {
        try {
            var c = document.createElement('canvas');
            var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
            if (!gl) return { available: false };
            var info = { available: true, renderer: null, software: false };
            var ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (ext) {
                info.renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
                info.software = /swiftshader|llvmpipe|software/i.test(String(info.renderer));
            }
            return info;
        } catch (e) { return { available: false }; }
    }

    function jsFeatures() {
        var f = {};
        f['Promise'] = typeof Promise !== 'undefined';
        f['fetch'] = typeof fetch === 'function';
        f['AbortController'] = typeof AbortController !== 'undefined';
        f['MutationObserver'] = typeof MutationObserver !== 'undefined';
        f['IntersectionObserver'] = typeof IntersectionObserver !== 'undefined';
        f['PerformanceObserver'] = typeof PerformanceObserver !== 'undefined';
        f['requestIdleCallback'] = typeof requestIdleCallback === 'function';
        f['IndexedDB'] = typeof indexedDB !== 'undefined';
        f['Web Workers'] = typeof Worker !== 'undefined';
        f['img decoding'] = IMG_DECODING;
        f['img loading=lazy'] = IMG_LOADING;
        f['backdrop-filter'] = !!(window.CSS && CSS.supports && (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')));
        return f;
    }

    function scanDevice() {
        var nav = window.navigator || {};        var ua = nav.userAgent || '';
        var d = { ua: ua, notes: [] };
        d.lampaPlatforms = lampaPlatforms();
        d.lampaVersion = null;
        try { if (Lampa.Manifest && Lampa.Manifest.app_version) d.lampaVersion = Lampa.Manifest.app_version; } catch (e) { /* ignore */ }

        var m = /Chrom(?:e|ium)\/(\d+)/.exec(ua);
        var engine = null;
        if (m) engine = { name: 'Chromium', major: parseInt(m[1], 10) };
        else if ((m = /Firefox\/(\d+)/.exec(ua))) engine = { name: 'Firefox', major: parseInt(m[1], 10) };
        else if ((m = /Version\/(\d+).+Safari/.exec(ua))) engine = { name: 'WebKit/Safari', major: parseInt(m[1], 10) };
        d.engine = engine;

        d.cores = nav.hardwareConcurrency || null;
        d.deviceMemory = nav.deviceMemory || null;
        d.screen = {
            w: window.screen ? screen.width : null, h: window.screen ? screen.height : null,
            iw: window.innerWidth, ih: window.innerHeight, dpr: window.devicePixelRatio || 1
        };
        d.gl = webglInfo();
        try { d.css3d = !!(window.CSS && CSS.supports && CSS.supports('transform', 'translateZ(0)')); } catch (e2) { d.css3d = null; }
        d.features = jsFeatures();

        var tv = /Tizen|Web0S|webOS|NetCast|SmartTV|Smart-TV|HbbTV|SMART-TV|Viera|Bravia/i.test(ua) ||
            d.lampaPlatforms.indexOf('tizen') >= 0 || d.lampaPlatforms.indexOf('webos') >= 0 ||
            d.lampaPlatforms.indexOf('orsay') >= 0 || d.lampaPlatforms.indexOf('netcast') >= 0;
        var android = /Android/i.test(ua) || d.lampaPlatforms.indexOf('android') >= 0;
        var androidTv = android && (/\bTV\b|BRAVIA|AFT|SHIELD|MIBOX|MiBOX|Box/i.test(ua) || (!!window.AndroidJS && !/Mobile/i.test(ua)));
        var googleTv = androidTv && /Google ?TV|Chromecast|Sabrina/i.test(ua);

        if (!ua) { d.profile = 'Unknown Device'; d.notes.push('User Agent недоступен'); }
        else if (tv) {
            var low = (engine && engine.major <= 69) || (d.deviceMemory && d.deviceMemory <= 1);
            var high = engine && engine.major >= 88 && !low;
            if (!engine) d.notes.push('Версия движка не определена, класс телевизора принят как средний');
            d.profile = low ? 'Smart TV Low-End' : high ? 'Smart TV High-End' : 'Smart TV Mid-Range';
            d.notes.push('Класс ТВ — оценка по версии браузерного движка и доступным API, не точная характеристика железа');
        } else if (googleTv) { d.profile = 'Google TV'; }
        else if (androidTv) { d.profile = 'Android TV'; }
        else if (engine) { d.profile = 'Web Browser'; }
        else { d.profile = 'Unknown Device'; }

        if (!d.cores) d.notes.push('Число логических ядер браузер не сообщает');
        if (!d.deviceMemory) d.notes.push('Объём RAM устройства недоступен (navigator.deviceMemory не поддерживается)');
        d.notes.push('Модель процессора и физическая RAM не определяются: надёжного API нет');
        return d;
    }

    function lampaState() {
        var need = ['Storage', 'Scroll', 'Component', 'Activity', 'Controller', 'Select', 'Noty', 'Listener', 'Menu', 'Platform', 'TMDB', 'Manifest'];
        var missing = [];
        for (var i = 0; i < need.length; i++) if (!window.Lampa || !Lampa[need[i]]) missing.push(need[i]);
        var st = { missing: missing, plugins: null, dupPlugins: 0 };
        try {
            var p = Lampa.Storage.get('plugins', '[]');
            if (typeof p === 'string') p = JSON.parse(p);
            if (Array.isArray(p)) {
                st.plugins = p.length;
                var seen = {};
                for (var j = 0; j < p.length; j++) {
                    var u = typeof p[j] === 'string' ? p[j] : (p[j] && p[j].url);
                    if (!u) continue;
                    if (seen[u]) st.dupPlugins++; else seen[u] = 1;
                }
            }
        } catch (e) { /* ignore */ }
        return st;
    }

    /* ======================= Performance Engine ======================= */

    function yieldThen(fn) { setTimeout(fn, 0); }

    function cpuBench(rounds, cb) {
        var best = 1e9;
        var r = 0;
        (function step() {
            var t0 = now();
            var acc = 0;
            var i;
            for (i = 0; i < 200000; i++) acc += Math.sqrt(i) * Math.sin(i);
            var arr = [];
            for (i = 0; i < 20000; i++) arr.push((i * 7) % 1013);
            arr.sort(function (a, b) { return a - b; });
            var dt = now() - t0;
            if (dt < best) best = dt;
            if (acc === 42.5) dbg(acc);
            r++;
            if (r < rounds) yieldThen(step); else cb(round(best, 1));
        })();
    }

    // Синтетический тест отрисовки: двигаем элементы через transform и мерим интервалы кадров.
    function measureFrames(ms, cb, cancelled) {
        if (!window.requestAnimationFrame || !document.body) { cb(null); return; }
        var box = document.createElement('div');
        box.style.cssText = 'position:fixed;right:0;bottom:0;width:160px;height:40px;opacity:.03;overflow:hidden;pointer-events:none;z-index:1';
        var els = [];
        for (var i = 0; i < 60; i++) {
            var e = document.createElement('div');
            e.style.cssText = 'position:absolute;top:' + (i % 4) * 10 + 'px;left:0;width:8px;height:8px;background:#fff';
            box.appendChild(e);
            els.push(e);
        }
        document.body.appendChild(box);

        var d = [];
        var last = 0;
        var start = now();
        var done = false;
        var guard = setTimeout(function () { finish(); }, ms + 2000);

        function finish() {
            if (done) return;
            done = true;
            clearTimeout(guard);
            if (box.parentNode) box.parentNode.removeChild(box);
            if (d.length < 5) { cb(null); return; }
            var sum = 0, max = 0, jank = 0, longF = 0;
            for (var k = 0; k < d.length; k++) {
                sum += d[k];
                if (d[k] > max) max = d[k];
                if (d[k] > 33.4) jank++;
                if (d[k] > 50) longF++;
            }
            cb({ n: d.length, avg: round(sum / d.length, 1), max: round(max, 1), jank: jank, longFrames: longF, jankRatio: round(jank / d.length, 3) });
        }

        function tick() {
            if (done) return;
            var t = now();
            if (last) d.push(t - last);
            last = t;
            for (var j = 0; j < els.length; j++) els[j].style.transform = 'translateX(' + ((t / 8 + j * 3) % 150) + 'px)';
            if ((cancelled && cancelled()) || t - start >= ms) finish();
            else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function domStats() {
        var all = document.getElementsByTagName('*');
        var wide = 0;
        for (var i = 0; i < all.length && i < 20000; i++) if (all[i].childElementCount > 150) wide++;
        var imgs = document.images;
        var pending = 0;
        for (var j = 0; j < imgs.length; j++) if (!imgs[j].complete && imgs[j].getAttribute('src')) pending++;
        return { nodes: all.length, imgs: imgs.length, pending: pending, wide: wide };
    }

    function memStats() {
        var r = { ls: lsUsage() };
        try {
            if (performance.memory && performance.memory.jsHeapSizeLimit) {
                r.used = performance.memory.usedJSHeapSize;
                r.limit = performance.memory.jsHeapSizeLimit;
                r.ratio = r.used / r.limit;
            }
        } catch (e) { /* ignore */ }
        if (navigator.deviceMemory) r.device = navigator.deviceMemory;
        return r;
    }

    function lsUsage() {
        var total = 0, own = 0;
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                var v = localStorage.getItem(k) || '';
                var b = (k.length + v.length) * 2;
                total += b;
                if (k.indexOf('ao_') === 0) own += b;
            }
        } catch (e) { /* ignore */ }
        return { total: total, own: own };
    }

    function resStats() {
        try {
            if (!performance.getEntriesByType) return null;
            var e = performance.getEntriesByType('resource');
            var imgs = [];
            var counts = {};
            var tn = now();
            for (var i = 0; i < e.length; i++) {
                var en = e[i];
                if (en.name.indexOf('ao=') >= 0) continue;
                if (en.initiatorType === 'img' || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(en.name)) imgs.push(en.duration);
                else if (tn - en.startTime < 60000) counts[en.name] = (counts[en.name] || 0) + 1;
            }
            var dup = [];
            for (var u in counts) if (counts[u] >= 4) dup.push({ url: u, n: counts[u] });
            dup.sort(function (a, b) { return b.n - a.n; });
            var sorted = imgs.slice().sort(function (a, b) { return a - b; });
            var sum = 0;
            for (var j = 0; j < imgs.length; j++) sum += imgs[j];
            return {
                total: e.length, bufferFull: e.length >= 250, imgN: imgs.length,
                imgAvg: imgs.length ? round(sum / imgs.length, 0) : null,
                imgP90: imgs.length ? round(sorted[Math.floor(sorted.length * 0.9)] || sorted[sorted.length - 1], 0) : null,
                dup: dup.slice(0, 3)
            };
        } catch (e2) { return null; }
    }

    /* ======================= Network Optimizer ======================= */

    function probeOnce(host, timeout, cb) {
        if (typeof fetch !== 'function') { cb({ ok: null }); return; }
        var t0 = now();
        var done = false;
        var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var tm = setTimeout(function () {
            if (done) return;
            done = true;
            if (ctrl) { try { ctrl.abort(); } catch (e) { /* ignore */ } }
            cb({ ok: false, timeout: true });
        }, timeout);
        var opts = { method: 'HEAD', mode: 'no-cors', cache: 'no-store' };
        if (ctrl) opts.signal = ctrl.signal;
        try {
            fetch(host + '/?ao=' + Date.now(), opts).then(function () {
                if (done) return;
                done = true; clearTimeout(tm);
                cb({ ok: true, ms: now() - t0 });
            }, function () {
                if (done) return;
                done = true; clearTimeout(tm);
                cb({ ok: false, timeout: false });
            });
        } catch (e2) { done = true; clearTimeout(tm); cb({ ok: null }); }
    }

    function probeHost(host, samples, retries, cancelled, cb) {
        var res = { host: host, samples: [], fails: 0, timeouts: 0, unsupported: false };
        var i = 0;
        function one(attempt) {
            if (cancelled && cancelled()) { finish(); return; }
            probeOnce(host, 8000, function (r) {
                if (r.ok === null) { res.unsupported = true; finish(); return; }
                if (r.ok) { res.samples.push(round(r.ms, 0)); next(); return; }
                if (r.timeout) res.timeouts++;
                if (attempt < retries) { setTimeout(function () { one(attempt + 1); }, attempt === 0 ? 400 : 1200); }
                else { res.fails++; next(); }
            });
        }
        function next() { i++; if (i < samples) one(0); else finish(); }
        function finish() {
            res.median = median(res.samples);
            res.ok = res.samples.length > 0;
            if (res.fails) {
                addLog('net', 'Хост недоступен: ' + host + (res.timeouts ? ' (таймаут)' : ''));
                var h = jget(K.net, []);
                if (!Array.isArray(h)) h = [];
                h.push({ t: Date.now(), host: host });
                jset(K.net, h.slice(-50));
            }
            cb(res);
        }
        one(0);
    }

    function probeAll(samples, retries, cancelled, cb) {
        var hosts = discoverHosts();
        var out = { hosts: [], discovered: hosts.length > 0, unsupported: false };
        var i = 0;
        (function next() {
            if (i >= hosts.length || (cancelled && cancelled())) { cb(out); return; }
            probeHost(hosts[i++], samples, retries, cancelled, function (r) {
                if (r.unsupported) out.unsupported = true;
                out.hosts.push(r);
                next();
            });
        })();
    }

    function repeatedNetFailures() {
        var h = jget(K.net, []);
        if (!Array.isArray(h)) return [];
        var from = Date.now() - 600000;
        var c = {};
        for (var i = 0; i < h.length; i++) if (h[i].t >= from) c[h[i].host] = (c[h[i].host] || 0) + 1;
        var out = [];
        for (var k in c) if (c[k] >= 2) out.push(k);
        return out;
    }

    /* ======================= измерение целиком, оценка, анализ ======================= */

    // opts: { deep: bool, net: bool }
    function measure(opts, cancelled, cb) {
        var m = { t: Date.now(), deep: !!opts.deep };
        cpuBench(opts.deep ? 3 : 2, function (ms) {
            m.cpu = { ms: ms };
            yieldThen(function () {
                measureFrames(opts.deep ? 3000 : 1200, function (fr) {
                    m.frames = fr;
                    m.dom = domStats();
                    m.mem = memStats();
                    m.longtasks = { supported: LT_OK, n60: LT_OK ? recentLong(60000) : null };
                    m.res = resStats();
                    m.errors = { recent: logCount(['js', 'promise', 'resource'], 600000), own: logCount(['js', 'promise'], 600000, true) };
                    m.netRepeated = repeatedNetFailures();
                    if (opts.net && !(cancelled && cancelled())) {
                        probeAll(opts.deep ? 3 : 1, opts.deep ? 2 : 1, cancelled, function (net) {
                            m.net = net;
                            m.score = computeScore(m);
                            cb(m);
                        });
                    } else {
                        m.net = opts.reuseNet || null;
                        m.score = computeScore(m);
                        cb(m);
                    }
                }, cancelled);
            });
        });
    }

    // Формула: взвешенное среднее доступных компонентов (веса перенормируются).
    // frames 35%, cpu 25%, dom 15%, memory 10%, errors 10%, network 5%.
    // Пороги эвристические и описаны в документации.
    function computeScore(m) {
        var parts = {};
        var w = { frames: 0.35, cpu: 0.25, dom: 0.15, mem: 0.10, err: 0.10, net: 0.05 };
        if (m.frames) parts.frames = Math.max(0, lin(m.frames.avg, 17, 50) - Math.min(40, m.frames.jankRatio * 150));
        if (m.cpu) parts.cpu = lin(m.cpu.ms, 20, 250);
        if (m.dom) parts.dom = lin(m.dom.nodes, 1500, 6000);
        if (m.mem && typeof m.mem.ratio === 'number') parts.mem = lin(m.mem.ratio, 0.5, 0.9);
        if (m.errors) parts.err = lin(m.errors.recent, 0, 10);
        if (m.net && m.net.hosts && m.net.hosts.length) {
            var meds = [];
            var failed = 0;
            for (var i = 0; i < m.net.hosts.length; i++) { if (m.net.hosts[i].ok) meds.push(m.net.hosts[i].median); else failed++; }
            if (meds.length || failed) {
                var base = meds.length ? lin(median(meds), 200, 1500) : 0;
                parts.net = failed ? base * (meds.length / (meds.length + failed)) : base;
            }
        }
        var sum = 0, ws = 0;
        for (var k in parts) { sum += parts[k] * w[k]; ws += w[k]; }
        return ws ? Math.round(sum / ws) : null;
    }

    function scoreLabel(s) {
        if (s === null || s === undefined) return 'Нет данных';
        return s >= 85 ? 'Отлично' : s >= 65 ? 'Хорошо' : s >= 45 ? 'Средне' : 'Плохо';
    }

    var SEV = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    var SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

    // fix: ключ функции, которая может смягчить проблему (null — средствами плагина не исправить)
    function analyze(m, dev) {
        var is = [];
        function add(sev, id, text, cause, fix) { is.push({ sev: sev, id: id, text: text, cause: cause, fix: fix || null }); }
        if (m.frames) {
            if (m.frames.avg > 50) add('critical', 'frames', 'Средний кадр ' + m.frames.avg + ' мс (меньше 20 к/с)', 'Перегружен главный поток или отрисовка', 'noAnim');
            else if (m.frames.avg > 33) add('high', 'frames', 'Средний кадр ' + m.frames.avg + ' мс', 'Медленная отрисовка', 'noAnim');
            else if (m.frames.avg > 22) add('medium', 'frames', 'Средний кадр ' + m.frames.avg + ' мс', 'Нагрузка на отрисовку', 'noBackdrop');
            if (m.frames.jankRatio > 0.15) add('high', 'jank', 'Пропущено кадров: ' + Math.round(m.frames.jankRatio * 100) + '%', 'Разовые блокировки интерфейса', 'noAnim');
            else if (m.frames.jankRatio > 0.05) add('medium', 'jank', 'Пропущено кадров: ' + Math.round(m.frames.jankRatio * 100) + '%', 'Периодические подвисания', 'noBackdrop');
        } else {
            add('low', 'frames_na', 'Плавность отрисовки измерить не удалось', 'requestAnimationFrame недоступен или приостановлен', null);
        }
        if (m.cpu) {
            if (m.cpu.ms > 250) add('critical', 'cpu', 'Тест скорости JS: ' + m.cpu.ms + ' мс (очень медленно)', 'Слабый процессор или высокая фоновая нагрузка', 'noAnim');
            else if (m.cpu.ms > 120) add('high', 'cpu', 'Тест скорости JS: ' + m.cpu.ms + ' мс', 'Медленное выполнение JavaScript', 'noAnim');
            else if (m.cpu.ms > 60) add('medium', 'cpu', 'Тест скорости JS: ' + m.cpu.ms + ' мс', 'Средняя скорость выполнения JavaScript', null);
        }
        if (m.dom) {
            if (m.dom.nodes > 6000) add('high', 'dom', 'Элементов DOM: ' + m.dom.nodes, 'Перегруженная страница. Плагин не может безопасно удалять элементы Lampa', null);
            else if (m.dom.nodes > 3500) add('medium', 'dom', 'Элементов DOM: ' + m.dom.nodes, 'Много элементов на странице', null);
            if (m.dom.pending > 40) add('high', 'imgs', 'Незавершённых изображений: ' + m.dom.pending, 'Много одновременных загрузок', 'imgLazy');
            else if (m.dom.pending > 20) add('medium', 'imgs', 'Незавершённых изображений: ' + m.dom.pending, 'Много одновременных загрузок', 'imgLazy');
        }
        if (m.mem && typeof m.mem.ratio === 'number') {
            var pr = Math.round(m.mem.ratio * 100);
            if (m.mem.ratio > 0.9) add('critical', 'mem', 'Память JS: ' + pr + '% от лимита', 'Риск вылета. Освободить память Lampa плагин не может', null);
            else if (m.mem.ratio > 0.75) add('high', 'mem', 'Память JS: ' + pr + '% от лимита', 'Высокое потребление памяти', null);
            else if (m.mem.ratio > 0.6) add('medium', 'mem', 'Память JS: ' + pr + '% от лимита', 'Повышенное потребление памяти', null);
        }
        if (m.longtasks && m.longtasks.supported) {
            if (m.longtasks.n60 > 10) add('high', 'longtask', 'Длинных задач за минуту: ' + m.longtasks.n60, 'Тяжёлые операции JavaScript', null);
            else if (m.longtasks.n60 > 3) add('medium', 'longtask', 'Длинных задач за минуту: ' + m.longtasks.n60, 'Тяжёлые операции JavaScript', null);
        }
        if (m.errors) {
            if (m.errors.recent >= 10) add('high', 'errors', 'Ошибок за 10 минут: ' + m.errors.recent, 'Смотрите раздел ERRORS', null);
            else if (m.errors.recent >= 3) add('medium', 'errors', 'Ошибок за 10 минут: ' + m.errors.recent, 'Смотрите раздел ERRORS', null);
            else if (m.errors.recent >= 1) add('low', 'errors', 'Ошибок за 10 минут: ' + m.errors.recent, 'Смотрите раздел ERRORS', null);
        }
        if (m.net && m.net.hosts) {
            var failed = 0;
            for (var i = 0; i < m.net.hosts.length; i++) {
                var h = m.net.hosts[i];
                if (!h.ok) { failed++; add(m.net.hosts.length === 1 || failed === m.net.hosts.length ? 'critical' : 'high', 'net_' + h.host, 'Хост недоступен: ' + h.host, 'Сеть, DNS или блокировка. Плагин сеть не меняет', null); }
                else if (h.median > 1500) add('high', 'net_slow_' + h.host, 'Медленный ответ ' + h.host + ': ' + h.median + ' мс', 'Медленная сеть или сервер', null);
                else if (h.median > 700) add('medium', 'net_slow_' + h.host, 'Ответ ' + h.host + ': ' + h.median + ' мс', 'Задержка сети', null);
            }
        }        if (m.netRepeated && m.netRepeated.length) add('medium', 'net_repeat', 'Повторяющиеся сетевые ошибки: ' + m.netRepeated.join(', '), 'Нестабильное соединение', null);
        if (m.res) {
            if (m.res.imgAvg && m.res.imgAvg > 1500) add('medium', 'img_slow', 'Изображения грузятся в среднем ' + m.res.imgAvg + ' мс', 'Медленная сеть или CDN. Влиять на них плагин не может', null);
            if (m.res.dup && m.res.dup.length) add('medium', 'dup_req', 'Возможные повторные запросы (' + m.res.dup[0].n + ' раз за минуту)', 'Приложение или плагин многократно запрашивает один URL. Перехват запросов плагин не ведёт', null);
        }
        is.sort(function (a, b) { return SEV_ORDER[a.sev] - SEV_ORDER[b.sev]; });
        return is;
    }

    function chooseProfile(m, dev) {
        var reasons = [];
        var eco = false, bal = false;
        if (m.frames && m.frames.avg > 33) { eco = true; reasons.push('кадр ' + m.frames.avg + ' мс'); }
        if (m.frames && m.frames.jankRatio > 0.10) { eco = true; reasons.push('пропуски кадров ' + Math.round(m.frames.jankRatio * 100) + '%'); }
        if (m.cpu && m.cpu.ms > 90) { eco = true; reasons.push('медленный JS (' + m.cpu.ms + ' мс)'); }
        if (m.mem && m.mem.ratio > 0.8) { eco = true; reasons.push('память JS ' + Math.round(m.mem.ratio * 100) + '%'); }
        if (dev && dev.profile === 'Smart TV Low-End') { eco = true; reasons.push('ТВ класса Low-End'); }
        if (!eco) {
            if (m.frames && m.frames.avg > 20) { bal = true; reasons.push('кадр ' + m.frames.avg + ' мс'); }
            if (m.cpu && m.cpu.ms > 40) { bal = true; reasons.push('JS ' + m.cpu.ms + ' мс'); }
            if (m.dom && m.dom.nodes > 3500) { bal = true; reasons.push('DOM ' + m.dom.nodes + ' элементов'); }
            if (dev && dev.profile === 'Smart TV Mid-Range') { bal = true; reasons.push('ТВ класса Mid-Range'); }
        }
        var p = eco ? 'eco' : bal ? 'balanced' : 'performance';
        if (!reasons.length) reasons.push('замеры хорошие');
        return { profile: p, reasons: reasons };
    }

    /* ======================= Auto Repair ======================= */

    function selfCheckAndRepair() {
        var r = { found: [], fixed: [], unresolved: [] };
        var i;

        // 1. повреждённые собственные ключи
        var keys = [K.settings, K.snap, K.log, K.net, K.last, K.clean];
        for (i = 0; i < keys.length; i++) {
            var raw = null;
            try { raw = localStorage.getItem(keys[i]); } catch (e) { raw = null; }
            if (raw === null) continue;
            try { JSON.parse(raw); } catch (e2) {
                r.found.push('Повреждены данные ' + keys[i]);
                try { localStorage.removeItem(keys[i]); r.fixed.push('Удалены повреждённые данные ' + keys[i]); if (keys[i] === K.log) logBuf = []; }
                catch (e3) { r.unresolved.push('Не удалось удалить ' + keys[i]); }
            }
        }
        corruptKeys = [];

        // 2. некорректные собственные настройки
        if (settingsWereInvalid || !validSettings(S)) {
            r.found.push('Несовместимые настройки плагина');
            pushSnapshot('Перед сбросом настроек');
            S = defaults();
            saveSettings();
            applyFeatures();
            settingsWereInvalid = false;
            r.fixed.push('Настройки плагина сброшены к стандартным');
        }

        // 3. дубли собственных элементов
        try {
            var links = document.querySelectorAll('link[data-ao-pc]');
            var expected = S.features.preconnect ? discoverHosts().length : 0;
            if (links.length !== expected) {
                r.found.push('Неверное число preconnect-ссылок плагина (' + links.length + ' вместо ' + expected + ')');
                applyPreconnect(S.features.preconnect);
                r.fixed.push('Preconnect-ссылки плагина пересозданы');
            }
            var items = [];
            var texts = document.querySelectorAll('.menu__text');
            for (i = 0; i < texts.length; i++) if (texts[i].textContent === TITLE) items.push(texts[i]);
            if (items.length > 1) {
                r.found.push('Дубли пункта меню: ' + items.length);
                for (i = 1; i < items.length; i++) {
                    var li = items[i].parentNode;
                    if (li && li.parentNode) li.parentNode.removeChild(li);
                }
                r.fixed.push('Лишние пункты меню плагина удалены');
            }
        } catch (e4) { r.unresolved.push('Проверка DOM не выполнена: ' + (e4 && e4.message)); }

        // 4. перезапуск зависшего модуля изображений
        if ((S.features.imgAsync || S.features.imgLazy) && !F.observer && typeof MutationObserver !== 'undefined') {
            r.found.push('Модуль обработки изображений не запущен');
            applyImages();
            r.fixed.push('Модуль обработки изображений перезапущен');
        }

        // 5. отключение проблемной функции при собственных ошибках
        var own = logCount(['js', 'promise'], 600000, true);
        if (own >= 3) {
            r.found.push('Собственные ошибки плагина: ' + own);
            pushSnapshot('Перед отключением функций');
            for (var f in S.features) S.features[f] = false;
            S.profile = 'none';
            saveSettings();
            applyFeatures();
            r.fixed.push('Функции плагина отключены, профиль можно вернуть из снимка');
        }

        // 6. проверка записи в хранилище
        var tmp = TMP_PREFIX + 'test';
        try {
            localStorage.setItem(tmp, '1');
            var ok = localStorage.getItem(tmp) === '1';
            localStorage.removeItem(tmp);
            if (!ok) throw new Error('read mismatch');
        } catch (e5) {
            r.found.push('Ошибка записи в localStorage');
            r.unresolved.push('Хранилище недоступно для записи: плагин не может сохранять настройки и журнал');
            addLog('storage', 'Ошибка записи в localStorage');
        }

        // 7. состояние Lampa
        var ls = lampaState();
        if (ls.dupPlugins > 0) { r.found.push('Дубли плагинов в списке Lampa: ' + ls.dupPlugins); r.unresolved.push('Дубли плагинов в списке Lampa: удалить можно через Lampa Cleaner или «Расширения»'); }
        if (ls.missing.length) { r.found.push('Не найдены API Lampa: ' + ls.missing.join(', ')); r.unresolved.push('В этой версии Lampa нет: ' + ls.missing.join(', ')); }

        for (i = 0; i < r.fixed.length; i++) addLog('repair', r.fixed[i]);
        return r;
    }

    /* ======================= Cache Manager ======================= */

    function ownKeys() {
        var out = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k.indexOf('ao_') === 0) out.push({ key: k, bytes: (k.length + (localStorage.getItem(k) || '').length) * 2 });
            }
        } catch (e) { /* ignore */ }
        out.sort(function (a, b) { return b.bytes - a.bytes; });
        return out;
    }

    function cleanSafe() {
        var actions = [];
        var before = lsUsage().own;
        var l = loadLog();
        var from = Date.now() - 7 * DAY;
        var kept = l.filter(function (e) { return e.t >= from; });
        if (kept.length > 100) kept = kept.slice(-100);
        if (kept.length !== l.length) { actions.push('Журнал: удалено записей ' + (l.length - kept.length)); logBuf = kept; jset(K.log, kept); }

        var net = jget(K.net, []);
        if (Array.isArray(net)) {
            var nk = net.filter(function (e) { return e.t >= Date.now() - 3600000; });
            if (nk.length !== net.length) { actions.push('История сети: удалено записей ' + (net.length - nk.length)); jset(K.net, nk); }
        }
        var snaps = getSnaps();
        if (snaps.length > 5) { jset(K.snap, snaps.slice(0, 5)); actions.push('Снимки: оставлено 5 последних'); }

        var keys = ownKeys();
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].key.indexOf(TMP_PREFIX) === 0) { try { localStorage.removeItem(keys[i].key); actions.push('Удалён временный ключ ' + keys[i].key); } catch (e) { /* ignore */ } }
        }
        if (lsUsage().own > OWN_LIMIT) {
            var l2 = loadLog().slice(-30);
            logBuf = l2; jset(K.log, l2);
            actions.push('Журнал сокращён до 30 записей (превышен лимит ' + fmtBytes(OWN_LIMIT) + ')');
        }
        jset(K.clean, Date.now());
        var freed = Math.max(0, before - lsUsage().own);
        if (actions.length) addLog('repair', 'Очистка собственных данных: освобождено ' + fmtBytes(freed));
        return { actions: actions, freed: freed };
    }

    var schedulerTimer = null;
    function startScheduler() {
        if (schedulerTimer) return;
        function check() {
            if (!S.autoClean) return;
            var last = jget(K.clean, 0);
            if (typeof last !== 'number' || Date.now() - last > DAY) cleanSafe();
        }
        check();
        schedulerTimer = setInterval(check, 3600000);
    }

    /* ======================= Smart Optimization ======================= */

    var lastMeasure = null;
    var lastReport = null;

    function saveLast() { jset(K.last, { measure: lastMeasure, report: lastReport }); }

    function loadLast() {
        var v = jget(K.last, null);
        if (v && typeof v === 'object') { lastMeasure = v.measure || null; lastReport = v.report || null; }
    }

    // ctl: { p(percent, text), cancelled() }
    function runFull(ctl, done) {
        var rep = { t: Date.now(), kind: 'full', issuesBefore: [], issuesAfter: [], fixedRepair: [], applied: [], unresolved: [], profile: null, reasons: [], before: null, after: null, reverted: false, cancelled: false, snapId: null, notes: [] };
        var dev = null, mBefore = null;

        function abort() {
            rep.cancelled = true;
            if (rep.snapId) { restoreSnapshot(rep.snapId); rep.reverted = true; }
            done(rep);
        }
        function guard(fn) { return function () { if (ctl.cancelled()) { abort(); return; } fn.apply(null, arguments); }; }

        var s1 = guard(function () {
            ctl.p(4, 'Сканирование устройства');
            dev = scanDevice();
            rep.device = dev.profile;
            ctl.p(10, 'Проверка состояния Lampa');
            var ls = lampaState();
            if (ls.missing.length) rep.notes.push('В Lampa нет API: ' + ls.missing.join(', '));
            yieldThen(s2);
        });
        var s2 = guard(function () {
            ctl.p(16, 'Самодиагностика и безопасные исправления');
            var r = selfCheckAndRepair();
            rep.fixedRepair = r.fixed;
            rep.unresolved = rep.unresolved.concat(r.unresolved);
            yieldThen(s3);
        });
        var s3 = guard(function () {
            ctl.p(24, 'Измерение производительности (до)');
            measure({ deep: true, net: true }, ctl.cancelled, guard(function (m) {
                mBefore = m; rep.before = m.score; lastMeasure = m;
                ctl.p(55, 'Анализ причин проблем');
                rep.issuesBefore = analyze(m, dev);
                yieldThen(s4);
            }));
        });
        var s4 = guard(function () {
            var ch = chooseProfile(mBefore, dev);
            rep.profile = ch.profile;
            rep.reasons = ch.reasons;
            ctl.p(62, 'Выбор профиля: ' + PROFILE_NAMES[ch.profile]);
            var target = clone(PROFILES[ch.profile]);
            var same = true;
            for (var f in target) if (S.features[f] !== target[f]) same = false;
            if (same && S.profile === ch.profile) {
                rep.notes.push('Профиль ' + PROFILE_NAMES[ch.profile] + ' уже применён, новых изменений нет');
                yieldThen(s6);
                return;
            }
            ctl.p(66, 'Резервная копия настроек плагина');
            var snap = pushSnapshot('Перед AUTO OPTIMIZER');
            rep.snapId = snap.id;
            ctl.p(70, 'Применение оптимизации');
            var oldFeatures = clone(S.features);
            var res = setProfile(ch.profile);
            rep.applied = featureDiff(oldFeatures, S.features);
            if (res.unsupported.length) {
                for (var u = 0; u < res.unsupported.length; u++) rep.notes.push('Не поддерживается этим устройством: ' + FEATURE_NAMES[res.unsupported[u]]);
            }
            setTimeout(guard(s5), 1200);
        });
        var s5 = guard(function () {
            ctl.p(76, 'Повторное измерение (после)');
            measure({ deep: true, net: false, reuseNet: mBefore.net }, ctl.cancelled, guard(function (m) {
                rep.after = m.score; lastMeasure = m;
                rep.issuesAfter = analyze(m, dev);
                ctl.p(94, 'Сравнение результатов');
                if (rep.before !== null && rep.after !== null && rep.after < rep.before) {
                    restoreSnapshot(rep.snapId);
                    rep.reverted = true;
                    rep.notes.push('Оценка после оптимизации (' + rep.after + ') ниже исходной (' + rep.before + '): изменения откатаны');
                }
                yieldThen(s6);
            }));
        });
        var s6 = guard(function () {
            if (!rep.after && rep.after !== 0) { rep.after = rep.before; rep.issuesAfter = rep.issuesBefore; }
            cleanSafe();
            var open = [];
            for (var i = 0; i < rep.issuesAfter.length; i++) open.push(rep.issuesAfter[i]);
            rep.unresolvedIssues = open;
            lastReport = rep;
            saveLast();
            ctl.p(100, 'Готово');
            addLog('repair', 'AUTO OPTIMIZER: ' + rep.before + ' → ' + rep.after + ', профиль ' + PROFILE_NAMES[S.profile] + (rep.reverted ? ' (откат)' : ''));
            done(rep);
        });
        s1();
    }

    function runScan(deep, ctl, done) {
        ctl.p(5, 'Сканирование устройства');
        var dev = scanDevice();
        var ls = lampaState();
        ctl.p(15, deep ? 'Глубокая диагностика: измерения' : 'Быстрое сканирование: измерения');
        measure({ deep: deep, net: true }, ctl.cancelled, function (m) {
            lastMeasure = m;
            var rep = { t: Date.now(), kind: deep ? 'deep' : 'quick', device: dev.profile, before: m.score, after: null, issuesBefore: analyze(m, dev), profile: S.profile, applied: [], fixedRepair: [], unresolved: [], notes: ls.missing.length ? ['В Lampa нет API: ' + ls.missing.join(', ')] : [] };
            lastReport = rep;
            saveLast();
            ctl.p(100, 'Готово');
            done(rep);
        });
    }

    /* ======================= интерфейс ======================= */

    var CSS_UI = '' +
        '.ao{padding:1.5em 2em 2em 2em}' +
        '.ao__top{display:flex;align-items:center;margin-bottom:1.2em}' +
        '.ao__ring{width:11em;height:11em;flex-shrink:0;position:relative}' +
        '.ao__ring svg{width:100%;height:100%;transform:rotate(-90deg)}' +
        '.ao__num{position:absolute;left:0;top:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}' +
        '.ao__num b{font-size:3em;font-weight:300;line-height:1}' +
        '.ao__num span{opacity:.6;font-size:1em;margin-top:.2em}' +
        '.ao__info{margin-left:2em;min-width:0}' +
        '.ao__title{font-size:2em;font-weight:300}' +
        '.ao__state{font-size:1.5em;margin:.2em 0}' +
        '.ao__meta{opacity:.6;font-size:1.1em;margin-top:.2em}' +
        '.ao__prog{height:.5em;background:rgba(255,255,255,.12);border-radius:.3em;margin:.8em 0 .4em 0;overflow:hidden}' +
        '.ao__prog i{display:block;height:100%;width:0;background:#4caf50}' +
        '.ao__step{opacity:.8;font-size:1.1em;min-height:1.4em;margin-bottom:.8em}' +
        '.ao__grid{display:flex;flex-wrap:wrap;margin:0 -.3em}' +
        '.ao-btn{margin:.3em;padding:.9em 1.4em;border-radius:.8em;background:rgba(255,255,255,.08);font-size:1.2em;min-width:11em;text-align:center}' +
        '.ao-btn.focus{background:#fff;color:#000}' +
        '.ao-btn.ao-main{background:rgba(76,175,80,.45);font-weight:bold}' +
        '.ao-btn.ao-main.focus{background:#4caf50;color:#fff}' +
        '.ao-btn.ao-dim{opacity:.45}' +
        '.ao__sec{font-size:1.3em;margin:1.2em 0 .5em 0;opacity:.85}' +
        '.ao-row{display:flex;justify-content:space-between;padding:.7em 1em;margin-bottom:.35em;border-radius:.6em;background:rgba(255,255,255,.06);font-size:1.15em}' +
        '.ao-row.focus{background:#fff;color:#000}' +
        '.ao-row .l{opacity:.7;margin-right:1em}' +
        '.ao-row .v{text-align:right;min-width:0}' +
        '.ao-sev{display:inline-block;padding:.1em .6em;border-radius:1em;font-size:.85em;margin-right:.6em;color:#fff}' +
        '.ao-sev.critical{background:#c62828}.ao-sev.high{background:#ef6c00}.ao-sev.medium{background:#f9a825;color:#000}.ao-sev.low{background:#607d8b}' +
        '.ao-ok{color:#66bb6a}.ao-bad{color:#ef5350}' +
        '.ao-row.focus .ao-ok{color:#2e7d32}.ao-row.focus .ao-bad{color:#c62828}' +
        '.ao__note{opacity:.55;font-size:1em;margin:.8em 0}';

    function injectCss() {
        if (document.getElementById('ao-ui-css')) return;
        var st = document.createElement('style');
        st.id = 'ao-ui-css';
        st.appendChild(document.createTextNode(CSS_UI));
        document.head.appendChild(st);
    }

    function select(title, items, onSelect) {
        Lampa.Select.show({
            title: title, items: items,
            onSelect: function (it) { setTimeout(function () { onSelect(it); }, 30); },
            onBack: function () { Lampa.Controller.toggle(COMPONENT); }
        });
    }

    function confirmDialog(title, details, yes, onYes) {
        select(title, [
            { title: 'Отмена', subtitle: 'Ничего не изменится', selected: true, v: 0 },
            { title: yes, subtitle: details, v: 1 }
        ], function (it) { if (it.v === 1) onYes(); else Lampa.Controller.toggle(COMPONENT); });
    }

    function Component() {
        var self = this;
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var html = $('<div class="ao"></div>');
        var body = $('<div class="ao__body"></div>');
        var view = 'home';
        var focusKey = null;
        var destroyed = false;
        var busy = false;
        var cancel = false;
        var prog = { p: 0, text: '' };
        var progEl = null, stepEl = null;

        function btn(key, text, fn, cls) {
            var el = $('<div class="ao-btn selector"></div>').text(text).attr('data-key', key);
            if (cls) el.addClass(cls);
            el.on('hover:focus', function () { focusKey = key; scroll.update(el, true); });
            el.on('hover:enter', function () {
                if (busy && !(cls && cls.indexOf('ao-always') >= 0)) { noty('Подождите, идёт работа. Кнопка «Назад» отменяет её.'); return; }
                fn();
            });
            return el;
        }

        function row(key, label, value, cls) {
            var el = $('<div class="ao-row selector"></div>').attr('data-key', key);
            el.append($('<div class="l"></div>').text(label));
            var v = $('<div class="v"></div>').text(value);
            if (cls) v.addClass(cls);
            el.append(v);
            el.on('hover:focus', function () { focusKey = key; scroll.update(el, true); });
            return el;
        }

        function issueRow(key, is) {
            var el = $('<div class="ao-row selector"></div>').attr('data-key', key);
            var l = $('<div class="l"></div>');
            l.append($('<span class="ao-sev"></span>').addClass(is.sev).text(SEV[is.sev]));
            l.append(document.createTextNode(is.text));
            el.append(l);
            el.append($('<div class="v"></div>').text(is.cause));
            el.on('hover:focus', function () { focusKey = key; scroll.update(el, true); });
            return el;
        }
        function ctl() {
            return {
                p: function (p, t) {
                    prog.p = p; prog.text = t;
                    if (progEl) progEl.css('width', p + '%');
                    if (stepEl) stepEl.text(t + ' · ' + Math.round(p) + '%');
                },
                cancelled: function () { return cancel || destroyed; }
            };
        }

        function run(fn) {
            if (busy) return;
            busy = true; cancel = false; prog = { p: 0, text: 'Запуск' };
            self.draw();
            fn(ctl(), function (rep) {
                busy = false;
                if (destroyed) return;
                if (rep && rep.cancelled) noty('Операция отменена' + (rep.reverted ? ', изменения откатаны' : ''));
                view = rep && !rep.cancelled ? (rep.goto || (rep.kind ? 'report' : 'home')) : 'home';
                self.draw();
            });
        }

        function ring() {
            var sc = lastMeasure ? lastMeasure.score : null;
            var C = 2 * Math.PI * 84;
            var off = sc === null ? C : C * (1 - sc / 100);
            var color = sc === null ? '#607d8b' : sc >= 85 ? '#4caf50' : sc >= 65 ? '#8bc34a' : sc >= 45 ? '#ffb300' : '#e53935';
            var w = $('<div class="ao__ring"></div>');
            w.html('<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="14"></circle>' +
                '<circle cx="100" cy="100" r="84" fill="none" stroke="' + color + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"></circle></svg>');
            var num = $('<div class="ao__num"></div>');
            num.append($('<b></b>').text(sc === null ? '—' : sc));
            num.append($('<span></span>').text('Performance Score'));
            w.append(num);
            return w;
        }

        function homeView() {
            var top = $('<div class="ao__top"></div>');
            top.append(ring());
            var info = $('<div class="ao__info"></div>');
            info.append($('<div class="ao__title"></div>').text(TITLE));
            var sc = lastMeasure ? lastMeasure.score : null;
            info.append($('<div class="ao__state"></div>').text(sc === null ? 'Данных пока нет. Запустите QUICK SCAN' : scoreLabel(sc)));
            info.append($('<div class="ao__meta"></div>').text('Профиль: ' + PROFILE_NAMES[S.profile] + (lastMeasure ? ' · замер ' + fmtTime(lastMeasure.t) : '')));
            if (busy) {
                var pr = $('<div class="ao__prog"><i></i></div>');
                progEl = pr.find('i').css('width', prog.p + '%');
                stepEl = $('<div class="ao__step"></div>').text(prog.text + ' · ' + Math.round(prog.p) + '%');
                info.append(pr).append(stepEl);
            }
            top.append(info);
            body.append(top);

            var g = $('<div class="ao__grid"></div>');
            g.append(btn('full', 'FULL OPTIMIZATION', function () { run(runFull); }, 'ao-main'));
            g.append(btn('quick', 'QUICK SCAN', function () { run(function (c, d) { runScan(false, c, d); }); }));
            g.append(btn('deep', 'DEEP DIAGNOSTICS', function () { run(function (c, d) { runScan(true, c, function (r) { r.goto = 'diag'; d(r); }); }); }));
            g.append(btn('repair', 'AUTO REPAIR', doRepair));
            g.append(btn('cache', 'CACHE MANAGER', function () { view = 'cache'; self.draw(); }));
            g.append(btn('device', 'DEVICE INFO', function () { view = 'device'; self.draw(); }));
            g.append(btn('diagv', 'ДИАГНОСТИКА', function () { view = 'diag'; self.draw(); }));
            g.append(btn('profile', 'ПРОФИЛЬ', profileMenu));
            g.append(btn('log', 'ЖУРНАЛ', function () { view = 'log'; self.draw(); }));
            if (lastReport) g.append(btn('report', 'ПОСЛЕДНИЙ ОТЧЁТ', function () { view = 'report'; self.draw(); }));
            if (getSnaps().length) g.append(btn('undo', 'ВОССТАНОВИТЬ НАСТРОЙКИ', undoMenu));
            body.append(g);
            body.append($('<div class="ao__note"></div>').text('Плагин меняет только собственный профиль (изображения, анимации, размытие). Кэш ТВ, данные Lampa и сеть не затрагиваются. Любое изменение можно откатить.'));
        }

        function doRepair() {
            var r = selfCheckAndRepair();
            lastReport = { t: Date.now(), kind: 'repair', device: null, before: null, after: null, issuesBefore: [], profile: S.profile, applied: [], fixedRepair: r.fixed, unresolved: r.unresolved, found: r.found, notes: r.found.length ? [] : ['Проблем не найдено'] };
            saveLast();
            view = 'report';
            self.draw();
        }

        function profileMenu() {
            var items = [
                { title: 'Автоматически (после диагностики)', subtitle: 'Запустит FULL OPTIMIZATION', v: 'auto' },
                { title: 'ECO MODE', subtitle: 'Минимум анимаций, lazy-загрузка, без размытия', v: 'eco' },
                { title: 'BALANCED MODE', subtitle: 'Lazy-загрузка, без размытия, preconnect', v: 'balanced' },
                { title: 'PERFORMANCE MODE', subtitle: 'Async-декодирование, preconnect, эффекты сохранены', v: 'performance' },
                { title: 'Отключить все функции плагина', subtitle: 'Вернуть вид Lampa как был', v: 'none' }
            ];
            for (var i = 0; i < items.length; i++) if (items[i].v === S.profile) items[i].selected = true;
            select('Профиль', items, function (it) {
                if (it.v === 'auto') { Lampa.Controller.toggle(COMPONENT); run(runFull); return; }
                pushSnapshot('Перед сменой профиля');
                var res = setProfile(it.v);
                noty('Профиль: ' + PROFILE_NAMES[it.v] + (res.unsupported.length ? ' (часть функций не поддерживается устройством)' : ''));
                view = 'home';
                self.draw();
            });
        }

        function undoMenu() {
            var snaps = getSnaps();
            select('Восстановить настройки', snaps.map(function (s, i) {
                return { title: fmtTime(s.t) + ' · ' + PROFILE_NAMES[s.settings.profile], subtitle: s.reason, idx: i, selected: i === 0 };
            }), function (it) {
                var s = snaps[it.idx];
                confirmDialog('Вернуть настройки от ' + fmtTime(s.t) + '?', 'Профиль: ' + PROFILE_NAMES[s.settings.profile] + '. Текущие настройки тоже сохранятся', 'Да, вернуть', function () {
                    noty(restoreSnapshot(s.id) ? 'Настройки восстановлены' : 'Не удалось восстановить');
                    view = 'home';
                    self.draw();
                });
            });
        }

        function backBtn() { return btn('back', '← Назад', function () { view = 'home'; self.draw(); }); }

        function diagView() {
            body.append(backBtn());
            var m = lastMeasure;
            if (!m) { body.append($('<div class="ao__note"></div>').text('Измерений ещё не было. Запустите QUICK SCAN или DEEP DIAGNOSTICS.')); return; }
            var dev = scanDevice();
            body.append($('<div class="ao__sec"></div>').text('CPU'));
            body.append(row('c1', 'Тест скорости JS (лучший из раундов)', m.cpu ? m.cpu.ms + ' мс' : 'нет данных'));
            body.append(row('c2', 'Логические ядра (по данным браузера)', dev.cores ? String(dev.cores) : 'недоступно'));
            body.append($('<div class="ao__note"></div>').text('Модель и загрузка процессора недоступны: надёжного API нет.'));

            body.append($('<div class="ao__sec"></div>').text('MEMORY'));
            body.append(row('m1', 'Память JS (heap)', m.mem && typeof m.mem.ratio === 'number' ? fmtBytes(m.mem.used) + ' из ' + fmtBytes(m.mem.limit) + ' (' + Math.round(m.mem.ratio * 100) + '%)' : 'API недоступен на этом устройстве'));
            body.append(row('m2', 'RAM устройства (округлённо)', m.mem && m.mem.device ? '≈ ' + m.mem.device + ' ГБ' : 'недоступно'));
            body.append(row('m3', 'localStorage: всего / плагин', m.mem ? fmtBytes(m.mem.ls.total) + ' / ' + fmtBytes(m.mem.ls.own) : '—'));

            body.append($('<div class="ao__sec"></div>').text('NETWORK'));
            if (!m.net) body.append(row('n0', 'Сетевые тесты', 'не выполнялись'));
            else if (!m.net.hosts.length) body.append(row('n0', 'Хосты Lampa', 'определить не удалось (нет Lampa.TMDB)'));
            else m.net.hosts.forEach(function (h, i) {
                body.append(row('n' + i, h.host, h.ok ? 'отклик ' + h.median + ' мс' + (h.fails ? ', сбоев ' + h.fails : '') : (h.unsupported ? 'fetch недоступен' : 'недоступен'), h.ok ? 'ao-ok' : 'ao-bad'));
            });
            if (m.res && m.res.imgN) body.append(row('n_img', 'Загрузка изображений (среднее / p90)', m.res.imgAvg + ' / ' + m.res.imgP90 + ' мс, замеров ' + m.res.imgN));
            body.append($('<div class="ao__note"></div>').text('Проверка делает HEAD-запрос к корню хоста без данных пользователя; содержимое ответа недоступно (CORS), измеряется только время.'));

            body.append($('<div class="ao__sec"></div>').text('INTERFACE'));
            if (m.frames) {
                body.append(row('i1', 'Кадр: среднее / максимум', m.frames.avg + ' / ' + m.frames.max + ' мс'));
                body.append(row('i2', 'Пропущенных кадров', m.frames.jank + ' из ' + m.frames.n + ' (' + Math.round(m.frames.jankRatio * 100) + '%)'));
            } else body.append(row('i1', 'Плавность отрисовки', 'измерить не удалось'));
            body.append(row('i3', 'Длинные задачи за минуту', m.longtasks && m.longtasks.supported ? String(m.longtasks.n60) : 'API не поддерживается'));
            body.append(row('i4', 'Элементов DOM / широких контейнеров', m.dom.nodes + ' / ' + m.dom.wide));
            body.append(row('i5', 'Изображений / не завершено', m.dom.imgs + ' / ' + m.dom.pending));
            body.append($('<div class="ao__note"></div>').text('Плавность — синтетический тест отрисовки. Время открытия главной страницы и карточек плагин не измеряет.'));

            body.append($('<div class="ao__sec"></div>').text('ERRORS'));
            var issues = analyze(m, dev);
            if (!issues.length) body.append(row('e0', 'Проблем по замерам', 'не найдено', 'ao-ok'));
            issues.forEach(function (is, i) { body.append(issueRow('e' + i, is)); });
            var l = loadLog().slice(-5).reverse();
            l.forEach(function (e, i) { body.append(row('el' + i, fmtTime(e.t) + ' · ' + e.type, e.msg + (e.n > 1 ? ' ×' + e.n : ''))); });

            body.append($('<div class="ao__sec"></div>').text('OPTIMIZATION'));
            body.append(row('o0', 'Профиль', PROFILE_NAMES[S.profile]));
            for (var f in FEATURE_NAMES) {
                var unsup = (f === 'imgAsync' && !IMG_DECODING) || (f === 'imgLazy' && !IMG_LOADING);
                body.append(row('o_' + f, FEATURE_NAMES[f], unsup ? 'не поддерживается' : (S.features[f] ? 'включено' : 'выключено'), S.features[f] && !unsup ? 'ao-ok' : ''));
            }
            body.append($('<div class="ao__note"></div>').text('Score = взвешенное среднее: отрисовка 35%, JS 25%, DOM 15%, память 10%, ошибки 10%, сеть 5% (недоступные части исключаются). Пороги эвристические.'));
        }

        function deviceView() {
            body.append(backBtn());
            var d = scanDevice();
            var rows = [
                ['Профиль устройства', d.profile],
                ['Платформа (по Lampa)', d.lampaPlatforms.length ? d.lampaPlatforms.join(', ') : 'не определена'],
                ['Версия Lampa', d.lampaVersion || 'недоступна'],
                ['Движок', d.engine ? d.engine.name + ' ' + d.engine.major : 'не определён'],
                ['Экран / окно', d.screen.w + '×' + d.screen.h + ' / ' + d.screen.iw + '×' + d.screen.ih + ' @' + d.screen.dpr + 'x'],
                ['Аппаратное ускорение (WebGL)', d.gl.available ? (d.gl.software ? 'программное' : 'доступно') + (d.gl.renderer ? ': ' + d.gl.renderer : '') : 'WebGL недоступен'],
                ['CSS 3D transform', d.css3d === null ? 'неизвестно' : d.css3d ? 'да' : 'нет'],
                ['Логические ядра (браузер)', d.cores ? String(d.cores) : 'недоступно'],
                ['RAM (navigator.deviceMemory)', d.deviceMemory ? '≈ ' + d.deviceMemory + ' ГБ' : 'недоступно'],
                ['API памяти JS', (window.performance && performance.memory) ? 'есть' : 'нет'],
                ['User Agent', d.ua || 'недоступен']
            ];
            rows.forEach(function (r, i) { body.append(row('d' + i, r[0], r[1])); });
            body.append($('<div class="ao__sec"></div>').text('Поддержка API'));
            var i2 = 0;
            for (var k in d.features) body.append(row('f' + (i2++), k, d.features[k] ? 'да' : 'нет', d.features[k] ? 'ao-ok' : 'ao-bad'));
            d.notes.forEach(function (n) { body.append($('<div class="ao__note"></div>').text(n)); });
        }

        function cacheView() {
            body.append(backBtn());
            var keys = ownKeys();
            var u = lsUsage();
            body.append(row('k0', 'Данные плагина (ключи ao_*)', fmtBytes(u.own) + ' из лимита ' + fmtBytes(OWN_LIMIT)));
            keys.forEach(function (k, i) { body.append(row('k' + (i + 1), k.key, fmtBytes(k.bytes))); });
            body.append(row('k_auto', 'Автоочистка раз в сутки', S.autoClean ? 'включена' : 'выключена', S.autoClean ? 'ao-ok' : ''));
            var g = $('<div class="ao__grid"></div>');
            g.append(btn('c_clean', 'Очистить безопасные данные', function () {
                confirmDialog('Очистить данные плагина?', 'Старые записи журнала, истории сети и лишние снимки. Настройки Lampa не затрагиваются', 'Да, очистить', function () {
                    var r = cleanSafe();
                    noty(r.actions.length ? 'Освобождено ' + fmtBytes(r.freed) : 'Очищать нечего');
                    self.draw();
                });
            }));
            g.append(btn('c_auto', S.autoClean ? 'Выключить автоочистку' : 'Включить автоочистку', function () { S.autoClean = !S.autoClean; saveSettings(); self.draw(); }));
            g.append(btn('c_log', 'Стереть журнал', function () {
                confirmDialog('Стереть журнал ошибок?', 'Только журнал плагина', 'Да, стереть', function () { logBuf = []; jset(K.log, []); self.draw(); });
            }));
            body.append(g);
            body.append($('<div class="ao__note"></div>').text('Очищаются только данные плагина. Системный кэш телевизора, кэш браузера, история, закладки и аккаунты Lampa не затрагиваются: у плагина нет такого доступа и он его не использует.'));
        }

        function logView() {
            body.append(backBtn());
            var l = loadLog().slice().reverse().slice(0, 40);
            if (!l.length) body.append($('<div class="ao__note"></div>').text('Журнал пуст.'));
            l.forEach(function (e, i) { body.append(row('l' + i, fmtTime(e.t) + ' · ' + e.type + (e.own ? ' · плагин' : ''), e.msg + (e.n > 1 ? ' ×' + e.n : ''))); });
        }

        function reportView() {
            body.append(backBtn());
            var r = lastReport;
            if (!r) { body.append($('<div class="ao__note"></div>').text('Отчётов пока нет.')); return; }
            var title = r.kind === 'full' ? 'FULL OPTIMIZATION' : r.kind === 'deep' ? 'DEEP DIAGNOSTICS' : r.kind === 'quick' ? 'QUICK SCAN' : 'AUTO REPAIR';
            body.append($('<div class="ao__sec"></div>').text('Отчёт: ' + title + ' · ' + fmtTime(r.t)));
            var found = (r.issuesBefore ? r.issuesBefore.length : 0) + (r.found ? r.found.length : 0);
            var fixedByMeasure = 0;
            if (r.kind === 'full' && r.issuesAfter && !r.reverted) {
                var open = {};
                r.issuesAfter.forEach(function (x) { open[x.id] = 1; });
                r.issuesBefore.forEach(function (x) { if (!open[x.id]) fixedByMeasure++; });
            }
            var fixed = (r.fixedRepair ? r.fixedRepair.length : 0) + fixedByMeasure;
            body.append(row('r1', 'Найдено проблем', String(found)));
            body.append(row('r2', 'Исправлено (ремонт + устранено по повторному замеру)', String(fixed)));
            if (r.device) body.append(row('r3', 'Устройство', r.device));
            body.append(row('r4', 'Выбранный профиль', PROFILE_NAMES[S.profile] + (r.reverted ? ' (откат: изменения не помогли)' : '')));
            if (r.before !== null && r.before !== undefined) body.append(row('r5', 'Производительность до', String(r.before)));
            if (r.kind === 'full') body.append(row('r6', 'Производительность после', r.after === null || r.after === undefined ? '—' : String(r.after)));
            if (r.reasons && r.reasons.length) body.append(row('r7', 'Причина выбора профиля', r.reasons.join(', ')));

            var done = (r.applied || []).concat(r.fixedRepair || []);
            body.append($('<div class="ao__sec"></div>').text('Выполненные действия'));
            if (!done.length) body.append(row('a0', 'Изменений не вносилось', ''));
            done.forEach(function (t, i) { body.append(row('a' + i, t, '')); });

            var left = (r.kind === 'full' ? (r.issuesAfter || []) : (r.issuesBefore || []));
            body.append($('<div class="ao__sec"></div>').text('Требуют вмешательства'));
            if (!left.length && !(r.unresolved && r.unresolved.length)) body.append(row('u0', 'Нерешённых проблем нет', '', 'ao-ok'));
            left.forEach(function (is, i) { body.append(issueRow('u' + i, is)); });
            (r.unresolved || []).forEach(function (t, i) { body.append(row('uu' + i, t, '')); });
            (r.notes || []).forEach(function (t) { body.append($('<div class="ao__note"></div>').text(t)); });
            body.append($('<div class="ao__note"></div>').text('Результаты замеров приблизительные и могут колебаться от запуска к запуску.'));

            var g = $('<div class="ao__grid"></div>');
            if (getSnaps().length) g.append(btn('r_undo', 'Восстановить предыдущие настройки', undoMenu));
            body.append(g);
        }

        this.draw = function () {
            if (destroyed) return;
            body.empty();
            progEl = null; stepEl = null;
            if (view === 'diag') diagView();
            else if (view === 'device') deviceView();
            else if (view === 'cache') cacheView();
            else if (view === 'log') logView();
            else if (view === 'report') reportView();
            else homeView();
            if (Lampa.Controller.enabled && Lampa.Controller.enabled().name === COMPONENT) Lampa.Controller.toggle(COMPONENT);
        };

        this.create = function () {
            scroll.append(body);
            html.append(scroll.render());
            this.draw();
            this.activity.loader(false);
            this.activity.toggle();
        };

        this.start = function () {
            try {
                if (Lampa.Activity.active && Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return;
            } catch (e) { /* продолжаем */ }
            var nav = (typeof Navigator !== 'undefined' && Navigator && typeof Navigator.canmove === 'function') ? Navigator : null;
            Lampa.Controller.add(COMPONENT, {
                toggle: function () {
                    var target = body.find('[data-key="' + focusKey + '"]')[0] || body.find('.selector')[0] || false;
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(target, scroll.render());
                },
                left: function () { if (nav && nav.canmove('left')) nav.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function () { if (nav && nav.canmove('right')) nav.move('right'); },
                up: function () { if (nav && nav.canmove('up')) nav.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { if (nav && nav.canmove('down')) nav.move('down'); },
                back: function () {
                    if (busy) { cancel = true; noty('Отмена…'); return; }
                    if (view !== 'home') { view = 'home'; self.draw(); return; }
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle(COMPONENT);
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () {
            destroyed = true; cancel = true;
            try { scroll.destroy(); } catch (e) { /* ignore */ }
            html.remove();
        };
    }

    /* ======================= меню и запуск ======================= */

    function addMenuItem() {
        var icon = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>';
        function open() { Lampa.Activity.push({ url: '', title: TITLE, component: COMPONENT, page: 1 }); }
        var exists = false;
        $('.menu__text').each(function () { if ($(this).text() === TITLE) exists = true; });
        if (exists) return 'exists';
        try {
            if (Lampa.Menu && typeof Lampa.Menu.addButton === 'function') { Lampa.Menu.addButton(icon, TITLE, open); return 'api'; }
        } catch (e) { dbg('Menu.addButton failed', e); }
        var list = $('.menu .menu__list').eq(0);
        if (list.length) {
            var li = $('<li class="menu__item selector"><div class="menu__ico"></div><div class="menu__text"></div></li>');
            li.find('.menu__ico').html(icon);
            li.find('.menu__text').text(TITLE);
            li.on('hover:enter', open);
            list.append(li);
            return 'dom';
        }
        return null;
    }

    var started = false;

    function start() {
        if (started) return;
        started = true;
        var need = ['Storage', 'Scroll', 'Component', 'Activity', 'Controller', 'Select', 'Noty', 'Listener'];
        var missing = need.filter(function (n) { return !window.Lampa || !window.Lampa[n]; });
        if (missing.length || typeof window.$ !== 'function') {
            dbg('Не хватает API:', missing.join(', '));
            try { noty(TITLE + ': эта версия Lampa не поддерживается (нет ' + missing.join(', ') + ')'); } catch (e) { /* ignore */ }
            return;
        }
        try {
            startDetector();
            loadLast();
            if (corruptKeys.length || settingsWereInvalid) selfCheckAndRepair();
            applyFeatures();
            startScheduler();
            injectCss();
            Lampa.Component.add(COMPONENT, Component);
            var how = addMenuItem();
            if (!how) noty(TITLE + ': не удалось добавить пункт в меню');
            dbg('v' + VERSION + ' ready, menu:', how, 'profile:', S.profile);
        } catch (e2) {
            dbg('init error', e2);
            addLog('own', 'Ошибка запуска: ' + (e2 && e2.message), true);
            noty(TITLE + ': ошибка запуска, подробности в консоли');
        }
    }

    function boot() {
        if (window.appready) start();
        else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
    }

    function waitLampa(left) {
        if (window.Lampa && window.Lampa.Listener) boot();
        else if (left > 0) setTimeout(function () { waitLampa(left - 1); }, 200);
    }

    // для проверки логики вне Lampa
    window.AutoOptimizerCore = {
        version: VERSION, computeScore: computeScore, analyze: analyze, chooseProfile: chooseProfile,
        scanDevice: scanDevice, validSettings: validSettings, defaults: defaults, getSettings: function () { return S; },
        setProfile: setProfile, pushSnapshot: pushSnapshot, restoreSnapshot: restoreSnapshot, getSnaps: getSnaps,
        cleanSafe: cleanSafe, selfCheckAndRepair: selfCheckAndRepair, addLog: addLog, loadLog: loadLog,
        scoreLabel: scoreLabel, featureDiff: featureDiff, median: median
    };

    waitLampa(50);
})();