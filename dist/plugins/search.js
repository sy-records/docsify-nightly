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
    function getAndRemoveDocisfyIgnoreConfig() {
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
                const text = getAndRemoveDocisfyIgnoreConfig(token.text).content;
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
                    title = getAndRemoveDocisfyIgnoreConfig(str).content;
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
                        end = start === 0 ? 70 : indexContent + keyword.length + 60;
                        if (postContent && end > postContent.length) {
                            end = postContent.length;
                        }
                        const matchContent = handlePostContent && "..." + handlePostContent.substring(start, end).replace(regEx, (word => `<em class="search-keyword">${word}</em>`)) + "...";
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
    let NO_DATA_TEXT = "";
    let options;
    function style() {
        const code = `\n.sidebar {\n  padding-top: 0;\n}\n\n.search {\n  margin-bottom: 20px;\n  padding: 6px;\n  border-bottom: 1px solid #eee;\n}\n\n.search .input-wrap {\n  display: flex;\n  align-items: center;\n}\n\n.search .results-status:not(:empty) {\n  margin-top: 10px;\n  font-size: smaller;\n}\n\n.search .results-panel {\n  display: none;\n}\n\n.search .results-panel.show {\n  display: block;\n}\n\n.search input {\n  outline: none;\n  border: none;\n  width: 100%;\n  padding: 0.6em 7px;\n  font-size: inherit;\n  border: 1px solid transparent;\n}\n\n.search input:focus {\n  box-shadow: 0 0 5px var(--theme-color, #42b983);\n  border: 1px solid var(--theme-color, #42b983);\n}\n\n.search input::-webkit-search-decoration,\n.search input::-webkit-search-cancel-button,\n.search input {\n  -webkit-appearance: none;\n  -moz-appearance: none;\n  appearance: none;\n}\n\n.search input::-ms-clear {\n  display: none;\n  height: 0;\n  width: 0;\n}\n\n.search .clear-button {\n  cursor: pointer;\n  width: 36px;\n  text-align: right;\n  display: none;\n}\n\n.search .clear-button.show {\n  display: block;\n}\n\n.search .clear-button svg {\n  transform: scale(.5);\n}\n\n.search kbd {\n  position: absolute;\n  right: 8px;\n  margin: 0;\n}\n\n.search input:focus ~ kbd,\n.search input:not(:empty) ~ kbd {\n  display: none;\n}\n\n.search h2 {\n  font-size: 17px;\n  margin: 10px 0;\n}\n\n.search a {\n  text-decoration: none;\n  color: inherit;\n}\n\n.search .matching-post {\n  border-bottom: 1px solid #eee;\n}\n\n.search .matching-post:last-child {\n  border-bottom: 0;\n}\n\n.search p {\n  font-size: 14px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n}\n\n.search p.empty {\n  text-align: center;\n}\n\n.app-name.hide, .sidebar-nav.hide {\n  display: none;\n}`;
        Docsify.dom.style(code);
    }
    function tpl() {
        let defaultValue = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const html = `\n    <div class="input-wrap">\n      <input type="search" value="${defaultValue}" aria-keyshortcuts="/ control+k meta+k" />\n      <div class="clear-button">\n        <svg width="26" height="24">\n          <circle cx="12" cy="12" r="11" fill="#ccc" />\n          <path stroke="white" stroke-width="2" d="M8.25,8.25,15.75,15.75" />\n          <path stroke="white" stroke-width="2"d="M8.25,15.75,15.75,8.25" />\n        </svg>\n      </div>\n      <kbd title="Press / to search">/</kbd>\n    </div>\n    <div class="results-status" aria-live="polite"></div>\n    <div class="results-panel"></div>\n  `;
        const el = Docsify.dom.create("div", html);
        const aside = Docsify.dom.find("aside");
        Docsify.dom.toggleClass(el, "search");
        el.setAttribute("role", "search");
        Docsify.dom.before(aside, el);
    }
    function doSearch(value) {
        const $search = Docsify.dom.find("div.search");
        const $panel = Docsify.dom.find($search, ".results-panel");
        const $clearBtn = Docsify.dom.find($search, ".clear-button");
        const $sidebarNav = Docsify.dom.find(".sidebar-nav");
        const $status = Docsify.dom.find("div.search .results-status");
        const $appName = Docsify.dom.find(".app-name");
        if (!value) {
            $panel.classList.remove("show");
            $clearBtn.classList.remove("show");
            $panel.innerHTML = "";
            $status.textContent = "";
            if (options.hideOtherSidebarContent) {
                $sidebarNav && $sidebarNav.classList.remove("hide");
                $appName && $appName.classList.remove("hide");
            }
            return;
        }
        const matches = search(value);
        let html = "";
        matches.forEach(((post, i) => {
            html += `\n      <div class="matching-post" aria-label="search result ${i + 1}">\n        <a href="${post.url}">\n          <h2>${post.title}</h2>\n          <p>${post.content}</p>\n        </a>\n      </div>\n    `;
        }));
        $panel.classList.add("show");
        $clearBtn.classList.add("show");
        $panel.innerHTML = html || `<p class="empty">${NO_DATA_TEXT}</p>`;
        $status.textContent = `Found ${matches.length} results`;
        if (options.hideOtherSidebarContent) {
            $sidebarNav && $sidebarNav.classList.add("hide");
            $appName && $appName.classList.add("hide");
        }
    }
    function bindEvents() {
        const $search = Docsify.dom.find("div.search");
        const $input = Docsify.dom.find($search, "input");
        const $inputWrap = Docsify.dom.find($search, ".input-wrap");
        let timeId;
        Docsify.dom.on($search, "click", (e => [ "A", "H2", "P", "EM" ].indexOf(e.target.tagName) === -1 && e.stopPropagation()));
        Docsify.dom.on($input, "input", (e => {
            clearTimeout(timeId);
            timeId = setTimeout((_ => doSearch(e.target.value.trim())), 100);
        }));
        Docsify.dom.on($inputWrap, "click", (e => {
            if (e.target.tagName !== "INPUT") {
                $input.value = "";
                doSearch();
            }
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
    function updateOptions(opts) {
        options = opts;
    }
    function init(opts, vm) {
        const keywords = vm.router.parse().query.s;
        updateOptions(opts);
        style();
        tpl(keywords);
        bindEvents();
        keywords && setTimeout((_ => doSearch(keywords)), 500);
    }
    function update(opts, vm) {
        updateOptions(opts);
        updatePlaceholder(opts.placeholder, vm.route.path);
        updateNoData(opts.noData, vm.route.path);
    }
    const CONFIG = {
        placeholder: "Type to search",
        noData: "No Results!",
        paths: "auto",
        depth: 2,
        maxAge: 864e5,
        hideOtherSidebarContent: false,
        namespace: undefined,
        pathNamespaces: undefined,
        keyBindings: [ "/", "meta+k", "ctrl+k" ]
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
            CONFIG.hideOtherSidebarContent = opts.hideOtherSidebarContent || CONFIG.hideOtherSidebarContent;
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
