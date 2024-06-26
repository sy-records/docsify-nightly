/*!
 * Docsify Plugin: external-script v4.13.0
 * https://docsify.js.org
 * (c) 2017-2024
 * MIT license
 */
(function() {
    "use strict";
    function handleExternalScript() {
        const container = Docsify.dom.getNode("#main");
        const scripts = Docsify.dom.findAll(container, "script");
        for (const script of scripts) {
            if (script.src) {
                const newScript = document.createElement("script");
                Array.from(script.attributes).forEach((attribute => {
                    newScript[attribute.name] = attribute.value;
                }));
                script.parentNode.insertBefore(newScript, script);
                script.parentNode.removeChild(script);
            }
        }
    }
    const install = function(hook) {
        hook.doneEach(handleExternalScript);
    };
    window.$docsify = window.$docsify || {};
    $docsify.plugins = [ install, ...$docsify.plugins || [] ];
})();
