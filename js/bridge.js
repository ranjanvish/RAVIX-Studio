var HUB_URL = 'http://127.0.0.1:17841';
var logBox = document.getElementById('logBox'), projBox = document.getElementById('projBox'), badge = document.getElementById('statusBadge');
// The hub can respond while Premiere's scripting thread is still busy.
var ravixHubOnline = false, ravixLastEval = 0, ravixEvalStarted = 0;
window.ravixStatusRefresh = function () {
    if (!ravixHubOnline) { badge.style.background='#a94141'; badge.innerText='HUB OFFLINE'; }
    else if (ravixEvalStarted && Date.now()-ravixEvalStarted > 8000) { badge.style.background='#b76c24'; badge.innerText='PREMIERE BUSY'; }
    else if (!ravixLastEval || Date.now()-ravixLastEval > 15000) { badge.style.background='#8c7137'; badge.innerText='CHECKING PREMIERE'; }
    else { badge.style.background='#1b875b'; badge.innerText='LIVE ROUTE'; }
};
setInterval(window.ravixStatusRefresh, 1000);
// One serialized JSX lane shared by every protocol in this panel.
(function () {
    var queue = [], running = false;
    window.ravixEval = function (code, callback) {
        queue.push({code: code, callback: callback || function () {}});
        drain();
    };
    function drain() {
        if (running || !queue.length) return;
        running = true;
        var task = queue.shift(), finished = false;
        ravixEvalStarted = Date.now(); window.ravixStatusRefresh();
        function done(result) {
            if (finished) return;
            finished = true;
            ravixEvalStarted = 0;
            if (result !== "EvalScript error." && String(result).indexOf("ERROR: CSINTERFACE_NOT_AVAILABLE") !== 0) ravixLastEval = Date.now();
            window.ravixStatusRefresh();
            try { task.callback(result); }
            finally { running = false; drain(); }
        }
        try {
            if (!window.__adobe_cep__) return done('ERROR: CSINTERFACE_NOT_AVAILABLE');
            window.__adobe_cep__.evalScript(task.code, done);
        } catch (error) { done('ERROR: ' + error); }
    }
    window.ravixRequest = function (url, options) {
        options = options || {};
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(options.method || 'GET', url, true);
            xhr.timeout = 30000;
            Object.keys(options.headers || {}).forEach(function (key) { xhr.setRequestHeader(key, options.headers[key]); });
            xhr.onload = function () {
                if (xhr.status < 200 || xhr.status >= 300) return reject(new Error('Hub HTTP ' + xhr.status));
                resolve({ok:true, status:xhr.status, json:function () { return Promise.resolve().then(function () { return JSON.parse(xhr.responseText); }); }});
            };
            xhr.onerror = function () { reject(new Error('Hub unavailable')); };
            xhr.ontimeout = function () { reject(new Error('Hub request timed out')); };
            xhr.send(options.body || null);
        });
    };
})();
function evalExtendScript(code, cb) { window.ravixEval(code, cb); }
var heartbeatBusy = false;
function sendHeartbeat() {
    if (heartbeatBusy) return;
    heartbeatBusy = true;
    evalExtendScript('(function(){return JSON.stringify({project:flowMcpGetProjectInfo(),history:JSON.parse(PremiereGodV7.history("status"))});})()', function (info) {
        try { var state=JSON.parse(info); updateHistoryButtons(state.history); info=state.project; } catch(e) {}
        projBox.innerText = 'Active: ' + (info || 'No project');
        window.ravixRequest(HUB_URL + '/premiere_heartbeat', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({project:info || 'No project',version:'24.4.1',clientRevision:'sync-undo6-20261021'})})
            .then(function () { heartbeatBusy=false; }, function () { heartbeatBusy=false; });
    });
}
function pollLoop() {
    window.ravixRequest(HUB_URL + '/premiere_poll?wait=1').then(function (r) { return r.json(); }).then(function (data) {
        ravixHubOnline=true; window.ravixStatusRefresh();
        if (!data || !data.command || !data.script) { setTimeout(pollLoop,25); return; }
        logBox.innerText='Executing: '+data.command;
        evalExtendScript(data.script,function(result) {
            logBox.innerText='Result: '+result;
            window.ravixRequest(HUB_URL+'/premiere_result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:data.command,result:result})})
                .then(function(){setTimeout(pollLoop,0);},function(){logBox.innerText='Result delivery failed; command was not repeated.';setTimeout(pollLoop,1500);});
        });
    }).catch(function () { ravixHubOnline=false;window.ravixStatusRefresh();setTimeout(pollLoop,1500); });
}
function manualSync(){sendHeartbeat();logBox.innerText='Sync requested at '+new Date().toLocaleTimeString();}
function resetRoute(){window.ravixRequest(HUB_URL+'/premiere_reset',{method:'POST'}).then(function(r){return r.json();}).then(function(data){logBox.innerText=data.status;sendHeartbeat();}).catch(function(e){logBox.innerText='Reset failed: '+e;});}
setInterval(sendHeartbeat,4000);sendHeartbeat();pollLoop();

var historyBusy=false;
function updateHistoryButtons(result){
    var undo=document.getElementById('undoButton'),redo=document.getElementById('redoButton'),status=document.getElementById('historyStatus');
    if(!undo||!redo||!status)return;
    undo.disabled=historyBusy||!result.ok||!result.undoAvailable;
    redo.disabled=historyBusy||!result.ok||!result.redoAvailable;
    status.innerText=result.ok?'Undo: '+result.undoAvailable+'/6  |  Redo: '+result.redoAvailable+'/6':(result.error||'History unavailable');
}
function ravixHistory(action){
    if(historyBusy)return;
    historyBusy=true;
    updateHistoryButtons({ok:true});
    evalExtendScript('PremiereGodV7.history('+JSON.stringify(action)+')',function(raw){
        historyBusy=false;
        try{updateHistoryButtons(JSON.parse(raw));}catch(e){updateHistoryButtons({ok:false,error:'History response unavailable'});}
    });
}
