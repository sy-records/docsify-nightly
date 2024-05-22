/*!
 * Docsify Plugin: gtag v4.13.0
 * https://docsify.js.org
 * (c) 2017-2024
 * MIT license
 */
(function() {
    "use strict";
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
})();
