/*!
 * Docsify Plugin: search v4.13.0
 * https://docsify.js.org
 * (c) 2017-2024
 * MIT license
 */
(function() {
    "use strict";
    function getAndRemoveConfig() {
        let str = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const config = {};
        if (str) {
            str = str.replace(/^('|")/, "").replace(/('|")$/, "").replace(/(?:^|\s):([\w-]+:?)=?([\w-%]+)?/g, ((m, key, value) => {
                if (key.indexOf(":") === -1) {
                    config[key] = value && value.replace(/&quot;/g, "") || true;
                    return "";
                }
                return m;
            })).trim();
        }
        return {
            str: str,
            config: config
        };
    }
    function getAndRemoveDocsifyIgnoreConfig() {
        let content = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        let ignoreAllSubs, ignoreSubHeading;
        if (/<!-- {docsify-ignore} -->/g.test(content)) {
            content = content.replace("\x3c!-- {docsify-ignore} --\x3e", "");
            ignoreSubHeading = true;
        }
        if (/{docsify-ignore}/g.test(content)) {
            content = content.replace("{docsify-ignore}", "");
            ignoreSubHeading = true;
        }
        if (/<!-- {docsify-ignore-all} -->/g.test(content)) {
            content = content.replace("\x3c!-- {docsify-ignore-all} --\x3e", "");
            ignoreAllSubs = true;
        }
        if (/{docsify-ignore-all}/g.test(content)) {
            content = content.replace("{docsify-ignore-all}", "");
            ignoreAllSubs = true;
        }
        return {
            content: content,
            ignoreAllSubs: ignoreAllSubs,
            ignoreSubHeading: ignoreSubHeading
        };
    }
    let INDEXS = {};
    const LOCAL_STORAGE = {
        EXPIRE_KEY: "docsify.search.expires",
        INDEX_KEY: "docsify.search.index"
    };
    function resolveExpireKey(namespace) {
        return namespace ? `${LOCAL_STORAGE.EXPIRE_KEY}/${namespace}` : LOCAL_STORAGE.EXPIRE_KEY;
    }
    function resolveIndexKey(namespace) {
        return namespace ? `${LOCAL_STORAGE.INDEX_KEY}/${namespace}` : LOCAL_STORAGE.INDEX_KEY;
    }
    function escapeHtml(string) {
        const entityMap = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return String(string).replace(/[&<>"']/g, (s => entityMap[s]));
    }
    function getAllPaths(router) {
        const paths = [];
        Docsify.dom.findAll(".sidebar-nav a:not(.section-link):not([data-nosearch])").forEach((node => {
            const href = node.href;
            const originHref = node.getAttribute("href");
            const path = router.parse(href).path;
            if (path && paths.indexOf(path) === -1 && !Docsify.util.isAbsolutePath(originHref)) {
                paths.push(path);
            }
        }));
        return paths;
    }
    function getTableData(token) {
        if (!token.text && token.type === "table") {
            token.rows.unshift(token.header);
            token.text = token.rows.map((columns => columns.map((r => r.text)).join(" | "))).join(" |\n ");
        }
        return token.text;
    }
    function getListData(token) {
        if (!token.text && token.type === "list") {
            token.text = token.raw;
        }
        return token.text;
    }
    function saveData(maxAge, expireKey, indexKey) {
        localStorage.setItem(expireKey, Date.now() + maxAge);
        localStorage.setItem(indexKey, JSON.stringify(INDEXS));
    }
    function genIndex(path) {
        let content = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
        let router = arguments.length > 2 ? arguments[2] : undefined;
        let depth = arguments.length > 3 ? arguments[3] : undefined;
        const tokens = window.marked.lexer(content);
        const slugify = window.Docsify.slugify;
        const index = {};
        let slug;
        let title = "";
        tokens.forEach(((token, tokenIndex) => {
            if (token.type === "heading" && token.depth <= depth) {
                const {str: str, config: config} = getAndRemoveConfig(token.text);
                const text = getAndRemoveDocsifyIgnoreConfig(token.text).content;
                if (config.id) {
                    slug = router.toURL(path, {
                        id: slugify(config.id)
                    });
                } else {
                    slug = router.toURL(path, {
                        id: slugify(escapeHtml(text))
                    });
                }
                if (str) {
                    title = getAndRemoveDocsifyIgnoreConfig(str).content;
                }
                index[slug] = {
                    slug: slug,
                    title: title,
                    body: ""
                };
            } else {
                if (tokenIndex === 0) {
                    slug = router.toURL(path);
                    index[slug] = {
                        slug: slug,
                        title: path !== "/" ? path.slice(1) : "Home Page",
                        body: token.text || ""
                    };
                }
                if (!slug) {
                    return;
                }
                if (!index[slug]) {
                    index[slug] = {
                        slug: slug,
                        title: "",
                        body: ""
                    };
                } else if (index[slug].body) {
                    token.text = getTableData(token);
                    token.text = getListData(token);
                    index[slug].body += "\n" + (token.text || "");
                } else {
                    token.text = getTableData(token);
                    token.text = getListData(token);
                    index[slug].body = token.text || "";
                }
            }
        }));
        slugify.clear();
        return index;
    }
    function ignoreDiacriticalMarks(keyword) {
        if (keyword && keyword.normalize) {
            return keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
        return keyword;
    }
    function search(query) {
        const matchingResults = [];
        let data = [];
        Object.keys(INDEXS).forEach((key => {
            data = [ ...data, ...Object.keys(INDEXS[key]).map((page => INDEXS[key][page])) ];
        }));
        query = query.trim();
        let keywords = query.split(/[\s\-，\\/]+/);
        if (keywords.length !== 1) {
            keywords = [ query, ...keywords ];
        }
        for (const post of data) {
            let matchesScore = 0;
            let resultStr = "";
            let handlePostTitle = "";
            let handlePostContent = "";
            const postTitle = post.title && post.title.trim();
            const postContent = post.body && post.body.trim();
            const postUrl = post.slug || "";
            if (postTitle) {
                keywords.forEach((keyword => {
                    const regEx = new RegExp(escapeHtml(ignoreDiacriticalMarks(keyword)).replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"), "gi");
                    let indexTitle = -1;
                    let indexContent = -1;
                    handlePostTitle = postTitle ? escapeHtml(ignoreDiacriticalMarks(postTitle)) : postTitle;
                    handlePostContent = postContent ? escapeHtml(ignoreDiacriticalMarks(postContent)) : postContent;
                    indexTitle = postTitle ? handlePostTitle.search(regEx) : -1;
                    indexContent = postContent ? handlePostContent.search(regEx) : -1;
                    if (indexTitle >= 0 || indexContent >= 0) {
                        matchesScore += indexTitle >= 0 ? 3 : indexContent >= 0 ? 2 : 0;
                        if (indexContent < 0) {
                            indexContent = 0;
                        }
                        let start = 0;
                        let end = 0;
                        start = indexContent < 11 ? 0 : indexContent - 10;
                        end = start === 0 ? 100 : indexContent + keyword.length + 90;
                        if (postContent && end > postContent.length) {
                            end = postContent.length;
                        }
                        const matchContent = handlePostContent && handlePostContent.substring(start, end).replace(regEx, (word => `<mark>${word}</mark>`));
                        resultStr += matchContent;
                    }
                }));
                if (matchesScore > 0) {
                    const matchingPost = {
                        title: handlePostTitle,
                        content: postContent ? resultStr : "",
                        url: postUrl,
                        score: matchesScore
                    };
                    matchingResults.push(matchingPost);
                }
            }
        }
        return matchingResults.sort(((r1, r2) => r2.score - r1.score));
    }
    function init$1(config, vm) {
        const isAuto = config.paths === "auto";
        const paths = isAuto ? getAllPaths(vm.router) : config.paths;
        let namespaceSuffix = "";
        if (paths.length && isAuto && config.pathNamespaces) {
            const path = paths[0];
            if (Array.isArray(config.pathNamespaces)) {
                namespaceSuffix = config.pathNamespaces.filter((prefix => path.slice(0, prefix.length) === prefix))[0] || namespaceSuffix;
            } else if (config.pathNamespaces instanceof RegExp) {
                const matches = path.match(config.pathNamespaces);
                if (matches) {
                    namespaceSuffix = matches[0];
                }
            }
            const isExistHome = paths.indexOf(namespaceSuffix + "/") === -1;
            const isExistReadme = paths.indexOf(namespaceSuffix + "/README") === -1;
            if (isExistHome && isExistReadme) {
                paths.unshift(namespaceSuffix + "/");
            }
        } else if (paths.indexOf("/") === -1 && paths.indexOf("/README") === -1) {
            paths.unshift("/");
        }
        const expireKey = resolveExpireKey(config.namespace) + namespaceSuffix;
        const indexKey = resolveIndexKey(config.namespace) + namespaceSuffix;
        const isExpired = localStorage.getItem(expireKey) < Date.now();
        INDEXS = JSON.parse(localStorage.getItem(indexKey));
        if (isExpired) {
            INDEXS = {};
        } else if (!isAuto) {
            return;
        }
        const len = paths.length;
        let count = 0;
        paths.forEach((path => {
            if (INDEXS[path]) {
                return count++;
            }
            Docsify.get(vm.router.getFile(path), false, vm.config.requestHeaders).then((result => {
                INDEXS[path] = genIndex(path, result, vm.router, config.depth);
                len === ++count && saveData(config.maxAge, expireKey, indexKey);
            }));
        }));
    }
    var cssText = "/* prettier-ignore */\n:root {\n  --plugin-search-input-bg           : var(--form-element-bg);\n  --plugin-search-input-border-color : var(--sidebar-border-color);\n  --plugin-search-input-border-radius: var(--form-element-border-radius);\n  --plugin-search-input-color        : var(--form-element-color);\n  --plugin-search-kbd-bg             : var(--color-bg);\n  --plugin-search-kbd-border         : 1px solid var(--color-mono-3);\n  --plugin-search-kbd-border-radius  : 4px;\n  --plugin-search-kbd-color          : var(--color-mono-5);\n  --plugin-search-margin             : 10px;\n  --plugin-search-reset-bg           : var(--theme-color);\n  --plugin-search-reset-border       : transparent;\n  --plugin-search-reset-border-radius: var(--border-radius);\n  --plugin-search-reset-color        : #fff;\n}\n\n.search {\n  margin: var(--plugin-search-margin);\n}\n\n/* Input */\n/* ================================== */\n.search .input-wrap {\n  position: relative;\n}\n\n.search input {\n  width: 100%;\n  padding-inline-end: 36px;\n  border: 1px solid var(--plugin-search-input-border-color);\n  border-radius: var(--plugin-search-input-border-radius);\n  background: var(--plugin-search-input-bg);\n  color: var(--plugin-search-input-color);\n}\n\n.search input::-webkit-search-decoration,\n.search input::-webkit-search-cancel-button {\n  appearance: none;\n}\n\n.search .clear-button,\n.search .kbd-group {\n  visibility: hidden;\n  display: flex;\n  gap: 0.15em;\n  position: absolute;\n  right: 7px;\n  top: 50%;\n  opacity: 0;\n  translate: 0 -50%;\n  transition-property: opacity, visibility;\n  transition-duration: var(--duration-medium);\n}\n\n/* Note: invalid = empty, valid = not empty */\n.search input:valid ~ .clear-button,\n.search input:invalid:where(:focus, :hover) ~ .kbd-group,\n.search .kbd-group:hover {\n  visibility: visible;\n  opacity: 1;\n}\n\n.search .clear-button {\n  --_button-size: 20px;\n  --_content-size: 12px;\n\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: var(--_button-size);\n  width: var(--_button-size);\n  border: var(--plugin-search-reset-border);\n  border-radius: var(--plugin-search-reset-border-radius);\n  background: var(--plugin-search-reset-bg);\n  cursor: pointer;\n}\n\n.search .clear-button::before,\n.search .clear-button::after {\n  content: '';\n  position: absolute;\n  height: 2px;\n  width: var(--_content-size);\n  color: var(--plugin-search-reset-color);\n  background: var(--plugin-search-reset-color);\n}\n\n.search .clear-button::before {\n  rotate: 45deg;\n}\n\n.search .clear-button::after {\n  rotate: -45deg;\n}\n\n.search kbd {\n  border: var(--plugin-search-kbd-border);\n  border-radius: var(--plugin-search-kbd-border-radius);\n  background: var(--plugin-search-kbd-bg);\n  color: var(--plugin-search-kbd-color);\n  font-size: var(--font-size-s);\n}\n\n/* Results */\n/* ================================== */\n.search a:hover {\n  color: var(--theme-color);\n}\n\n.search .results-panel:empty {\n  display: none;\n}\n\n/* Hide other sidebar items when results are shown */\n.search:has(.results-panel:not(:empty)) ~ * {\n  display: none;\n}\n\n/* Dim other sidebar items when no results are found */\n.search:where(:has(input:valid:focus), :has(.results-panel::empty)) ~ * {\n  opacity: 0.2;\n}\n\n.search .matching-post {\n  overflow: hidden;\n  padding: 1em 0 1.2em 0;\n  border-bottom: 1px solid var(--color-mono-2);\n}\n\n.search .matching-post:hover a {\n  text-decoration-color: transparent;\n}\n\n.search .matching-post:hover .title {\n  text-decoration: inherit;\n  text-decoration-color: var(--link-underline-color-hover);\n}\n\n.search .matching-post .title {\n  margin: 0 0 0.5em 0;\n  line-height: 1.4;\n}\n\n.search .matching-post .content {\n  margin: 0;\n  color: var(--color-mono-6);\n  font-size: var(--font-size-s);\n}\n\n.search .results-status {\n  margin-bottom: 0;\n  color: var(--color-mono-6);\n  font-size: var(--font-size-s);\n}\n\n.search .results-status:empty {\n  display: none;\n}\n";
    let NO_DATA_TEXT = "";
    function tpl(vm) {
        let defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
        const {insertAfter: insertAfter, insertBefore: insertBefore} = vm.config?.search || {};
        const html = `\n    <div class="input-wrap">\n      <input type="search" value="${defaultValue}" required aria-keyshortcuts="/ control+k meta+k" />\n      <button class="clear-button" title="Clear search">\n        <span class="visually-hidden">Clear search</span>\n      </button>\n      <div class="kbd-group">\n        <kbd title="Press / to search">/</kbd>\n        <kbd title="Press Control+K to search">⌃K</kbd>\n      </div>\n    </div>\n    <p class="results-status" aria-live="polite"></p>\n    <div class="results-panel"></div>\n  `;
        const sidebarElm = Docsify.dom.find(".sidebar");
        const searchElm = Docsify.dom.create("section", html);
        const insertElm = sidebarElm.querySelector(`:scope ${insertAfter || insertBefore || "> :first-child"}`);
        searchElm.classList.add("search");
        searchElm.setAttribute("role", "search");
        sidebarElm.insertBefore(searchElm, insertAfter ? insertElm.nextSibling : insertElm);
    }
    function doSearch(value) {
        const $search = Docsify.dom.find(".search");
        const $panel = Docsify.dom.find($search, ".results-panel");
        const $status = Docsify.dom.find(".search .results-status");
        if (!value) {
            $panel.innerHTML = "";
            $status.textContent = "";
            return;
        }
        const matches = search(value);
        let html = "";
        matches.forEach(((post, i) => {
            html += `\n      <div class="matching-post" aria-label="search result ${i + 1}">\n        <a href="${post.url}">\n          <p class="title clamp-1">${post.title}</p>\n          <p class="content clamp-2">${post.content}</p>\n        </a>\n      </div>\n    `;
        }));
        $panel.innerHTML = html || "";
        $status.textContent = matches.length ? `Found ${matches.length} results` : NO_DATA_TEXT;
    }
    function bindEvents() {
        const $search = Docsify.dom.find(".search");
        const $input = Docsify.dom.find($search, "input");
        const $clear = Docsify.dom.find($search, ".clear-button");
        let timeId;
        Docsify.dom.on($search, "click", (e => [ "A", "H2", "P", "EM" ].indexOf(e.target.tagName) === -1 && e.stopPropagation()));
        Docsify.dom.on($input, "input", (e => {
            clearTimeout(timeId);
            timeId = setTimeout((_ => doSearch(e.target.value.trim())), 100);
        }));
        Docsify.dom.on($clear, "click", (e => {
            $input.value = "";
            doSearch();
        }));
    }
    function updatePlaceholder(text, path) {
        const $input = Docsify.dom.getNode('.search input[type="search"]');
        if (!$input) {
            return;
        }
        if (typeof text === "string") {
            $input.placeholder = text;
        } else {
            const match = Object.keys(text).filter((key => path.indexOf(key) > -1))[0];
            $input.placeholder = text[match];
        }
    }
    function updateNoData(text, path) {
        if (typeof text === "string") {
            NO_DATA_TEXT = text;
        } else {
            const match = Object.keys(text).filter((key => path.indexOf(key) > -1))[0];
            NO_DATA_TEXT = text[match];
        }
    }
    function init(opts, vm) {
        const sidebarElm = Docsify.dom.find(".sidebar");
        if (!sidebarElm) {
            return;
        }
        const keywords = vm.router.parse().query.s;
        Docsify.dom.style(cssText);
        tpl(vm, keywords);
        bindEvents();
        keywords && setTimeout((_ => doSearch(keywords)), 500);
    }
    function update(opts, vm) {
        updatePlaceholder(opts.placeholder, vm.route.path);
        updateNoData(opts.noData, vm.route.path);
    }
    const CONFIG = {
        placeholder: "Type to search",
        noData: "No Results!",
        paths: "auto",
        depth: 2,
        maxAge: 864e5,
        namespace: undefined,
        pathNamespaces: undefined,
        keyBindings: [ "/", "meta+k", "ctrl+k" ],
        insertAfter: undefined,
        insertBefore: undefined
    };
    const install = function(hook, vm) {
        const {util: util} = Docsify;
        const opts = vm.config.search || CONFIG;
        if (Array.isArray(opts)) {
            CONFIG.paths = opts;
        } else if (typeof opts === "object") {
            CONFIG.paths = Array.isArray(opts.paths) ? opts.paths : "auto";
            CONFIG.maxAge = util.isPrimitive(opts.maxAge) ? opts.maxAge : CONFIG.maxAge;
            CONFIG.placeholder = opts.placeholder || CONFIG.placeholder;
            CONFIG.noData = opts.noData || CONFIG.noData;
            CONFIG.depth = opts.depth || CONFIG.depth;
            CONFIG.namespace = opts.namespace || CONFIG.namespace;
            CONFIG.pathNamespaces = opts.pathNamespaces || CONFIG.pathNamespaces;
            CONFIG.keyBindings = opts.keyBindings || CONFIG.keyBindings;
        }
        const isAuto = CONFIG.paths === "auto";
        hook.init((() => {
            const {keyBindings: keyBindings} = vm.config;
            if (keyBindings.constructor === Object) {
                keyBindings.focusSearch = {
                    bindings: CONFIG.keyBindings,
                    callback(e) {
                        const sidebarElm = document.querySelector(".sidebar");
                        const sidebarToggleElm = document.querySelector(".sidebar-toggle");
                        const searchElm = sidebarElm?.querySelector('input[type="search"]');
                        const isSidebarHidden = sidebarElm?.getBoundingClientRect().x < 0;
                        isSidebarHidden && sidebarToggleElm?.click();
                        setTimeout((() => searchElm?.focus()), isSidebarHidden ? 250 : 0);
                    }
                };
            }
        }));
        hook.mounted((_ => {
            init(CONFIG, vm);
            !isAuto && init$1(CONFIG, vm);
        }));
        hook.doneEach((_ => {
            update(CONFIG, vm);
            isAuto && init$1(CONFIG, vm);
        }));
    };
    window.$docsify = window.$docsify || {};
    $docsify.plugins = [ install, ...$docsify.plugins || [] ];
})();
