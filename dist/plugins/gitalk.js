/*!
 * Docsify Plugin: gitalk v5.0.0-rc.3
 * https://docsify.js.org
 * (c) 2017-2025
 * MIT license
 */
(function() {
    "use strict";
    function getDefaultExportFromCjs(x) {
        return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
    }
    var gitalk$2 = {};
    var hasRequiredGitalk;
    function requireGitalk() {
        if (hasRequiredGitalk) return gitalk$2;
        hasRequiredGitalk = 1;
        function install(hook) {
            const dom = Docsify.dom;
            hook.mounted((_ => {
                const div = dom.create("div");
                div.id = "gitalk-container";
                const main = dom.getNode("#main");
                div.style = `width: ${main.clientWidth}px; margin: 0 auto 20px;`;
                dom.appendTo(dom.find(".content"), div);
            }));
            hook.doneEach((_ => {
                const el = document.getElementById("gitalk-container");
                while (el.hasChildNodes()) {
                    el.removeChild(el.firstChild);
                }
                gitalk.render("gitalk-container");
            }));
        }
        window.$docsify = window.$docsify || {};
        $docsify.plugins = [ install, ...$docsify.plugins || [] ];
        return gitalk$2;
    }
    var gitalkExports = requireGitalk();
    var gitalk$1 = getDefaultExportFromCjs(gitalkExports);
    return gitalk$1;
})();
