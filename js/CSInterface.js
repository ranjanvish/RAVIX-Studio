/* RAVIX: CEP methods used by the Premiere v8 panel. */
(function (global) {
    if (global.CSInterface) return;
    function CSInterface() {}
    CSInterface.prototype.evalScript = function (script, callback) {
        if (!global.__adobe_cep__ || !global.__adobe_cep__.evalScript) {
            if (callback) callback("EvalScript error: CEP host unavailable");
            return;
        }
        global.__adobe_cep__.evalScript(String(script), callback || function () {});
    };
    CSInterface.prototype.getSystemPath = function (kind) {
        if (!global.__adobe_cep__ || !global.__adobe_cep__.getSystemPath) return "";
        return global.__adobe_cep__.getSystemPath(kind || "extension");
    };
    global.CSInterface = CSInterface;
    if (!global.SystemPath) global.SystemPath = { EXTENSION: "extension" };
})(window);
