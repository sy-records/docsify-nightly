/*!
 * Docsify Plugin: gtag v5.0.0-rc.3
 * https://docsify.js.org
 * (c) 2017-2025
 * MIT license
 */
(function() {
    "use strict";
    function getDefaultExportFromCjs(x) {
        return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
    }
    var gtag$1 = {};
    var hasRequiredGtag;
    function requireGtag() {
        if (hasRequiredGtag) return gtag$1;
        hasRequiredGtag = 1;
        function appendScript(id) {
            const script = document.createElement("script");
            script.async = true;
            script.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
            document.body.appendChild(script);
        }
        function initGlobalSiteTag(id) {
            appendScript(id);
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function() {
                window.dataLayer.push(arguments);
            };
            window.gtag("js", new Date);
            window.gtag("config", id);
        }
        function initAdditionalTag(id) {
            window.gtag("config", id);
        }
        function init(ids) {
            if (Array.isArray(ids)) {
                initGlobalSiteTag(ids[0]);
                ids.forEach(((id, index) => {
                    if (index > 0) {
                        initAdditionalTag(id);
                    }
                }));
            } else {
                initGlobalSiteTag(ids);
            }
        }
        function collect() {
            if (!window.gtag) {
                init($docsify.gtag);
            }
            window.gtag("event", "page_view", {
                page_title: document.title,
                page_location: location.href,
                page_path: location.pathname
            });
        }
        const install = function(hook) {
            if (!$docsify.gtag) {
                console.error("[Docsify] gtag is required.");
                return;
            }
            hook.beforeEach(collect);
        };
        window.$docsify = window.$docsify || {};
        $docsify.plugins = [ install, ...$docsify.plugins || [] ];
        return gtag$1;
    }
    var gtagExports = requireGtag();
    var gtag = getDefaultExportFromCjs(gtagExports);
    return gtag;
})();
