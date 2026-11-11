// ============================================================================
// MODULE [1/6] (SUPREME CEP CLIENT): 0ms LONG-POLL + JSX SELF-HEALER + UI WIRING
// ============================================================================
(function startSupremePremiereCepBridge() {
    if (window.__PREMIERE_V8_SUPREME_BRIDGE__ && !window.__PREMIERE_V8_SUPREME_BRIDGE__.stop) return;


    var bridgeState = { stop: false, busy: false };
    window.__PREMIERE_V8_SUPREME_BRIDGE__ = bridgeState;


    var cs = (typeof CSInterface !== "undefined") ? new CSInterface() :
        (window.__adobe_cep__ ? {
            evalScript: function (s, cb) { window.__adobe_cep__.evalScript(s, cb); },
            getSystemPath: function () { return window.__adobe_cep__.getSystemPath("extension"); }
        } : null);
    var HUB_URL = "http://127.0.0.1:17841";


    // Get full disk path of premiere_god_v7.jsx inside the CEP extension folder for self-healing
    var jsxFullPath = "";
    try {
        if (cs && cs.getSystemPath) {
            var extRoot = cs.getSystemPath("extension");
            jsxFullPath = (extRoot + "/jsx/premiere_god_v7.jsx").replace(/\\/g, "/");
        }
    } catch (e) {}


    // Helper: Evaluate JSX with automatic self-healing if PremiereGodV7 was not yet loaded
    function evalJsxWithSelfHeal(jsxCode, callback) {
        if (!cs) {
            callback('{"ok":false,"error":"CSINTERFACE_NOT_AVAILABLE"}', '{}');
            return;
        }


        var selfHealPrefix = jsxFullPath
            ? "if (typeof PremiereGodV7 === 'undefined' || !PremiereGodV7.executeInstantDictionaryAction) { try { $.evalFile('" + jsxFullPath + "'); } catch(e){} } "
            : "";


        var wrappedScript =
            "(function(){" +
            selfHealPrefix +
            "  var __res = null;" +
            "  try { __res = " + jsxCode + "; } catch(err) { __res = '{\"ok\":false,\"error\":\"' + String(err).replace(/\\\\/g,'\\\\\\\\').replace(/\"/g,'\\\\\"').replace(/\\r|\\n/g,' ') + '\"}'; }" +
            "  var __eye = '{}';" +
            "  try { if (typeof PremiereGodV7 !== 'undefined' && PremiereGodV7.scanLiveEye) { __eye = PremiereGodV7.scanLiveEye(); } } catch(e2) {}" +
            "  return String(__res) + '|||EYE_SPLIT|||' + String(__eye);" +
            "})()";


        window.ravixEval(wrappedScript, function (rawOut) {
            var outStr = String(rawOut || "");
            var parts = outStr.split("|||EYE_SPLIT|||");
            var resPart = parts[0] || '{"ok":false,"error":"EMPTY_JSX_RESULT"}';
            var eyePart = parts.length > 1 ? parts[1] : "{}";
            callback(resPart, eyePart);
        });
    }


    // Push immediate initial Premiere Eye heartbeat on startup or when "Force Sync" is clicked
    function forceSyncPremiereEyeNow() {
        if (bridgeState.busy || bridgeState.eyeBusy) return;
        bridgeState.eyeBusy = true;
        evalJsxWithSelfHeal("PremiereGodV7.scanLiveEye()", function (resPart, eyePart) {
            bridgeState.eyeBusy = false;
            var bestEye = (eyePart && eyePart.length > 10) ? eyePart : resPart;
            window.ravixRequest(HUB_URL + "/premiere_task_done", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId: "",
                    resultJson: bestEye,
                    updatedEyeJson: bestEye
                })
            }).catch(function () {});
        });
    }


    // Wire the CEP Panel's "Force Sync" and "Reset Route" buttons
    function wirePanelButtons() {
        var buttons = document.querySelectorAll("button");
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            if (btn.getAttribute("onclick")) continue;
            var txt = (btn.innerText || "").toLowerCase();
            if (txt.indexOf("force sync") !== -1 && !btn.__v8Wired) {
                btn.__v8Wired = true;
                btn.addEventListener("click", function () { forceSyncPremiereEyeNow(); });
            } else if (txt.indexOf("reset route") !== -1 && !btn.__v8Wired) {
                btn.__v8Wired = true;
                btn.addEventListener("click", function () {
                    window.ravixRequest(HUB_URL + "/premiere_reset_route", { method: "POST" }).catch(function () {});
                    setTimeout(forceSyncPremiereEyeNow, 60);
                });
            }
        }
    }


    // Continuous 0ms Long-Poll + 80ms Fallback Loop
    async function runZeroLatencyPollLoop() {
        wirePanelButtons();
        forceSyncPremiereEyeNow();


        while (!bridgeState.stop) {
            try {
                var resp = await window.ravixRequest(HUB_URL + "/premiere_poll_task?wait=1&holdMs=1000", { cache: "no-store" });
                if (resp && resp.ok) {
                    var payload = await resp.json();
                    if (payload && payload.hasTask && payload.taskId && payload.jsx) {
                        bridgeState.busy = true;
                        await new Promise(function (resolve) {
                            evalJsxWithSelfHeal(payload.jsx, function (resPart, eyePart) {
                                window.ravixRequest(HUB_URL + "/premiere_task_done", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        taskId: payload.taskId,
                                        resultJson: resPart,
                                        updatedEyeJson: eyePart
                                    })
                                }).then(resolve, resolve);
                            });
                        });
                        bridgeState.busy = false;
                        // Immediately loop with 0ms delay to check if another task is waiting!
                        continue;
                    }
                }
            } catch (err) {
                // If HubServer is restarting, wait 80ms before retrying
                await new Promise(function (r) { setTimeout(r, 80); });
            }
            // Brief 20ms yield between long-poll cycles
            await new Promise(function (r) { setTimeout(r, 20); });
        }
    }


    // Periodic 2.5s background eye refresh so GET /premiere_eye is always 0ms warm in RAM
    bridgeState.intervalId = setInterval(function () {
        if (!bridgeState.stop) forceSyncPremiereEyeNow();
    }, 10000);


    runZeroLatencyPollLoop();
})();

