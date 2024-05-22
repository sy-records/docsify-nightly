/*!
 * Docsify Plugin: ga v4.13.0
 * https://docsify.js.org
 * (c) 2017-2024
 * MIT license
 */
(function() {
    "use strict";
    function appendScript() {
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://www.google-analytics.com/analytics.js";
        document.body.appendChild(script);
    }
    function init(id) {
        appendScript();
        window.ga = window.ga || function() {
            (window.ga.q = window.ga.q || []).push(arguments);
        };
        window.ga.l = Number(new Date);
        window.ga("create", id, "auto");
    }
    function collect() {
        if (!window.ga) {
            init($docsify.ga);
        }
        window.ga("set", "page", location.hash);
        window.ga("send", "pageview");
    }
    const install = function(hook) {
        if (!$docsify.ga) {
            console.error("[Docsify] ga is required.");
            return;
        }
        hook.beforeEach(collect);
    };
    window.$docsify = window.$docsify || {};
    $docsify.plugins = [ install, ...$docsify.plugins || [] ];
})();
