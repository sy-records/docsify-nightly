/*!
 * Docsify Plugin: matomo v4.13.0
 * https://docsify.js.org
 * (c) 2017-2024
 * MIT license
 */
(function() {
    "use strict";
    function appendScript(options) {
        const script = document.createElement("script");
        script.async = true;
        script.src = options.host + "/matomo.js";
        document.body.appendChild(script);
    }
    function init(options) {
        window._paq = window._paq || [];
        window._paq.push([ "trackPageView" ]);
        window._paq.push([ "enableLinkTracking" ]);
        setTimeout((() => {
            appendScript(options);
            window._paq.push([ "setTrackerUrl", options.host + "/matomo.php" ]);
            window._paq.push([ "setSiteId", String(options.id) ]);
        }), 0);
    }
    function collect() {
        if (!window._paq) {
            init($docsify.matomo);
        }
        window._paq.push([ "setCustomUrl", window.location.hash.substr(1) ]);
        window._paq.push([ "setDocumentTitle", document.title ]);
        window._paq.push([ "trackPageView" ]);
    }
    const install = function(hook) {
        if (!$docsify.matomo) {
            console.error("[Docsify] matomo is required.");
            return;
        }
        hook.beforeEach(collect);
    };
    window.$docsify = window.$docsify || {};
    $docsify.plugins = [ install, ...$docsify.plugins || [] ];
})();