// RAVIX Omniscient Cortex v9.0.0 integration
// =============================================================================
// RAVIX STUDIO v9.0.0 — CEP PANEL SYNCHRONOUS 0ms BRIDGE & BIN TELEPATHY
// Bundle ID: com.ravix.studio | Local Hub: http://127.0.0.1:17841
// =============================================================================


(function () {
    "use strict";


    var HUB_BASE_URL = "http://127.0.0.1:17841";
    var csInterface = (typeof CSInterface !== "undefined") ? new CSInterface() : null;
    var isPollingActive = false;
    var lastBinSyncTimestamp = 0;


    // =========================================================================
    // 1. EVALUATE EXTENDSCRIPT HELPER (PROMISE-LIKE CALLBACK)
    // =========================================================================


    function evalExtendScript(scriptExpr, callback) {
        if (!csInterface) {
            if (callback) {
                callback("{\"status\":\"SIMULATED_NO_CSINTERFACE\"}");
            }
            return;
        }
        window.ravixEval(scriptExpr, function (result) {
            if (callback) {
                callback(result || "{}");
            }
        });
    }


    // =========================================================================
    // 2. HOT-RELOAD premiere_god_v7.jsx IN-PLACE (ZERO PREMIERE RESTART)
    // =========================================================================


    function reloadPremiereGodJsx(callback) {
        if (!csInterface) {
            if (callback) callback(false);
            return;
        }


        try {
            var extRoot = csInterface.getSystemPath(SystemPath.EXTENSION);
            var jsxPath = extRoot.replace(/\\/g, "/") + "/jsx/premiere_god_v7.jsx";
            var loadExpr = "$.evalFile(\"" + jsxPath + "\"); RAVIX_GetLiveTimelineTelemetry();";


            evalExtendScript(loadExpr, function (res) {
                updateStudioHudStatus("ONLINE • JSX v9.0.0 Reloaded");
                if (callback) callback(true, res);
            });
        } catch (err) {
            if (callback) callback(false, String(err));
        }
    }


    // =========================================================================
    // 3. SYNCHRONOUS <45ms LONG-POLL COMMAND LOOP (/cep_poll_command)
    // =========================================================================


    function startLongPollBridgeLoop() {
        if (isPollingActive) {
            return;
        }
        isPollingActive = true;
        pollNextHubCommand();
    }


    function pollNextHubCommand() {
        var settled = false;
        function scheduleNext(delay) {
            if (settled) return;
            settled = true;
            setTimeout(pollNextHubCommand, delay);
        }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", HUB_BASE_URL + "/cep_poll_command?ts=" + Date.now(), true);
        xhr.timeout = 3500;


        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4 || settled) {
                return;
            }


            if (xhr.status === 200 && xhr.responseText) {
                try {
                    var packet = JSON.parse(xhr.responseText);
                    if (packet && packet.has_command && packet.command_id) {
                        settled = true;
                        executeHubCommandInPremiere(packet, function () {
                            setTimeout(pollNextHubCommand, 5);
                        });
                        return;
                    }
                } catch (e) {}
            }


            // Re-poll immediately if connected, or backoff 400ms if Hub is restarting
            var delay = (xhr.status === 200) ? 250 : 400;
            scheduleNext(delay);
        };


        xhr.onerror = function () {
            updateStudioHudStatus("WAITING FOR RAVIX HUB (17841)...");
            scheduleNext(600);
        };


        xhr.ontimeout = function () {
            scheduleNext(250);
        };


        try {
            xhr.send();
        } catch (e) {
            scheduleNext(600);
        }
    }


    // =========================================================================
    // 4. EXECUTE DISPATCHED COMMAND IN PREMIERE & REPORT RESULT IMMEDIATELY
    // =========================================================================


    function executeHubCommandInPremiere(packet, doneCallback) {
        var cmdId = packet.command_id;
        var endpoint = packet.endpoint || "/premiere_instant";
        var payloadObj = packet.payload || {};
        var payloadStr = JSON.stringify(payloadObj);


        if (endpoint === "/premiere_reload_jsx") {
            reloadPremiereGodJsx(function (ok, telemetryJson) {
                reportResultToHub(cmdId, {
                    command_id: cmdId,
                    status: ok ? "JSX_RELOADED" : "RELOAD_ERROR",
                    telemetry: safeParseJson(telemetryJson)
                }, doneCallback);
            });
            return;
        }


        if (endpoint === "/premiere_eye") {
            evalExtendScript("RAVIX_GetLiveTimelineTelemetry()", function (rawRes) {
                var parsed = safeParseJson(rawRes);
                parsed.command_id = cmdId;
                reportResultToHub(cmdId, parsed, doneCallback);
            });
            return;
        }


        // Escape payload string for safe ExtendScript invocation
        var escapedForJsx = payloadStr.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        var jsxCall = "RAVIX_ExecuteInstantCommand(\"" + escapedForJsx + "\")";


        evalExtendScript(jsxCall, function (rawDomResult) {
            var parsedRes = safeParseJson(rawDomResult);
            parsedRes.command_id = cmdId;


            reportResultToHub(cmdId, parsedRes, function () {
                // Trigger immediate Bin & DOM sync so Omniscient Cortex has updated tracks/playhead
                syncBinsAndDomToCortex();
                if (doneCallback) doneCallback();
            });
        });
    }


    function reportResultToHub(cmdId, resultObject, callback) {
        resultObject.command_id = cmdId;
        var xhr = new XMLHttpRequest();
        xhr.open("POST", HUB_BASE_URL + "/cep_report_result", true);
        xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && callback) {
                callback();
            }
        };
        try {
            xhr.send(JSON.stringify(resultObject));
        } catch (e) {
            if (callback) callback();
        }
    }


    // =========================================================================
    // 5. BACKGROUND PROJECT BIN & TIMELINE TELEPATHY SYNC (/ravix_bin_sync)
    // =========================================================================


    function syncBinsAndDomToCortex() {
        var now = Date.now();
        if (now - lastBinSyncTimestamp < 800) {
            return;
        }
        lastBinSyncTimestamp = now;


        evalExtendScript("RAVIX_ScanAllProjectBins()", function (rawScanJson) {
            var scanData = safeParseJson(rawScanJson);
            if (!scanData || !scanData.timeline) {
                return;
            }


            var tl = scanData.timeline;
            updateStudioHudStatus("CONNECTED • " + (tl.sequence_name || "No Seq") + " @ " + (tl.playhead_tc || "00:00:00:00"));


            // Send Timeline State + Bin Items to RAVIX Hub Cortex
            var items = scanData.bin_items || [];
            if (items.length === 0) {
                postBinSyncPacket(tl, null);
            } else {
                for (var i = 0; i < Math.min(items.length, 40); i++) {
                    postBinSyncPacket(tl, items[i]);
                }
            }
        });
    }


    function postBinSyncPacket(tl, binItem) {
        var body = {
            project_name: tl.project_name || "",
            sequence_name: tl.sequence_name || "",
            width: tl.width || 1080,
            height: tl.height || 1920,
            fps: tl.fps || 60,
            playhead_sec: tl.playhead_sec || 0,
            playhead_tc: tl.playhead_tc || "00:00:00:00",
            seq_end_sec: tl.seq_end_sec || 0,
            highest_video_track: tl.highest_video_track || 1,
            highest_audio_track: tl.highest_audio_track || 1,
            selected_clip: tl.selected_clip || "",
            selected_track: tl.selected_track || 1,
            clip_name: binItem ? binItem.clip_name : "",
            bin_path: binItem ? binItem.bin_path : "",
            media_path: binItem ? binItem.media_path : "",
            duration_sec: binItem ? binItem.duration_sec : 0,
            dimensions: binItem ? binItem.dimensions : ""
        };


        var xhr = new XMLHttpRequest();
        xhr.open("POST", HUB_BASE_URL + "/ravix_bin_sync", true);
        xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        try {
            xhr.send(JSON.stringify(body));
        } catch (e) {}
    }


    function safeParseJson(str) {
        if (!str) return {};
        try {
            return JSON.parse(str);
        } catch (e) {
            return { raw: String(str) };
        }
    }


    function updateStudioHudStatus(text) {
        if (window.ravixStatusRefresh && !document.getElementById("ravix-studio-status")) { window.ravixStatusRefresh(); return; }
        var el = (document.getElementById("ravix-studio-status") || document.getElementById("statusBadge"));
        if (el) {
            el.textContent = text;
        }
    }


    // =========================================================================
    // 6. AUTO-START ON CEP PANEL LOAD
    // =========================================================================


    window.addEventListener("DOMContentLoaded", function () {
        reloadPremiereGodJsx(function () {
            syncBinsAndDomToCortex();
            startLongPollBridgeLoop();
        });
    });
})();
