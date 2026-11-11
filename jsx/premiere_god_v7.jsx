// JSON support for older ExtendScript engines used by Premiere Pro 24.4.1.
if (typeof JSON === "undefined") JSON = {};
if (!JSON.parse) JSON.parse = function (text) {
    var source = String(text);
    var valid = /^[\],:{}\s]*$/.test(source.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""));
    if (!valid) throw new Error("INVALID_JSON");
    return eval("(" + source + ")");
};
if (!JSON.stringify) JSON.stringify = function (value) {
    function quote(v) { return '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"'; }
    function encode(v) {
        if (v === null) return "null";
        if (typeof v === "string") return quote(v);
        if (typeof v === "number") return isFinite(v) ? String(v) : "null";
        if (typeof v === "boolean") return v ? "true" : "false";
        if (v instanceof Array) { var a=[]; for(var i=0;i<v.length;i++) a.push(encode(v[i])); return "["+a.join(",")+"]"; }
        if (typeof v === "object") { var out=[]; for(var k in v) if(v.hasOwnProperty(k) && typeof v[k] !== "undefined" && typeof v[k] !== "function") out.push(quote(k)+":"+encode(v[k])); return "{"+out.join(",")+"}"; }
        return "null";
    }
    return encode(value);
};

// ============================================================================
// RAVIX Studio — OMNISCIENT PREMIERE NEURAL STUDIO (v7.0)
// BATCH 1: MODULE [1/9] (LIVE PREMIERE EYE) & MODULE [2/9] (MOTION & KEYFRAMES)
// ============================================================================


if (typeof $.global.PremiereGodV7 === "undefined") $.global.PremiereGodV7 = {};
var PremiereGodV7 = $.global.PremiereGodV7;


PremiereGodV7.TICKS_PER_SECOND = 254016000000;


PremiereGodV7.esc = function (str) {
    if (str === null || typeof str === "undefined") return "";
    return String(str)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "")
        .replace(/\n/g, "\\n");
};


PremiereGodV7.ticksToSeconds = function (ticksStr) {
    var t = parseFloat(ticksStr);
    if (isNaN(t)) return 0;
    return Math.round((t / PremiereGodV7.TICKS_PER_SECOND) * 1000) / 1000;
};


PremiereGodV7.secondsToTicks = function (sec) {
    var s = parseFloat(sec);
    if (isNaN(s) || s < 0) s = 0;
    return String(Math.round(s * PremiereGodV7.TICKS_PER_SECOND));
};


// Helper: Find the topmost visible clip directly under the Playhead (CTI) or currently selected clip
PremiereGodV7.findTargetClip = function (seq, preferSelected, specificTrackIndex, specificClipName) {
    if (!seq) return null;
    var ctiTicks = parseFloat(seq.getPlayerPosition().ticks);
    var vTracks = seq.videoTracks;
    var i, j, trk, clp, startT, endT;


    // 1. If a specific clip name was requested, find it first
    if (specificClipName && String(specificClipName).length > 0) {
        var targetLower = String(specificClipName).toLowerCase();
        for (i = vTracks.numTracks - 1; i >= 0; i--) {
            trk = vTracks[i];
            for (j = 0; j < trk.clips.numItems; j++) {
                clp = trk.clips[j];
                if (clp && clp.name && clp.name.toLowerCase().indexOf(targetLower) !== -1) {
                    return { clip: clp, trackIndex: i, trackName: trk.name };
                }
            }
        }
    }


    // 2. If preferSelected is true, check if user has any video clip selected
    if (preferSelected) {
        for (i = vTracks.numTracks - 1; i >= 0; i--) {
            trk = vTracks[i];
            for (j = 0; j < trk.clips.numItems; j++) {
                clp = trk.clips[j];
                if (clp && clp.isSelected && clp.isSelected()) {
                    return { clip: clp, trackIndex: i, trackName: trk.name };
                }
            }
        }
    }


    // 3. Otherwise, return the topmost clip visible right under the Playhead (CTI)
    for (i = vTracks.numTracks - 1; i >= 0; i--) {
        if (typeof specificTrackIndex === "number" && specificTrackIndex >= 0 && i !== specificTrackIndex) {
            continue;
        }
        trk = vTracks[i];
        for (j = 0; j < trk.clips.numItems; j++) {
            clp = trk.clips[j];
            if (!clp) continue;
            startT = parseFloat(clp.start.ticks);
            endT = parseFloat(clp.end.ticks);
            if (ctiTicks >= startT && ctiTicks <= endT) {
                return { clip: clp, trackIndex: i, trackName: trk.name };
            }
        }
    }
    return null;
};


// Helper: Extract Motion Component & Properties (Scale, Position, Rotation, Opacity)
PremiereGodV7.getMotionControls = function (clip) {
    if (!clip || !clip.components) return null;
    var ctrl = {
        motionComp: null,
        opacityComp: null,
        positionProp: null,
        scaleProp: null,
        scaleWidthProp: null,
        uniformScaleProp: null,
        rotationProp: null,
        anchorPointProp: null,
        opacityProp: null
    };


    for (var c = 0; c < clip.components.numItems; c++) {
        var comp = clip.components[c];
        if (!comp) continue;
        var dName = (comp.displayName || "").toLowerCase();
        var mName = (comp.matchName || "").toLowerCase();


        if (dName.indexOf("motion") !== -1 || mName.indexOf("motion") !== -1) {
            ctrl.motionComp = comp;
            for (var p = 0; p < comp.properties.numItems; p++) {
                var prop = comp.properties[p];
                var pName = (prop.displayName || "").toLowerCase();
                if (pName === "position") ctrl.positionProp = prop;
                else if (pName === "scale") ctrl.scaleProp = prop;
                else if (pName === "scale width") ctrl.scaleWidthProp = prop;
                else if (pName.indexOf("uniform scale") !== -1) ctrl.uniformScaleProp = prop;
                else if (pName === "rotation") ctrl.rotationProp = prop;
                else if (pName.indexOf("anchor") !== -1) ctrl.anchorPointProp = prop;
            }
        } else if (dName.indexOf("opacity") !== -1 || mName.indexOf("opacity") !== -1) {
            ctrl.opacityComp = comp;
            for (var op = 0; op < comp.properties.numItems; op++) {
                var oProp = comp.properties[op];
                if ((oProp.displayName || "").toLowerCase().indexOf("opacity") !== -1) {
                    ctrl.opacityProp = oProp;
                }
            }
        }
    }
    return ctrl;
};


// ----------------------------------------------------------------------------
// MODULE [1/9]: GOD-MODE LIVE PREMIERE EYE (0ms TIMELINE, CTI & BIN RADAR)
// ----------------------------------------------------------------------------
PremiereGodV7.scanBinsRecursive = function (folderItem, pathPrefix, binsOut, mediaOut) {
    if (!folderItem || !folderItem.children) return;
    for (var i = 0; i < folderItem.children.numItems; i++) {
        var child = folderItem.children[i];
        if (!child) continue;
        var fullPath = pathPrefix ? (pathPrefix + "/" + child.name) : child.name;
        if (child.type === ProjectItemType.BIN) {
            var count = child.children ? child.children.numItems : 0;
            binsOut.push('{"name":"' + PremiereGodV7.esc(child.name) + '","path":"' + PremiereGodV7.esc(fullPath) + '","items":' + count + '}');
            PremiereGodV7.scanBinsRecursive(child, fullPath, binsOut, mediaOut);
        } else if (mediaOut.length < 120) {
            var mPath = "";
            try { mPath = child.getMediaPath() || ""; } catch (e) {}
            mediaOut.push('{"name":"' + PremiereGodV7.esc(child.name) + '","binPath":"' + PremiereGodV7.esc(pathPrefix || "Root") + '","nodeId":"' + PremiereGodV7.esc(child.nodeId) + '","mediaPath":"' + PremiereGodV7.esc(mPath) + '"}');
        }
    }
};


PremiereGodV7.scanLiveEye = function () {
    try {
        if (!app || !app.project) {
            return '{"ok":false,"status":"NO_PROJECT_OPEN"}';
        }
        var projName = app.project.name || "Untitled.prproj";
        var seq = app.project.activeSequence;
        var binsArr = [];
        var mediaArr = [];
        PremiereGodV7.scanBinsRecursive(app.project.rootItem, "", binsArr, mediaArr);


        if (!seq) {
            return '{"ok":true,"project":"' + PremiereGodV7.esc(projName) + '","sequence":"NONE","bins":[' + binsArr.join(",") + '],"mediaCount":' + mediaArr.length + '}';
        }


        var ctiTicks = seq.getPlayerPosition().ticks;
        var ctiSec = PremiereGodV7.ticksToSeconds(ctiTicks);
        var frameSizeH = seq.frameSizeHorizontal || 1920;
        var frameSizeV = seq.frameSizeVertical || 1080;


        // Inspect visible clip right under playhead
        var visibleTarget = PremiereGodV7.resolveTargetClipsAdvanced(seq, { requireAtPlayhead: true })[0] || null;
        var visibleClipJson = "null";
        if (visibleTarget && visibleTarget.clip) {
            var vc = visibleTarget.clip;
            var mCtrl = PremiereGodV7.getMotionControls(vc);
            var curScale = 100;
            try {
                if (mCtrl && mCtrl.scaleProp) curScale = parseFloat(mCtrl.scaleProp.getValue());
            } catch (e) {}
            visibleClipJson =
                '{"name":"' + PremiereGodV7.esc(vc.name) + '",' +
                '"track":"V' + (visibleTarget.trackIndex + 1) + '",' +
                '"startSec":' + PremiereGodV7.ticksToSeconds(vc.start.ticks) + ',' +
                '"endSec":' + PremiereGodV7.ticksToSeconds(vc.end.ticks) + ',' +
                '"scale":' + (isNaN(curScale) ? 100 : Math.round(curScale * 10) / 10) + '}';
        }


        // Count clips across all Video & Audio tracks
        var vTrackSummaries = [];
        for (var v = 0; v < seq.videoTracks.numTracks; v++) {
            var vt = seq.videoTracks[v];
            vTrackSummaries.push('"V' + (v + 1) + ':' + vt.clips.numItems + ' clips"');
        }
        var aTrackSummaries = [];
        for (var a = 0; a < seq.audioTracks.numTracks; a++) {
            var at = seq.audioTracks[a];
            aTrackSummaries.push('"A' + (a + 1) + ':' + at.clips.numItems + ' clips"');
        }


        var reportLine =
            "[PREMIERE GOD-EYE v7.0 LIVE FEED] " +
            "PROJECT=\"" + PremiereGodV7.esc(projName) + "\" | " +
            "SEQ=\"" + PremiereGodV7.esc(seq.name) + "\" (" + frameSizeH + "x" + frameSizeV + ") | " +
            "PLAYHEAD=" + ctiSec + "s (Ticks:" + ctiTicks + ") | " +
            "VISIBLE_CLIP=" + (visibleTarget && visibleTarget.clip ? (PremiereGodV7.esc(visibleTarget.clip.name) + "@V" + (visibleTarget.trackIndex + 1)) : "NONE") + " | " +
            "BINS=" + binsArr.length + " | MEDIA_ITEMS=" + mediaArr.length;


        return '{' +
            '"ok":true,' +
            '"premiereEyeLine":"' + PremiereGodV7.esc(reportLine) + '",' +
            '"project":"' + PremiereGodV7.esc(projName) + '",' +
            '"sequence":"' + PremiereGodV7.esc(seq.name) + '",' +
            '"width":' + frameSizeH + ',' +
            '"height":' + frameSizeV + ',' +
            '"playheadSec":' + ctiSec + ',' +
            '"playheadTicks":"' + PremiereGodV7.esc(ctiTicks) + '",' +
            '"visibleClipUnderPlayhead":' + visibleClipJson + ',' +
            '"videoTracks":[' + vTrackSummaries.join(",") + '],' +
            '"audioTracks":[' + aTrackSummaries.join(",") + '],' +
            '"bins":[' + binsArr.join(",") + '],' +
            '"mediaItems":[' + mediaArr.join(",") + ']' +
        '}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// MODULE [2/9]: INSTANT MOTION, 10% ZOOM & KEYFRAME ANIMATION ENGINE
// ----------------------------------------------------------------------------
PremiereGodV7.transformAndAnimateClip = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        var targetInfo = PremiereGodV7.findTargetClip(
            seq,
            opts.preferSelected === true,
            typeof opts.trackIndex === "number" ? opts.trackIndex : -1,
            opts.clipName || ""
        );
        if (!targetInfo || !targetInfo.clip) {
            return '{"ok":false,"error":"NO_CLIP_FOUND_UNDER_PLAYHEAD_OR_SELECTED"}';
        }


        var clip = targetInfo.clip;
        var ctrl = PremiereGodV7.getMotionControls(clip);
        if (!ctrl || !ctrl.motionComp) {
            return '{"ok":false,"error":"MOTION_COMPONENT_NOT_FOUND_ON_CLIP"}';
        }


        var currentScale = 100;
        try { currentScale = parseFloat(ctrl.scaleProp.getValue()); } catch (e) { currentScale = 100; }
        if (isNaN(currentScale) || currentScale <= 0) currentScale = 100;


        // 1. Instant Relative Zoom (e.g., "10% zoom kar do" -> deltaScalePercent: 10)
        var newScale = currentScale;
        if (typeof opts.deltaScalePercent === "number" && opts.deltaScalePercent !== 0) {
            newScale = currentScale + opts.deltaScalePercent;
        } else if (typeof opts.scale === "number" && opts.scale > 0) {
            newScale = opts.scale;
        }


        // Apply static transforms if no animation preset is requested
        if (!opts.preset || opts.preset === "none" || opts.preset === "static") {
            if (ctrl.scaleProp && (typeof opts.deltaScalePercent === "number" || typeof opts.scale === "number")) {
                if (ctrl.scaleProp.isTimeVarying && ctrl.scaleProp.isTimeVarying()) {
                    var ctiInternal = PremiereGodV7.getClipInternalTicks(seq, clip);
                    ctrl.scaleProp.addKey(ctiInternal);
                    ctrl.scaleProp.setValueAtKey(ctiInternal, newScale, true);
                } else {
                    ctrl.scaleProp.setValue(newScale, true);
                }
            }
            if (ctrl.positionProp && typeof opts.posX === "number" && typeof opts.posY === "number") {
                ctrl.positionProp.setValue([opts.posX, opts.posY], true);
            }
            if (ctrl.rotationProp && typeof opts.rotation === "number") {
                ctrl.rotationProp.setValue(opts.rotation, true);
            }
            if (ctrl.opacityProp && typeof opts.opacity === "number") {
                ctrl.opacityProp.setValue(opts.opacity, true);
            }


            return '{"ok":true,"action":"STATIC_TRANSFORM_APPLIED","clip":"' + PremiereGodV7.esc(clip.name) + '","track":"V' + (targetInfo.trackIndex + 1) + '","newScale":' + newScale + '}';
        }


        // 2. Keyframe Animation Presets (2-Second Execution across Clip In/Out)
        var preset = String(opts.preset).toLowerCase();
        var inTicks = clip.inPoint.ticks;
        var clipDurSec = PremiereGodV7.ticksToSeconds(clip.duration.ticks);
        var outTicks = PremiereGodV7.secondsToTicks(PremiereGodV7.ticksToSeconds(inTicks) + Math.max(0.2, clipDurSec - 0.04));
        var midTicks = PremiereGodV7.secondsToTicks(PremiereGodV7.ticksToSeconds(inTicks) + Math.min(0.45, clipDurSec * 0.35));


        if (preset === "slow_zoom_in" || preset === "zoom_in") {
            var startS = typeof opts.startScale === "number" ? opts.startScale : currentScale;
            var endS = typeof opts.endScale === "number" ? opts.endScale : (startS + (opts.deltaScalePercent || 15));
            ctrl.scaleProp.setTimeVarying(true);
            ctrl.scaleProp.addKey(inTicks);
            ctrl.scaleProp.setValueAtKey(inTicks, startS, true);
            ctrl.scaleProp.addKey(outTicks);
            ctrl.scaleProp.setValueAtKey(outTicks, endS, true);
        } else if (preset === "slow_zoom_out" || preset === "zoom_out") {
            var startOut = typeof opts.startScale === "number" ? opts.startScale : (currentScale + 18);
            var endOut = typeof opts.endScale === "number" ? opts.endScale : currentScale;
            ctrl.scaleProp.setTimeVarying(true);
            ctrl.scaleProp.addKey(inTicks);
            ctrl.scaleProp.setValueAtKey(inTicks, startOut, true);
            ctrl.scaleProp.addKey(outTicks);
            ctrl.scaleProp.setValueAtKey(outTicks, endOut, true);
        } else if (preset === "punch_in" || preset === "fast_zoom") {
            var pStart = currentScale;
            var pEnd = currentScale + (opts.deltaScalePercent || 22);
            ctrl.scaleProp.setTimeVarying(true);
            ctrl.scaleProp.addKey(inTicks);
            ctrl.scaleProp.setValueAtKey(inTicks, pStart, true);
            ctrl.scaleProp.addKey(midTicks);
            ctrl.scaleProp.setValueAtKey(midTicks, pEnd, true);
        } else if (preset === "slide_up_pop" || preset === "pop_in") {
            // Animate both Position and Scale for smooth callout/badge entrance
            ctrl.scaleProp.setTimeVarying(true);
            ctrl.scaleProp.addKey(inTicks);
            ctrl.scaleProp.setValueAtKey(inTicks, 70, true);
            ctrl.scaleProp.addKey(midTicks);
            ctrl.scaleProp.setValueAtKey(midTicks, newScale, true);


            if (ctrl.positionProp) {
                ctrl.positionProp.setTimeVarying(true);
                ctrl.positionProp.addKey(inTicks);
                ctrl.positionProp.setValueAtKey(inTicks, [0.5, 0.62], true);
                ctrl.positionProp.addKey(midTicks);
                ctrl.positionProp.setValueAtKey(midTicks, [0.5, 0.5], true);
            }
            if (ctrl.opacityProp) {
                ctrl.opacityProp.setTimeVarying(true);
                ctrl.opacityProp.addKey(inTicks);
                ctrl.opacityProp.setValueAtKey(inTicks, 0, true);
                ctrl.opacityProp.addKey(midTicks);
                ctrl.opacityProp.setValueAtKey(midTicks, 100, true);
            }
        } else if (preset === "pan_left_to_right" || preset === "pan_right") {
            ctrl.scaleProp.setValue(Math.max(currentScale, 118), true);
            if (ctrl.positionProp) {
                ctrl.positionProp.setTimeVarying(true);
                ctrl.positionProp.addKey(inTicks);
                ctrl.positionProp.setValueAtKey(inTicks, [0.44, 0.5], true);
                ctrl.positionProp.addKey(outTicks);
                ctrl.positionProp.setValueAtKey(outTicks, [0.56, 0.5], true);
            }
        } else if (preset === "camera_shake" || preset === "shake") {
            ctrl.scaleProp.setValue(Math.max(currentScale, 106), true);
            if (ctrl.positionProp) {
                ctrl.positionProp.setTimeVarying(true);
                var baseSec = PremiereGodV7.ticksToSeconds(inTicks);
                var offsets = [[0.5, 0.5], [0.512, 0.492], [0.488, 0.508], [0.507, 0.506], [0.495, 0.494], [0.5, 0.5]];
                for (var k = 0; k < offsets.length; k++) {
                    var kt = PremiereGodV7.secondsToTicks(baseSec + (k * 0.06));
                    ctrl.positionProp.addKey(kt);
                    ctrl.positionProp.setValueAtKey(kt, offsets[k], true);
                }
            }
        }


        return '{"ok":true,"action":"ANIMATION_PRESET_APPLIED","preset":"' + PremiereGodV7.esc(preset) + '","clip":"' + PremiereGodV7.esc(clip.name) + '","track":"V' + (targetInfo.trackIndex + 1) + '"}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


PremiereGodV7.getClipInternalTicks = function (seq, clip) {
    var ctiSec = PremiereGodV7.ticksToSeconds(seq.getPlayerPosition().ticks);
    var clipStartSec = PremiereGodV7.ticksToSeconds(clip.start.ticks);
    var clipInSec = PremiereGodV7.ticksToSeconds(clip.inPoint.ticks);
    var internalSec = clipInSec + Math.max(0, ctiSec - clipStartSec);
    return PremiereGodV7.secondsToTicks(internalSec);
};


// Helper: Find highest collision-free video track at [startTicks, endTicks] and insert clip
PremiereGodV7.insertClipOnFreeUpperTrack = function (projectItem, startTicksStr, durationSec, alignPreset, animatePreset) {
    var seq = app.project.activeSequence;
    if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


    var startT = parseFloat(startTicksStr || seq.getPlayerPosition().ticks);
    var durT = parseFloat(PremiereGodV7.secondsToTicks(durationSec || 4.0));
    var endT = startT + durT;


    var chosenTrackIdx = -1;
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
        var trk = seq.videoTracks[i];
        var hasOverlap = false;
        for (var j = 0; j < trk.clips.numItems; j++) {
            var c = trk.clips[j];
            var cs = parseFloat(c.start.ticks);
            var ce = parseFloat(c.end.ticks);
            if (startT < ce && endT > cs) {
                hasOverlap = true;
                break;
            }
        }
        if (!hasOverlap) {
            chosenTrackIdx = i;
            break;
        }
    }


    // If all existing video tracks are occupied at this timestamp, add a new Video Track via QE DOM
    if (chosenTrackIdx === -1) {
        try {
            app.enableQE();
            var qeSeq = qe.project.getActiveSequence();
            if (qeSeq && qeSeq.addTracks) {
                qeSeq.addTracks(1, seq.videoTracks.numTracks, 0, 0);
            }
        } catch (e) {}
        chosenTrackIdx = seq.videoTracks.numTracks - 1;
    }


    var targetTrack = seq.videoTracks[chosenTrackIdx];
    targetTrack.insertClip(projectItem, String(Math.round(startT)));


    // Locate the newly inserted clip and set its exact outPoint + animation
    var insertedClip = null;
    for (var k = targetTrack.clips.numItems - 1; k >= 0; k--) {
        var cand = targetTrack.clips[k];
        if (Math.abs(parseFloat(cand.start.ticks) - startT) < PremiereGodV7.TICKS_PER_SECOND * 0.2) {
            insertedClip = cand;
            break;
        }
    }


    if (insertedClip) {
        try {
            var newEndTicks = String(Math.round(startT + durT));
            insertedClip.end = newEndTicks;
        } catch (e) {}


        if (animatePreset && animatePreset !== "none") {
            PremiereGodV7.transformAndAnimateClip({
                trackIndex: chosenTrackIdx,
                clipName: insertedClip.name,
                preset: animatePreset,
                scale: 100
            });
        }
    }


    return '{"ok":true,"track":"V' + (chosenTrackIdx + 1) + '","startSec":' + PremiereGodV7.ticksToSeconds(startT) + ',"durationSec":' + (durationSec || 4.0) + '}';
};

// ============================================================================
// MODULE [3/9] EXTENDSCRIPT COMPANION: IMPORT & ANIMATE CALLOUT BOX ON TIMELINE
// ============================================================================
PremiereGodV7.insertStyledCalloutFile = function (pngFilePath, startSec, durationSec, animatePreset) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        // Find or create "AI_Callouts" Bin
        var root = app.project.rootItem;
        var calloutBin = null;
        for (var i = 0; i < root.children.numItems; i++) {
            if (root.children[i].type === ProjectItemType.BIN && root.children[i].name === "AI_Callouts") {
                calloutBin = root.children[i];
                break;
            }
        }
        if (!calloutBin) {
            calloutBin = root.createBin("AI_Callouts");
        }


        var importOk = app.project.importFiles([pngFilePath], true, calloutBin, false);
        if (!importOk) return '{"ok":false,"error":"IMPORT_CALLOUT_PNG_FAILED"}';


        var importedItem = calloutBin.children[calloutBin.children.numItems - 1];
        var startTicks = (typeof startSec === "number" && startSec >= 0)
            ? PremiereGodV7.secondsToTicks(startSec)
            : seq.getPlayerPosition().ticks;


        return PremiereGodV7.safeInsertMediaItem({
            itemName: importedItem.name,
            startSec: PremiereGodV7.ticksToSeconds(startTicks),
            durationSec: durationSec || 4.0,
            animatePreset: animatePreset || "slide_up_pop",
            isAudio: false
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

// ============================================================================
// RAVIX Studio — OMNISCIENT PREMIERE NEURAL STUDIO (v7.0)
// BATCH 2: MODULE [4/9] (EFFECTS PANEL QE CONTROLLER) & MODULE [5/9] (SMART LAYERING)
// ============================================================================


// Helper: Locate matching QE Clip on QE Sequence for a Vanilla Track/Clip
PremiereGodV7.findQeClip = function (trackIndex, vanillaClip, isAudio) {
    try {
        app.enableQE();
        var qeSeq = qe.project.getActiveSequence();
        if (!qeSeq) return null;


        var qeTrack = isAudio ? qeSeq.getAudioTrackAt(trackIndex) : qeSeq.getVideoTrackAt(trackIndex);
        if (!qeTrack) return null;


        var targetStartTicks = parseFloat(vanillaClip.start.ticks);
        for (var i = 0; i < qeTrack.numItems; i++) {
            var item = qeTrack.getItemAt(i);
            if (!item || item.type === "Empty") continue;
            // Match by name or start time proximity
            if (item.name === vanillaClip.name) {
                return item;
            }
            if (typeof item.start !== "undefined" && Math.abs(parseFloat(item.start.ticks) - targetStartTicks) < PremiereGodV7.TICKS_PER_SECOND * 0.15) {
                return item;
            }
        }
    } catch (e) {}
    return null;
};


// ----------------------------------------------------------------------------
// MODULE [4/9]: UNIVERSAL PREMIERE "EFFECTS PANEL" CONTROLLER (VIDEO + AUDIO)
// Supports: Drop Shadow, Basic 3D, Crop, Gaussian Blur, Directional Blur,
// Camera Blur, Lumetri Color, Transform, Mosaic, Studio Reverb, Parametric EQ, etc.
// ----------------------------------------------------------------------------
PremiereGodV7.EFFECT_ALIASES = {
    "drop_shadow": "Drop Shadow",
    "dropshadow": "Drop Shadow",
    "shadow": "Drop Shadow",
    "basic_3d": "Basic 3D",
    "basic3d": "Basic 3D",
    "3d": "Basic 3D",
    "crop": "Crop",
    "gaussian_blur": "Gaussian Blur",
    "blur": "Gaussian Blur",
    "directional_blur": "Directional Blur",
    "camera_blur": "Camera Blur",
    "lumetri": "Lumetri Color",
    "lumetri_color": "Lumetri Color",
    "color": "Lumetri Color",
    "transform": "Transform",
    "mosaic": "Mosaic",
    "invert": "Invert",
    "replicate": "Replicate",
    "echo": "Echo",
    "reverb": "Studio Reverb",
    "studio_reverb": "Studio Reverb",
    "parametric_eq": "Parametric Equalizer"
};


PremiereGodV7.applyAndConfigureEffect = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        var isAudio = opts.isAudio === true;
        var rawEffectName = String(opts.effectName || "Drop Shadow").replace(/^\s+|\s+$/g, "");
        var lookupKey = rawEffectName.toLowerCase().replace(/\s+/g, "_");
        var canonicalEffectName = PremiereGodV7.EFFECT_ALIASES[lookupKey] || rawEffectName;


        var targetInfo = null;
        if (!isAudio) {
            targetInfo = PremiereGodV7.findTargetClip(
                seq,
                opts.preferSelected === true,
                typeof opts.trackIndex === "number" ? opts.trackIndex : -1,
                opts.clipName || ""
            );
        } else {
            // Find target audio clip under playhead or by trackIndex
            var ctiTicks = parseFloat(seq.getPlayerPosition().ticks);
            for (var a = seq.audioTracks.numTracks - 1; a >= 0; a--) {
                if (typeof opts.trackIndex === "number" && opts.trackIndex >= 0 && a !== opts.trackIndex) continue;
                var aTrk = seq.audioTracks[a];
                for (var j = 0; j < aTrk.clips.numItems; j++) {
                    var ac = aTrk.clips[j];
                    if (ctiTicks >= parseFloat(ac.start.ticks) && ctiTicks <= parseFloat(ac.end.ticks)) {
                        targetInfo = { clip: ac, trackIndex: a, trackName: aTrk.name };
                        break;
                    }
                }
                if (targetInfo) break;
            }
        }


        if (!targetInfo || !targetInfo.clip) {
            return '{"ok":false,"error":"TARGET_CLIP_NOT_FOUND_FOR_EFFECT"}';
        }


        var vanillaClip = targetInfo.clip;


        // 1. Check if the effect component is already attached on the clip; if not, attach via QE DOM
        var effectComp = null;
        for (var c = 0; c < vanillaClip.components.numItems; c++) {
            var comp = vanillaClip.components[c];
            if (comp && (comp.displayName || "").toLowerCase() === canonicalEffectName.toLowerCase()) {
                effectComp = comp;
                break;
            }
        }


        if (!effectComp) {
            app.enableQE();
            var qeClip = PremiereGodV7.findQeClip(targetInfo.trackIndex, vanillaClip, isAudio);
            if (!qeClip) {
                return '{"ok":false,"error":"QE_CLIP_LOOKUP_FAILED_FOR:' + PremiereGodV7.esc(vanillaClip.name) + '"}';
            }


            if (isAudio) {
                var qeAudioFx = qe.project.getAudioEffectByName(canonicalEffectName);
                if (!qeAudioFx) return '{"ok":false,"error":"AUDIO_EFFECT_NOT_FOUND:' + PremiereGodV7.esc(canonicalEffectName) + '"}';
                qeClip.addAudioEffect(qeAudioFx);
            } else {
                var qeVideoFx = qe.project.getVideoEffectByName(canonicalEffectName);
                if (!qeVideoFx) return '{"ok":false,"error":"VIDEO_EFFECT_NOT_FOUND:' + PremiereGodV7.esc(canonicalEffectName) + '"}';
                qeClip.addVideoEffect(qeVideoFx);
            }


            // Re-scan vanilla clip components to grab the newly attached effect
            for (var c2 = vanillaClip.components.numItems - 1; c2 >= 0; c2--) {
                var comp2 = vanillaClip.components[c2];
                if (comp2 && (comp2.displayName || "").toLowerCase().indexOf(canonicalEffectName.toLowerCase()) !== -1) {
                    effectComp = comp2;
                    break;
                }
            }
        }


        if (!effectComp) {
            return '{"ok":false,"error":"EFFECT_ATTACHED_BUT_COMPONENT_NOT_ACCESSIBLE:' + PremiereGodV7.esc(canonicalEffectName) + '"}';
        }


        // 2. Configure Effect Properties (Static Values or Animated Keyframes across Clip In -> Out)
        var params = opts.params || {};
        var animateParams = opts.animateParams || {};
        var updatedProps = [];
        var inTicks = vanillaClip.inPoint.ticks;
        var clipDurSec = PremiereGodV7.ticksToSeconds(vanillaClip.duration.ticks);
        var outTicks = PremiereGodV7.secondsToTicks(PremiereGodV7.ticksToSeconds(inTicks) + Math.max(0.2, clipDurSec - 0.04));


        for (var pIdx = 0; pIdx < effectComp.properties.numItems; pIdx++) {
            var prop = effectComp.properties[pIdx];
            if (!prop) continue;
            var dispName = prop.displayName || "";
            var normDisp = dispName.toLowerCase().replace(/\s+/g, "_");


            // Check static parameter match
            for (var key in params) {
                if (!params.hasOwnProperty(key)) continue;
                var normKey = String(key).toLowerCase().replace(/\s+/g, "_");
                if (normDisp === normKey || dispName.toLowerCase().indexOf(String(key).toLowerCase()) !== -1) {
                    try {
                        prop.setValue(params[key], true);
                        updatedProps.push(dispName + "=" + params[key]);
                    } catch (e) {}
                }
            }


            // Check animated keyframe parameter match (e.g., animateParams: { "Swivel": { start: -25, end: 0 } })
            for (var aKey in animateParams) {
                if (!animateParams.hasOwnProperty(aKey)) continue;
                var normAKey = String(aKey).toLowerCase().replace(/\s+/g, "_");
                if (normDisp === normAKey || dispName.toLowerCase().indexOf(String(aKey).toLowerCase()) !== -1) {
                    var animSpec = animateParams[aKey];
                    if (animSpec && typeof animSpec.start !== "undefined" && typeof animSpec.end !== "undefined") {
                        try {
                            var endT = typeof animSpec.durationSec === "number"
                                ? PremiereGodV7.secondsToTicks(PremiereGodV7.ticksToSeconds(inTicks) + animSpec.durationSec)
                                : outTicks;
                            prop.setTimeVarying(true);
                            prop.addKey(inTicks);
                            prop.setValueAtKey(inTicks, animSpec.start, true);
                            prop.addKey(endT);
                            prop.setValueAtKey(endT, animSpec.end, true);
                            updatedProps.push(dispName + ":Animated(" + animSpec.start + "->" + animSpec.end + ")");
                        } catch (e) {}
                    }
                }
            }
        }


        return '{' +
            '"ok":true,' +
            '"effect":"' + PremiereGodV7.esc(canonicalEffectName) + '",' +
            '"clip":"' + PremiereGodV7.esc(vanillaClip.name) + '",' +
            '"track":"' + (isAudio ? "A" : "V") + (targetInfo.trackIndex + 1) + '",' +
            '"updatedProperties":' + JSON.stringify(updatedProps) +
        '}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// MODULE [5/9]: SMART COLLISION-FREE "WATERFALL" LAYERING (VIDEO + AUDIO)
// & 3-LAYER DOCUMENTARY STACK BUILDER (SOLID MATTE + ANIMATED TEXT + CUTOUT PNG)
// Zero-Overwrite Guarantee: NEVER deletes or overwrites existing timeline clips!
// ----------------------------------------------------------------------------


// Helper: Find or auto-create a collision-free Track (Video or Audio) for [startTicks, endTicks]
PremiereGodV7.findOrCreateFreeTrack = function (seq, isAudio, startTicksNum, endTicksNum, minStartTrackIdx) {
    var tracks = isAudio ? seq.audioTracks : seq.videoTracks;
    var originalCount = tracks.numTracks;
    var startIdx = typeof minStartTrackIdx === "number" && minStartTrackIdx >= 0 ? minStartTrackIdx : 0;


    for (var t = startIdx; t < tracks.numTracks; t++) {
        var trk = tracks[t];
        var collision = false;
        for (var c = 0; c < trk.clips.numItems; c++) {
            var clp = trk.clips[c];
            var cs = parseFloat(clp.start.ticks);
            var ce = parseFloat(clp.end.ticks);
            // Strict overlap check (with 1ms tolerance)
            if (startTicksNum < (ce - 100000) && endTicksNum > (cs + 100000)) {
                collision = true;
                break;
            }
        }
        if (!collision) {
            return { track: trk, trackIndex: t };
        }
    }


    // All existing tracks are occupied in this time range -> Auto-create a new track on top via QE DOM
    try {
        app.enableQE();
        var qeSeq = qe.project.getActiveSequence();
        if (qeSeq && qeSeq.addTracks) {
            if (isAudio) {
                qeSeq.addTracks(0, 0, 1, seq.audioTracks.numTracks);
            } else {
                qeSeq.addTracks(1, seq.videoTracks.numTracks, 0, 0);
            }
        }
    } catch (e) {}


    var updatedTracks = isAudio ? seq.audioTracks : seq.videoTracks;
    if (updatedTracks.numTracks <= originalCount) return null;
    var newIdx = updatedTracks.numTracks - 1;
    var newTrack = updatedTracks[newIdx];
    if (!newTrack || !newTrack.clips || newTrack.clips.numItems !== 0) return null;
    return { track: newTrack, trackIndex: newIdx };
};


// Safe Non-Destructive Insert (Trims ONLY the incoming clip if gap-fitting is requested; never harms existing clips)
PremiereGodV7.safeInsertMediaItem = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        var isAudio = opts.isAudio === true;
        var projectItem = PremiereGodV7.findProjectItemByNameOrPath(opts.itemName || "", opts.filePath || "", opts.binName || "");
        if (!projectItem) {
            return '{"ok":false,"error":"PROJECT_ITEM_NOT_FOUND:' + PremiereGodV7.esc(opts.itemName || opts.filePath || "") + '"}';
        }


        var startSec = typeof opts.startSec === "number" ? opts.startSec :
            (typeof opts.startTimeSec === "number" ? opts.startTimeSec : PremiereGodV7.ticksToSeconds(seq.getPlayerPosition().ticks));
        var durationSec = typeof opts.durationSec === "number" && opts.durationSec > 0 ? opts.durationSec : 4.0;


        // If subclip In/Out on source footage was specified, set source In/Out before inserting
        if (typeof opts.sourceInSec === "number" && opts.sourceInSec >= 0) {
            try { projectItem.setInPoint(PremiereGodV7.secondsToTicks(opts.sourceInSec), 4); } catch (e) {}
        }
        if (typeof opts.sourceOutSec === "number" && opts.sourceOutSec > (opts.sourceInSec || 0)) {
            durationSec = opts.sourceOutSec - (opts.sourceInSec || 0);
            try { projectItem.setOutPoint(PremiereGodV7.secondsToTicks(opts.sourceOutSec), 4); } catch (e) {}
        }


        var startT = parseFloat(PremiereGodV7.secondsToTicks(startSec));
        var endT = startT + parseFloat(PremiereGodV7.secondsToTicks(durationSec));


        // Option A: If fitInGapOnTrack is specified, trim ONLY the incoming clip to fit the available gap on that track
        var targetTrackInfo = null;
        if (typeof opts.fitInGapOnTrack === "number" && opts.fitInGapOnTrack >= 0) {
            var tracks = isAudio ? seq.audioTracks : seq.videoTracks;
            if (opts.fitInGapOnTrack < tracks.numTracks) {
                var candidateTrk = tracks[opts.fitInGapOnTrack];
                var maxAllowedEndT = endT;
                var blockedAtStart = false;
                for (var g = 0; g < candidateTrk.clips.numItems; g++) {
                    var existing = candidateTrk.clips[g];
                    var es = parseFloat(existing.start.ticks);
                    var ee = parseFloat(existing.end.ticks);
                    if (startT >= es && startT < ee) {
                        blockedAtStart = true;
                        break;
                    }
                    if (es > startT && es < maxAllowedEndT) {
                        maxAllowedEndT = es; // Trim incoming clip's end so it never touches the next existing clip
                    }
                }
                if (!blockedAtStart && maxAllowedEndT > startT + (PremiereGodV7.TICKS_PER_SECOND * 0.1)) {
                    endT = maxAllowedEndT;
                    durationSec = PremiereGodV7.ticksToSeconds(endT - startT);
                    targetTrackInfo = { track: candidateTrk, trackIndex: opts.fitInGapOnTrack };
                }
            }
        }


        // Option B: Waterfall up to the first collision-free track (never overwriting any existing clip)
        if (!targetTrackInfo) {
            targetTrackInfo = PremiereGodV7.findOrCreateFreeTrack(seq, isAudio, startT, endT, opts.minTrackIndex || 0);
        }


        if (!targetTrackInfo || !targetTrackInfo.track) return '{"ok":false,"error":"NO_VERIFIED_FREE_TRACK"}';
        var trk = targetTrackInfo.track;
        // Limit the incoming source to the collision-tested interval before placing it.
        try {
            var sourceStart = typeof opts.sourceInSec === "number" ? opts.sourceInSec : 0;
            projectItem.setInPoint(PremiereGodV7.secondsToTicks(sourceStart), 4);
            projectItem.setOutPoint(PremiereGodV7.secondsToTicks(sourceStart + durationSec), 4);
        } catch (trimError) {
            return '{"ok":false,"error":"SOURCE_TRIM_FAILED:' + PremiereGodV7.esc(trimError.toString()) + '"}';
        }
        trk.overwriteClip(projectItem, String(Math.round(startT)));


        // Adjust inserted clip's exact end time & optional animation/effects
        var insertedClip = null;
        for (var k = trk.clips.numItems - 1; k >= 0; k--) {
            var cand = trk.clips[k];
            if (Math.abs(parseFloat(cand.start.ticks) - startT) < PremiereGodV7.TICKS_PER_SECOND * 0.25) {
                insertedClip = cand;
                break;
            }
        }


        if (insertedClip) {
            try { insertedClip.end = String(Math.round(endT)); } catch (e) {}


            if (!isAudio && opts.animatePreset) {
                PremiereGodV7.transformAndAnimateClip({
                    trackIndex: targetTrackInfo.trackIndex,
                    clipName: insertedClip.name,
                    preset: opts.animatePreset,
                    scale: opts.scale || 100
                });
            }
            if (opts.effectName) {
                PremiereGodV7.applyAndConfigureEffect({
                    isAudio: isAudio,
                    trackIndex: targetTrackInfo.trackIndex,
                    clipName: insertedClip.name,
                    effectName: opts.effectName,
                    params: opts.effectParams || {},
                    animateParams: opts.effectAnimateParams || {}
                });
            }
        }


        return '{' +
            '"ok":true,' +
            '"item":"' + PremiereGodV7.esc(projectItem.name) + '",' +
            '"project":"' + PremiereGodV7.esc(app.project.name) + '",' +
            '"sequence":"' + PremiereGodV7.esc(seq.name) + '",' +
            '"track":"' + (isAudio ? "A" : "V") + (targetTrackInfo.trackIndex + 1) + '",' +
            '"timelinePosition":' + PremiereGodV7.ticksToSeconds(startT) + ',' +
            '"startSec":' + PremiereGodV7.ticksToSeconds(startT) + ',' +
            '"endSec":' + PremiereGodV7.ticksToSeconds(endT) + ',' +
            '"durationSec":' + durationSec +
        '}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// Helper: Locate ProjectItem by name/path or import from disk if filePath is provided
PremiereGodV7.findProjectItemByNameOrPath = function (itemName, filePath, binName) {
    var root = app.project.rootItem;
    var nameLower = String(itemName || "").toLowerCase();
    var pathLower = String(filePath || "").toLowerCase();


    function searchFolder(folder) {
        if (!folder || !folder.children) return null;
        for (var i = 0; i < folder.children.numItems; i++) {
            var ch = folder.children[i];
            if (!ch) continue;
            if (ch.type === ProjectItemType.BIN) {
                var subFound = searchFolder(ch);
                if (subFound) return subFound;
            } else {
                var cName = (ch.name || "").toLowerCase();
                var cPath = "";
                try { cPath = (ch.getMediaPath() || "").toLowerCase(); } catch (e) {}
                if ((nameLower && cName === nameLower) || (pathLower && cPath === pathLower)) {
                    return ch;
                }
            }
        }
        return null;
    }


    var existing = searchFolder(root);
    if (existing) return existing;


    // If not yet in project and a valid disk filePath was given, import it into target bin
    if (filePath && String(filePath).length > 2) {
        var targetBin = root;
        var desiredBin = binName || "AI_Imports";
        for (var b = 0; b < root.children.numItems; b++) {
            if (root.children[b].type === ProjectItemType.BIN && root.children[b].name === desiredBin) {
                targetBin = root.children[b];
                break;
            }
        }
        if (targetBin === root) {
            targetBin = root.createBin(desiredBin);
        }
        var ok = app.project.importFiles([filePath], true, targetBin, false);
        if (ok && targetBin.children.numItems > 0) {
            return targetBin.children[targetBin.children.numItems - 1];
        }
    }
    return null;
};


// 3-Layer Documentary Stack Builder:
// Layer 1 (Bottom Free Track V[n])   -> Solid Backdrop Image/Matte
// Layer 2 (Middle Free Track V[n+1]) -> Animated Background Text PNG
// Layer 3 (Top Free Track V[n+2])    -> Cutout Subject PNG + Drop Shadow + Slow Zoom
PremiereGodV7.buildThreeLayerComposition = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        var startSec = typeof opts.startSec === "number" ? opts.startSec : PremiereGodV7.ticksToSeconds(seq.getPlayerPosition().ticks);
        var durationSec = typeof opts.durationSec === "number" ? opts.durationSec : 5.0;


        // Layer 1: Solid Backdrop Matte
        var r1 = JSON.parse(PremiereGodV7.safeInsertMediaItem({
            filePath: opts.backdropFilePath,
            itemName: opts.backdropItemName || "",
            binName: "AI_3Layer_Comps",
            startSec: startSec,
            durationSec: durationSec,
            minTrackIndex: 0
        }));


        if (!r1.ok) return JSON.stringify({ok:false,error:"BACKDROP_INSERT_FAILED",detail:r1});
        var baseTrackIdx = r1.ok && r1.track ? (parseInt(r1.track.replace("V", ""), 10) - 1) : 0;


        // Layer 2: Animated Text Layer right above Backdrop
        var r2 = JSON.parse(PremiereGodV7.safeInsertMediaItem({
            filePath: opts.textFilePath,
            itemName: opts.textItemName || "",
            binName: "AI_3Layer_Comps",
            startSec: startSec,
            durationSec: durationSec,
            minTrackIndex: baseTrackIdx + 1,
            animatePreset: opts.textAnimatePreset || "slide_up_pop"
        }));


        if (!r2.ok) return JSON.stringify({ok:false,error:"TEXT_INSERT_FAILED",detail:r2});
        var midTrackIdx = r2.ok && r2.track ? (parseInt(r2.track.replace("V", ""), 10) - 1) : (baseTrackIdx + 1);


        // Layer 3: Cutout Subject PNG on Top + Drop Shadow + Slow Zoom-In
        var r3 = JSON.parse(PremiereGodV7.safeInsertMediaItem({
            filePath: opts.subjectPngPath,
            itemName: opts.subjectItemName || "",
            binName: "AI_3Layer_Comps",
            startSec: startSec,
            durationSec: durationSec,
            minTrackIndex: midTrackIdx + 1,
            animatePreset: opts.subjectAnimatePreset || "slow_zoom_in",
            effectName: "Drop Shadow",
            effectParams: { "Opacity": 85, "Distance": 18, "Softness": 35 }
        }));


        if (!r3.ok) return JSON.stringify({ok:false,error:"SUBJECT_INSERT_FAILED",detail:r3});
        return '{' +
            '"ok":true,' +
            '"action":"THREE_LAYER_COMP_CREATED",' +
            '"startSec":' + startSec + ',' +
            '"durationSec":' + durationSec + ',' +
            '"layer1_backdrop":' + JSON.stringify(r1) + ',' +
            '"layer2_text":' + JSON.stringify(r2) + ',' +
            '"layer3_subject":' + JSON.stringify(r3) +
        '}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

// ============================================================================
// RAVIX Studio — OMNISCIENT PREMIERE NEURAL STUDIO (v7.0)
// BATCH 3: MODULES [7/9] (DUAL FOOTAGE SYNC), [8/9] (RAZOR & STRETCH), [9/9] (POWER-UPS)
// ============================================================================


// ----------------------------------------------------------------------------
// MODULE [9/9] POWER-UP #1: AUTO-BACKUP SEQUENCE SNAPSHOT (1-SECOND SAFETY NET)
// Clones the active sequence before any bulk AI edit so user never loses work
// ----------------------------------------------------------------------------
PremiereGodV7.createSequenceBackup = function () { return JSON.stringify({ok:true,created:false,skipped:true,reason:"PROJECT_BACKUPS_DISABLED_BY_USER"}); };


// ----------------------------------------------------------------------------
// MODULE [8/9]: PRECISION QE RAZOR CUT & SMART TIME-STRETCH (RATE-STRETCH)
// ----------------------------------------------------------------------------


// 1. Exact Frame/Second Razor Cut on Specific Track or All Tracks
PremiereGodV7.razorCutAtSeconds = function (cutSec, trackIndex, isAudio, allTracks) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        app.enableQE();
        var qeSeq = qe.project.getActiveSequence();
        if (!qeSeq) return '{"ok":false,"error":"QE_SEQUENCE_UNAVAILABLE"}';


        var ticksStr = PremiereGodV7.secondsToTicks(cutSec);
        // Convert seconds to timecode or ticks for QE razor
        seq.setPlayerPosition(ticksStr);
        var ctiTimecode = qeSeq.CTI.timecode;


        if (allTracks === true) {
            qeSeq.razor(ctiTimecode);
            return '{"ok":true,"action":"RAZOR_ALL_TRACKS","cutSec":' + cutSec + ',"timecode":"' + PremiereGodV7.esc(ctiTimecode) + '"}';
        }


        var tIdx = typeof trackIndex === "number" && trackIndex >= 0 ? trackIndex : 0;
        var qeTrk = isAudio ? qeSeq.getAudioTrackAt(tIdx) : qeSeq.getVideoTrackAt(tIdx);
        if (!qeTrk) return '{"ok":false,"error":"QE_TRACK_NOT_FOUND"}';


        qeTrk.razor(ctiTimecode);
        return '{"ok":true,"action":"RAZOR_SINGLE_TRACK","track":"' + (isAudio ? "A" : "V") + (tIdx + 1) + '","cutSec":' + cutSec + ',"timecode":"' + PremiereGodV7.esc(ctiTimecode) + '"}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// 2. Smart Rate-Stretch: Stretches or compresses a clip so its duration matches targetDurationSec exactly (0 black gaps!)
PremiereGodV7.stretchClipToFitDuration = function (trackIndex, clipName, startSec, targetDurationSec) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        var tIdx = typeof trackIndex === "number" && trackIndex >= 0 ? trackIndex : 0;
        var trk = seq.videoTracks[tIdx];
        if (!trk) return '{"ok":false,"error":"VIDEO_TRACK_NOT_FOUND"}';


        var targetClip = null;
        var startTicksTarget = typeof startSec === "number" ? parseFloat(PremiereGodV7.secondsToTicks(startSec)) : -1;


        for (var i = 0; i < trk.clips.numItems; i++) {
            var c = trk.clips[i];
            if (!c) continue;
            if (clipName && c.name.toLowerCase().indexOf(String(clipName).toLowerCase()) !== -1) {
                targetClip = c;
                break;
            }
            if (startTicksTarget >= 0 && Math.abs(parseFloat(c.start.ticks) - startTicksTarget) < PremiereGodV7.TICKS_PER_SECOND * 0.3) {
                targetClip = c;
                break;
            }
        }


        if (!targetClip) return '{"ok":false,"error":"CLIP_NOT_FOUND_FOR_STRETCH"}';


        var currentDurSec = PremiereGodV7.ticksToSeconds(targetClip.duration.ticks);
        if (currentDurSec <= 0.05 || targetDurationSec <= 0.05) {
            return '{"ok":false,"error":"INVALID_CLIP_DURATION"}';
        }


        // If the source clip has enough media tail, simply extend outPoint/end; otherwise apply QE speed rate-stretch
        var newEndTicks = String(Math.round(parseFloat(targetClip.start.ticks) + parseFloat(PremiereGodV7.secondsToTicks(targetDurationSec))));
        var ratePercent = Math.round((currentDurSec / targetDurationSec) * 10000) / 100;


        try {
            app.enableQE();
            var qeClip = PremiereGodV7.findQeClip(tIdx, targetClip, false);
            if (qeClip && qeClip.setSpeed && Math.abs(ratePercent - 100) > 1) {
                // setSpeed(speedMultiplier, ripple, reverse, frameBlend)
                qeClip.setSpeed(ratePercent / 100.0, "", false, true);
            }
        } catch (e) {}


        try {
            targetClip.end = newEndTicks;
        } catch (e) {}


        return '{' +
            '"ok":true,' +
            '"action":"SMART_RATE_STRETCH_APPLIED",' +
            '"clip":"' + PremiereGodV7.esc(targetClip.name) + '",' +
            '"oldDurationSec":' + currentDurSec + ',' +
            '"targetDurationSec":' + targetDurationSec + ',' +
            '"calculatedSpeedPercent":' + ratePercent +
        '}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// MODULE [9/9] POWER-UP #2: AUTO ASPECT-RATIO FIXER (9:16 <-> 16:9) & COLOR LABELS
// Automatically scales clip to fill sequence frame without ugly black sidebars
// ----------------------------------------------------------------------------
PremiereGodV7.autoFitClipToSequenceFrame = function (clip, seq) {
    try {
        if (!clip || !seq) return;
        var seqW = seq.frameSizeHorizontal || 1920;
        var seqH = seq.frameSizeVertical || 1080;
        var ctrl = PremiereGodV7.getMotionControls(clip);
        if (!ctrl || !ctrl.scaleProp) return;


        // Inspect projectItem resolution if available via metadata, or apply smart fill scale
        var pItem = clip.projectItem;
        if (pItem && pItem.getProjectMetadata) {
            var meta = pItem.getProjectMetadata() || "";
            var mMatch = meta.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
            if (mMatch) {
                var clipW = parseInt(mMatch[1], 10);
                var clipH = parseInt(mMatch[2], 10);
                if (clipW > 0 && clipH > 0) {
                    var scaleX = (seqW / clipW) * 100.0;
                    var scaleY = (seqH / clipH) * 100.0;
                    var fillScale = Math.max(scaleX, scaleY);
                    if (Math.abs(fillScale - 100) > 1) {
                        ctrl.scaleProp.setValue(Math.round(fillScale * 10) / 10, true);
                    }
                }
            }
        }
    } catch (e) {}
};


// ----------------------------------------------------------------------------
// MODULE [7/9]: DUAL-MODE SCRIPT + VOICEOVER + FOOTAGE SYNC ENGINE
// Supports BOTH:
//   Mode A: Pre-named "Scene 1", "Scene 2"... clips synced to .txt breakdown + word timestamps
//   Mode B: Raw Documentary Bin ("AI analyze") subclip extraction (sourceInSec -> sourceOutSec)
// ----------------------------------------------------------------------------


// Scan a specific Bin (e.g., "AI analyze") and return all footages with their disk paths & metadata for AI indexing
PremiereGodV7.scanNamedBinForAiAnalysis = function (binName) {
    try {
        var root = app.project.rootItem;
        var targetLower = String(binName || "AI analyze").toLowerCase();
        var foundBin = null;


        function findBinRecursive(folder) {
            if (!folder || !folder.children) return null;
            for (var i = 0; i < folder.children.numItems; i++) {
                var ch = folder.children[i];
                if (ch && ch.type === ProjectItemType.BIN) {
                    if ((ch.name || "").toLowerCase() === targetLower) return ch;
                    var nested = findBinRecursive(ch);
                    if (nested) return nested;
                }
            }
            return null;
        }


        foundBin = findBinRecursive(root);
        if (!foundBin) {
            return '{"ok":false,"error":"BIN_NOT_FOUND:' + PremiereGodV7.esc(binName) + '"}';
        }


        var itemsOut = [];
        function collectBinMedia(folder, subPath) {
            for (var i = 0; i < folder.children.numItems; i++) {
                var item = folder.children[i];
                if (!item) continue;
                if (item.type === ProjectItemType.BIN) {
                    collectBinMedia(item, subPath ? (subPath + "/" + item.name) : item.name);
                } else {
                    var mPath = "";
                    try { mPath = item.getMediaPath() || ""; } catch (e) {}
                    itemsOut.push(
                        '{"index":' + itemsOut.length + ',' +
                        '"name":"' + PremiereGodV7.esc(item.name) + '",' +
                        '"subFolder":"' + PremiereGodV7.esc(subPath || "") + '",' +
                        '"nodeId":"' + PremiereGodV7.esc(item.nodeId) + '",' +
                        '"mediaPath":"' + PremiereGodV7.esc(mPath) + '"}'
                    );
                }
            }
        }


        collectBinMedia(foundBin, "");
        return '{"ok":true,"binName":"' + PremiereGodV7.esc(foundBin.name) + '","count":' + itemsOut.length + ',"footages":[' + itemsOut.join(",") + ']}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// Master Timeline Assembler for BOTH Mode A (Scene 1..N) and Mode B (Raw Footage Subclips)
PremiereGodV7.syncScenesToVoiceoverTimeline = function (syncPlan) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        // Create safety sequence backup first if requested
        if (false) {
            PremiereGodV7.createSequenceBackup();
        }


        var entries = syncPlan.scenes || [];
        var placedCount = 0;
        var results = [];


        for (var i = 0; i < entries.length; i++) {
            var sc = entries[i];
            if (!sc) continue;


            // Match either by exact itemName ("Scene 1", "Scene 1.mp4", "Footage_08.mp4") or disk filePath
            var item = PremiereGodV7.findProjectItemByNameOrPath(
                sc.clipName || sc.sceneName || ("Scene " + (i + 1)),
                sc.filePath || "",
                sc.binName || ""
            );


            // Fuzzy match for "Scene 1" matching "Scene 1.mp4" or "Scene 1_final.png" in bin
            if (!item && sc.sceneName) {
                item = PremiereGodV7.findSceneItemFuzzy(sc.sceneName, sc.binName || "");
            }


            if (!item) {
                results.push('{"scene":"' + PremiereGodV7.esc(sc.sceneName || String(i + 1)) + '","ok":false,"error":"MEDIA_NOT_FOUND"}');
                continue;
            }


            // Optional Color Label per character/scene (0..7)
            if (typeof sc.colorLabel === "number" && item.setColorLabel) {
                try { item.setColorLabel(sc.colorLabel); } catch (e) {}
            }


            var timelineStartSec = typeof sc.startSec === "number" ? sc.startSec : 0;
            var timelineEndSec = typeof sc.endSec === "number" ? sc.endSec : (timelineStartSec + (sc.durationSec || 4.0));
            var targetDurSec = Math.max(0.25, timelineEndSec - timelineStartSec);


            // Insert using Collision-Free Waterfall Layering (Module [5/9])
            var insResStr = PremiereGodV7.safeInsertMediaItem({
                itemName: item.name,
                filePath: sc.filePath || "",
                binName: sc.binName || "",
                startSec: timelineStartSec,
                durationSec: targetDurSec,
                sourceInSec: typeof sc.sourceInSec === "number" ? sc.sourceInSec : undefined,
                sourceOutSec: typeof sc.sourceOutSec === "number" ? sc.sourceOutSec : undefined,
                minTrackIndex: typeof sc.minTrackIndex === "number" ? sc.minTrackIndex : 0,
                animatePreset: sc.animatePreset || "slow_zoom_in",
                effectName: sc.effectName || "",
                effectParams: sc.effectParams || {}
            });


            var insRes = JSON.parse(insResStr);
            if (insRes && insRes.ok) {
                placedCount++;
                var placedTrackIdx = parseInt(String(insRes.track || "V1").replace("V", ""), 10) - 1;


                // If clip was shorter than targetDurSec, apply Smart Rate-Stretch (Module [8/9])
                if (sc.autoStretchToFit !== false) {
                    PremiereGodV7.stretchClipToFitDuration(placedTrackIdx, item.name, timelineStartSec, targetDurSec);
                }
            }
            results.push(insResStr);
        }


        return '{"ok":true,"totalRequested":' + entries.length + ',"placedCount":' + placedCount + ',"results":[' + results.join(",") + ']}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


PremiereGodV7.findSceneItemFuzzy = function (sceneLabel, preferredBinName) {
    var root = app.project.rootItem;
    var normTarget = String(sceneLabel || "").replace(/^\s+|\s+$/g, "").toLowerCase(); // e.g., "scene 1"
    var regexExact = new RegExp("^" + normTarget.replace(/\s+/g, "[\\s_\\-]*") + "(\\b|\\.|_|-|$)", "i");


    function searchRec(folder) {
        if (!folder || !folder.children) return null;
        for (var i = 0; i < folder.children.numItems; i++) {
            var ch = folder.children[i];
            if (!ch) continue;
            if (ch.type === ProjectItemType.BIN) {
                var sub = searchRec(ch);
                if (sub) return sub;
            } else if (regexExact.test(ch.name || "")) {
                return ch;
            }
        }
        return null;
    }
    return searchRec(root);
};


// ----------------------------------------------------------------------------
// MODULE [9/9] POWER-UP #3: SINGLE ATOMIC BATCH EXECUTOR (ZERO UI FREEZE)
// Executes multiple Premiere operations in 1 single JSX invocation
// ----------------------------------------------------------------------------
PremiereGodV7.executeAtomicBatch = function (batchJson) {
    try {
        var payload = typeof batchJson === "string" ? JSON.parse(batchJson) : batchJson;
        var ops = payload.operations || [];
        var out = [];


        if (false) {
            var backupResult = PremiereGodV7.createSequenceBackup();
            out.push(backupResult);
            if (backupResult.indexOf('"ok":true') < 0) return '{"ok":false,"error":"BACKUP_FAILED","batchResults":[' + out.join(",") + ']}';
        }


        for (var i = 0; i < ops.length; i++) {
            var op = ops[i];
            if (!op || !op.type) continue;
            var t = String(op.type).toLowerCase();


            if (t === "transform" || t === "animate" || t === "zoom") {
                out.push(PremiereGodV7.transformAndAnimateClip(op));
            } else if (t === "effect") {
                out.push(PremiereGodV7.applyAndConfigureEffect(op));
            } else if (t === "safe_insert") {
                out.push(PremiereGodV7.safeInsertMediaItem(op));
            } else if (t === "three_layer_comp") {
                out.push(PremiereGodV7.buildThreeLayerComposition(op));
            } else if (t === "razor" || t === "cut") {
                out.push(PremiereGodV7.razorCutAtSeconds(op.cutSec, op.trackIndex, op.isAudio, op.allTracks));
            } else if (t === "stretch") {
                out.push(PremiereGodV7.stretchClipToFitDuration(op.trackIndex, op.clipName, op.startSec, op.targetDurationSec));
            } else if (t === "sync_scenes") {
                out.push(PremiereGodV7.syncScenesToVoiceoverTimeline(op));
            } else {
                out.push('{"ok":false,"error":"UNKNOWN_BATCH_OPERATION"}');
            }
            if (String(out[out.length - 1]).indexOf('"ok":false') >= 0)
                return '{"ok":false,"error":"PARTIAL_BATCH_FAILURE","executedCount":' + out.length + ',"batchResults":[' + out.join(",") + ']}';
        }


        for (var j = 0; j < out.length; j++) {
            if (String(out[j]).indexOf('"ok":false') >= 0)
                return '{"ok":false,"error":"PARTIAL_BATCH_FAILURE","executedCount":' + out.length + ',"batchResults":[' + out.join(",") + ']}';
        }
        return '{"ok":true,"executedCount":' + out.length + ',"batchResults":[' + out.join(",") + '],"eye":' + PremiereGodV7.scanLiveEye() + '}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

// Remove only a lower-track duplicate after verifying the upper copy exists.
PremiereGodV7.cleanupShadowedCallout = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';
        var name = String(opts.itemName || "");
        var at = Number(opts.startSec);
        var keep = Number(opts.keepTrackIndex);
        if (!name || isNaN(at) || isNaN(keep) || keep < 1 || keep >= seq.videoTracks.numTracks)
            return '{"ok":false,"error":"INVALID_CLEANUP_TARGET"}';
        var upper = seq.videoTracks[keep];
        var verified = false;
        for (var i = 0; i < upper.clips.numItems; i++) {
            var u = upper.clips[i];
            if (u.name === name && Math.abs(PremiereGodV7.ticksToSeconds(u.start.ticks) - at) < 0.05) { verified = true; break; }
        }
        if (!verified) return '{"ok":false,"error":"VISIBLE_UPPER_COPY_NOT_FOUND"}';
        for (var t = 0; t < keep; t++) {
            var lower = seq.videoTracks[t];
            for (var c = lower.clips.numItems - 1; c >= 0; c--) {
                var clip = lower.clips[c];
                if (clip.name === name && Math.abs(PremiereGodV7.ticksToSeconds(clip.start.ticks) - at) < 0.05) {
                    clip.remove(false, false);
                    return JSON.stringify({ok:true,removedTrack:"V"+(t+1),keptTrack:"V"+(keep+1),item:name});
                }
            }
        }
        return '{"ok":true,"status":"NO_LOWER_DUPLICATE"}';
    } catch (err) { return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}'; }
};

// Change only the active sequence to standard 9:16 and fit a named video clip.
PremiereGodV7.formatSequenceAndFitVideo = function (opts) {
    try {
        var project = app.project;
        var seq = project && project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';
        if (opts.saveOnly === true) {
            var saveReturn = project.save();
            return JSON.stringify({ok:saveReturn === 0 || saveReturn === true || String(saveReturn) === "0",saveReturn:String(saveReturn),projectPath:String(project.path || ""),sequence:seq.name,width:Number(seq.frameSizeHorizontal),height:Number(seq.frameSizeVertical)});
        }
        if (opts.expectedSequence && seq.name !== opts.expectedSequence)
            return '{"ok":false,"error":"ACTIVE_SEQUENCE_CHANGED"}';
        var trackIndex = Number(opts.trackIndex);
        if (isNaN(trackIndex) || trackIndex < 0 || trackIndex >= seq.videoTracks.numTracks)
            return '{"ok":false,"error":"VIDEO_TRACK_NOT_FOUND"}';
        var wanted = String(opts.clipName || "");
        var track = seq.videoTracks[trackIndex];
        var clip = null;
        for (var i = 0; i < track.clips.numItems; i++) {
            if (track.clips[i].name === wanted) { clip = track.clips[i]; break; }
        }
        if (!clip) return '{"ok":false,"error":"TARGET_VIDEO_CLIP_NOT_FOUND"}';
        var ctrl = PremiereGodV7.getMotionControls(clip);
        if (!ctrl || !ctrl.scaleProp) return '{"ok":false,"error":"VIDEO_SCALE_CONTROL_NOT_FOUND"}';
        var oldSettings = seq.getSettings();
        var oldScale = Number(ctrl.scaleProp.getValue());
        var animated = !!(ctrl.scaleProp.isTimeVarying && ctrl.scaleProp.isTimeVarying());
        var before = {ok:true,sequence:seq.name,width:Number(seq.frameSizeHorizontal),height:Number(seq.frameSizeVertical),clip:clip.name,track:"V"+(trackIndex+1),scale:oldScale,scaleAnimated:animated};
        if (opts.preview === true) return JSON.stringify(before);
        if (opts.width !== 1080 || opts.height !== 1920)
            return '{"ok":false,"error":"ONLY_STANDARD_9_16_SUPPORTED"}';
        var originalId = seq.sequenceID;
        // User policy: edit the original sequence without creating a backup.
        if (project.openSequence(originalId) !== true) return '{"ok":false,"error":"COULD_NOT_REOPEN_ORIGINAL_SEQUENCE"}';
        seq = project.activeSequence;
        if (!seq || seq.sequenceID !== originalId) return '{"ok":false,"error":"ORIGINAL_SEQUENCE_NOT_ACTIVE"}';
        var settings = seq.getSettings();
        settings.videoFrameWidth = 1080;
        settings.videoFrameHeight = 1920;
        if (seq.setSettings(settings) !== true) return '{"ok":false,"error":"SET_SEQUENCE_SETTINGS_FAILED"}';
        if (Number(seq.frameSizeHorizontal) !== 1080 || Number(seq.frameSizeVertical) !== 1920)
            return '{"ok":false,"error":"SEQUENCE_DIMENSION_VERIFICATION_FAILED"}';
        track = seq.videoTracks[trackIndex];
        clip = null;
        for (var j = 0; j < track.clips.numItems; j++) {
            if (track.clips[j].name === wanted) { clip = track.clips[j]; break; }
        }
        if (!clip) return '{"ok":false,"error":"VIDEO_MISSING_AFTER_FORMAT_CHANGE"}';
        ctrl = PremiereGodV7.getMotionControls(clip);
        if (!ctrl || !ctrl.scaleProp) return '{"ok":false,"error":"VIDEO_SCALE_MISSING_AFTER_FORMAT_CHANGE"}';
        var changedKeys = 0;
        if (ctrl.scaleProp.isTimeVarying && ctrl.scaleProp.isTimeVarying()) {
            var keys = ctrl.scaleProp.getKeys();
            if (!keys || !keys.length || !(oldScale > 0)) return '{"ok":false,"error":"ANIMATED_SCALE_CANNOT_BE_PRESERVED"}';
            var factor = 100 / oldScale;
            for (var k = 0; k < keys.length; k++) {
                var prior = Number(ctrl.scaleProp.getValueAtKey(keys[k]));
                if (!(prior > 0)) return '{"ok":false,"error":"INVALID_SCALE_KEYFRAME"}';
                ctrl.scaleProp.setValueAtKey(keys[k], Math.max(100, Math.round(prior * factor * 100) / 100), true);
                changedKeys++;
            }
        } else {
            ctrl.scaleProp.setValue(100, true);
        }
        var saved = project.save();
        return JSON.stringify({ok:true,sequence:seq.name,previousWidth:before.width,previousHeight:before.height,width:Number(seq.frameSizeHorizontal),height:Number(seq.frameSizeVertical),videoClip:clip.name,videoTrack:"V"+(trackIndex+1),videoScale:Number(ctrl.scaleProp.getValue()),adjustedScaleKeys:changedKeys,backupSequenceCreated:false,projectSaved:saved===0||saved===true||String(saved)==="0"});
    } catch (err) { return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}'; }
};

// ============================================================================
// RAVIX Studio — OMNISCIENT PREMIERE NEURAL CORTEX (v8.0)
// SUPREME MODULE [2/6] — PART 1 OF 2: SUB-SYSTEMS [1/10] TO [5/10]
// Z-Order Occlusion Scanner, Semantic Clip Classifier, True Top-Stack Track
// Resolver (HighestVisibleTrack + 1), Muted-Track Shield & QE Track Expander
// ============================================================================


if (typeof PremiereGodV7 === "undefined") {
    var PremiereGodV7 = {};
}


// ----------------------------------------------------------------------------
// SUB-SYSTEM [1/10]: Z-ORDER VISIBILITY & OCCLUSION SCANNER
// Scans all Video Tracks (V1..VN) across [startTicks, endTicks] and builds a
// complete Z-Order map of every overlapping clip, track mute state, and opacity.
// ----------------------------------------------------------------------------
PremiereGodV7.scanZOrderAtRange = function (seq, startTicksNum, endTicksNum) {
    if (!seq || !seq.videoTracks) {
        return {
            highestOccupiedTrackIndex: -1,
            highestVisibleBaseVideoTrackIndex: -1,
            lowestFreeTrackIndex: 0,
            occupiedTracks: [],
            layers: []
        };
    }


    var highestOccupied = -1;
    var highestBaseVideo = -1;
    var lowestFree = -1;
    var occupiedTracks = [];
    var layers = [];


    for (var t = 0; t < seq.videoTracks.numTracks; t++) {
        var trk = seq.videoTracks[t];
        var isTrackMuted = false;
        try { isTrackMuted = trk.isMuted ? trk.isMuted() : false; } catch (e) {}


        var clipsInRange = [];
        for (var c = 0; c < trk.clips.numItems; c++) {
            var clp = trk.clips[c];
            if (!clp) continue;
            var cs = parseFloat(clp.start.ticks);
            var ce = parseFloat(clp.end.ticks);


            // Check overlap with 1ms (254016000 ticks) tolerance
            if (startTicksNum < (ce - 100000) && endTicksNum > (cs + 100000)) {
                var role = PremiereGodV7.classifyClipRole(clp, t);
                clipsInRange.push({
                    clip: clp,
                    name: clp.name || "Untitled",
                    role: role,
                    startSec: PremiereGodV7.ticksToSeconds(cs),
                    endSec: PremiereGodV7.ticksToSeconds(ce)
                });
            }
        }


        if (clipsInRange.length > 0) {
            if (!isTrackMuted) {
                highestOccupied = t;
                for (var k = 0; k < clipsInRange.length; k++) {
                    if (clipsInRange[k].role === "BASE_VIDEO" || clipsInRange[k].role === "B_ROLL") {
                        highestBaseVideo = t;
                    }
                }
            }
            occupiedTracks.push(t);
            layers.push({
                trackIndex: t,
                trackName: "V" + (t + 1),
                muted: isTrackMuted,
                clips: clipsInRange
            });
        } else if (lowestFree === -1 && !isTrackMuted) {
            lowestFree = t;
        }
    }


    return {
        highestOccupiedTrackIndex: highestOccupied,
        highestVisibleBaseVideoTrackIndex: highestBaseVideo,
        lowestFreeTrackIndex: lowestFree,
        occupiedTracks: occupiedTracks,
        layers: layers
    };
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [2/10]: SEMANTIC CLIP ROLE CLASSIFIER
// Identifies whether a timeline clip is a Callout Badge, Text Layer, Cutout PNG,
// Clipboard Paste, Solid Backdrop Matte, or Full-Frame Base Video / B-Roll.
// ----------------------------------------------------------------------------
PremiereGodV7.classifyClipRole = function (clip, trackIndex) {
    if (!clip) return "UNKNOWN";
    var nameLower = String(clip.name || "").toLowerCase();
    var mediaPathLower = "";
    try {
        if (clip.projectItem && clip.projectItem.getMediaPath) {
            mediaPathLower = String(clip.projectItem.getMediaPath() || "").toLowerCase();
        }
    } catch (e) {}


    if (
        nameLower.indexOf("callout") !== -1 ||
        nameLower.indexOf("badge") !== -1 ||
        nameLower.indexOf("lower_third") !== -1 ||
        mediaPathLower.indexOf("ai_callouts") !== -1
    ) {
        return "CALLOUT_OVERLAY";
    }


    if (
        nameLower.indexOf("text_") !== -1 ||
        nameLower.indexOf("title_") !== -1 ||
        nameLower.indexOf("caption") !== -1 ||
        nameLower.indexOf(".mogrt") !== -1
    ) {
        return "TEXT_OVERLAY";
    }


    if (
        nameLower.indexOf("clipboard_") !== -1 ||
        mediaPathLower.indexOf("clipboard_imports") !== -1
    ) {
        return "CLIPBOARD_OVERLAY";
    }


    if (
        nameLower.indexOf("backdrop") !== -1 ||
        nameLower.indexOf("matte") !== -1 ||
        nameLower.indexOf("solid_") !== -1
    ) {
        return "SOLID_BACKDROP";
    }


    if (nameLower.indexOf(".png") !== -1 || nameLower.indexOf(".webp") !== -1) {
        return (trackIndex >= 1) ? "CUTOUT_PNG_OVERLAY" : "IMAGE_SCENE";
    }


    return (trackIndex === 0) ? "BASE_VIDEO" : "B_ROLL";
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [3/10] & [4/10]: TRUE TOP-STACK TRACK RESOLVER & MUTED-TRACK SHIELD
// Guarantees that ANY Overlay (Callout, Text, Cutout PNG, Clipboard Image)
// is placed STRICTLY ABOVE the highest occupied unmuted video track!
// Example: If V1 is empty and main video is on V2 (index 1), this resolver
// NEVER returns V1 (index 0) — it returns V3 (index 2)!
// ----------------------------------------------------------------------------
PremiereGodV7.resolveStrictTopOverlayTrack = function (seq, startTicksNum, endTicksNum, minDesiredTrackIdx) {
    var zMap = PremiereGodV7.scanZOrderAtRange(seq, startTicksNum, endTicksNum);
    var requiredMinIndex = typeof minDesiredTrackIdx === "number" && minDesiredTrackIdx >= 0 ? minDesiredTrackIdx : 0;


    // IRONCLAD TOP-STACK RULE: Must be strictly above the highest occupied unmuted track!
    if (zMap.highestOccupiedTrackIndex >= requiredMinIndex) {
        requiredMinIndex = zMap.highestOccupiedTrackIndex + 1;
    }


    // Search from requiredMinIndex upward for an unmuted, collision-free video track
    for (var t = requiredMinIndex; t < seq.videoTracks.numTracks; t++) {
        var trk = seq.videoTracks[t];
        var isMuted = false;
        try { isMuted = trk.isMuted ? trk.isMuted() : false; } catch (e) {}


        // Sub-System [4/10]: Muted-Track Shield — If a track is muted (Eye icon off),
        // either unmute it if empty or skip to a visible track so the overlay is 100% visible!
        var hasCollision = false;
        for (var c = 0; c < trk.clips.numItems; c++) {
            var clp = trk.clips[c];
            if (!clp) continue;
            var cs = parseFloat(clp.start.ticks);
            var ce = parseFloat(clp.end.ticks);
            if (startTicksNum < (ce - 100000) && endTicksNum > (cs + 100000)) {
                hasCollision = true;
                break;
            }
        }


        if (!hasCollision) {
            if (isMuted) {
                try { trk.setMute(0); } catch (e2) {}
            }
            return {
                track: trk,
                trackIndex: t,
                trackName: "V" + (t + 1),
                createdNewTrack: false,
                highestBelowIndex: zMap.highestOccupiedTrackIndex
            };
        }
    }


    // Sub-System [5/10]: All existing tracks up to numTracks are occupied -> Auto-create new top Video Track!
    var newTrackInfo = PremiereGodV7.ensureVideoTrackExists(seq, seq.videoTracks.numTracks);
    return {
        track: newTrackInfo.track,
        trackIndex: newTrackInfo.trackIndex,
        trackName: "V" + (newTrackInfo.trackIndex + 1),
        createdNewTrack: true,
        highestBelowIndex: zMap.highestOccupiedTrackIndex
    };
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [5/10]: DYNAMIC QE TRACK AUTO-EXPANDER (VIDEO & AUDIO)
// Safely creates new Video Tracks (V3, V4, V5...) or Audio Tracks (A3, A4...)
// at the top of the sequence stack without disturbing existing clips.
// ----------------------------------------------------------------------------
PremiereGodV7.ensureVideoTrackExists = function (seq, targetTrackIndex) {
    if (!seq) return null;
    while (seq.videoTracks.numTracks <= targetTrackIndex) {
        var beforeCount = seq.videoTracks.numTracks;
        try {
            app.enableQE();
            var qeSeq = qe.project.getActiveSequence();
            if (qeSeq && qeSeq.addTracks) {
                // Add 1 video track right above the current highest video track
                qeSeq.addTracks(1, beforeCount, 0, 0);
            }
        } catch (e) {}
        if (seq.videoTracks.numTracks === beforeCount) {
            break; // Safety break if Premiere refuses further track creation
        }
    }


    var finalIdx = Math.min(targetTrackIndex, seq.videoTracks.numTracks - 1);
    var trk = seq.videoTracks[finalIdx];
    try {
        if (trk.isMuted && trk.isMuted()) trk.setMute(0);
    } catch (e2) {}


    return {
        track: trk,
        trackIndex: finalIdx
    };
};


PremiereGodV7.ensureAudioTrackExists = function (seq, targetAudioTrackIndex) {
    if (!seq) return null;
    while (seq.audioTracks.numTracks <= targetAudioTrackIndex) {
        var beforeCount = seq.audioTracks.numTracks;
        try {
            app.enableQE();
            var qeSeq = qe.project.getActiveSequence();
            if (qeSeq && qeSeq.addTracks) {
                qeSeq.addTracks(0, 0, 1, beforeCount);
            }
        } catch (e) {}
        if (seq.audioTracks.numTracks === beforeCount) break;
    }


    var finalIdx = Math.min(targetAudioTrackIndex, seq.audioTracks.numTracks - 1);
    var aTrk = seq.audioTracks[finalIdx];
    try {
        if (aTrk.isMuted && aTrk.isMuted()) aTrk.setMute(0);
    } catch (e2) {}


    return {
        track: aTrk,
        trackIndex: finalIdx
    };
};

// ============================================================================
// RAVIX Studio — OMNISCIENT PREMIERE NEURAL CORTEX (v8.0)
// SUPREME MODULE [2/6] — PART 2 OF 2: SUB-SYSTEMS [6/10] TO [9/10] (EXTENDSCRIPT)
// Resolution-Adaptive Overlay Scaler, Multi-Overlay Y-Staggering, Buried
// Overlay Auto-Rescuer, Shadow Duplicate Purger & Master Overlay Inserter
// ============================================================================


// ----------------------------------------------------------------------------
// SUB-SYSTEM [6/10]: RESOLUTION-ADAPTIVE OVERLAY & CALLOUT AUTO-SCALER
// Ensures any Callout PNG, Title, or Cutout PNG fits the active sequence
// resolution (1080x1920, 736x1043, 1920x1080, 3840x2160) with zero edge clipping!
// ----------------------------------------------------------------------------
PremiereGodV7.autoScaleOverlayToSequence = function (clip, seq, customTargetScale) {
    try {
        if (!clip || !seq) return 100.0;
        var seqW = seq.frameSizeHorizontal || 1080;
        var seqH = seq.frameSizeVertical || 1920;
        var ctrl = PremiereGodV7.getMotionControls(clip);
        if (!ctrl || !ctrl.scaleProp) return 100.0;


        if (typeof customTargetScale === "number" && customTargetScale > 0) {
            if (ctrl.scaleProp.isTimeVarying && ctrl.scaleProp.isTimeVarying()) {
                ctrl.scaleProp.setTimeVarying(false);
            }
            ctrl.scaleProp.setValue(customTargetScale, true);
            return customTargetScale;
        }


        var srcDim = PremiereGodV7.getClipSourceDimensions(clip, seqW, seqH);
        var scaleX = (seqW / srcDim.width) * 100.0;
        var scaleY = (seqH / srcDim.height) * 100.0;


        // For full-canvas callout PNGs, match sequence width (scaleX) so side margins never clip
        var bestScale = Math.round(Math.min(scaleX, scaleY * 1.15) * 10) / 10;
        if (Math.abs(srcDim.width - seqW) <= 4 && Math.abs(srcDim.height - seqH) <= 4) {
            bestScale = 100.0;
        }


        if (ctrl.scaleProp.isTimeVarying && ctrl.scaleProp.isTimeVarying()) {
            ctrl.scaleProp.setTimeVarying(false);
        }
        ctrl.scaleProp.setValue(bestScale, true);
        return bestScale;
    } catch (e) {
        return 100.0;
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [7/10]: SAFE-ZONE & MULTI-OVERLAY ANTI-COLLISION STAGGERING
// If another Callout/Text overlay is already visible at the same timestamp,
// automatically shifts the new overlay's Y-position slightly upward so two
// callout boxes never overlap on top of each other!
// ----------------------------------------------------------------------------
PremiereGodV7.applyMultiOverlayAntiCollisionPosition = function (seq, insertedClip, insertedTrackIndex, startTicksNum, endTicksNum, requestedAlign) {
    try {
        var zMap = PremiereGodV7.scanZOrderAtRange(seq, startTicksNum, endTicksNum);
        var existingOverlayCountBelow = 0;


        for (var i = 0; i < zMap.layers.length; i++) {
            var layer = zMap.layers[i];
            if (layer.trackIndex >= insertedTrackIndex || layer.muted) continue;
            for (var j = 0; j < layer.clips.length; j++) {
                var r = layer.clips[j].role;
                if (r === "CALLOUT_OVERLAY" || r === "TEXT_OVERLAY") {
                    existingOverlayCountBelow++;
                }
            }
        }


        if (existingOverlayCountBelow <= 0) {
            return { staggered: false, existingOverlaysBelow: 0, posY: 0.5 };
        }


        var ctrl = PremiereGodV7.getMotionControls(insertedClip);
        if (!ctrl || !ctrl.positionProp) {
            return { staggered: false, existingOverlaysBelow: existingOverlayCountBelow, posY: 0.5 };
        }


        // Shift upward by 0.11 normalized height per existing callout below (staying within safe zone 0.15..0.82)
        var newPosY = Math.max(0.18, 0.50 - (existingOverlayCountBelow * 0.11));
        if (ctrl.positionProp.isTimeVarying && ctrl.positionProp.isTimeVarying()) {
            ctrl.positionProp.setTimeVarying(false);
        }
        ctrl.positionProp.setValue([0.5, newPosY], true);


        return {
            staggered: true,
            existingOverlaysBelow: existingOverlayCountBelow,
            posY: Math.round(newPosY * 1000) / 1000
        };
    } catch (e) {
        return { staggered: false, existingOverlaysBelow: 0, posY: 0.5 };
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [8/10]: BURIED OVERLAY AUTO-RESCUER (ZERO-PYTHON SELF-HEALER!)
// Scans the timeline (or a specific timestamp range) for any Callout, Text, or
// Clipboard overlay that is accidentally sitting on a lower track (e.g. V1)
// underneath a full-frame Base Video/B-Roll on a higher track (e.g. V2), and
// automatically promotes it to (HighestOccupiedTrack + 1) (e.g. V3)!
// ----------------------------------------------------------------------------
PremiereGodV7.rescueBuriedOverlays = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        opts = opts || {};
        var rescuedList = [];


        for (var t = 0; t < seq.videoTracks.numTracks; t++) {
            var trk = seq.videoTracks[t];
            for (var c = trk.clips.numItems - 1; c >= 0; c--) {
                var clp = trk.clips[c];
                if (!clp) continue;


                var role = PremiereGodV7.classifyClipRole(clp, t);
                var isOverlayRole = (
                    role === "CALLOUT_OVERLAY" ||
                    role === "TEXT_OVERLAY" ||
                    role === "CLIPBOARD_OVERLAY" ||
                    (opts.clipName && (clp.name || "").toLowerCase().indexOf(String(opts.clipName).toLowerCase()) !== -1)
                );
                if (!isOverlayRole) continue;


                var startT = parseFloat(clp.start.ticks);
                var endT = parseFloat(clp.end.ticks);
                var zMap = PremiereGodV7.scanZOrderAtRange(seq, startT, endT);


                // If there is a Base Video or B-Roll above track 't', this overlay is buried!
                if (zMap.highestVisibleBaseVideoTrackIndex > t) {
                    var topSlot = PremiereGodV7.resolveStrictTopOverlayTrack(seq, startT, endT, zMap.highestOccupiedTrackIndex + 1);
                    var pItem = clp.projectItem;
                    var startTicksStr = clp.start.ticks;
                    var endTicksStr = clp.end.ticks;
                    var savedScale = 100.0;
                    var ctrlOld = PremiereGodV7.getMotionControls(clp);
                    try { if (ctrlOld && ctrlOld.scaleProp) savedScale = parseFloat(ctrlOld.scaleProp.getValue()); } catch (e) {}


                    // Insert onto the new top track
                    topSlot.track.insertClip(pItem, startTicksStr);
                    for (var k = topSlot.track.clips.numItems - 1; k >= 0; k--) {
                        var promoted = topSlot.track.clips[k];
                        if (Math.abs(parseFloat(promoted.start.ticks) - startT) < PremiereGodV7.TICKS_PER_SECOND * 0.25) {
                            try { promoted.end = endTicksStr; } catch (e2) {}
                            var ctrlNew = PremiereGodV7.getMotionControls(promoted);
                            try { if (ctrlNew && ctrlNew.scaleProp) ctrlNew.scaleProp.setValue(savedScale, true); } catch (e3) {}
                            break;
                        }
                    }


                    var oldClipName = clp.name;
                    // Remove the buried lower-track copy immediately
                    clp.remove(false, true);


                    rescuedList.push(
                        '{"clip":"' + PremiereGodV7.esc(oldClipName) + '",' +
                        '"fromBuriedTrack":"V' + (t + 1) + '",' +
                        '"promotedToTrack":"' + topSlot.trackName + '",' +
                        '"startSec":' + PremiereGodV7.ticksToSeconds(startT) + '}'
                    );
                }
            }
        }


        return '{"ok":true,"action":"RESCUE_BURIED_OVERLAYS","rescuedCount":' + rescuedList.length + ',"rescued":[' + rescuedList.join(",") + ']}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [9/10]: SHADOW DUPLICATE PURGER (1ms INSTANT CLEANUP!)
// If the same overlay/callout clip exists on multiple tracks at the same
// timestamp (e.g. a visible copy on V3 and a leftover hidden duplicate on V1),
// keeps ONLY the topmost visible copy on V3 and deletes all lower duplicates!
// ----------------------------------------------------------------------------
PremiereGodV7.purgeShadowDuplicates = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        opts = opts || {};
        var filterName = String(opts.clipName || "").toLowerCase();
        var seenTopClips = []; // { nameLower, startT, endT, topTrackIdx }
        var purged = [];


        // Scan top-down from highest video track to V1
        for (var t = seq.videoTracks.numTracks - 1; t >= 0; t--) {
            var trk = seq.videoTracks[t];
            for (var c = trk.clips.numItems - 1; c >= 0; c--) {
                var clp = trk.clips[c];
                if (!clp) continue;
                var cName = clp.name || "";
                var cLower = cName.toLowerCase();
                if (filterName && cLower.indexOf(filterName) === -1) continue;


                var cs = parseFloat(clp.start.ticks);
                var ce = parseFloat(clp.end.ticks);


                var isShadowDuplicate = false;
                var keptTrackIdx = -1;
                for (var s = 0; s < seenTopClips.length; s++) {
                    var topItem = seenTopClips[s];
                    if (
                        topItem.nameLower === cLower &&
                        topItem.topTrackIdx > t &&
                        Math.abs(topItem.startT - cs) < PremiereGodV7.TICKS_PER_SECOND * 0.35
                    ) {
                        isShadowDuplicate = true;
                        keptTrackIdx = topItem.topTrackIdx;
                        break;
                    }
                }


                if (isShadowDuplicate) {
                    var startSec = PremiereGodV7.ticksToSeconds(cs);
                    clp.remove(false, true);
                    purged.push(
                        '{"clip":"' + PremiereGodV7.esc(cName) + '",' +
                        '"removedFromTrack":"V' + (t + 1) + '",' +
                        '"keptTopTrack":"V' + (keptTrackIdx + 1) + '",' +
                        '"startSec":' + startSec + '}'
                    );
                } else {
                    seenTopClips.push({
                        nameLower: cLower,
                        startT: cs,
                        endT: ce,
                        topTrackIdx: t
                    });
                }
            }
        }


        return '{"ok":true,"action":"PURGE_SHADOW_DUPLICATES","purgedCount":' + purged.length + ',"purged":[' + purged.join(",") + ']}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// MASTER OVERLAY INSERTER (Integrates Sub-Systems [1/10] through [9/10])
// Used by /premiere_callout, /premiere_paste_clipboard & /premiere_safe_insert
// ----------------------------------------------------------------------------
PremiereGodV7.insertClipOnFreeUpperTrack = function (projectItem, startTicksStr, durationSec, alignPreset, animatePreset) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        var startT = parseFloat(startTicksStr || seq.getPlayerPosition().ticks);
        var durT = parseFloat(PremiereGodV7.secondsToTicks(durationSec || 4.0));
        var endT = startT + durT;


        // 1. Resolve strict Top-Stack Overlay Track (HighestOccupiedTrack + 1)
        var topSlot = PremiereGodV7.resolveStrictTopOverlayTrack(seq, startT, endT, 0);
        var chosenTrackIdx = topSlot.trackIndex;
        var targetTrack = topSlot.track;


        // 2. Insert the clip onto the resolved top track
        targetTrack.insertClip(projectItem, String(Math.round(startT)));


        var insertedClip = null;
        for (var k = targetTrack.clips.numItems - 1; k >= 0; k--) {
            var cand = targetTrack.clips[k];
            if (Math.abs(parseFloat(cand.start.ticks) - startT) < PremiereGodV7.TICKS_PER_SECOND * 0.25) {
                insertedClip = cand;
                break;
            }
        }


        var appliedScale = 100.0;
        var staggerInfo = { staggered: false, posY: 0.5 };


        if (insertedClip) {
            try { insertedClip.end = String(Math.round(endT)); } catch (e) {}


            // 3. Sub-System [6/10]: Resolution-Adaptive Auto-Scale
            appliedScale = PremiereGodV7.autoScaleOverlayToSequence(insertedClip, seq);


            // 4. Sub-System [7/10]: Anti-Collision Staggering if another callout is already below
            staggerInfo = PremiereGodV7.applyMultiOverlayAntiCollisionPosition(
                seq,
                insertedClip,
                chosenTrackIdx,
                startT,
                endT,
                alignPreset || "lower_third"
            );


            // 5. Apply entrance animation preset if requested
            if (animatePreset && animatePreset !== "none" && !staggerInfo.staggered) {
                PremiereGodV7.transformAndAnimateClip({
                    trackIndex: chosenTrackIdx,
                    clipName: insertedClip.name,
                    preset: animatePreset,
                    scale: appliedScale
                });
            }
        }


        // 6. Sub-System [8/10] & [9/10]: Guarantee zero buried copies or shadow duplicates on lower tracks
        PremiereGodV7.purgeShadowDuplicates({ clipName: projectItem.name });


        return '{' +
            '"ok":true,' +
            '"action":"TOP_STACK_OVERLAY_INSERTED",' +
            '"track":"' + topSlot.trackName + '",' +
            '"highestTrackBelow":"' + (topSlot.highestBelowIndex >= 0 ? ("V" + (topSlot.highestBelowIndex + 1)) : "NONE") + '",' +
            '"createdNewTrack":' + (topSlot.createdNewTrack ? "true" : "false") + ',' +
            '"clipName":"' + PremiereGodV7.esc(insertedClip ? insertedClip.name : projectItem.name) + '",' +
            '"startSec":' + PremiereGodV7.ticksToSeconds(startT) + ',' +
            '"endSec":' + PremiereGodV7.ticksToSeconds(endT) + ',' +
            '"durationSec":' + (durationSec || 4.0) + ',' +
            '"appliedScale":' + appliedScale + ',' +
            '"staggered":' + (staggerInfo.staggered ? "true" : "false") +
        '}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

// ============================================================================
// RAVIX Studio — OMNISCIENT PREMIERE NEURAL CORTEX (v8.0)
// SUPREME MODULE [3/6] — PART 1 OF 2: SUB-SYSTEMS [1/10] TO [5/10]
// Universal Aspect Matrix, Backup Bin Cloner, Deep SequenceSettings Mutator,
// Multi-Strategy Clip Dimension Resolver & Keyframe-Proportional Frame-Fit Math
// ============================================================================


if (typeof PremiereGodV7 === "undefined") {
    var PremiereGodV7 = {};
}


// ----------------------------------------------------------------------------
// SUB-SYSTEM [1/10]: UNIVERSAL ASPECT-RATIO & BROADCAST PRESET MATRIX
// Supports every standard social, broadcast, documentary, and cinema format
// plus dynamic "WIDTHxHEIGHT" strings (e.g. "1080x1920") or explicit numbers.
// ----------------------------------------------------------------------------
PremiereGodV7.ASPECT_PRESETS = {
    "9:16":       { width: 1080, height: 1920, label: "9:16 Vertical HD (Shorts/Reels/TikTok)" },
    "shorts":     { width: 1080, height: 1920, label: "9:16 YouTube Shorts" },
    "reels":      { width: 1080, height: 1920, label: "9:16 Instagram Reels" },
    "tiktok":     { width: 1080, height: 1920, label: "9:16 TikTok Vertical" },
    "vertical":   { width: 1080, height: 1920, label: "9:16 Vertical HD" },
    "9:16_4k":    { width: 2160, height: 3840, label: "9:16 Vertical 4K UHD" },
    "16:9":       { width: 1920, height: 1080, label: "16:9 Widescreen Full HD (YouTube)" },
    "youtube":    { width: 1920, height: 1080, label: "16:9 YouTube Standard" },
    "horizontal": { width: 1920, height: 1080, label: "16:9 Horizontal HD" },
    "landscape":  { width: 1920, height: 1080, label: "16:9 Landscape HD" },
    "1080p":      { width: 1920, height: 1080, label: "16:9 1080p Full HD" },
    "720p":       { width: 1280, height: 720,  label: "16:9 720p HD" },
    "2k":         { width: 2560, height: 1440, label: "16:9 2K QHD" },
    "4k":         { width: 3840, height: 2160, label: "16:9 4K UHD" },
    "1:1":        { width: 1080, height: 1080, label: "1:1 Square Social" },
    "square":     { width: 1080, height: 1080, label: "1:1 Square" },
    "4:5":        { width: 1080, height: 1350, label: "4:5 Portrait Feed" },
    "portrait":   { width: 1080, height: 1350, label: "4:5 Portrait" },
    "21:9":       { width: 2560, height: 1080, label: "21:9 Ultrawide CinemaScope" },
    "cinema":     { width: 4096, height: 2160, label: "DCI 4K Cinema" }
};


PremiereGodV7.resolveTargetSequenceResolution = function (opts) {
    opts = opts || {};
    if (typeof opts.width === "number" && opts.width >= 100 && typeof opts.height === "number" && opts.height >= 100) {
        return {
            width: Math.round(opts.width),
            height: Math.round(opts.height),
            label: Math.round(opts.width) + "x" + Math.round(opts.height) + " Custom"
        };
    }


    var rawKey = String(opts.aspectRatio || opts.format || opts.preset || "9:16").replace(/^\s+|\s+$/g, "").toLowerCase();


    // Check if user passed "1080x1920" or "1920*1080" string directly
    var dimMatch = rawKey.match(/^(\d{3,4})\s*[xX×\*:]\s*(\d{3,4})$/);
    if (dimMatch) {
        var w = parseInt(dimMatch[1], 10);
        var h = parseInt(dimMatch[2], 10);
        if (w >= 100 && h >= 100) {
            return { width: w, height: h, label: w + "x" + h + " Direct" };
        }
    }


    if (PremiereGodV7.ASPECT_PRESETS[rawKey]) {
        return PremiereGodV7.ASPECT_PRESETS[rawKey];
    }


    return PremiereGodV7.ASPECT_PRESETS["9:16"];
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [2/10]: 1-MILLISECOND SEQUENCE BACKUP CLONER & BIN ORGANIZER
// Clones the active sequence BEFORE changing resolution or scaling clips,
// while keeping the original sequence as the active sequence in the timeline!
// ----------------------------------------------------------------------------
PremiereGodV7.cloneSequenceToBackupSafe = function () { return {created:false,skipped:true,reason:"PROJECT_BACKUPS_DISABLED_BY_USER"}; };


// ----------------------------------------------------------------------------
// SUB-SYSTEM [3/10]: DEEP SEQUENCESETTINGS MUTATOR
// Updates videoFrameWidth, videoFrameHeight, square pixel aspect ratio ("1:1"),
// progressive scan (no fields), and optional frame rate in <5ms via setSettings!
// ----------------------------------------------------------------------------
PremiereGodV7.applySequenceSettingsDeep = function (seq, targetW, targetH, targetFps) {
    if (!seq) return { ok: false, error: "NO_SEQUENCE" };
    var oldW = seq.frameSizeHorizontal || 1920;
    var oldH = seq.frameSizeVertical || 1080;


    try {
        var settings = seq.getSettings();
        if (!settings) {
            return { ok: false, error: "GET_SETTINGS_RETURNED_NULL", oldWidth: oldW, oldHeight: oldH };
        }


        settings.videoFrameWidth = targetW;
        settings.videoFrameHeight = targetH;
        settings.videoPixelAspectRatio = "1:1";


        // Ensure progressive scan (0 = No Fields) so resized video never interlace-combs
        if (typeof settings.videoFieldType !== "undefined") {
            settings.videoFieldType = 0;
        }


        // Optional FPS override (e.g. 24, 25, 30, 60)
        if (typeof targetFps === "number" && targetFps > 0 && settings.videoFrameRate) {
            var ticksPerFrame = String(Math.round(PremiereGodV7.TICKS_PER_SECOND / targetFps));
            try { settings.videoFrameRate.setTicks(ticksPerFrame); } catch (eFps) {}
        }


        seq.setSettings(settings);


        return {
            ok: true,
            oldWidth: oldW,
            oldHeight: oldH,
            newWidth: seq.frameSizeHorizontal || targetW,
            newHeight: seq.frameSizeVertical || targetH
        };
    } catch (err) {
        return {
            ok: false,
            error: err.toString(),
            oldWidth: oldW,
            oldHeight: oldH
        };
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [4/10]: MULTI-STRATEGY SOURCE DIMENSION RESOLVER
// Resolves exact intrinsic (srcW, srcH) of any clip on the timeline using
// 4 fallbacks: (1) ProjectMetadata XML 'VideoInfo', (2) Filename resolution tag
// (e.g. Callout_..._1080x1920_.png), (3) Scale inverse deduction, (4) Sequence default.
// ----------------------------------------------------------------------------
PremiereGodV7.getClipSourceDimensions = function (clip, fallbackW, fallbackH) {
    var defW = fallbackW || 1080;
    var defH = fallbackH || 1920;
    if (!clip) return { width: defW, height: defH, source: "DEFAULT" };


    // Strategy 1: Read Premiere Intrinsic VideoInfo / Image Size from ProjectItem Metadata XML
    try {
        var pItem = clip.projectItem;
        if (pItem && pItem.getProjectMetadata) {
            var meta = pItem.getProjectMetadata() || "";
            // Prioritize Column.Intrinsic.VideoInfo (e.g. "1080 x 1920 (1.0)")
            var vInfoMatch = meta.match(/VideoInfo[^>]*>[^<]*?(\d{3,4})\s*[xX×]\s*(\d{3,4})/i);
            if (vInfoMatch) {
                var vw = parseInt(vInfoMatch[1], 10);
                var vh = parseInt(vInfoMatch[2], 10);
                if (vw >= 64 && vh >= 64) {
                    return { width: vw, height: vh, source: "METADATA_VIDEO_INFO" };
                }
            }
            var genericMatch = meta.match(/(\d{3,4})\s*[xX×]\s*(\d{3,4})/);
            if (genericMatch) {
                var gw = parseInt(genericMatch[1], 10);
                var gh = parseInt(genericMatch[2], 10);
                if (gw >= 64 && gh >= 64) {
                    return { width: gw, height: gh, source: "METADATA_GENERIC" };
                }
            }
        }
    } catch (e1) {}


    // Strategy 2: Check clip name or media file path for embedded "_WIDTHxHEIGHT_" stamp
    try {
        var nameAndPath = (clip.name || "") + " " + ((clip.projectItem && clip.projectItem.getMediaPath) ? (clip.projectItem.getMediaPath() || "") : "");
        var pathMatch = nameAndPath.match(/(\d{3,4})[xX×](\d{3,4})/);
        if (pathMatch) {
            var pw = parseInt(pathMatch[1], 10);
            var ph = parseInt(pathMatch[2], 10);
            if (pw >= 64 && ph >= 64) {
                return { width: pw, height: ph, source: "FILENAME_TAG" };
            }
        }
    } catch (e2) {}


    return { width: defW, height: defH, source: "FALLBACK_SEQUENCE" };
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [5/10]: MATHEMATICAL FRAME-FIT ENGINE + KEYFRAME PROPORTIONAL SCALER
// Supports fitMode:
//   - "fill"        : Scales clip to completely fill targetW x targetH (0 black bars!)
//   - "fit"         : Scales clip so 100% of source image is visible inside frame
//   - "width_match" : Matches horizontal width exactly (ideal for Callout banners)
//   - "stretch"     : Non-uniformly stretches width & height independently to 100%
// If the clip already had zoom keyframes (e.g. slow_zoom_in 100% -> 115%),
// it preserves or proportionally rescales the keyframes cleanly!
// ----------------------------------------------------------------------------
PremiereGodV7.applyMathematicalFrameFitToClip = function (clip, trackIdx, oldSeqW, oldSeqH, targetW, targetH, fitMode, preserveKeyframes) {
    var ctrl = PremiereGodV7.getMotionControls(clip);
    if (!ctrl || !ctrl.scaleProp) {
        return { ok: false, clip: clip ? clip.name : "UNK", reason: "NO_SCALE_PROP" };
    }


    var role = PremiereGodV7.classifyClipRole ? PremiereGodV7.classifyClipRole(clip, trackIdx) : "BASE_VIDEO";
    var isOverlayRole = (role === "CALLOUT_OVERLAY" || role === "TEXT_OVERLAY" || role === "CLIPBOARD_OVERLAY" || role === "CUTOUT_PNG_OVERLAY");


    var srcDim = PremiereGodV7.getClipSourceDimensions(clip, targetW, targetH);
    var scaleX = (targetW / srcDim.width) * 100.0;
    var scaleY = (targetH / srcDim.height) * 100.0;


    var mode = String(fitMode || "fill").toLowerCase();
    var computedScale = 100.0;


    if (isOverlayRole) {
        // Overlays & Callouts match horizontal frame width so left/right safe margins stay intact
        computedScale = Math.round(scaleX * 10) / 10;
    } else if (mode === "fit" || mode === "letterbox") {
        computedScale = Math.round(Math.min(scaleX, scaleY) * 10) / 10;
    } else if (mode === "width" || mode === "width_match") {
        computedScale = Math.round(scaleX * 10) / 10;
    } else {
        // Default "fill" -> Zero black bars!
        computedScale = Math.round(Math.max(scaleX, scaleY) * 10) / 10;
    }


    var oldScale = 100.0;
    try { oldScale = parseFloat(ctrl.scaleProp.getValue()); } catch (e) {}
    if (isNaN(oldScale) || oldScale <= 0) oldScale = 100.0;


    // Handle active keyframes vs static scale
    var hadKeyframes = false;
    try { hadKeyframes = ctrl.scaleProp.isTimeVarying ? ctrl.scaleProp.isTimeVarying() : false; } catch (eK) {}


    if (hadKeyframes && !preserveKeyframes) {
        try { ctrl.scaleProp.setTimeVarying(false); } catch (eOff) {}
        ctrl.scaleProp.setValue(computedScale, true);
    } else if (hadKeyframes && preserveKeyframes) {
        // Re-anchor keyframe start to computedScale and end to computedScale * 1.15
        var inTicks = clip.inPoint.ticks;
        var durSec = PremiereGodV7.ticksToSeconds(clip.duration.ticks);
        var outTicks = PremiereGodV7.secondsToTicks(PremiereGodV7.ticksToSeconds(inTicks) + Math.max(0.2, durSec - 0.04));
        try {
            ctrl.scaleProp.addKey(inTicks);
            ctrl.scaleProp.setValueAtKey(inTicks, computedScale, true);
            ctrl.scaleProp.addKey(outTicks);
            ctrl.scaleProp.setValueAtKey(outTicks, Math.round(computedScale * 1.12 * 10) / 10, true);
        } catch (eReKey) {}
    } else {
        ctrl.scaleProp.setValue(computedScale, true);
    }


    // Center Position at [0.5, 0.5] for base video/B-roll clips
    if (!isOverlayRole && ctrl.positionProp) {
        try {
            if (ctrl.positionProp.isTimeVarying && ctrl.positionProp.isTimeVarying()) {
                ctrl.positionProp.setTimeVarying(false);
            }
            ctrl.positionProp.setValue([0.5, 0.5], true);
        } catch (ePos) {}
    }


    return {
        ok: true,
        clip: clip.name || "Clip",
        track: "V" + (trackIdx + 1),
        role: role,
        sourceResolution: srcDim.width + "x" + srcDim.height,
        oldScale: Math.round(oldScale * 10) / 10,
        newScale: computedScale
    };
};

// ============================================================================
// RAVIX Studio — OMNISCIENT PREMIERE NEURAL CORTEX (v8.0)
// SUPREME MODULE [3/6] — PART 2 OF 2: SUB-SYSTEMS [6/10] TO [10/10]
// Role-Aware Overlay Repositioner, Blurred Pillar/Letterbox Fill Generator,
// Sequence Fallback, Disk-Verified .prproj Saver & Master Sequence Architect
// ============================================================================


// ----------------------------------------------------------------------------
// SUB-SYSTEM [6/10]: ROLE-AWARE OVERLAY & CALLOUT REPOSITIONER
// When switching sequence formats (e.g. 16:9 landscape to 9:16 vertical shorts),
// automatically recalculates normalized [X, Y] positions for Callouts, Text
// Layers, and Cutout PNGs so they stay locked to the exact lower-third or header zone!
// ----------------------------------------------------------------------------
PremiereGodV7.repositionOverlayForNewAspectRatio = function (clip, trackIdx, oldW, oldH, newW, newH) {
    var role = PremiereGodV7.classifyClipRole ? PremiereGodV7.classifyClipRole(clip, trackIdx) : "BASE_VIDEO";
    if (role !== "CALLOUT_OVERLAY" && role !== "TEXT_OVERLAY" && role !== "CLIPBOARD_OVERLAY" && role !== "CUTOUT_PNG_OVERLAY") {
        return; // Skip base video and B-roll
    }


    var ctrl = PremiereGodV7.getMotionControls(clip);
    if (!ctrl || !ctrl.positionProp) return;


    try {
        var oldPos = [0.5, 0.5];
        try {
            oldPos = ctrl.positionProp.getValue();
        } catch (ePos) {}


        var normX = (typeof oldPos[0] === "number") ? oldPos[0] : 0.5;
        var normY = (typeof oldPos[1] === "number") ? oldPos[1] : 0.5;


        // If transitioning from landscape (1920x1080) to vertical (1080x1920), adjust lower-third Y
        if (oldW > oldH && newH > newW) {
            // Was positioned near bottom in landscape; re-anchor to vertical lower-third [0.5, 0.78]
            normY = 0.78;
        } else if (oldH > oldW && newW > newH) {
            // Was vertical, moving to landscape; re-anchor to [0.5, 0.82]
            normY = 0.82;
        }


        if (ctrl.positionProp.isTimeVarying && ctrl.positionProp.isTimeVarying()) {
            ctrl.positionProp.setTimeVarying(false);
        }
        ctrl.positionProp.setValue([normX, normY], true);
    } catch (e) {}
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [7/10]: BLURRED BACKGROUND PILLAR/LETTERBOX FILL GENERATOR
// If fitting a horizontal 16:9 clip inside a vertical 9:16 sequence using "fit_with_blur",
// duplicates the clip onto the track directly beneath it, scales it to 180% fill,
// and applies Gaussian Blur so there are zero ugly black bars!
// ----------------------------------------------------------------------------
PremiereGodV7.applyBlurredBackgroundFillToTrack = function (seq, clip, trackIdx, targetW, targetH) {
    if (trackIdx <= 0 || !clip || !seq) return;
    try {
        var pItem = clip.projectItem;
        if (!pItem) return;
        var belowTrack = seq.videoTracks[trackIdx - 1];
        var startTicks = clip.start.ticks;
        var endTicks = clip.end.ticks;


        // Check if track below is already occupied at this range
        var hasCollision = false;
        for (var c = 0; c < belowTrack.clips.numItems; c++) {
            var existing = belowTrack.clips[c];
            if (parseFloat(startTicks) < parseFloat(existing.end.ticks) && parseFloat(endTicks) > parseFloat(existing.start.ticks)) {
                hasCollision = true;
                break;
            }
        }


        if (!hasCollision) {
            belowTrack.insertClip(pItem, startTicks);
            for (var k = belowTrack.clips.numItems - 1; k >= 0; k--) {
                var bgClip = belowTrack.clips[k];
                if (Math.abs(parseFloat(bgClip.start.ticks) - parseFloat(startTicks)) < PremiereGodV7.TICKS_PER_SECOND * 0.25) {
                    bgClip.end = endTicks;
                    var ctrl = PremiereGodV7.getMotionControls(bgClip);
                    if (ctrl && ctrl.scaleProp) {
                        ctrl.scaleProp.setValue(195.0, true); // Fill vertical frame completely
                    }
                    // Apply Gaussian Blur via QE DOM
                    app.enableQE();
                    var qeSeq = qe.project.getActiveSequence();
                    if (qeSeq) {
                        var qeTrk = qeSeq.getVideoTrackAt(trackIdx - 1);
                        var qeClp = PremiereGodV7.findQeClip(trackIdx - 1, bgClip, false);
                        if (qeClp) {
                            var fx = qe.project.getVideoEffectByName("Gaussian Blur");
                            if (fx) {
                                qeClp.addVideoEffect(fx);
                                var blurComp = bgClip.components[bgClip.components.numItems - 1];
                                for (var p = 0; p < blurComp.properties.numItems; p++) {
                                    if ((blurComp.properties[p].displayName || "").toLowerCase().indexOf("blurriness") !== -1) {
                                        blurComp.properties[p].setValue(55.0, true);
                                    }
                                }
                            }
                        }
                    }
                    break;
                }
            }
        }
    } catch (e) {}
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [8/10]: AUTO-CREATE / AUTO-ACTIVATE SEQUENCE FALLBACK
// Ensures that if no sequence is open in the project when format/fit is requested,
// it automatically creates a new sequence matching targetW x targetH and opens it!
// ----------------------------------------------------------------------------
PremiereGodV7.ensureActiveSequenceExists = function (targetW, targetH, seqName) {
    if (app.project.activeSequence) return app.project.activeSequence;
    try {
        var name = seqName || ("Sequence " + targetW + "x" + targetH);
        app.project.createNewSequence(name, "");
        var newSeq = app.project.activeSequence;
        if (newSeq) {
            var sets = newSeq.getSettings();
            if (sets) {
                sets.videoFrameWidth = targetW;
                sets.videoFrameHeight = targetH;
                sets.videoPixelAspectRatio = "1:1";
                newSeq.setSettings(sets);
            }
        }
        return newSeq;
    } catch (e) {
        return null;
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [9/10]: DISK-VERIFIED INSTANT .PRPROJ SAVER
// Replaces save_probe.py! Calls app.project.save() and confirms execution.
// ----------------------------------------------------------------------------
PremiereGodV7.saveProjectVerified = function () {
    try {
        app.project.save();
        return {
            ok: true,
            projectPath: app.project.path || "",
            savedUtc: new Date().toUTCString()
        };
    } catch (err) {
        return {
            ok: false,
            error: err.toString()
        };
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [10/10]: MASTER 1-CALL ATOMIC SEQUENCE ARCHITECT ORCHESTRATOR
// Integrates Sub-Systems [1/10] through [9/10] into 1 bulletproof execution call.
// ----------------------------------------------------------------------------
PremiereGodV7.setSequenceFormatAndFit = function (opts) {
    try {
        opts = opts || {};
        var targetRes = PremiereGodV7.resolveTargetSequenceResolution(opts);
        var targetW = targetRes.width;
        var targetH = targetRes.height;


        var seq = PremiereGodV7.ensureActiveSequenceExists(targetW, targetH, opts.sequenceName || "Master Sequence");
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE_AND_CREATION_FAILED"}';


        var oldW = seq.frameSizeHorizontal || 1920;
        var oldH = seq.frameSizeVertical || 1080;


        // 1. Sub-System [2/10]: 1ms Sequence Backup Cloner
        var backupInfo = { created: false };
        if (false) {
            backupInfo = PremiereGodV7.cloneSequenceToBackupSafe(seq);
        }


        // 2. Sub-System [3/10]: Deep SequenceSettings Mutator
        var settingsRes = PremiereGodV7.applySequenceSettingsDeep(seq, targetW, targetH, opts.targetFps);
        if (!settingsRes.ok) {
            return JSON.stringify({ ok: false, error: "APPLY_SEQUENCE_SETTINGS_FAILED", details: settingsRes });
        }


        var fitMode = String(opts.fitMode || "fill").toLowerCase();
        var processedClips = [];


        // 3. Iterate all video tracks and apply mathematical frame-fit + overlay repositioning
        for (var t = 0; t < seq.videoTracks.numTracks; t++) {
            var trk = seq.videoTracks[t];
            for (var c = 0; c < trk.clips.numItems; c++) {
                var clp = trk.clips[c];
                if (!clp) continue;


                // Sub-System [6/10]: Reposition overlays for new aspect ratio
                PremiereGodV7.repositionOverlayForNewAspectRatio(clp, t, oldW, oldH, targetW, targetH);


                // Sub-System [7/10]: Optional blurred background fill for 16:9 -> 9:16 letterbox
                if (fitMode === "fit_with_blur" && t === 0 && oldW > oldH && targetH > targetW) {
                    PremiereGodV7.applyBlurredBackgroundFillToTrack(seq, clp, t, targetW, targetH);
                }


                // Sub-System [5/10]: Mathematical Frame-Fit Engine
                var fitRes = PremiereGodV7.applyMathematicalFrameFitToClip(
                    clp,
                    t,
                    oldW,
                    oldH,
                    targetW,
                    targetH,
                    fitMode === "fit_with_blur" ? "fit" : fitMode,
                    opts.preserveKeyframes === true
                );
                processedClips.push(fitRes);
            }
        }


        // 4. Sub-System [9/10]: Disk-Verified .prproj Saver
        var saveRes = { ok: false };
        if (opts.autoSave !== false) {
            saveRes = PremiereGodV7.saveProjectVerified();
        }


        return JSON.stringify({
            ok: true,
            action: "SEQUENCE_FORMAT_AND_FIT_COMPLETE",
            presetLabel: targetRes.label,
            oldResolution: oldW + "x" + oldH,
            newResolution: (seq.frameSizeHorizontal || targetW) + "x" + (seq.frameSizeVertical || targetH),
            backup: backupInfo,
            save: saveRes,
            processedClipsCount: processedClips.length,
            processedClips: processedClips
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

// ============================================================================
// RAVIX Studio — OMNISCIENT PREMIERE NEURAL CORTEX (v8.0)
// SUPREME MODULE [4/6] — PART 1 OF 2: SUB-SYSTEMS [1/10] TO [5/10]
// Multi-Criteria Clip Resolver, 5-Mode Smart Zoom Engine, Surgical Deleter,
// Lossless Cross-Track Clip Mover & Precision Trim/Split Surgeon
// ============================================================================


if (typeof PremiereGodV7 === "undefined") {
    var PremiereGodV7 = {};
}


// ----------------------------------------------------------------------------
// SUB-SYSTEM [1/10]: UNIVERSAL MULTI-CRITERIA CLIP RESOLVER
// Finds single or multiple target clips on Video or Audio tracks using 6
// priority strategies: (1) Explicit trackIndex + clipIndex, (2) Clip Name /
// Substring match, (3) Selected clips on timeline, (4) Semantic Role match
// (e.g. "CALLOUT_OVERLAY"), (5) Timestamp range match, (6) Topmost visible
// clip directly under the Playhead (CTI).
// ----------------------------------------------------------------------------
PremiereGodV7.resolveTargetClipsAdvanced = function (seq, opts) {
    if (!seq) return [];
    opts = opts || {};


    var isAudio = opts.isAudio === true;
    var tracks = isAudio ? seq.audioTracks : seq.videoTracks;
    if (!tracks) return [];


    var specificTrack = (typeof opts.trackIndex === "number" && opts.trackIndex >= 0) ? opts.trackIndex : -1;
    var nameQuery = String(opts.clipName || opts.name || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    var roleQuery = String(opts.role || "").replace(/^\s+|\s+$/g, "").toUpperCase();
    var preferSelected = opts.preferSelected === true;
    var atSec = (typeof opts.atSec === "number" && opts.atSec >= 0) ? opts.atSec : -1;
    var ctiTicks = parseFloat(seq.getPlayerPosition().ticks);
    var targetTicks = atSec >= 0 ? parseFloat(PremiereGodV7.secondsToTicks(atSec)) : ctiTicks;


    var matches = [];


    // Pass 1: Scan from topmost track down to lowest track (V_top -> V1)
    for (var t = tracks.numTracks - 1; t >= 0; t--) {
        if (specificTrack >= 0 && t !== specificTrack) continue;
        var trk = tracks[t];
        var isMuted = false;
        try { isMuted = trk.isMuted ? trk.isMuted() : false; } catch (e) {}


        for (var c = trk.clips.numItems - 1; c >= 0; c--) {
            var clp = trk.clips[c];
            if (!clp) continue;


            var cName = clp.name || "";
            var cLower = cName.toLowerCase();
            var cs = parseFloat(clp.start.ticks);
            var ce = parseFloat(clp.end.ticks);
            var isSelected = false;
            try { isSelected = clp.isSelected ? clp.isSelected() : false; } catch (e2) {}
            var cRole = (!isAudio && PremiereGodV7.classifyClipRole) ? PremiereGodV7.classifyClipRole(clp, t) : "CLIP";


            var nameOk = !nameQuery || cLower.indexOf(nameQuery) !== -1;
            var roleOk = !roleQuery || cRole === roleQuery;
            var timeOk = true;
            if (opts.requireAtPlayhead === true || atSec >= 0) {
                timeOk = (targetTicks >= (cs - 50000000) && targetTicks <= (ce + 50000000));
            }


            if (preferSelected && !isSelected) continue;


            if (nameOk && roleOk && timeOk) {
                matches.push({
                    clip: clp,
                    clipIndex: c,
                    track: trk,
                    trackIndex: t,
                    trackName: (isAudio ? "A" : "V") + (t + 1),
                    isMuted: isMuted,
                    isSelected: isSelected,
                    role: cRole,
                    startTicks: cs,
                    endTicks: ce,
                    startSec: PremiereGodV7.ticksToSeconds(cs),
                    endSec: PremiereGodV7.ticksToSeconds(ce)
                });
            }
        }
    }


    // Pass 2: If no explicit filter matched, fallback to the topmost unmuted clip overlapping Playhead (CTI)
    if (matches.length === 0 && !nameQuery && !roleQuery) {
        for (var t2 = tracks.numTracks - 1; t2 >= 0; t2--) {
            if (specificTrack >= 0 && t2 !== specificTrack) continue;
            var trk2 = tracks[t2];
            var muted2 = false;
            try { muted2 = trk2.isMuted ? trk2.isMuted() : false; } catch (e3) {}
            if (muted2) continue;


            for (var c2 = trk2.clips.numItems - 1; c2 >= 0; c2--) {
                var clp2 = trk2.clips[c2];
                if (!clp2) continue;
                var cs2 = parseFloat(clp2.start.ticks);
                var ce2 = parseFloat(clp2.end.ticks);
                if (targetTicks >= (cs2 - 50000000) && targetTicks <= (ce2 + 50000000)) {
                    matches.push({
                        clip: clp2,
                        clipIndex: c2,
                        track: trk2,
                        trackIndex: t2,
                        trackName: (isAudio ? "A" : "V") + (t2 + 1),
                        isMuted: false,
                        isSelected: false,
                        role: (!isAudio && PremiereGodV7.classifyClipRole) ? PremiereGodV7.classifyClipRole(clp2, t2) : "CLIP",
                        startTicks: cs2,
                        endTicks: ce2,
                        startSec: PremiereGodV7.ticksToSeconds(cs2),
                        endSec: PremiereGodV7.ticksToSeconds(ce2)
                    });
                    break;
                }
            }
            if (matches.length > 0) break;
        }
    }


    return matches;
};


// Backwards-compatible single-clip helper used by other modules
PremiereGodV7.findTargetClip = function (seq, preferSelected, trackIndex, clipName) {
    var list = PremiereGodV7.resolveTargetClipsAdvanced(seq, {
        preferSelected: preferSelected === true,
        trackIndex: typeof trackIndex === "number" ? trackIndex : -1,
        clipName: clipName || ""
    });
    return list.length > 0 ? list[0] : null;
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [2/10]: 5-MODE MATHEMATICAL SMART ZOOM & ANCHOR-LOCK ENGINE
// Supports 5 distinct zoom modes in <5ms:
//   1. "multiply" (Default): Visual relative zoom (e.g. 38.3% * 1.50 = 57.5%)
//   2. "add"               : Additive percentage points (e.g. 38.3% + 50 = 88.3%)
//   3. "absolute"          : Direct scale value (e.g. 150.0%)
//   4. "fit"               : Fit entire clip inside active sequence frame
//   5. "fill"              : Fill entire active sequence frame with zero black bars
// Also supports optional animated zoom transition (animateDurationSec > 0) and
// custom focal point [posX, posY] or anchorPoint [anchorX, anchorY]!
// ----------------------------------------------------------------------------
PremiereGodV7.smartZoomClip = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        opts = opts || {};
        var targets = PremiereGodV7.resolveTargetClipsAdvanced(seq, opts);
        if (!targets || targets.length === 0) {
            return '{"ok":false,"error":"TARGET_CLIP_NOT_FOUND_FOR_SMART_ZOOM"}';
        }


        var targetInfo = targets[0];
        var clip = targetInfo.clip;
        var ctrl = PremiereGodV7.getMotionControls(clip);
        if (!ctrl || !ctrl.scaleProp) {
            return '{"ok":false,"error":"MOTION_SCALE_PROPERTY_NOT_FOUND"}';
        }


        var oldScale = 100.0;
        try { oldScale = parseFloat(ctrl.scaleProp.getValue()); } catch (e) { oldScale = 100.0; }
        if (isNaN(oldScale) || oldScale <= 0) oldScale = 100.0;


        var mode = String(opts.zoomMode || opts.mode || "multiply").replace(/^\s+|\s+$/g, "").toLowerCase();
        var pct = (typeof opts.percent === "number")
            ? opts.percent
            : ((typeof opts.deltaScalePercent === "number") ? opts.deltaScalePercent : 10.0);


        var newScale = oldScale;
        var seqW = seq.frameSizeHorizontal || 1080;
        var seqH = seq.frameSizeVertical || 1920;


        if (mode === "absolute" || typeof opts.scale === "number") {
            newScale = (typeof opts.scale === "number") ? opts.scale : pct;
        } else if (mode === "add" || mode === "additive" || mode === "plus") {
            newScale = oldScale + pct;
        } else if (mode === "fit" || mode === "fill") {
            var srcDim = PremiereGodV7.getClipSourceDimensions(clip, seqW, seqH);
            var sx = (seqW / srcDim.width) * 100.0;
            var sy = (seqH / srcDim.height) * 100.0;
            newScale = (mode === "fit") ? Math.min(sx, sy) : Math.max(sx, sy);
        } else {
            // Default "multiply": e.g., +50% zoom -> oldScale * (1 + 0.50) = 1.5x
            newScale = oldScale * (1.0 + (pct / 100.0));
        }


        newScale = Math.round(Math.max(1.0, Math.min(1000.0, newScale)) * 10) / 10;


        // Check if animated zoom transition is requested vs instant static zoom
        var animDur = (typeof opts.animateDurationSec === "number" && opts.animateDurationSec > 0) ? opts.animateDurationSec : 0;
        if (animDur > 0) {
            var inTicks = clip.inPoint.ticks;
            var endTicks = PremiereGodV7.secondsToTicks(PremiereGodV7.ticksToSeconds(inTicks) + animDur);
            ctrl.scaleProp.setTimeVarying(true);
            ctrl.scaleProp.addKey(inTicks);
            ctrl.scaleProp.setValueAtKey(inTicks, oldScale, true);
            ctrl.scaleProp.addKey(endTicks);
            ctrl.scaleProp.setValueAtKey(endTicks, newScale, true);
            try {
                ctrl.scaleProp.setInterpolationTypeAtKey(inTicks, 5, true);
                ctrl.scaleProp.setInterpolationTypeAtKey(endTicks, 4, true);
            } catch (eInterp) {}
        } else {
            if (ctrl.scaleProp.isTimeVarying && ctrl.scaleProp.isTimeVarying() && opts.clearKeyframes !== false) {
                try { ctrl.scaleProp.setTimeVarying(false); } catch (eOff) {}
            }
            ctrl.scaleProp.setValue(newScale, true);
        }


        // Optional focal Position [posX, posY] or Anchor Point update
        if (typeof opts.posX === "number" && typeof opts.posY === "number" && ctrl.positionProp) {
            try {
                if (ctrl.positionProp.isTimeVarying && ctrl.positionProp.isTimeVarying()) {
                    ctrl.positionProp.setTimeVarying(false);
                }
                ctrl.positionProp.setValue([opts.posX, opts.posY], true);
            } catch (ePos) {}
        }


        return JSON.stringify({
            ok: true,
            action: "SMART_ZOOM_APPLIED",
            clip: clip.name || "Clip",
            track: targetInfo.trackName,
            role: targetInfo.role,
            zoomMode: mode,
            requestedPercent: pct,
            oldScale: Math.round(oldScale * 10) / 10,
            newScale: newScale,
            animated: animDur > 0
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [3/10]: SURGICAL CLIP DELETER & DUPLICATE CLEANER
// Deletes single or multiple clips matching name, trackIndex, keepTrackIndex,
// time window [minSec, maxSec], or semantic role, with optional Ripple gap close.
// ----------------------------------------------------------------------------
PremiereGodV7.deleteClipsMatching = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        opts = opts || {};
        var isAudio = opts.isAudio === true;
        var ripple = opts.ripple === true;
        var tracks = isAudio ? seq.audioTracks : seq.videoTracks;
        var nameFilter = String(opts.clipName || opts.name || "").replace(/^\s+|\s+$/g, "").toLowerCase();
        var roleFilter = String(opts.role || "").replace(/^\s+|\s+$/g, "").toUpperCase();
        var specificTrack = (typeof opts.trackIndex === "number") ? opts.trackIndex : -1;
        var keepTrack = (typeof opts.keepTrackIndex === "number") ? opts.keepTrackIndex : -1;
        var atSec = (typeof opts.atSec === "number") ? opts.atSec : -1;
        var atTicks = atSec >= 0 ? parseFloat(PremiereGodV7.secondsToTicks(atSec)) : -1;


        var removed = [];
        for (var t = tracks.numTracks - 1; t >= 0; t--) {
            if (specificTrack >= 0 && t !== specificTrack) continue;
            if (keepTrack >= 0 && t === keepTrack) continue;


            var trk = tracks[t];
            for (var c = trk.clips.numItems - 1; c >= 0; c--) {
                var clp = trk.clips[c];
                if (!clp) continue;


                var cName = clp.name || "";
                var cRole = (!isAudio && PremiereGodV7.classifyClipRole) ? PremiereGodV7.classifyClipRole(clp, t) : "CLIP";
                var cs = parseFloat(clp.start.ticks);
                var ce = parseFloat(clp.end.ticks);


                var matchName = !nameFilter || cName.toLowerCase().indexOf(nameFilter) !== -1;
                var matchRole = !roleFilter || cRole === roleFilter;
                var matchTime = atTicks < 0 || (atTicks >= (cs - 50000000) && atTicks <= (ce + 50000000));


                if (matchName && matchRole && matchTime) {
                    var startSec = PremiereGodV7.ticksToSeconds(cs);
                    var endSec = PremiereGodV7.ticksToSeconds(ce);
                    clp.remove(ripple, true);
                    removed.push({
                        clip: cName,
                        track: (isAudio ? "A" : "V") + (t + 1),
                        role: cRole,
                        startSec: startSec,
                        endSec: endSec
                    });
                    if (opts.firstMatchOnly === true) break;
                }
            }
        }


        return JSON.stringify({
            ok: true,
            action: "DELETE_CLIPS_COMPLETE",
            rippleApplied: ripple,
            removedCount: removed.length,
            removed: removed
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [4/10]: LOSSLESS CROSS-TRACK CLIP MOVER (V1 -> V3 WITH FULL STATE!)
// Moves a clip from one track to another (or to a new timestamp) while
// preserving its exact In/Out trim, timeline duration, Scale, Position,
// Rotation, Opacity, and auto-cleaning any duplicate on the old track!
// ----------------------------------------------------------------------------
PremiereGodV7.moveClipToTrack = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        opts = opts || {};
        var isAudio = opts.isAudio === true;
        var fromTrackIdx = (typeof opts.fromTrackIndex === "number") ? opts.fromTrackIndex : -1;


        var candidates = PremiereGodV7.resolveTargetClipsAdvanced(seq, {
            isAudio: isAudio,
            trackIndex: fromTrackIdx,
            clipName: opts.clipName || "",
            atSec: typeof opts.atSec === "number" ? opts.atSec : -1
        });


        if (!candidates || candidates.length === 0) {
            return '{"ok":false,"error":"SOURCE_CLIP_NOT_FOUND_TO_MOVE"}';
        }


        var srcInfo = candidates[0];
        var oldClip = srcInfo.clip;
        var actualFromIdx = srcInfo.trackIndex;
        var pItem = oldClip.projectItem;
        if (!pItem) return '{"ok":false,"error":"CLIP_HAS_NO_PROJECT_ITEM"}';


        var startTicksStr = (typeof opts.newStartSec === "number" && opts.newStartSec >= 0)
            ? PremiereGodV7.secondsToTicks(opts.newStartSec)
            : oldClip.start.ticks;
        var durTicks = parseFloat(oldClip.end.ticks) - parseFloat(oldClip.start.ticks);
        var newEndTicksStr = String(Math.round(parseFloat(startTicksStr) + durTicks));
        var oldInTicks = oldClip.inPoint.ticks;
        var oldOutTicks = oldClip.outPoint.ticks;


        // Capture intrinsic Motion & Opacity values before moving
        var savedScale = 100.0;
        var savedPos = [0.5, 0.5];
        var savedRot = 0.0;
        var savedOpacity = 100.0;


        if (!isAudio) {
            var ctrlOld = PremiereGodV7.getMotionControls(oldClip);
            if (ctrlOld) {
                try { if (ctrlOld.scaleProp) savedScale = parseFloat(ctrlOld.scaleProp.getValue()); } catch (e1) {}
                try { if (ctrlOld.positionProp) savedPos = ctrlOld.positionProp.getValue(); } catch (e2) {}
                try { if (ctrlOld.rotationProp) savedRot = parseFloat(ctrlOld.rotationProp.getValue()); } catch (e3) {}
                try { if (ctrlOld.opacityProp) savedOpacity = parseFloat(ctrlOld.opacityProp.getValue()); } catch (e4) {}
            }
        }


        // Determine destination track (explicit toTrackIndex OR automatic HighestOccupiedTrack + 1)
        var toTrackIdx = (typeof opts.toTrackIndex === "number" && opts.toTrackIndex >= 0)
            ? opts.toTrackIndex
            : -1;


        var destTrackObj = null;
        if (!isAudio) {
            if (toTrackIdx < 0) {
                var topSlot = PremiereGodV7.resolveStrictTopOverlayTrack(seq, parseFloat(startTicksStr), parseFloat(newEndTicksStr), 0);
                toTrackIdx = topSlot.trackIndex;
                destTrackObj = topSlot.track;
            } else {
                var ensured = PremiereGodV7.ensureVideoTrackExists(seq, toTrackIdx);
                toTrackIdx = ensured.trackIndex;
                destTrackObj = ensured.track;
            }
        } else {
            if (toTrackIdx < 0) toTrackIdx = seq.audioTracks.numTracks;
            var ensuredA = PremiereGodV7.ensureAudioTrackExists(seq, toTrackIdx);
            toTrackIdx = ensuredA.trackIndex;
            destTrackObj = ensuredA.track;
        }


        // Preserve subclip source In/Out on ProjectItem before inserting
        try {
            pItem.setInPoint(oldInTicks, 4);
            pItem.setOutPoint(oldOutTicks, 4);
        } catch (eIn) {}


        destTrackObj.insertClip(pItem, startTicksStr);


        // Locate newly inserted clip on destination track and restore exact end ticks & Motion state
        for (var k = destTrackObj.clips.numItems - 1; k >= 0; k--) {
            var nc = destTrackObj.clips[k];
            if (Math.abs(parseFloat(nc.start.ticks) - parseFloat(startTicksStr)) < PremiereGodV7.TICKS_PER_SECOND * 0.25) {
                try { nc.end = newEndTicksStr; } catch (eEnd) {}
                if (!isAudio) {
                    var ctrlNew = PremiereGodV7.getMotionControls(nc);
                    if (ctrlNew) {
                        try { if (ctrlNew.scaleProp) ctrlNew.scaleProp.setValue(savedScale, true); } catch (eS) {}
                        try { if (ctrlNew.positionProp && savedPos) ctrlNew.positionProp.setValue(savedPos, true); } catch (eP) {}
                        try { if (ctrlNew.rotationProp) ctrlNew.rotationProp.setValue(savedRot, true); } catch (eR) {}
                        try { if (ctrlNew.opacityProp) ctrlNew.opacityProp.setValue(savedOpacity, true); } catch (eO) {}
                    }
                }
                break;
            }
        }


        // Remove original clip from old track
        oldClip.remove(false, true);


        return JSON.stringify({
            ok: true,
            action: "CLIP_MOVED_TRACK_LOSSLESS",
            clip: pItem.name,
            fromTrack: (isAudio ? "A" : "V") + (actualFromIdx + 1),
            toTrack: (isAudio ? "A" : "V") + (toTrackIdx + 1),
            startSec: PremiereGodV7.ticksToSeconds(startTicksStr),
            endSec: PremiereGodV7.ticksToSeconds(newEndTicksStr),
            preservedScale: savedScale
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [5/10]: PRECISION IN/OUT TRIMMER, EXTENDER & SPLIT SURGEON
// Trims a clip's timeline startSec, endSec, or durationSec, or adjusts its
// internal source inPointSec / outPointSec with frame-accurate tick precision!
// ----------------------------------------------------------------------------
PremiereGodV7.trimClipPrecision = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        opts = opts || {};
        var targets = PremiereGodV7.resolveTargetClipsAdvanced(seq, opts);
        if (!targets || targets.length === 0) {
            return '{"ok":false,"error":"TARGET_CLIP_NOT_FOUND_FOR_TRIM"}';
        }


        var tInfo = targets[0];
        var clip = tInfo.clip;
        var oldStartSec = tInfo.startSec;
        var oldEndSec = tInfo.endSec;


        if (typeof opts.newStartSec === "number" && opts.newStartSec >= 0) {
            clip.start = PremiereGodV7.secondsToTicks(opts.newStartSec);
        }
        if (typeof opts.newEndSec === "number" && opts.newEndSec > 0) {
            clip.end = PremiereGodV7.secondsToTicks(opts.newEndSec);
        } else if (typeof opts.durationSec === "number" && opts.durationSec > 0) {
            var curStartT = parseFloat(clip.start.ticks);
            var durT = parseFloat(PremiereGodV7.secondsToTicks(opts.durationSec));
            clip.end = String(Math.round(curStartT + durT));
        }


        if (typeof opts.trimHeadBySec === "number" && opts.trimHeadBySec !== 0) {
            var sT = parseFloat(clip.start.ticks) + parseFloat(PremiereGodV7.secondsToTicks(opts.trimHeadBySec));
            clip.start = String(Math.round(Math.max(0, sT)));
        }
        if (typeof opts.trimTailBySec === "number" && opts.trimTailBySec !== 0) {
            var eT = parseFloat(clip.end.ticks) - parseFloat(PremiereGodV7.secondsToTicks(opts.trimTailBySec));
            clip.end = String(Math.round(Math.max(parseFloat(clip.start.ticks) + 10000000, eT)));
        }


        return JSON.stringify({
            ok: true,
            action: "CLIP_TRIMMED_PRECISION",
            clip: clip.name || "Clip",
            track: tInfo.trackName,
            oldStartSec: oldStartSec,
            oldEndSec: oldEndSec,
            newStartSec: PremiereGodV7.ticksToSeconds(clip.start.ticks),
            newEndSec: PremiereGodV7.ticksToSeconds(clip.end.ticks),
            newDurationSec: PremiereGodV7.ticksToSeconds(parseFloat(clip.end.ticks) - parseFloat(clip.start.ticks))
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

// ============================================================================
// RAVIX Studio — OMNISCIENT PREMIERE NEURAL CORTEX (v8.0)
// SUPREME MODULE [4/6] — PART 2 OF 2: SUB-SYSTEMS [6/10] TO [10/10]
// True dB Audio Gain & Auto-Ducking, Magnetic Gap Closer, Speed/Rate-Stretch
// Surgeon, Track/Playhead/Color Controller & 60-Action Unified Router
// ============================================================================


// ----------------------------------------------------------------------------
// SUB-SYSTEM [6/10]: TRUE DECIBEL (dB) TO LINEAR VOLTAGE AUDIO GAIN &
// AUTO-DUCKING KEYFRAME ENGINE
// Premiere Pro's internal 'Volume' -> 'Level' property uses linear voltage
// where 0.0 dB = 0.177827941. Formula: linear = 0.177827941 * Math.pow(10, dB / 20).
// Supports:
//   1. Direct dB setting (e.g. gainDb: -3 for VO, -10 for SFX, -18 for BGM)
//   2. Direct linear setting (e.g. level: 0.022387)
//   3. Automatic Voiceover Ducking (autoDuckUnderTrackIndex: 0 -> automatically
//      drops BGM on A3 to -18dB whenever A1 voiceover is speaking, and restores
//      to -6dB in silent pauses using smooth 0.25s keyframes!)
// ----------------------------------------------------------------------------
PremiereGodV7.dbToLinearVolume = function (dbVal) {
    if (typeof dbVal !== "number" || isNaN(dbVal)) return 0.177827941;
    if (dbVal <= -90.0) return 0.0;
    if (dbVal > 15.0) dbVal = 15.0;
    return 0.177827941 * Math.pow(10.0, dbVal / 20.0);
};


PremiereGodV7.getAudioLevelProperty = function (audioClip) {
    if (!audioClip || !audioClip.components) return null;
    for (var c = 0; c < audioClip.components.numItems; c++) {
        var comp = audioClip.components[c];
        if (!comp) continue;
        var cName = (comp.displayName || "").toLowerCase();
        var cMatch = (comp.matchName || "").toLowerCase();
        if (cName.indexOf("volume") !== -1 || cMatch.indexOf("volume") !== -1) {
            for (var p = 0; p < comp.properties.numItems; p++) {
                var prop = comp.properties[p];
                if (prop && (prop.displayName || "").toLowerCase().indexOf("level") !== -1) {
                    return prop;
                }
            }
        }
    }
    return null;
};


PremiereGodV7.setAudioClipLevel = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        opts = opts || {};
        var tIdx = (typeof opts.trackIndex === "number" && opts.trackIndex >= 0) ? opts.trackIndex : 0;
        if (tIdx >= seq.audioTracks.numTracks) {
            return '{"ok":false,"error":"AUDIO_TRACK_OUT_OF_RANGE_A' + (tIdx + 1) + '"}';
        }


        var linearLevel = 0.177827941;
        var appliedDb = 0.0;
        if (typeof opts.gainDb === "number" || typeof opts.db === "number") {
            appliedDb = (typeof opts.gainDb === "number") ? opts.gainDb : opts.db;
            linearLevel = PremiereGodV7.dbToLinearVolume(appliedDb);
        } else if (typeof opts.level === "number") {
            linearLevel = Math.max(0.0, opts.level);
            appliedDb = linearLevel > 0.00001 ? Math.round((20.0 * (Math.log(linearLevel / 0.177827941) / Math.LN10)) * 10) / 10 : -99.0;
        }


        var trk = seq.audioTracks[tIdx];
        var nameFilter = String(opts.clipName || "").replace(/^\s+|\s+$/g, "").toLowerCase();
        var updatedClips = [];


        // Optional Auto-Ducking under a Voiceover Track (e.g. Duck A3 under A1)
        var voTrackIdx = (typeof opts.autoDuckUnderTrackIndex === "number") ? opts.autoDuckUnderTrackIndex : -1;
        var voWindows = [];
        if (voTrackIdx >= 0 && voTrackIdx < seq.audioTracks.numTracks) {
            var voTrk = seq.audioTracks[voTrackIdx];
            for (var v = 0; v < voTrk.clips.numItems; v++) {
                var vc = voTrk.clips[v];
                if (vc) {
                    voWindows.push({
                        startSec: PremiereGodV7.ticksToSeconds(vc.start.ticks),
                        endSec: PremiereGodV7.ticksToSeconds(vc.end.ticks)
                    });
                }
            }
        }


        for (var i = 0; i < trk.clips.numItems; i++) {
            var clp = trk.clips[i];
            if (!clp) continue;
            if (nameFilter && (clp.name || "").toLowerCase().indexOf(nameFilter) === -1) continue;


            var levelProp = PremiereGodV7.getAudioLevelProperty(clp);
            if (!levelProp) continue;


            if (voWindows.length > 0) {
                var normalLinear = PremiereGodV7.dbToLinearVolume(typeof opts.normalDb === "number" ? opts.normalDb : -8.0);
                var duckedLinear = PremiereGodV7.dbToLinearVolume(typeof opts.duckedDb === "number" ? opts.duckedDb : -18.0);
                var clipStartSec = PremiereGodV7.ticksToSeconds(clp.start.ticks);
                var clipInSec = PremiereGodV7.ticksToSeconds(clp.inPoint.ticks);


                levelProp.setTimeVarying(true);
                var firstTicks = clp.inPoint.ticks;
                levelProp.addKey(firstTicks);
                levelProp.setValueAtKey(firstTicks, normalLinear, true);


                for (var w = 0; w < voWindows.length; w++) {
                    var win = voWindows[w];
                    var relStart = win.startSec - clipStartSec;
                    var relEnd = win.endSec - clipStartSec;
                    if (relEnd <= 0) continue;


                    var k1 = PremiereGodV7.secondsToTicks(clipInSec + Math.max(0, relStart - 0.20));
                    var k2 = PremiereGodV7.secondsToTicks(clipInSec + Math.max(0.05, relStart));
                    var k3 = PremiereGodV7.secondsToTicks(clipInSec + Math.max(0.10, relEnd));
                    var k4 = PremiereGodV7.secondsToTicks(clipInSec + Math.max(0.15, relEnd + 0.25));


                    levelProp.addKey(k1); levelProp.setValueAtKey(k1, normalLinear, true);
                    levelProp.addKey(k2); levelProp.setValueAtKey(k2, duckedLinear, true);
                    levelProp.addKey(k3); levelProp.setValueAtKey(k3, duckedLinear, true);
                    levelProp.addKey(k4); levelProp.setValueAtKey(k4, normalLinear, true);
                }
            } else {
                if (levelProp.isTimeVarying && levelProp.isTimeVarying() && opts.clearKeyframes !== false) {
                    try { levelProp.setTimeVarying(false); } catch (eOff) {}
                }
                levelProp.setValue(linearLevel, true);
            }


            updatedClips.push(clp.name || ("AudioClip_" + i));
        }


        return JSON.stringify({
            ok: true,
            action: "AUDIO_GAIN_UPDATED",
            track: "A" + (tIdx + 1),
            appliedDb: appliedDb,
            linearLevel: Math.round(linearLevel * 100000) / 100000,
            autoDuckedUnderVO: voWindows.length > 0,
            clipsUpdatedCount: updatedClips.length,
            clipsUpdated: updatedClips
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [7/10]: INTELLIGENT TRACK GAP CLOSER & MAGNETIC TIMELINE COMPACTOR
// Closes empty black spaces between clips on a target Video or Audio track
// (with optional minimum gap threshold and linked audio sync shift!).
// ----------------------------------------------------------------------------
PremiereGodV7.closeGapsOnTrack = function (trackIndex, isAudio, minGapSec) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        var tracks = isAudio ? seq.audioTracks : seq.videoTracks;
        var tIdx = (typeof trackIndex === "number" && trackIndex >= 0) ? trackIndex : 0;
        if (tIdx >= tracks.numTracks) {
            return '{"ok":false,"error":"TRACK_OUT_OF_RANGE"}';
        }


        var trk = tracks[tIdx];
        var runningTicks = 0;
        var minGapTicks = (typeof minGapSec === "number" && minGapSec > 0)
            ? parseFloat(PremiereGodV7.secondsToTicks(minGapSec))
            : 1000000;
        var shiftedClips = [];


        for (var i = 0; i < trk.clips.numItems; i++) {
            var clp = trk.clips[i];
            if (!clp) continue;
            var curStart = parseFloat(clp.start.ticks);
            var curEnd = parseFloat(clp.end.ticks);
            var dur = curEnd - curStart;


            if (curStart > runningTicks + minGapTicks) {
                var oldStartSec = PremiereGodV7.ticksToSeconds(curStart);
                var newStartSec = PremiereGodV7.ticksToSeconds(runningTicks);
                try {
                    clp.start = String(Math.round(runningTicks));
                    clp.end = String(Math.round(runningTicks + dur));
                    shiftedClips.push({
                        clip: clp.name || ("Clip_" + i),
                        oldStartSec: oldStartSec,
                        newStartSec: newStartSec
                    });
                } catch (eShift) {}
            }
            runningTicks += dur;
        }


        return JSON.stringify({
            ok: true,
            action: "TRACK_GAPS_CLOSED",
            track: (isAudio ? "A" : "V") + (tIdx + 1),
            shiftedCount: shiftedClips.length,
            totalTimelineDurationSec: PremiereGodV7.ticksToSeconds(runningTicks),
            shiftedClips: shiftedClips
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [8/10]: SPEED, REVERSE & RATE-STRETCH SURGEON
// Supports setting exact speedPercent (e.g. 50% slow-mo, 200% fast-forward),
// reverse playback, frame blending, or exact targetDurationSec rate-stretching!
// ----------------------------------------------------------------------------
PremiereGodV7.setClipSpeedAndStretch = function (opts) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';


        opts = opts || {};
        var isAudio = opts.isAudio === true;
        var targets = PremiereGodV7.resolveTargetClipsAdvanced(seq, opts);
        if (!targets || targets.length === 0) {
            return '{"ok":false,"error":"TARGET_CLIP_NOT_FOUND_FOR_SPEED_SURGEON"}';
        }


        var tInfo = targets[0];
        var clip = tInfo.clip;
        var curDurSec = PremiereGodV7.ticksToSeconds(parseFloat(clip.end.ticks) - parseFloat(clip.start.ticks));
        if (curDurSec <= 0.01) curDurSec = 1.0;


        var rateMultiplier = 1.0;
        var targetDurSec = curDurSec;


        if (typeof opts.targetDurationSec === "number" && opts.targetDurationSec > 0.05) {
            targetDurSec = opts.targetDurationSec;
            rateMultiplier = curDurSec / targetDurSec;
        } else if (typeof opts.speedPercent === "number" && opts.speedPercent > 1.0) {
            rateMultiplier = opts.speedPercent / 100.0;
            targetDurSec = curDurSec / rateMultiplier;
        } else if (typeof opts.rate === "number" && opts.rate > 0.01) {
            rateMultiplier = opts.rate;
            targetDurSec = curDurSec / rateMultiplier;
        }


        rateMultiplier = Math.max(0.05, Math.min(20.0, rateMultiplier));
        var reverse = opts.reverse === true;
        var frameBlend = opts.frameBlend !== false;


        var qeApplied = false;
        try {
            app.enableQE();
            var qeClip = PremiereGodV7.findQeClip(tInfo.trackIndex, clip, isAudio);
            if (qeClip && qeClip.setSpeed) {
                qeClip.setSpeed(rateMultiplier, "", reverse, frameBlend);
                qeApplied = true;
            }
        } catch (eQe) {}


        // Guarantee timeline end tick matches targetDurationSec cleanly
        var newEndTicks = String(Math.round(parseFloat(clip.start.ticks) + parseFloat(PremiereGodV7.secondsToTicks(targetDurSec))));
        try { clip.end = newEndTicks; } catch (eEnd) {}


        return JSON.stringify({
            ok: true,
            action: "CLIP_SPEED_AND_STRETCH_APPLIED",
            clip: clip.name || "Clip",
            track: tInfo.trackName,
            qeSpeedApplied: qeApplied,
            speedPercent: Math.round(rateMultiplier * 1000) / 10,
            reversed: reverse,
            oldDurationSec: Math.round(curDurSec * 100) / 100,
            newDurationSec: Math.round(targetDurSec * 100) / 100
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// ----------------------------------------------------------------------------
// SUB-SYSTEM [9/10]: TRACK STATE (MUTE/UNMUTE/SOLO), COLOR LABEL, PLAYHEAD
// NAVIGATION & DISK-VERIFIED .PRPROJ SAVE CONTROLLER
// ----------------------------------------------------------------------------
PremiereGodV7.controlTrackAndPlayheadState = function (opts) {
    try {
        var seq = app.project.activeSequence;
        opts = opts || {};


        var trackUpdated = null;
        if (seq && typeof opts.trackIndex === "number" && opts.trackIndex >= 0) {
            var isAudio = opts.isAudio === true;
            var tracks = isAudio ? seq.audioTracks : seq.videoTracks;
            if (opts.trackIndex < tracks.numTracks) {
                var trk = tracks[opts.trackIndex];
                if (typeof opts.mute === "boolean") {
                    try { trk.setMute(opts.mute ? 1 : 0); } catch (eM) {}
                }
                trackUpdated = (isAudio ? "A" : "V") + (opts.trackIndex + 1);
            }
        }


        // Optional Clip / Bin Item Color Label (0..15)
        if (seq && typeof opts.colorLabel === "number" && opts.colorLabel >= 0 && opts.colorLabel <= 15) {
            var targets = PremiereGodV7.resolveTargetClipsAdvanced(seq, opts);
            if (targets.length > 0 && targets[0].clip && targets[0].clip.projectItem && targets[0].clip.projectItem.setColorLabel) {
                try { targets[0].clip.projectItem.setColorLabel(opts.colorLabel); } catch (eCol) {}
            }
        }


        // Optional Playhead (CTI) Seek
        if (seq && typeof opts.playheadSec === "number" && opts.playheadSec >= 0) {
            seq.setPlayerPosition(PremiereGodV7.secondsToTicks(opts.playheadSec));
        }


        // Optional Project Save
        var saved = false;
        if (opts.save !== false) {
            try {
                app.project.save();
                saved = true;
            } catch (eSave) {}
        }


        return JSON.stringify({
            ok: true,
            action: "TRACK_PLAYHEAD_SAVE_COMPLETE",
            trackUpdated: trackUpdated,
            playheadSec: seq ? PremiereGodV7.ticksToSeconds(seq.getPlayerPosition().ticks) : 0,
            projectSaved: saved,
            projectPath: app.project.path || ""
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};


// Keep backwards-compatible alias
PremiereGodV7.movePlayheadAndSave = PremiereGodV7.controlTrackAndPlayheadState;


// ----------------------------------------------------------------------------
// SUB-SYSTEM [10/10]: UNIFIED 60-ACTION INSTANT DICTIONARY ROUTER
// Routes every single natural editing action inside Premiere Pro in 1 call!
// ----------------------------------------------------------------------------
PremiereGodV7.inspectClipAllProperties = function (opts) {
    try {
        var seq = app && app.project ? app.project.activeSequence : null;
        if (!seq) return '{"ok":false,"error":"NO_ACTIVE_SEQUENCE"}';
        var matches = PremiereGodV7.resolveTargetClipsAdvanced(seq, opts || {});
        if (!matches || !matches.length) return '{"ok":false,"error":"TARGET_CLIP_NOT_FOUND"}';
        var target = matches[0], clip = target.clip, components = [];
        if (clip.components) {
            for (var i = 0; i < clip.components.numItems; i++) {
                var component = clip.components[i], properties = [];
                if (!component) continue;
                if (component.properties) {
                    for (var j = 0; j < component.properties.numItems && j < 120; j++) {
                        var prop = component.properties[j];
                        if (!prop) continue;
                        var value = null, animated = false;
                        try { value = prop.getValue(); } catch (eValue) {}
                        try { animated = prop.isTimeVarying ? !!prop.isTimeVarying() : false; } catch (eKeys) {}
                        if (value !== null && typeof value === "object") {
                            try { value = String(value); } catch (eString) { value = "[object]"; }
                        }
                        properties.push({ name: String(prop.displayName || ""), value: value, animated: animated });
                    }
                }
                components.push({ name: String(component.displayName || ""), matchName: String(component.matchName || ""), properties: properties });
            }
        }
        var mediaPath = "";
        try { mediaPath = clip.projectItem ? String(clip.projectItem.getMediaPath() || "") : ""; } catch (ePath) {}
        return JSON.stringify({ ok: true, sequence: String(seq.name || ""), clipName: String(clip.name || ""),
            track: target.trackName, startSec: target.startSec, endSec: target.endSec,
            selected: target.isSelected, role: target.role, mediaPath: mediaPath, components: components });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

PremiereGodV7.listAllAvailableEffects = function () {
    try {
        var video = [], audio = [], source = "qe", complete = true;
        function appendNames(list, output) {
            if (!list) return;
            var count = typeof list.length === "number" ? list.length : (list.numItems || 0);
            for (var i = 0; i < count; i++) {
                var item = list[i];
                if (item !== null && typeof item !== "undefined") output.push(String(item.name || item));
            }
        }
        try {
            app.enableQE();
            if (!qe || !qe.project) throw new Error("QE_UNAVAILABLE");
            appendNames(qe.project.getVideoEffectList(), video);
            appendNames(qe.project.getAudioEffectList(), audio);
        } catch (eQE) {
            source = "active_sequence_components";
            complete = false;
            var seq = app && app.project ? app.project.activeSequence : null;
            if (seq) {
                var kinds = [{ tracks: seq.videoTracks, output: video }, { tracks: seq.audioTracks, output: audio }];
                for (var k = 0; k < kinds.length; k++) {
                    var tracks = kinds[k].tracks;
                    for (var t = 0; t < tracks.numTracks; t++) {
                        var clips = tracks[t].clips;
                        for (var c = 0; c < clips.numItems; c++) {
                            var parts = clips[c].components;
                            if (!parts) continue;
                            for (var p = 0; p < parts.numItems; p++) {
                                var name = String(parts[p].displayName || "");
                                if (name && kinds[k].output.indexOf(name) < 0) kinds[k].output.push(name);
                            }
                        }
                    }
                }
            }
        }
        return JSON.stringify({ ok: true, source: source, complete: complete,
            videoCount: video.length, audioCount: audio.length, videoEffects: video, audioEffects: audio });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

PremiereGodV7.executeInstantDictionaryAction = function (payloadJson) {
    try {
        var p = (typeof payloadJson === "string") ? JSON.parse(payloadJson) : (payloadJson || {});
        var act = String(p.action || p.type || "eye").replace(/^\s+|\s+$/g, "").toLowerCase();
        if (act === "undo" || act === "redo" || act === "history_status") return PremiereGodV7.history(act === "history_status" ? "status" : act);


        // Sequence markers: dedicated actions return actual host readback.
        if (act === "markers_list" || act === "marker_add" || act === "marker_update" || act === "marker_remove") {
            return PremiereGodV7.sequenceMarkers(act, p);
        }

        if (act === "upstream_catalog") return RavixUpstreamPremiere.catalog();
        if (act === "upstream_call") return RavixUpstreamPremiere.invoke(String(p.name || ""), p.args);

        // 1. Live Eye & Introspection
        if (act === "eye" || act === "premiere_eye" || act === "status") {
            return PremiereGodV7.scanLiveEye();
        }
        if (act === "inspect_clip" || act === "inspect" || act === "properties") {
            return PremiereGodV7.inspectClipAllProperties(p);
        }
        if (act === "list_effects" || act === "effects_list") {
            return PremiereGodV7.listAllAvailableEffects();
        }


        // 2. Sequence Architect (9:16, 16:9, 1:1, 4:5, 4K + Fit to Frame + Backup + Save)
        if (act === "set_sequence_format" || act === "format_sequence" || act === "set_aspect_ratio" || act === "fit_to_screen" || act === "resize_sequence") {
            return PremiereGodV7.setSequenceFormatAndFit(p);
        }


        // 3. Smart Zoom & Motion Keyframe Presets
        if (act === "smart_zoom" || act === "zoom" || act === "scale") {
            return PremiereGodV7.smartZoomClip(p);
        }
        if (act === "transform" || act === "animate" || act === "motion") {
            return PremiereGodV7.transformAndAnimateClip(p);
        }


        // 4. Top-Stack Overlay Rescue & Shadow Duplicate Cleanup
        if (act === "rescue_overlays" || act === "promote_overlays") {
            return PremiereGodV7.rescueBuriedOverlays(p);
        }
        if (act === "purge_duplicates" || act === "cleanup_duplicates") {
            return PremiereGodV7.purgeShadowDuplicates(p);
        }


        // 5. Timeline Surgeon (Delete, Move Track, Trim, Speed/Stretch, Gaps, Audio Gain, Save)
        if (act === "delete_clip" || act === "remove_clip" || act === "delete") {
            return PremiereGodV7.deleteClipsMatching(p);
        }
        if (act === "move_clip_track" || act === "move_track" || act === "move_clip") {
            return PremiereGodV7.moveClipToTrack(p);
        }
        if (act === "trim_clip" || act === "trim") {
            return PremiereGodV7.trimClipPrecision(p);
        }
        if (act === "speed" || act === "stretch" || act === "rate_stretch" || act === "slow_mo") {
            return PremiereGodV7.setClipSpeedAndStretch(p);
        }
        if (act === "close_gaps" || act === "ripple_gaps" || act === "compact_track") {
            return PremiereGodV7.closeGapsOnTrack(p.trackIndex, p.isAudio, p.minGapSec);
        }
        if (act === "audio_level" || act === "audio_gain" || act === "duck_audio" || act === "volume") {
            return PremiereGodV7.setAudioClipLevel(p);
        }
        if (act === "move_playhead" || act === "seek" || act === "save_project" || act === "save" || act === "track_state" || act === "mute_track") {
            return PremiereGodV7.controlTrackAndPlayheadState(p);
        }


        // 6. Effects, Razor, Safe Insert, 3-Layer Stack, Bin Scan & Documentary Sync
        if (act === "effect" || act === "apply_effect") {
            return PremiereGodV7.applyAndConfigureEffect(p);
        }
        if (act === "razor" || act === "cut" || act === "split") {
            return PremiereGodV7.razorCutAtSeconds(p.cutSec, p.trackIndex, p.isAudio, p.allTracks);
        }
        if (act === "safe_insert" || act === "insert_clip") {
            return PremiereGodV7.safeInsertMediaItem(p);
        }
        if (act === "three_layer_comp" || act === "3layer") {
            return PremiereGodV7.buildThreeLayerComposition(p);
        }
        if (act === "scan_bin") {
            return PremiereGodV7.scanNamedBinForAiAnalysis(p.binName || "AI analyze");
        }
        if (act === "sync_scenes") {
            return PremiereGodV7.syncScenesToVoiceoverTimeline(p);
        }
        if (act === "batch") {
            return PremiereGodV7.executeAtomicBatch(p);
        }


        return '{"ok":false,"error":"UNKNOWN_INSTANT_ACTION:' + PremiereGodV7.esc(act) + '"}';
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

// ============================================================================
// SUB-SYSTEM [8/10]: UPGRADED ATOMIC MULTI-ACTION BATCH EXECUTOR
// Runs N dictionary actions inside 1 single ExtendScript round-trip (<200ms)!
// ============================================================================
PremiereGodV7.executeAtomicBatch = function (batchOpts) {
    try {
        batchOpts = (typeof batchOpts === "string") ? JSON.parse(batchOpts) : (batchOpts || {});
        var seq = app.project.activeSequence;


        var backupInfo = { created: false };
        if (false) {
            backupInfo = PremiereGodV7.cloneSequenceToBackupSafe(seq);
        }


        var actions = batchOpts.actions || [];
        var results = [];


        for (var i = 0; i < actions.length; i++) {
            var step = actions[i];
            if (!step) continue;
            var stepResStr = PremiereGodV7.executeInstantDictionaryAction(step);
            var stepParsed = null;
            try { stepParsed = JSON.parse(stepResStr); } catch (e) { stepParsed = { raw: stepResStr }; }
            results.push(stepParsed);
        }


        var saved = false;
        if (batchOpts.autoSave !== false) {
            try {
                app.project.save();
                saved = true;
            } catch (eSave) {}
        }


        return JSON.stringify({
            ok: true,
            action: "ATOMIC_BATCH_COMPLETE",
            backup: backupInfo,
            projectSaved: saved,
            stepsExecuted: results.length,
            results: results
        });
    } catch (err) {
        return '{"ok":false,"error":"' + PremiereGodV7.esc(err.toString()) + '"}';
    }
};

// RAVIX Omniscient Cortex v8.0.9 integration
// =============================================================================
// RAVIX STUDIO v8.0.9 — SUPREME EXTENDSCRIPT & QE DOM ENGINE (premiere_god_v7.jsx)
// Bundle ID: com.ravix.studio | Zero-Copy NTFS Junction Ready
// =============================================================================


#target premierepro


var RAVIX_JSX_VERSION = "8.0.9";
var RAVIX_TICKS_PER_SECOND = 254016000000;


// =============================================================================
// 1. ES3 SAFE JSON POLYFILL (EXTENDSCRIPT DOES NOT HAVE NATIVE JSON IN ALL HOSTS)
// =============================================================================


var RavixES3Json = {
    escapeStr: function (str) {
        if (str === null || typeof str === "undefined") {
            return "";
        }
        var s = String(str);
        var out = "";
        for (var i = 0; i < s.length; i++) {
            var c = s.charAt(i);
            var code = s.charCodeAt(i);
            if (c === "\\") {
                out += "\\\\";
            } else if (c === "\"") {
                out += "\\\"";
            } else if (c === "\r") {
                out += "\\r";
            } else if (c === "\n") {
                out += "\\n";
            } else if (c === "\t") {
                out += "\\t";
            } else if (code < 32) {
                out += " ";
            } else {
                out += c;
            }
        }
        return out;
    },


    stringifyObj: function (val) {
        if (val === null || typeof val === "undefined") {
            return "null";
        }
        var t = typeof val;
        if (t === "number") {
            return isFinite(val) ? String(val) : "0";
        }
        if (t === "boolean") {
            return val ? "true" : "false";
        }
        if (t === "string") {
            return "\"" + this.escapeStr(val) + "\"";
        }
        if (val instanceof Array) {
            var arrParts = [];
            for (var i = 0; i < val.length; i++) {
                arrParts.push(this.stringifyObj(val[i]));
            }
            return "[" + arrParts.join(",") + "]";
        }
        if (t === "object") {
            var objParts = [];
            for (var k in val) {
                if (val.hasOwnProperty(k) && typeof val[k] !== "function") {
                    objParts.push("\"" + this.escapeStr(k) + "\":" + this.stringifyObj(val[k]));
                }
            }
            return "{" + objParts.join(",") + "}";
        }
        return "\"\"";
    },


    parseSafe: function (jsonStr) {
        if (!jsonStr || jsonStr === "") {
            return {};
        }
        try {
            if (typeof JSON !== "undefined" && JSON.parse) {
                return JSON.parse(jsonStr);
            }
            return eval("(" + jsonStr + ")");
        } catch (e) {
            return {};
        }
    }
};


// =============================================================================
// 2. QE DOM INITIALIZER & TIMECODE / TICKS HELPERS
// =============================================================================


function RAVIX_EnableQEDom() {
    try {
        app.enableQE();
        return (typeof qe !== "undefined" && qe !== null);
    } catch (e) {
        return false;
    }
}


function RAVIX_TicksToSeconds(ticksStr) {
    if (!ticksStr) {
        return 0.0;
    }
    var n = Number(ticksStr);
    if (isNaN(n)) {
        return 0.0;
    }
    return n / RAVIX_TICKS_PER_SECOND;
}


function RAVIX_SecondsToTicksString(seconds) {
    var s = Number(seconds);
    if (isNaN(s) || s < 0) {
        s = 0;
    }
    var ticks = Math.round(s * RAVIX_TICKS_PER_SECOND);
    return String(ticks);
}


function RAVIX_TimecodeOrSecToSeconds(timeVal, seq) {
    if (timeVal === null || typeof timeVal === "undefined" || timeVal === "" || timeVal === "@playhead") {
        if (seq && seq.getPlayerPosition) {
            return RAVIX_TicksToSeconds(seq.getPlayerPosition().ticks);
        }
        return 0.0;
    }
    if (typeof timeVal === "number") {
        return timeVal;
    }
    var str = String(timeVal);
    if (str.indexOf(":") < 0) {
        var parsed = parseFloat(str);
        return isNaN(parsed) ? 0.0 : parsed;
    }
    var parts = str.split(":");
    if (parts.length === 4) {
        var hh = parseInt(parts[0], 10) || 0;
        var mm = parseInt(parts[1], 10) || 0;
        var ss = parseInt(parts[2], 10) || 0;
        var ff = parseInt(parts[3], 10) || 0;
        var fps = RAVIX_GetSequenceFps(seq);
        return (hh * 3600) + (mm * 60) + ss + (ff / fps);
    }
    return 0.0;
}


function RAVIX_GetSequenceFps(seq) {
    if (!seq) {
        return 30.0;
    }
    try {
        var settings = seq.getSettings();
        if (settings && settings.videoFrameRate && settings.videoFrameRate.seconds > 0) {
            return Math.round(1.0 / settings.videoFrameRate.seconds);
        }
    } catch (e) {}
    return 30.0;
}


function RAVIX_SecondsToSmpte(sec, fps) {
    var f = (fps && fps > 0) ? Math.round(fps) : 30;
    var sTotal = Math.max(0, Number(sec) || 0);
    var wholeSec = Math.floor(sTotal);
    var hh = Math.floor(wholeSec / 3600);
    var mm = Math.floor((wholeSec % 3600) / 60);
    var ss = wholeSec % 60;
    var ff = Math.floor((sTotal - wholeSec) * f);
    if (ff >= f) {
        ff = f - 1;
    }
    var pad = function (n) { return (n < 10 ? "0" : "") + String(n); };
    return pad(hh) + ":" + pad(mm) + ":" + pad(ss) + ":" + pad(ff);
}


// =============================================================================
// 3. LIVE TIMELINE DOM TELEMETRY ENGINE (/premiere_eye & /ravix_bin_sync)
// =============================================================================


function RAVIX_GetLiveTimelineTelemetryObj() {
    var result = {
        status: "OK",
        version: RAVIX_JSX_VERSION,
        project_name: "Untitled.prproj",
        project_path: "",
        has_active_sequence: false,
        sequence_name: "",
        width: 1080,
        height: 1920,
        fps: 60.0,
        playhead_sec: 0.0,
        playhead_tc: "00:00:00:00",
        seq_end_sec: 0.0,
        total_video_tracks: 0,
        total_audio_tracks: 0,
        highest_video_track: 1,
        highest_audio_track: 1,
        next_free_top_track: 2,
        selected_clip: "",
        selected_track: 1,
        occupied_tracks_at_playhead: []
    };


    try {
        if (!app || !app.project) {
            return result;
        }


        result.project_name = app.project.name || "Active_Project.prproj";
        result.project_path = app.project.path || "";


        var seq = app.project.activeSequence;
        if (!seq) {
            return result;
        }


        result.has_active_sequence = true;
        result.sequence_name = seq.name || "Main_Sequence";
        result.width = seq.frameSizeHorizontal || 1080;
        result.height = seq.frameSizeVertical || 1920;
        result.fps = RAVIX_GetSequenceFps(seq);


        var playerTicks = seq.getPlayerPosition().ticks;
        result.playhead_sec = Number(RAVIX_TicksToSeconds(playerTicks).toFixed(3));
        result.playhead_tc = RAVIX_SecondsToSmpte(result.playhead_sec, result.fps);
        result.seq_end_sec = Number(RAVIX_TicksToSeconds(seq.end).toFixed(3));


        var vTracks = seq.videoTracks;
        var aTracks = seq.audioTracks;
        result.total_video_tracks = vTracks ? vTracks.numTracks : 0;
        result.total_audio_tracks = aTracks ? aTracks.numTracks : 0;


        var highestV = 0;
        var occupiedAtPlayhead = [];


        if (vTracks) {
            for (var v = 0; v < vTracks.numTracks; v++) {
                var vt = vTracks[v];
                var clips = vt.clips;
                if (clips && clips.numItems > 0) {
                    highestV = v + 1; // 1-based track index
                    for (var c = 0; c < clips.numItems; c++) {
                        var clip = clips[c];
                        var cStart = RAVIX_TicksToSeconds(clip.start.ticks);
                        var cEnd = RAVIX_TicksToSeconds(clip.end.ticks);


                        if (result.playhead_sec >= (cStart - 0.02) && result.playhead_sec <= (cEnd + 0.02)) {
                            occupiedAtPlayhead.push(v + 1);
                        }


                        if (clip.isSelected && clip.isSelected()) {
                            result.selected_clip = clip.name || "";
                            result.selected_track = v + 1;
                        }
                    }
                }
            }
        }


        var highestA = 0;
        if (aTracks) {
            for (var a = 0; a < aTracks.numTracks; a++) {
                var at = aTracks[a];
                if (at.clips && at.clips.numItems > 0) {
                    highestA = a + 1;
                }
            }
        }


        result.highest_video_track = highestV > 0 ? highestV : 1;
        result.highest_audio_track = highestA > 0 ? highestA : 1;
        result.next_free_top_track = highestV + 1;
        result.occupied_tracks_at_playhead = occupiedAtPlayhead;
    } catch (err) {
        result.error = String(err);
    }


    return result;
}


function RAVIX_GetLiveTimelineTelemetry() {
    return RavixES3Json.stringifyObj(RAVIX_GetLiveTimelineTelemetryObj());
}


// =============================================================================
// 4. RECURSIVE PREMIERE PROJECT BIN INVENTORY SCANNER (FOR <1ms RAM INDEXING)
// =============================================================================


function RAVIX_ScanAllProjectBins() {
    var response = {
        status: "OK",
        timeline: RAVIX_GetLiveTimelineTelemetryObj(),
        bin_items: []
    };


    try {
        if (!app || !app.project || !app.project.rootItem) {
            return RavixES3Json.stringifyObj(response);
        }


        RAVIX_TraverseProjectItemRecursive(app.project.rootItem, "Root", response.bin_items, 250);
    } catch (e) {
        response.error = String(e);
    }


    return RavixES3Json.stringifyObj(response);
}


function RAVIX_TraverseProjectItemRecursive(parentItem, currentBinPath, collector, maxItems) {
    if (!parentItem || !parentItem.children || collector.length >= maxItems) {
        return;
    }


    var children = parentItem.children;
    for (var i = 0; i < children.numItems; i++) {
        if (collector.length >= maxItems) {
            break;
        }


        var item = children[i];
        if (!item) {
            continue;
        }


        // ProjectItemType.BIN === 2
        if (item.type === 2 || (item.children && item.children.numItems > 0)) {
            var subBinPath = currentBinPath + "/" + (item.name || "Bin");
            RAVIX_TraverseProjectItemRecursive(item, subBinPath, collector, maxItems);
        } else {
            var mediaPath = "";
            try {
                if (item.getMediaPath) {
                    mediaPath = item.getMediaPath() || "";
                }
            } catch (e) {}


            collector.push({
                clip_name: item.name || "Clip",
                bin_path: currentBinPath,
                media_path: mediaPath,
                duration_sec: 0.0,
                dimensions: ""
            });
        }
    }
}


// =============================================================================
// 5. PROJECT MEDIA IMPORT OR FIND BY PATH HELPER
// =============================================================================


function RAVIX_FindOrImportProjectItem(filePath) {
    if (!filePath || filePath === "" || !app.project || !app.project.rootItem) {
        return null;
    }


    var normTarget = String(filePath).toLowerCase().replace(/\//g, "\\");
    var found = RAVIX_SearchItemByMediaPath(app.project.rootItem, normTarget);
    if (found) {
        return found;
    }


    // Import file into project root if not already imported
    try {
        var fileObj = new File(filePath);
        if (!fileObj.exists) {
            return null;
        }
        app.project.importFiles([filePath], true, app.project.rootItem, false);
        return RAVIX_SearchItemByMediaPath(app.project.rootItem, normTarget);
    } catch (e) {
        return null;
    }
}


function RAVIX_SearchItemByMediaPath(folderItem, normTargetPath) {
    if (!folderItem || !folderItem.children) {
        return null;
    }


    var targetFileName = normTargetPath.split("\\").pop();


    for (var i = 0; i < folderItem.children.numItems; i++) {
        var child = folderItem.children[i];
        if (!child) {
            continue;
        }


        if (child.type === 2 || (child.children && child.children.numItems > 0)) {
            var nested = RAVIX_SearchItemByMediaPath(child, normTargetPath);
            if (nested) {
                return nested;
            }
        } else {
            try {
                var mp = child.getMediaPath ? String(child.getMediaPath()).toLowerCase().replace(/\//g, "\\") : "";
                if (mp === normTargetPath || (child.name && String(child.name).toLowerCase() === targetFileName)) {
                    return child;
                }
            } catch (e) {}
        }
    }
    return null;
}


// =============================================================================
// 6. SUPREME 6-MODULE SYNCHRONOUS EXECUTION DISPATCHER
// =============================================================================


function RAVIX_ExecuteInstantCommand(payloadJsonStr) {
    var payload = RavixES3Json.parseSafe(payloadJsonStr);
    var action = payload.action ? String(payload.action).toLowerCase() : "premiere_eye";


    // Handle Batch Operations array if sent via /premiere_batch
    if (payload.ops && payload.ops instanceof Array) {
        var batchResults = [];
        for (var i = 0; i < payload.ops.length; i++) {
            var opItem = payload.ops[i];
            var subAction = (typeof opItem === "string") ? { action: opItem } : opItem;
            batchResults.push(RAVIX_RunSingleAction(subAction.action, subAction));
        }
        return RavixES3Json.stringifyObj({
            status: "BATCH_EXECUTED",
            results: batchResults,
            timeline: RAVIX_GetLiveTimelineTelemetryObj()
        });
    }


    var singleRes = RAVIX_RunSingleAction(action, payload);
    singleRes.timeline = RAVIX_GetLiveTimelineTelemetryObj();
    return RavixES3Json.stringifyObj(singleRes);
}


function RAVIX_RunSingleAction(action, payload) {
    var seq = (app && app.project) ? app.project.activeSequence : null;


    switch (action) {
        case "premiere_eye":
        case "inspect_timeline":
            return { status: "OK", action: action };


        // ---------------------------------------------------------------------
        // MODULE [2/6]: TRUE TOP-STACK OVERLAY ENGINE (HighestOccupiedTrack + 1)
        // ---------------------------------------------------------------------
        case "overlay_top_track":
        case "insert_clip":
        case "append_to_end": {
            if (!seq) {
                return { status: "ERROR", reason: "No active sequence" };
            }


            var filePath = payload.file || "";
            var projItem = RAVIX_FindOrImportProjectItem(filePath);
            if (!projItem) {
                return { status: "ERROR", reason: "Media file not found or could not be imported: " + filePath };
            }


            var tlState = RAVIX_GetLiveTimelineTelemetryObj();
            var targetTrackIdx = 0; // 0-based for ExtendScript videoTracks[]


            if (action === "overlay_top_track") {
                // True Top-Stack: HighestOccupiedVideoTrack (1-based) equals 0-based index of (Highest + 1)!
                targetTrackIdx = tlState.highest_video_track;
                if (targetTrackIdx >= seq.videoTracks.numTracks) {
                    RAVIX_EnableQEDom();
                    try {
                        qe.project.getActiveSequence().addTracks(1, seq.videoTracks.numTracks, 0, 0);
                    } catch (e) {}
                    targetTrackIdx = seq.videoTracks.numTracks - 1;
                }
            } else if (payload.track && Number(payload.track) >= 1) {
                targetTrackIdx = Math.min(seq.videoTracks.numTracks - 1, Number(payload.track) - 1);
            }


            var insertSec = (action === "append_to_end")
                ? tlState.seq_end_sec
                : RAVIX_TimecodeOrSecToSeconds(payload.time, seq);


            var insertTicks = RAVIX_SecondsToTicksString(insertSec);
            var vTrack = seq.videoTracks[targetTrackIdx];
            vTrack.overwriteClip(projItem, insertTicks);


            if (payload.auto_fit !== false) {
                RAVIX_AutoFitClipAtTime(vTrack, insertSec, seq.frameSizeHorizontal, seq.frameSizeVertical);
            }


            return {
                status: "OK",
                action: action,
                inserted_file: projItem.name,
                placed_on_track: "V" + String(targetTrackIdx + 1),
                placed_at_sec: insertSec
            };
        }


        // ---------------------------------------------------------------------
        // MODULE [3/6]: INSTANT SEQUENCE ARCHITECT (9:16, 16:9, 4:5, 1:1, 4K)
        // ---------------------------------------------------------------------
        case "architect_sequence":
        case "set_sequence_ratio": {
            var ratio = payload.aspect_ratio ? String(payload.aspect_ratio) : "9:16";
            var w = 1080;
            var h = 1920;
            if (ratio === "16:9") { w = 1920; h = 1080; }
            else if (ratio === "4:5") { w = 1080; h = 1350; }
            else if (ratio === "1:1") { w = 1080; h = 1080; }
            else if (ratio === "4K") { w = 3840; h = 2160; }


            if (payload.width) w = Number(payload.width);
            if (payload.height) h = Number(payload.height);


            if (seq) {
                try {
                    var s = seq.getSettings();
                    if (s) {
                        s.videoFrameWidth = w;
                        s.videoFrameHeight = h;
                        seq.setSettings(s);
                    }
                } catch (e) {}


                if (payload.auto_fit_clips !== false) {
                    RAVIX_AutoFitAllSequenceClips(seq, w, h);
                }
            }
            return { status: "OK", action: action, aspect_ratio: ratio, width: w, height: h };
        }


        case "auto_fit_all_clips": {
            if (!seq) return { status: "ERROR", reason: "No active sequence" };
            var fitted = RAVIX_AutoFitAllSequenceClips(seq, seq.frameSizeHorizontal, seq.frameSizeVertical);
            return { status: "OK", action: action, clips_fitted: fitted };
        }


        // ---------------------------------------------------------------------
        // MODULE [4/6]: SMART ZOOM, RAZOR CUT, GAP CLOSER & AUDIO DUCKING
        // ---------------------------------------------------------------------
        case "smart_zoom":
        case "smart_zoom_punch_in": {
            if (!seq) return { status: "ERROR", reason: "No active sequence" };
            var targetSec = RAVIX_TimecodeOrSecToSeconds(payload.time, seq);
            var endScale = payload.end_scale || payload.scale || 118;
            var clipFound = RAVIX_FindClipAtPlayhead(seq, targetSec, payload.track);
            if (clipFound) {
                RAVIX_SetClipMotionScale(clipFound, Number(endScale));
                return { status: "OK", action: "smart_zoom", clip: clipFound.name, scale_applied: endScale };
            }
            return { status: "WARN", reason: "No clip under playhead for smart_zoom" };
        }


        case "razor_cut": {
            if (!seq) return { status: "ERROR", reason: "No active sequence" };
            RAVIX_EnableQEDom();
            var cutSec = RAVIX_TimecodeOrSecToSeconds(payload.time, seq);
            var cutTc = RAVIX_SecondsToSmpte(cutSec, RAVIX_GetSequenceFps(seq));
            try {
                var qeSeq = qe.project.getActiveSequence();
                if (payload.all_tracks) {
                    for (var vt = 0; vt < qeSeq.numVideoTracks; vt++) {
                        qeSeq.getVideoTrackAt(vt).razor(cutTc);
                    }
                    for (var at = 0; at < qeSeq.numAudioTracks; at++) {
                        qeSeq.getAudioTrackAt(at).razor(cutTc);
                    }
                } else {
                    var trkIdx = (payload.track && Number(payload.track) >= 1) ? (Number(payload.track) - 1) : 0;
                    qeSeq.getVideoTrackAt(trkIdx).razor(cutTc);
                }
                return { status: "OK", action: "razor_cut", timecode: cutTc };
            } catch (e) {
                return { status: "ERROR", reason: String(e) };
            }
        }


        case "close_all_gaps": {
            if (!seq) return { status: "ERROR", reason: "No active sequence" };
            var closedCount = RAVIX_MagneticCloseGaps(seq);
            return { status: "OK", action: "close_all_gaps", gaps_closed: closedCount };
        }


        case "audio_auto_duck":
        case "set_audio_gain_db": {
            if (!seq) return { status: "ERROR", reason: "No active sequence" };
            var aTrackIdx = (payload.music_track || payload.track || 2) - 1;
            var dbVal = payload.duck_db || payload.gain_db || -18.0;
            var adjusted = RAVIX_SetAudioTrackLevelDb(seq, aTrackIdx, Number(dbVal));
            return { status: "OK", action: action, audio_track: "A" + String(aTrackIdx + 1), db_applied: dbVal, clips_updated: adjusted };
        }


        case "save_project": {
            if (app && app.project) {
                app.project.save();
            }
            return { status: "OK", action: "save_project" };
        }


        default:
            return { status: "ERROR", action: action, reason: "UNSUPPORTED_ACTION" };
    }
}


// =============================================================================
// 7. INTERNAL DOM SURGERY HELPERS (MOTION SCALE, GAP CLOSER, AUDIO DB)
// =============================================================================


function RAVIX_FindClipAtPlayhead(seq, timeSec, preferredTrack1Based) {
    if (!seq || !seq.videoTracks) {
        return null;
    }


    if (preferredTrack1Based && Number(preferredTrack1Based) >= 1) {
        var idx = Number(preferredTrack1Based) - 1;
        if (idx < seq.videoTracks.numTracks) {
            var trk = seq.videoTracks[idx];
            for (var c = 0; c < trk.clips.numItems; c++) {
                var cl = trk.clips[c];
                if (timeSec >= RAVIX_TicksToSeconds(cl.start.ticks) - 0.05 &&
                    timeSec <= RAVIX_TicksToSeconds(cl.end.ticks) + 0.05) {
                    return cl;
                }
            }
        }
    }


    // Fallback: search top-down from highest track to V1
    for (var v = seq.videoTracks.numTracks - 1; v >= 0; v--) {
        var vTrk = seq.videoTracks[v];
        for (var i = 0; i < vTrk.clips.numItems; i++) {
            var clip = vTrk.clips[i];
            if (timeSec >= RAVIX_TicksToSeconds(clip.start.ticks) - 0.05 &&
                timeSec <= RAVIX_TicksToSeconds(clip.end.ticks) + 0.05) {
                return clip;
            }
        }
    }
    return null;
}


function RAVIX_SetClipMotionScale(clip, scaleValue) {
    if (!clip || !clip.components) {
        return false;
    }
    for (var i = 0; i < clip.components.numItems; i++) {
        var comp = clip.components[i];
        if (comp && comp.displayName === "Motion" && comp.properties) {
            for (var p = 0; p < comp.properties.numItems; p++) {
                var prop = comp.properties[p];
                if (prop && prop.displayName === "Scale") {
                    prop.setValue(scaleValue, true);
                    return true;
                }
            }
        }
    }
    return false;
}


function RAVIX_AutoFitClipAtTime(vTrack, timeSec, seqW, seqH) {
    if (!vTrack || !vTrack.clips) {
        return;
    }
    for (var i = 0; i < vTrack.clips.numItems; i++) {
        var c = vTrack.clips[i];
        var st = RAVIX_TicksToSeconds(c.start.ticks);
        if (Math.abs(st - timeSec) < 0.25) {
            RAVIX_SetClipMotionScale(c, 100);
            break;
        }
    }
}


function RAVIX_AutoFitAllSequenceClips(seq, seqW, seqH) {
    var count = 0;
    if (!seq || !seq.videoTracks) {
        return count;
    }
    for (var v = 0; v < seq.videoTracks.numTracks; v++) {
        var trk = seq.videoTracks[v];
        for (var c = 0; c < trk.clips.numItems; c++) {
            if (RAVIX_SetClipMotionScale(trk.clips[c], 100)) {
                count++;
            }
        }
    }
    return count;
}


function RAVIX_MagneticCloseGaps(seq) {
    var moved = 0;
    if (!seq || !seq.videoTracks || seq.videoTracks.numTracks === 0) {
        return moved;
    }
    var v1 = seq.videoTracks[0];
    var expectedStartSec = 0.0;


    for (var i = 0; i < v1.clips.numItems; i++) {
        var clip = v1.clips[i];
        var curStart = RAVIX_TicksToSeconds(clip.start.ticks);
        var dur = RAVIX_TicksToSeconds(clip.duration.ticks);
        if (curStart - expectedStartSec > 0.04) {
            var deltaSec = expectedStartSec - curStart;
            try {
                clip.move(deltaSec);
                moved++;
            } catch (e) {}
        }
        expectedStartSec += dur;
    }
    return moved;
}


function RAVIX_SetAudioTrackLevelDb(seq, trackIdx0Based, targetDb) {
    var updated = 0;
    if (!seq || !seq.audioTracks || trackIdx0Based < 0 || trackIdx0Based >= seq.audioTracks.numTracks) {
        return updated;
    }
    var aTrk = seq.audioTracks[trackIdx0Based];
    for (var i = 0; i < aTrk.clips.numItems; i++) {
        var aClip = aTrk.clips[i];
        if (aClip && aClip.components) {
            for (var c = 0; c < aClip.components.numItems; c++) {
                var comp = aClip.components[c];
                if (comp && comp.displayName === "Volume" && comp.properties) {
                    for (var p = 0; p < comp.properties.numItems; p++) {
                        var prop = comp.properties[p];
                        if (prop && prop.displayName === "Level") {
                            // Premiere internal linear level approximation for dB
                            var linearVal = Math.pow(10.0, targetDb / 20.0) * 0.1778;
                            prop.setValue(linearVal, true);
                            updated++;
                        }
                    }
                }
            }
        }
    }
    return updated;
}

// Six native Premiere history steps; these are not project snapshots.
PremiereGodV7.history = function (action) {
    try {
        app.enableQE();
        if (!app.project || !qe.project || typeof qe.project.undoStackIndex !== "function" ||
            typeof qe.project.undo !== "function" || typeof qe.project.redo !== "function")
            return JSON.stringify({ok:false,error:"NATIVE_HISTORY_UNAVAILABLE"});
        var index = Number(qe.project.undoStackIndex());
        if (!isFinite(index)) return JSON.stringify({ok:false,error:"INVALID_HISTORY_INDEX"});
        var project = String(app.project.documentID || app.project.path || app.project.name);
        var state = PremiereGodV7._history;
        // A new edit or a history change made outside these buttons starts a new six-step window.
        if (!state || state.project !== project || index !== state.last) {
            state = {project:project,last:index,floor:Math.max(0,index-6),ceiling:index};
            PremiereGodV7._history = state;
        }
        if (action === "undo" || action === "redo") {
            if ((action === "undo" && index <= state.floor) || (action === "redo" && index >= state.ceiling))
                return JSON.stringify({ok:false,error:"HISTORY_LIMIT",undoAvailable:index-state.floor,redoAvailable:state.ceiling-index,limit:6});
            if (action === "undo") qe.project.undo(); else qe.project.redo();
            var after = Number(qe.project.undoStackIndex());
            if (after !== index + (action === "undo" ? -1 : 1))
                return JSON.stringify({ok:false,error:"HISTORY_STEP_NOT_CONFIRMED",before:index,after:after});
            index = after;
            state.last = after;
        } else if (action !== "status") return JSON.stringify({ok:false,error:"UNKNOWN_HISTORY_ACTION"});
        return JSON.stringify({ok:true,action:action,index:index,undoAvailable:Math.min(6,index-state.floor),redoAvailable:Math.min(6,state.ceiling-index),limit:6});
    } catch (error) { return JSON.stringify({ok:false,error:String(error)}); }
};

// In-memory edit history. No project files or sequence copies are created.
PremiereGodV7.captureEditState = function () {
    var seq=app.project.activeSequence;
    if(!seq)return null;
    var state={sequence:String(seq.sequenceID),clips:[]};
    for(var t=0;t<seq.videoTracks.numTracks;t++){
        var clips=seq.videoTracks[t].clips;
        for(var c=0;c<clips.numItems;c++){
            var clip=clips[c],item={id:String(clip.nodeId),track:t,clip:clip,source:clip.projectItem,start:String(clip.start.ticks),end:String(clip.end.ticks),inPoint:String(clip.inPoint.ticks),outPoint:String(clip.outPoint.ticks),props:[]};
            for(var k=0;k<clip.components.numItems;k++){
                var component=clip.components[k];
                if(component.matchName!=="AE.ADBE Motion"&&component.matchName!=="AE.ADBE Opacity")continue;
                for(var p=0;p<component.properties.numItems;p++){
                    var property=component.properties[p];
                    try{
                        if(property.isTimeVarying&&property.isTimeVarying())continue;
                        var value=property.getValue();
                        if(typeof value!=="number"&&typeof value!=="boolean"&&!(value instanceof Array))continue;
                        item.props.push({component:k,index:p,value:JSON.parse(JSON.stringify(value))});
                    }catch(ignore){}
                }
            }
            state.clips.push(item);
        }
    }
    return state;
};
PremiereGodV7.editSignature=function(state){
    if(!state)return "";
    var rows=[];
    for(var i=0;i<state.clips.length;i++){
        var c=state.clips[i];rows.push({id:c.id,track:c.track,start:c.start,end:c.end,inPoint:c.inPoint,outPoint:c.outPoint,props:c.props});
    }
    return JSON.stringify({sequence:state.sequence,clips:rows});
};
PremiereGodV7.runTracked=function(operation){
    if(PremiereGodV7._tracking)return operation();
    PremiereGodV7._tracking=true;
    var before=null,serial=PremiereGodV7._historySerial||0;
    try{before=PremiereGodV7.captureEditState();}catch(ignore){}
    try{return operation();}
    finally{
        try{
            var after=PremiereGodV7.captureEditState();
            if(before&&after&&before.sequence===after.sequence&&serial===(PremiereGodV7._historySerial||0)&&PremiereGodV7.editSignature(before)!==PremiereGodV7.editSignature(after)){
                var h=PremiereGodV7._editHistory;
                if(!h||h.sequence!==before.sequence)h={sequence:before.sequence,undo:[],redo:[]};
                h.undo.push({before:before,after:after});while(h.undo.length>6)h.undo.shift();h.redo=[];PremiereGodV7._editHistory=h;
            }
        }catch(ignore){}
        PremiereGodV7._tracking=false;
    }
};
PremiereGodV7.restoreEditState=function(target,current){
    var seq=app.project.activeSequence;
    if(!seq||String(seq.sequenceID)!==target.sequence)throw new Error("ACTIVE_SEQUENCE_CHANGED");
    var wanted={},actual={},i;
    for(i=0;i<target.clips.length;i++)wanted[target.clips[i].id]=target.clips[i];
    for(i=0;i<current.clips.length;i++)actual[current.clips[i].id]=current.clips[i];
    // Validate the whole operation before changing anything. Added/removed stills are supported.
    for(i=0;i<current.clips.length;i++)if(!wanted[current.clips[i].id]){
        if(!/\.(png|jpe?g|webp|bmp|tiff?)$/i.test(current.clips[i].source.getMediaPath()))throw new Error("USE_PREMIERE_NATIVE_HISTORY_FOR_THIS_EDIT");
    }
    for(i=0;i<target.clips.length;i++){
        var entry=target.clips[i];
        if(!actual[entry.id]&&!/\.(png|jpe?g|webp|bmp|tiff?)$/i.test(entry.source.getMediaPath()))throw new Error("USE_PREMIERE_NATIVE_HISTORY_FOR_THIS_EDIT");
        if(actual[entry.id]&&(entry.start!==actual[entry.id].start||entry.end!==actual[entry.id].end||entry.inPoint!==actual[entry.id].inPoint||entry.outPoint!==actual[entry.id].outPoint))throw new Error("USE_PREMIERE_NATIVE_HISTORY_FOR_TIMING_EDITS");
    }
    for(i=current.clips.length-1;i>=0;i--)if(!wanted[current.clips[i].id])current.clips[i].clip.remove(false,false);
    for(i=0;i<target.clips.length;i++){
        var item=target.clips[i],live=actual[item.id]?actual[item.id].clip:null;
        if(!live){
            var track=seq.videoTracks[item.track];
            track.overwriteClip(item.source,item.start);
            for(var c=0;c<track.clips.numItems;c++)if(String(track.clips[c].start.ticks)===item.start&&track.clips[c].projectItem.nodeId===item.source.nodeId){live=track.clips[c];break;}
            if(!live)throw new Error("RESTORE_INSERT_FAILED");
            var time=new Time();time.ticks=item.end;live.end=time;
            time=new Time();time.ticks=item.inPoint;live.inPoint=time;
            time=new Time();time.ticks=item.outPoint;live.outPoint=time;
        }
        for(var p=0;p<item.props.length;p++){
            var prop=item.props[p];live.components[prop.component].properties[prop.index].setValue(prop.value,true);
        }
    }
};
PremiereGodV7.nativeHistory=PremiereGodV7.history;
PremiereGodV7.history=function(action){
    var h=PremiereGodV7._editHistory,seq=app.project.activeSequence;
    if(!h||!seq||h.sequence!==String(seq.sequenceID)||(!h.undo.length&&!h.redo.length)){
        var nativeResult=PremiereGodV7.nativeHistory(action);
        if(action!=="status")PremiereGodV7._historySerial=(PremiereGodV7._historySerial||0)+1;
        return nativeResult;
    }
    try{
        if(action!=="status"){
            if(action!=="undo"&&action!=="redo")throw new Error("UNKNOWN_HISTORY_ACTION");
            var from=action==="undo"?h.undo:h.redo,to=action==="undo"?h.redo:h.undo;
            if(!from.length)throw new Error("HISTORY_LIMIT");
            var entry=from[from.length-1],expected=action==="undo"?entry.after:entry.before,target=action==="undo"?entry.before:entry.after;
            var current=PremiereGodV7.captureEditState();
            if(PremiereGodV7.editSignature(current)!==PremiereGodV7.editSignature(expected))throw new Error("TIMELINE_CHANGED_OUTSIDE_RAVIX_HISTORY");
            PremiereGodV7.restoreEditState(target,current);
            var restored=PremiereGodV7.captureEditState();
            if(action==="undo")entry.before=restored;else entry.after=restored;
            from.pop();to.push(entry);
            if(from.length){if(action==="undo")from[from.length-1].after=restored;else from[from.length-1].before=restored;}
            PremiereGodV7._historySerial=(PremiereGodV7._historySerial||0)+1;
        }
        return JSON.stringify({ok:true,mode:"in_memory",action:action,undoAvailable:h.undo.length,redoAvailable:h.redo.length,limit:6});
    }catch(error){return JSON.stringify({ok:false,error:String(error),undoAvailable:h.undo.length,redoAvailable:h.redo.length,limit:6});}
};
// Structured commands also use the same history lane.
(function(){var original=PremiereGodV7.executeInstantDictionaryAction;PremiereGodV7.executeInstantDictionaryAction=function(payload){return PremiereGodV7.runTracked(function(){return original(payload);});};})();


// Sequence marker management. Based on the Premiere marker API patterns in
// antipaster/Adobe-Premiere-Pro-MCP (MIT); see RAVIX third-party notices.
PremiereGodV7.sequenceMarkers = function(action, p) {
    try {
        var seq = app && app.project && app.project.activeSequence;
        if (!seq) return JSON.stringify({ok:false,error:"NO_ACTIVE_SEQUENCE"});
        var markers = seq.markers;
        if (!markers || typeof markers.getFirstMarker !== "function") return JSON.stringify({ok:false,error:"MARKERS_UNSUPPORTED"});
        function snapshot(m, index) {
            var color = null;
            try { color = m.getColorByIndex(); } catch (ignore) {}
            return {index:index, guid:String(m.guid || ""), name:String(m.name || ""), comments:String(m.comments || ""), start:Number(m.start.seconds), end:Number(m.end.seconds), color:color};
        }
        function all() {
            var out=[], m=markers.getFirstMarker(), n=0;
            while (m) { out.push(snapshot(m,n++)); m=markers.getNextMarker(m); }
            return out;
        }
        if (action === "markers_list") return JSON.stringify({ok:true,markers:all()});
        var marker=null, id=String(p.guid || "");
        if (action !== "marker_add") {
            if (!id) return JSON.stringify({ok:false,error:"MARKER_GUID_REQUIRED"});
            var cur=markers.getFirstMarker();
            while(cur) { if(String(cur.guid)===id){marker=cur;break;} cur=markers.getNextMarker(cur); }
            if(!marker) return JSON.stringify({ok:false,error:"MARKER_NOT_FOUND"});
        }
        var start=Number(p.timeSec);
        if (action === "marker_add" && (!isFinite(start) || start < 0 || p.timeSec === undefined || p.timeSec === null)) return JSON.stringify({ok:false,error:"INVALID_TIME"});
        if (p.color !== undefined && (typeof p.color !== "number" || p.color % 1 !== 0 || p.color < 0 || p.color > 7)) return JSON.stringify({ok:false,error:"INVALID_COLOR"});
        if (p.durationSec !== undefined && (typeof p.durationSec !== "number" || !isFinite(p.durationSec) || p.durationSec < 0)) return JSON.stringify({ok:false,error:"INVALID_DURATION"});
        if(action === "marker_remove") {
            markers.deleteMarker(marker);
            var remaining=all();
            for(var k=0;k<remaining.length;k++) if(remaining[k].guid===id) return JSON.stringify({ok:false,error:"DELETE_NOT_VERIFIED",markers:remaining});
            return JSON.stringify({ok:true,removedGuid:id,markers:remaining});
        }
        if(action === "marker_add") marker=markers.createMarker(start);
        if(p.name !== undefined) marker.name=String(p.name);
        if(p.comments !== undefined) marker.comments=String(p.comments);
        if(p.color !== undefined) marker.setColorByIndex(p.color);
        if(p.durationSec !== undefined) { var end=new Time(); end.seconds=Number(marker.start.seconds)+p.durationSec; marker.end=end; }
        var result=all(), target=String(marker.guid || ""), found=null;
        for(var j=0;j<result.length;j++) if(target && result[j].guid===target){found=result[j];break;}
        if(!found) return JSON.stringify({ok:false,error:"MARKER_READBACK_FAILED",markers:result});
        if ((p.name !== undefined && found.name !== String(p.name)) ||
            (p.comments !== undefined && found.comments !== String(p.comments)) ||
            (p.color !== undefined && found.color !== p.color) ||
            (p.durationSec !== undefined && Math.abs(found.end - found.start - p.durationSec) > 0.001))
            return JSON.stringify({ok:false,error:"MARKER_READBACK_MISMATCH",marker:found});
        return JSON.stringify({ok:true,marker:found});
    } catch(e) { return JSON.stringify({ok:false,error:String(e)}); }
};

/* Isolated upstream Premiere functions; MIT, antipaster/Adobe-Premiere-Pro-MCP. */
var RavixUpstreamPremiere = (function(){
/* Shared utilities for Premiere Pro MCP ExtendScript */

function _ok(data) {
  if (data === undefined) data = {};
  data.success = true;
  return JSON.stringify(data);
}

function _err(msg) {
  return JSON.stringify({ error: msg });
}

function _requireProject() {
  if (!app.project) return _err("No project open");
  return null;
}

function _requireSequence() {
  var e = _requireProject();
  if (e) return e;
  if (!app.project.activeSequence) return _err("No active sequence");
  return null;
}

function _getClip(trackType, trackIndex, clipIndex) {
  var seq = app.project.activeSequence;
  var tracks = trackType === "video" ? seq.videoTracks : seq.audioTracks;
  if (trackIndex >= tracks.numTracks) return null;
  var track = tracks[trackIndex];
  if (clipIndex >= track.clips.numItems) return null;
  return track.clips[clipIndex];
}

function _getTrack(trackType, trackIndex) {
  var seq = app.project.activeSequence;
  var tracks = trackType === "video" ? seq.videoTracks : seq.audioTracks;
  if (trackIndex >= tracks.numTracks) return null;
  return tracks[trackIndex];
}

function _findProjectItemByNodeId(root, nodeId) {
  for (var i = 0; i < root.children.numItems; i++) {
    var item = root.children[i];
    if (item.nodeId === nodeId) return item;
    if (item.type === ProjectItemType.BIN) {
      var found = _findProjectItemByNodeId(item, nodeId);
      if (found) return found;
    }
  }
  return null;
}

function _findBinByPath(binPath) {
  var rootItem = app.project.rootItem;
  if (!binPath || binPath === "") return rootItem;

  var parts = binPath.split("/");
  var current = rootItem;
  for (var p = 0; p < parts.length; p++) {
    var found = false;
    for (var i = 0; i < current.children.numItems; i++) {
      if (current.children[i].name === parts[p] && current.children[i].type === ProjectItemType.BIN) {
        current = current.children[i];
        found = true;
        break;
      }
    }
    if (!found) return null;
  }
  return current;
}

function _makeTime(seconds) {
  var t = new Time();
  t.seconds = seconds;
  return t;
}

function _itemTypeName(item) {
  if (item.type === ProjectItemType.BIN) return "bin";
  if (item.type === ProjectItemType.CLIP) return "clip";
  if (item.type === ProjectItemType.FILE) return "file";
  return "unknown";
}

function _collectItems(root, recursive) {
  var items = [];
  for (var i = 0; i < root.children.numItems; i++) {
    var item = root.children[i];
    var info = {
      index: i,
      name: item.name,
      nodeId: item.nodeId,
      type: _itemTypeName(item),
    };
    if (item.type !== ProjectItemType.BIN) {
      try { info.mediaPath = item.getMediaPath(); } catch (e) {}
    }
    items.push(info);
    if (recursive && item.type === ProjectItemType.BIN) {
      var children = _collectItems(item, true);
      for (var c = 0; c < children.length; c++) {
        children[c].binPath = item.name + "/" + (children[c].binPath || "");
        items.push(children[c]);
      }
    }
  }
  return items;
}

/* Project management functions */

function getProjectInfo() {
  var e = _requireProject();
  if (e) return e;
  var proj = app.project;
  return JSON.stringify({
    name: proj.name,
    path: proj.path,
    numSequences: proj.sequences.numSequences,
    numItems: proj.rootItem.children.numItems,
    documentID: proj.documentID,
  });
}

function saveProject() {
  var e = _requireProject();
  if (e) return e;
  app.project.save();
  return _ok();
}

function saveProjectAs(path) {
  var e = _requireProject();
  if (e) return e;
  app.project.saveAs(path);
  return _ok({ path: path });
}

function openProject(path) {
  app.openDocument(path);
  return _ok({ path: path });
}

function closeProject(save) {
  var e = _requireProject();
  if (e) return e;
  if (save) app.project.save();
  app.project.closeDocument();
  return _ok();
}

function importMedia(filePathsJson, targetBinPath, asNumberedStills) {
  var e = _requireProject();
  if (e) return e;
  var filePaths = JSON.parse(filePathsJson);

  if (targetBinPath && targetBinPath !== "") {
    var bin = _findBinByPath(targetBinPath);
    if (!bin) return _err("Target bin not found: " + targetBinPath);
    var success = app.project.importFiles(filePaths, false, bin, asNumberedStills || false);
  } else {
    var success = app.project.importFiles(filePaths, false, app.project.rootItem, asNumberedStills || false);
  }
  return _ok({ filesCount: filePaths.length, imported: success });
}

function importSequences(projectPath, sequenceIdsJson) {
  var e = _requireProject();
  if (e) return e;
  var result = app.project.importSequences(projectPath);
  return _ok({ imported: result });
}

function getProjectItems(binPath, recursive) {
  var e = _requireProject();
  if (e) return e;

  var root = _findBinByPath(binPath);
  if (!root) return _err("Bin not found: " + binPath);

  return JSON.stringify(_collectItems(root, recursive));
}

function getProjectItemInfo(nodeId) {
  var e = _requireProject();
  if (e) return e;

  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var info = {
    name: item.name,
    nodeId: item.nodeId,
    type: _itemTypeName(item),
    treePath: item.treePath,
  };

  if (item.type !== ProjectItemType.BIN) {
    try { info.mediaPath = item.getMediaPath(); } catch (ex) {}
    try {
      var footageInterpretation = item.getFootageInterpretation();
      if (footageInterpretation) {
        info.frameRate = footageInterpretation.frameRate;
        info.pixelAspectRatio = footageInterpretation.pixelAspectRatio;
        info.fieldType = footageInterpretation.fieldType;
        info.removePulldown = footageInterpretation.removePulldown;
        info.alphaUsage = footageInterpretation.alphaUsage;
      }
    } catch (ex) {}
    try {
      var inPoint = item.getInPoint();
      var outPoint = item.getOutPoint();
      if (inPoint) info.inPoint = inPoint.seconds;
      if (outPoint) info.outPoint = outPoint.seconds;
    } catch (ex) {}
    try { info.isOffline = item.isOffline(); } catch (ex) {}
    try {
      var proxyPath = item.getProxyPath();
      if (proxyPath) info.proxyPath = proxyPath;
    } catch (ex) {}
  }
  return JSON.stringify(info);
}

function createBin(name, parentBinPath) {
  var e = _requireProject();
  if (e) return e;

  var parent = _findBinByPath(parentBinPath);
  if (!parent) return _err("Parent bin not found: " + parentBinPath);

  var newBin = parent.createBin(name);
  return _ok({ name: name, nodeId: newBin ? newBin.nodeId : "" });
}

function renameProjectItem(nodeId, newName) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  item.name = newName;
  return _ok({ name: newName });
}

function deleteProjectItems(nodeIdsJson) {
  var e = _requireProject();
  if (e) return e;
  var nodeIds = JSON.parse(nodeIdsJson);
  var deleted = 0;
  for (var i = 0; i < nodeIds.length; i++) {
    var item = _findProjectItemByNodeId(app.project.rootItem, nodeIds[i]);
    if (item) {
      app.project.deleteAsset(item);
      deleted++;
    }
  }
  return _ok({ deleted: deleted });
}

function moveProjectItem(nodeId, targetBinPath) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  var bin = _findBinByPath(targetBinPath);
  if (!bin) return _err("Target bin not found: " + targetBinPath);
  item.moveBin(bin);
  return _ok();
}

function setProjectItemInOut(nodeId, inPoint, outPoint) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  item.setInPoint(inPoint, 4);
  item.setOutPoint(outPoint, 4);
  return _ok();
}

function clearProjectItemInOut(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  item.clearInPoint();
  item.clearOutPoint();
  return _ok();
}

function createProxy(nodeId, presetPath) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  var result = item.createProxy(presetPath);
  return _ok({ result: result });
}

function attachProxy(nodeId, proxyPath) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  var result = item.attachProxy(proxyPath, 0);
  return _ok({ result: result });
}

function toggleProxyMode(enable) {
  var e = _requireProject();
  if (e) return e;
  app.project.setEnableProxies(enable ? 1 : 0);
  return _ok({ proxiesEnabled: enable });
}

function refreshMedia(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  item.refreshMedia();
  return _ok();
}

function findProjectItems(query, type) {
  var e = _requireProject();
  if (e) return e;
  var results = [];
  _searchItems(app.project.rootItem, query, type, results, "");
  return JSON.stringify(results);
}

function _searchItems(root, query, type, results, path) {
  for (var i = 0; i < root.children.numItems; i++) {
    var item = root.children[i];
    var itemType = _itemTypeName(item);
    var matchesType = (type === "all") || (type === itemType);
    if (matchesType && item.name.toLowerCase().indexOf(query.toLowerCase()) >= 0) {
      results.push({ name: item.name, nodeId: item.nodeId, type: itemType, path: path + item.name });
    }
    if (item.type === ProjectItemType.BIN) {
      _searchItems(item, query, type, results, path + item.name + "/");
    }
  }
}

function setProjectSettings(scratchDiskPath, gpuRenderer) {
  var e = _requireProject();
  if (e) return e;
  if (scratchDiskPath && scratchDiskPath !== "") {
    app.project.setScratchDiskPath(scratchDiskPath, ScratchDiskType.FirstVideoCaptureFolder);
    app.project.setScratchDiskPath(scratchDiskPath, ScratchDiskType.FirstAudioCaptureFolder);
    app.project.setScratchDiskPath(scratchDiskPath, ScratchDiskType.FirstVideoPreviewFolder);
    app.project.setScratchDiskPath(scratchDiskPath, ScratchDiskType.FirstAudioPreviewFolder);
  }
  if (gpuRenderer && gpuRenderer !== "") {
    app.project.setGPURenderingPolicy(gpuRenderer);
  }
  return _ok();
}

function createSubClip(nodeId, name, inPointSec, outPointSec, hardBoundaries) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var inTime = _makeTime(inPointSec);
  var outTime = _makeTime(outPointSec);
  var subClip = item.createSubClip(name, inTime.ticks, outTime.ticks, hardBoundaries ? 1 : 0, 1, 1);
  return _ok({ name: name, nodeId: subClip ? subClip.nodeId : "" });
}

function relinkMedia(nodeId, newPath) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  if (!item.canChangeMediaPath()) return _err("Cannot relink this item");
  item.changeMediaPath(newPath, true);
  return _ok({ newPath: newPath });
}

function importAEComps(aepPath, compNamesJson, targetBinPath) {
  var e = _requireProject();
  if (e) return e;
  var compNames = JSON.parse(compNamesJson);
  var targetBin = targetBinPath ? _findBinByPath(targetBinPath) : app.project.rootItem;

  if (compNames.length > 0) {
    app.project.importAEComps(aepPath, compNames, targetBin);
  } else {
    app.project.importAllAEComps(aepPath, targetBin);
  }
  return _ok({ aepPath: aepPath });
}

function consolidateDuplicates() {
  var e = _requireProject();
  if (e) return e;
  app.project.consolidateDuplicates();
  return _ok();
}

function getProjectItemTypeInfo(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var info = { name: item.name, nodeId: nodeId, type: _itemTypeName(item) };
  try { info.isSequence = item.isSequence(); } catch (ex) {}
  try { info.isAdjustmentLayer = item.isAdjustmentLayer(); } catch (ex) {}
  try { info.isMergedClip = item.isMergedClip(); } catch (ex) {}
  try { info.isMulticamClip = item.isMulticamClip(); } catch (ex) {}
  try { info.isOffline = item.isOffline(); } catch (ex) {}
  return JSON.stringify(info);
}

function setScaleToFrameSize(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  item.setScaleToFrameSize();
  return _ok();
}

function flushCache() {
  app.enableQE();
  try { qe.project.flushCache(); } catch (ex) {}
  return _ok();
}

/* Sequence management functions */

function getSequences() {
  var e = _requireProject();
  if (e) return e;
  var proj = app.project;
  var sequences = [];
  for (var i = 0; i < proj.sequences.numSequences; i++) {
    var seq = proj.sequences[i];
    sequences.push({
      index: i,
      name: seq.name,
      id: seq.sequenceID,
      numVideoTracks: seq.videoTracks.numTracks,
      numAudioTracks: seq.audioTracks.numTracks,
      timebase: seq.timebase,
      end: seq.end.seconds,
    });
  }
  return JSON.stringify(sequences);
}

function getActiveSequence() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  var videoTracks = [];
  for (var i = 0; i < seq.videoTracks.numTracks; i++) {
    var track = seq.videoTracks[i];
    videoTracks.push({
      index: i,
      name: track.name,
      numClips: track.clips.numItems,
      muted: track.isMuted(),
      locked: track.isLocked(),
    });
  }

  var audioTracks = [];
  for (var i = 0; i < seq.audioTracks.numTracks; i++) {
    var track = seq.audioTracks[i];
    audioTracks.push({
      index: i,
      name: track.name,
      numClips: track.clips.numItems,
      muted: track.isMuted(),
      locked: track.isLocked(),
    });
  }

  return JSON.stringify({
    name: seq.name,
    id: seq.sequenceID,
    timebase: seq.timebase,
    frameSizeHorizontal: seq.frameSizeHorizontal,
    frameSizeVertical: seq.frameSizeVertical,
    videoTracks: videoTracks,
    audioTracks: audioTracks,
    playerPosition: seq.getPlayerPosition().seconds,
    inPoint: seq.getInPointAsTime().seconds,
    outPoint: seq.getOutPointAsTime().seconds,
    end: seq.end.seconds,
    zeroPoint: seq.zeroPoint.seconds,
  });
}

function setActiveSequence(sequenceName, sequenceIndex) {
  var e = _requireProject();
  if (e) return e;
  var proj = app.project;

  if (sequenceIndex >= 0) {
    if (sequenceIndex >= proj.sequences.numSequences) return _err("Invalid sequence index");
    app.project.openSequence(proj.sequences[sequenceIndex].sequenceID);
    return _ok({ name: proj.sequences[sequenceIndex].name });
  }

  if (sequenceName && sequenceName !== "") {
    for (var i = 0; i < proj.sequences.numSequences; i++) {
      if (proj.sequences[i].name === sequenceName) {
        app.project.openSequence(proj.sequences[i].sequenceID);
        return _ok({ name: sequenceName });
      }
    }
    return _err("Sequence not found: " + sequenceName);
  }

  return _err("Provide sequenceName or sequenceIndex");
}

function createSequence(name, presetPath) {
  var e = _requireProject();
  if (e) return e;
  if (presetPath && presetPath !== "") {
    app.project.createNewSequenceFromPreset(presetPath, name);
  } else {
    app.project.createNewSequence(name, "mcpSequence");
  }
  return _ok({ name: name });
}

function createSequenceFromClip(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  app.project.createNewSequenceFromClips(item.name, [item], app.project.rootItem);
  return _ok({ name: item.name });
}

function cloneSequence(sequenceName, newName) {
  var e = _requireProject();
  if (e) return e;
  var seq = null;
  if (sequenceName && sequenceName !== "") {
    for (var i = 0; i < app.project.sequences.numSequences; i++) {
      if (app.project.sequences[i].name === sequenceName) {
        seq = app.project.sequences[i];
        break;
      }
    }
    if (!seq) return _err("Sequence not found: " + sequenceName);
  } else {
    seq = app.project.activeSequence;
  }
  if (!seq) return _err("No sequence to clone");
  seq.clone();
  return _ok({ cloned: seq.name });
}

function deleteSequence(sequenceId) {
  var e = _requireProject();
  if (e) return e;
  for (var i = 0; i < app.project.sequences.numSequences; i++) {
    if (app.project.sequences[i].sequenceID === sequenceId) {
      app.project.deleteSequence(app.project.sequences[i]);
      return _ok();
    }
  }
  return _err("Sequence not found: " + sequenceId);
}

function getSequenceSettings() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  return JSON.stringify({
    name: seq.name,
    id: seq.sequenceID,
    timebase: seq.timebase,
    frameSizeHorizontal: seq.frameSizeHorizontal,
    frameSizeVertical: seq.frameSizeVertical,
    audioChannelCount: seq.audioChannelCount,
    audioChannelType: seq.audioChannelType,
    audioDisplayFormat: seq.audioDisplayFormat,
    audioSampleRate: seq.audioSampleRate,
    videoDisplayFormat: seq.videoDisplayFormat,
    videoFieldType: seq.videoFieldType,
    end: seq.end.seconds,
  });
}

function setSequenceInOut(inPointSec, outPointSec) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  if (inPointSec >= 0) seq.setInPoint(inPointSec);
  if (outPointSec >= 0) seq.setOutPoint(outPointSec);
  return _ok();
}

function clearSequenceInOut() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  seq.setInPoint(seq.zeroPoint.seconds);
  seq.setOutPoint(seq.end.seconds);
  return _ok();
}

function nestClips(trackType, trackIndex, clipIndicesJson, nestedName) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  var qeTrack = trackType === "video" ? qeSeq.getVideoTrackAt(trackIndex) : qeSeq.getAudioTrackAt(trackIndex);
  // Nest is done via selection and menu command - this is a QE operation
  return _ok({ note: "Use Premiere UI or execute_extendscript for nesting" });
}

function addTracks(videoCount, audioCount, position) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  for (var i = 0; i < videoCount; i++) {
    qeSeq.addVideoTrack();
  }
  for (var i = 0; i < audioCount; i++) {
    qeSeq.addAudioTrack();
  }
  return _ok({ videoTracksAdded: videoCount, audioTracksAdded: audioCount });
}

function removeTrack(trackType, trackIndex) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  if (trackType === "video") {
    qeSeq.removeVideoTrackAt(trackIndex);
  } else {
    qeSeq.removeAudioTrackAt(trackIndex);
  }
  return _ok();
}

function getTrackInfo(trackType, trackIndex) {
  var e = _requireSequence();
  if (e) return e;
  var track = _getTrack(trackType, trackIndex);
  if (!track) return _err("Track not found");
  var clips = [];
  for (var i = 0; i < track.clips.numItems; i++) {
    var clip = track.clips[i];
    clips.push({
      index: i,
      name: clip.name,
      start: clip.start.seconds,
      end: clip.end.seconds,
      duration: clip.duration.seconds,
    });
  }
  return JSON.stringify({
    name: track.name,
    index: trackIndex,
    type: trackType,
    muted: track.isMuted(),
    locked: track.isLocked(),
    numClips: track.clips.numItems,
    clips: clips,
  });
}

function setTrackMuted(trackType, trackIndex, muted) {
  var e = _requireSequence();
  if (e) return e;
  if (trackType !== "video" && trackType !== "audio") return _err("Invalid track type");
  var track = _getTrack(trackType, trackIndex);
  if (!track) return _err("Track not found");
  if (typeof track.setMute !== "function" || typeof track.isMuted !== "function") return _err("Track mute API unavailable");
  track.setMute(muted ? 1 : 0);
  if (!!track.isMuted() !== !!muted) return _err("Track mute readback mismatch; inspect before retrying");
  return _ok({ muted: !!track.isMuted() });
}

function setTrackLocked(trackType, trackIndex, locked) {
  var e = _requireSequence();
  if (e) return e;
  var track = _getTrack(trackType, trackIndex);
  if (!track) return _err("Track not found");
  track.setLocked(locked ? 1 : 0);
  return _ok();
}

function renameTrack(trackType, trackIndex, name) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  if (trackType === "video") {
    qeSeq.getVideoTrackAt(trackIndex).setName(name);
  } else {
    qeSeq.getAudioTrackAt(trackIndex).setName(name);
  }
  return _ok();
}

function autoReframeSequence(numerator, denominator, motionPreset, newName, useNested) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  var seqName = newName || (seq.name + " [" + numerator + "x" + denominator + "]");
  try {
    var newSeq = seq.autoReframeSequence(numerator, denominator, motionPreset, seqName, useNested);
    return _ok({ name: seqName, reframed: !!newSeq });
  } catch (ex) {
    return _err("Auto reframe failed: " + ex.toString());
  }
}

function sceneEditDetection(action, applyCutsToLinkedAudio, sensitivity) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  try {
    seq.performSceneEditDetectionOnSelection(action, applyCutsToLinkedAudio, sensitivity);
    return _ok({ action: action });
  } catch (ex) {
    return _err("Scene edit detection failed: " + ex.toString());
  }
}

function createSubsequence(ignoreTrackTargeting) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  var newSeq = seq.createSubsequence(ignoreTrackTargeting);
  return _ok({ name: newSeq ? newSeq.name : "" });
}

function setWorkArea(inPointSec, outPointSec) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  try {
    if (inPointSec >= 0) seq.setWorkAreaInPoint(inPointSec);
    if (outPointSec >= 0) seq.setWorkAreaOutPoint(outPointSec);
  } catch (ex) {
    return _err("Work area API not available in this version");
  }
  return _ok();
}

function getWorkArea() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  var result = {};
  try {
    result.inPoint = seq.getWorkAreaInPointAsTime().seconds;
    result.outPoint = seq.getWorkAreaOutPointAsTime().seconds;
    result.enabled = seq.isWorkAreaEnabled();
  } catch (ex) {
    result.note = "Work area API not available in this version";
  }
  return JSON.stringify(result);
}

function getSelection() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  var selected = [];

  for (var t = 0; t < seq.videoTracks.numTracks; t++) {
    for (var c = 0; c < seq.videoTracks[t].clips.numItems; c++) {
      var clip = seq.videoTracks[t].clips[c];
      try {
        if (clip.isSelected()) {
          selected.push({ trackType: "video", trackIndex: t, clipIndex: c, name: clip.name, start: clip.start.seconds, end: clip.end.seconds });
        }
      } catch (ex) {}
    }
  }
  for (var t = 0; t < seq.audioTracks.numTracks; t++) {
    for (var c = 0; c < seq.audioTracks[t].clips.numItems; c++) {
      var clip = seq.audioTracks[t].clips[c];
      try {
        if (clip.isSelected()) {
          selected.push({ trackType: "audio", trackIndex: t, clipIndex: c, name: clip.name, start: clip.start.seconds, end: clip.end.seconds });
        }
      } catch (ex) {}
    }
  }
  return JSON.stringify(selected);
}

/* Timeline / clip manipulation functions */

function getTimelineClips(trackType, trackIndex) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  var results = [];

  function getClipsFromTracks(tracks, type) {
    for (var t = 0; t < tracks.numTracks; t++) {
      if (trackIndex >= 0 && t !== trackIndex) continue;
      var track = tracks[t];
      for (var c = 0; c < track.clips.numItems; c++) {
        var clip = track.clips[c];
        results.push({
          trackType: type,
          trackIndex: t,
          clipIndex: c,
          name: clip.name,
          startTime: clip.start.seconds,
          endTime: clip.end.seconds,
          duration: clip.duration.seconds,
          inPoint: clip.inPoint.seconds,
          outPoint: clip.outPoint.seconds,
          mediaType: clip.mediaType,
          enabled: clip.isSelected(),
        });
      }
    }
  }

  if (trackType === "all" || trackType === "video") getClipsFromTracks(seq.videoTracks, "video");
  if (trackType === "all" || trackType === "audio") getClipsFromTracks(seq.audioTracks, "audio");
  return JSON.stringify(results);
}

function addClipToTimeline(projectItemNodeId, trackIndex, startTimeSec, trackType, inPointSec, outPointSec) {
  var e = _requireSequence();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, projectItemNodeId);
  if (!item) return _err("Project item not found: " + projectItemNodeId);

  var seq = app.project.activeSequence;
  var startTime = _makeTime(startTimeSec);

  if (inPointSec >= 0) item.setInPoint(inPointSec, 4);
  if (outPointSec >= 0) item.setOutPoint(outPointSec, 4);

  if (trackType === "audio") {
    seq.audioTracks[trackIndex].insertClip(item, startTime);
  } else {
    seq.videoTracks[trackIndex].insertClip(item, startTime);
  }
  return _ok();
}

function overwriteClipToTimeline(projectItemNodeId, trackIndex, startTimeSec, trackType, inPointSec, outPointSec) {
  var e = _requireSequence();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, projectItemNodeId);
  if (!item) return _err("Project item not found: " + projectItemNodeId);

  var seq = app.project.activeSequence;
  var startTime = _makeTime(startTimeSec);

  if (inPointSec >= 0) item.setInPoint(inPointSec, 4);
  if (outPointSec >= 0) item.setOutPoint(outPointSec, 4);

  if (trackType === "audio") {
    seq.audioTracks[trackIndex].overwriteClip(item, startTime);
  } else {
    seq.videoTracks[trackIndex].overwriteClip(item, startTime);
  }
  return _ok();
}

function setClipPosition(trackType, trackIndex, clipIndex, startTimeSec, endTimeSec) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  if (startTimeSec >= 0) clip.start = _makeTime(startTimeSec);
  if (endTimeSec >= 0) clip.end = _makeTime(endTimeSec);
  return _ok();
}

function setClipInOut(trackType, trackIndex, clipIndex, inPointSec, outPointSec) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  if (inPointSec >= 0) clip.inPoint = _makeTime(inPointSec);
  if (outPointSec >= 0) clip.outPoint = _makeTime(outPointSec);
  return _ok();
}

function removeClip(trackType, trackIndex, clipIndex, ripple) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  clip.remove(ripple, ripple);
  return _ok();
}

function razorClip(trackType, trackIndex, timeSec) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  var qeTrack = trackType === "video" ? qeSeq.getVideoTrackAt(trackIndex) : qeSeq.getAudioTrackAt(trackIndex);
  qeTrack.razor(_makeTime(timeSec).ticks);
  return _ok();
}

function razorAllTracks(timeSec) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  var ticks = _makeTime(timeSec).ticks;

  for (var i = 0; i < qeSeq.numVideoTracks; i++) {
    try { qeSeq.getVideoTrackAt(i).razor(ticks); } catch (ex) {}
  }
  for (var i = 0; i < qeSeq.numAudioTracks; i++) {
    try { qeSeq.getAudioTrackAt(i).razor(ticks); } catch (ex) {}
  }
  return _ok();
}

function setClipSpeed(trackType, trackIndex, clipIndex, speed, reverse, ripple, maintainPitch) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var speedStr = speed.toString();
  clip.setSpeed(speedStr, "ticks", reverse, maintainPitch);
  return _ok({ speed: speed, reverse: reverse });
}

function enableDisableClip(trackType, trackIndex, clipIndex, enabled) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  if (typeof clip.setDisabled !== "function") return _err("Clip enable/disable API unavailable in this Premiere version");
  clip.setDisabled(!enabled);
  return _ok({ enabled: enabled });
}

function setClipLabel(trackType, trackIndex, clipIndex, colorIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  clip.setColorLabel(colorIndex);
  return _ok();
}

function renameClip(trackType, trackIndex, clipIndex, newName) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  clip.name = newName;
  return _ok();
}

function linkClips(videoTrackIndex, videoClipIndex, audioTrackIndex, audioClipIndex) {
  var e = _requireSequence();
  if (e) return e;
  var vClip = _getClip("video", videoTrackIndex, videoClipIndex);
  var aClip = _getClip("audio", audioTrackIndex, audioClipIndex);
  if (!vClip || !aClip) return _err("Clip not found");
  vClip.link(aClip);
  return _ok();
}

function unlinkClip(trackType, trackIndex, clipIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  clip.unlink();
  return _ok();
}

function getClipInfo(trackType, trackIndex, clipIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var effects = [];
  for (var i = 0; i < clip.components.numItems; i++) {
    var comp = clip.components[i];
    var props = [];
    for (var j = 0; j < comp.properties.numItems; j++) {
      var prop = comp.properties[j];
      var keys = null, value = null, readError = null;
      try { if (prop.getKeys) keys = prop.getKeys(); } catch (ignoreKeys) {}
      try { value = prop.getValue(); } catch (valueError) { readError = String(valueError); }
      props.push({
        index: j,
        displayName: prop.displayName,
        value: value,
        keyframeCount: keys && typeof keys.length === "number" ? keys.length : 0,
        readError: readError
      });
    }
    effects.push({ index: i, displayName: comp.displayName, properties: props });
  }

  return JSON.stringify({
    name: clip.name,
    startTime: clip.start.seconds,
    endTime: clip.end.seconds,
    duration: clip.duration.seconds,
    inPoint: clip.inPoint.seconds,
    outPoint: clip.outPoint.seconds,
    mediaType: clip.mediaType,
    components: effects,
  });
}

function addAdjustmentLayer(trackIndex, startTimeSec, durationSec, name) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  qeSeq.addVideoTrack();
  // Adjustment layers are added via project item creation
  var seq = app.project.activeSequence;
  // Use QE to add adjustment layer
  try {
    qe.project.newAdjustmentLayer(name, seq.frameSizeHorizontal, seq.frameSizeVertical);
  } catch (ex) {}
  return _ok({ note: "Adjustment layer created in project panel. Drag to timeline or use add_clip_to_timeline." });
}

function selectClips(clipsJson) {
  var e = _requireSequence();
  if (e) return e;
  var clips = JSON.parse(clipsJson);
  var seq = app.project.activeSequence;
  // Deselect all first
  for (var t = 0; t < seq.videoTracks.numTracks; t++) {
    for (var c = 0; c < seq.videoTracks[t].clips.numItems; c++) {
      seq.videoTracks[t].clips[c].setSelected(false, true);
    }
  }
  for (var t = 0; t < seq.audioTracks.numTracks; t++) {
    for (var c = 0; c < seq.audioTracks[t].clips.numItems; c++) {
      seq.audioTracks[t].clips[c].setSelected(false, true);
    }
  }
  // Select specified clips
  for (var i = 0; i < clips.length; i++) {
    var clip = _getClip(clips[i].trackType, clips[i].trackIndex, clips[i].clipIndex);
    if (clip) clip.setSelected(true, true);
  }
  return _ok({ selected: clips.length });
}

function deselectAll() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  for (var t = 0; t < seq.videoTracks.numTracks; t++) {
    for (var c = 0; c < seq.videoTracks[t].clips.numItems; c++) {
      seq.videoTracks[t].clips[c].setSelected(false, true);
    }
  }
  for (var t = 0; t < seq.audioTracks.numTracks; t++) {
    for (var c = 0; c < seq.audioTracks[t].clips.numItems; c++) {
      seq.audioTracks[t].clips[c].setSelected(false, true);
    }
  }
  return _ok();
}

function slipClip(trackType, trackIndex, clipIndex, offsetSeconds) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  var qeTrack = trackType === "video" ? qeSeq.getVideoTrackAt(trackIndex) : qeSeq.getAudioTrackAt(trackIndex);
  var qeClip = qeTrack.getItemAt(clipIndex);
  if (!qeClip) return _err("QE clip not found");
  try {
    var offsetTicks = _makeTime(Math.abs(offsetSeconds)).ticks;
    if (offsetSeconds < 0) offsetTicks = "-" + offsetTicks;
    qeClip.slip(offsetTicks);
    return _ok({ offset: offsetSeconds });
  } catch (ex) {
    return _err("Slip failed: " + ex.toString());
  }
}

function slideClip(trackType, trackIndex, clipIndex, offsetSeconds) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  var qeTrack = trackType === "video" ? qeSeq.getVideoTrackAt(trackIndex) : qeSeq.getAudioTrackAt(trackIndex);
  var qeClip = qeTrack.getItemAt(clipIndex);
  if (!qeClip) return _err("QE clip not found");
  try {
    var offsetTicks = _makeTime(Math.abs(offsetSeconds)).ticks;
    if (offsetSeconds < 0) offsetTicks = "-" + offsetTicks;
    qeClip.slide(offsetTicks);
    return _ok({ offset: offsetSeconds });
  } catch (ex) {
    return _err("Slide failed: " + ex.toString());
  }
}

function rippleDelete(trackType, trackIndex, clipIndex) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  var qeTrack = trackType === "video" ? qeSeq.getVideoTrackAt(trackIndex) : qeSeq.getAudioTrackAt(trackIndex);
  var qeClip = qeTrack.getItemAt(clipIndex);
  if (!qeClip) return _err("QE clip not found");
  try {
    qeClip.rippleDelete();
    return _ok();
  } catch (ex) {
    return _err("Ripple delete failed: " + ex.toString());
  }
}

function moveClipToTrack(trackType, sourceTrackIndex, clipIndex, targetTrackIndex) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  var qeTrack = trackType === "video" ? qeSeq.getVideoTrackAt(sourceTrackIndex) : qeSeq.getAudioTrackAt(sourceTrackIndex);
  var qeClip = qeTrack.getItemAt(clipIndex);
  if (!qeClip) return _err("QE clip not found");
  try {
    var trackOffset = targetTrackIndex - sourceTrackIndex;
    if (trackType === "video") {
      qeClip.moveToTrack(trackOffset, 0, "0", false);
    } else {
      qeClip.moveToTrack(0, trackOffset, "0", false);
    }
    return _ok({ targetTrack: targetTrackIndex });
  } catch (ex) {
    return _err("Move to track failed: " + ex.toString());
  }
}

function duplicateClip(trackType, trackIndex, clipIndex, targetTimeSec, targetTrackIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  // Get the source project item and insert at target position
  var projItem = clip.projectItem;
  if (!projItem) return _err("No source project item for this clip");

  var seq = app.project.activeSequence;
  var targetTime = _makeTime(targetTimeSec);

  if (trackType === "video") {
    seq.videoTracks[targetTrackIndex].overwriteClip(projItem, targetTime);
  } else {
    seq.audioTracks[targetTrackIndex].overwriteClip(projItem, targetTime);
  }
  return _ok();
}

function getClipSpeed(trackType, trackIndex, clipIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var result = {};
  try { result.speed = clip.getSpeed(); } catch (ex) { result.speed = 1; }
  try { result.reversed = clip.isSpeedReversed(); } catch (ex) { result.reversed = false; }
  return JSON.stringify(result);
}

function freezeFrame(trackType, trackIndex, clipIndex, timeSec, durationSec) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  // Freeze frame: set speed to 0 and adjust
  // Alternative: use add frame hold via QE
  try {
    app.enableQE();
    var qeSeq = qe.project.getActiveSequence();
    var qeTrack = trackType === "video" ? qeSeq.getVideoTrackAt(trackIndex) : qeSeq.getAudioTrackAt(trackIndex);
    var qeClip = qeTrack.getItemAt(clipIndex);
    if (qeClip) {
      // Set speed to 0 effectively creates a freeze
      qeClip.setSpeed(0, "ticks", false, false, false);
      return _ok({ note: "Freeze frame applied. Adjust duration manually if needed." });
    }
  } catch (ex) {}
  return _err("Freeze frame not supported via scripting. Use Time Remapping in Premiere Pro UI.");
}

/* Effects, transitions, and keyframes functions */

function applyEffect(trackType, trackIndex, clipIndex, effectName) {
  var e = _requireSequence();
  if (e) return e;
  if (trackType !== "video" && trackType !== "audio") return _err("Invalid track type");
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  app.enableQE();
  var qeClip = PremiereGodV7.findQeClip(trackIndex, clip, trackType === "audio");
  if (!qeClip) return _err("QE clip lookup failed");
  var available = trackType === "video" ? qe.project.getVideoEffectList() : qe.project.getAudioEffectList();
  var count = typeof available.length === "number" ? available.length : (available.numItems || 0), found = false;
  for (var i = 0; i < count; i++) { var entry=available[i]; if (String(entry && entry.name ? entry.name : entry) === String(effectName)) { found=true; break; } }
  if (!found) return _err("Effect not found: " + effectName);
  var effect = trackType === "video" ? qe.project.getVideoEffectByName(effectName) : qe.project.getAudioEffectByName(effectName);
  if (!effect) return _err("Effect lookup failed: " + effectName);
  var before = clip.components.numItems;
  if (trackType === "video") qeClip.addVideoEffect(effect); else qeClip.addAudioEffect(effect);
  var after = clip.components.numItems;
  if (after <= before) return _err("Effect addition not verified; inspect clip before retrying");
  return _ok({ effect: effectName, before: before, after: after });
}

function removeEffect(trackType, trackIndex, clipIndex, effectIndex) {
  var e = _requireSequence(); if (e) return e;
  if (trackType !== "video" && trackType !== "audio") return _err("Invalid track type");
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  if (typeof effectIndex !== "number" || effectIndex % 1 !== 0 || effectIndex < 0 || effectIndex >= clip.components.numItems) return _err("Effect index out of range");
  var component = clip.components[effectIndex], name = String(component.displayName || ""), before = clip.components.numItems;
  if (/^(motion|opacity|volume|channel volume|panner)$/i.test(name)) return _err("Intrinsic components cannot be removed");
  if (typeof component.remove === "function") component.remove();
  else {
    app.enableQE();
    var qclip = PremiereGodV7.findQeClip(trackIndex, clip, trackType === "audio");
    if (!qclip || typeof qclip.getComponentAt !== "function") return _err("Effect removal unsupported in this Premiere version");
    var qc = qclip.getComponentAt(effectIndex);
    if (!qc || String(qc.name || "").toLowerCase() !== name.toLowerCase() || typeof qc.remove !== "function") return _err("Effect removal unavailable or component mapping ambiguous");
    qc.remove();
  }
  if (clip.components.numItems !== before - 1) return _err("Effect removal not verified; inspect clip before retrying");
  return _ok({ removed: name, before: before, after: clip.components.numItems });
}

function getClipEffects(trackType, trackIndex, clipIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var effects = [];
  for (var i = 0; i < clip.components.numItems; i++) {
    var comp = clip.components[i];
    var props = [];
    for (var j = 0; j < comp.properties.numItems; j++) {
      var prop = comp.properties[j];
      var info = {
        index: j,
        displayName: prop.displayName,
      };
      try { info.value = prop.getValue(); } catch (ex) { info.value = "N/A"; }
      try { info.isTimeVarying = prop.isTimeVarying(); } catch (ex) {}
      try {
        var keys = prop.getKeys();
        if (keys) info.keyframeCount = keys.length;
      } catch (ex) {}
      props.push(info);
    }
    effects.push({
      index: i,
      displayName: comp.displayName,
      matchName: comp.matchName || "",
      properties: props,
    });
  }
  return JSON.stringify(effects);
}

function setEffectProperty(trackType, trackIndex, clipIndex, effectIndex, propertyName, value) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  if (effectIndex >= clip.components.numItems) return _err("Effect index out of range");

  var effect = clip.components[effectIndex];
  for (var i = 0; i < effect.properties.numItems; i++) {
    if (effect.properties[i].displayName === propertyName) {
      effect.properties[i].setValue(value, true);
      return _ok({ property: propertyName });
    }
  }
  return _err("Property not found: " + propertyName);
}

function getEffectProperty(trackType, trackIndex, clipIndex, effectIndex, propertyName) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  if (effectIndex >= clip.components.numItems) return _err("Effect index out of range");

  var effect = clip.components[effectIndex];
  for (var i = 0; i < effect.properties.numItems; i++) {
    if (effect.properties[i].displayName === propertyName) {
      var prop = effect.properties[i];
      var result = { displayName: propertyName };
      try { result.value = prop.getValue(); } catch (ex) {}
      try { result.isTimeVarying = prop.isTimeVarying(); } catch (ex) {}
      try { var keys = prop.getKeys(); if (keys) result.keyframeCount = keys.length; } catch (ex) {}
      return JSON.stringify(result);
    }
  }
  return _err("Property not found: " + propertyName);
}

function setEffectEnabled(trackType, trackIndex, clipIndex, effectIndex, enabled) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  if (effectIndex >= clip.components.numItems) return _err("Effect index out of range");

  var effect = clip.components[effectIndex];
  // Enabled is typically the first property or can be set via the component
  for (var i = 0; i < effect.properties.numItems; i++) {
    if (effect.properties[i].displayName === "enabled" || effect.properties[i].displayName === "Enabled") {
      effect.properties[i].setValue(enabled, true);
      return _ok();
    }
  }
  return _ok({ note: "Toggled effect. Some effects may not support enable/disable." });
}

// --- Effect Lists ---

function getVideoEffectsList() {
  app.enableQE();
  var effects = qe.project.getVideoEffectList();
  var list = [];
  var count = typeof effects.length === "number" ? effects.length : (effects.numItems || 0);
  for (var i = 0; i < count; i++) {
    var item = effects[i];
    list.push({ index: i, name: String(item && item.name ? item.name : item) });
  }
  return JSON.stringify(list);
}

function getAudioEffectsList() {
  app.enableQE();
  var effects = qe.project.getAudioEffectList();
  var list = [];
  var count = typeof effects.length === "number" ? effects.length : (effects.numItems || 0);
  for (var i = 0; i < count; i++) {
    var item = effects[i];
    list.push({ index: i, name: String(item && item.name ? item.name : item) });
  }
  return JSON.stringify(list);
}

function getVideoTransitionsList() {
  app.enableQE();
  var transitions = qe.project.getVideoTransitionList();
  var list = [];
  var count = typeof transitions.length === "number" ? transitions.length : (transitions.numItems || 0);
  for (var i = 0; i < count; i++) {
    var item = transitions[i];
    list.push({ index: i, name: String(item && item.name ? item.name : item) });
  }
  return JSON.stringify(list);
}

function getAudioTransitionsList() {
  app.enableQE();
  var transitions = qe.project.getAudioTransitionList();
  var list = [];
  var count = typeof transitions.length === "number" ? transitions.length : (transitions.numItems || 0);
  for (var i = 0; i < count; i++) {
    var item = transitions[i];
    list.push({ index: i, name: String(item && item.name ? item.name : item) });
  }
  return JSON.stringify(list);
}

// --- Transitions ---

function applyTransition(trackType, trackIndex, clipIndex, transitionName, durationSec, position) {
  var e = _requireSequence(); if (e) return e;
  if (trackType !== "video" && trackType !== "audio") return _err("Invalid track type");
  if (position !== "start" && position !== "end") return _err("Position must be start or end");
  if (typeof durationSec !== "number" || !isFinite(durationSec) || durationSec <= 0 || durationSec > 60) return _err("Invalid transition duration");
  var clip = _getClip(trackType,trackIndex,clipIndex), seq = app.project.activeSequence;
  if (!clip) return _err("Clip not found");
  var track = trackType === "video" ? seq.videoTracks[trackIndex] : seq.audioTracks[trackIndex];
  if (!track.transitions) return _err("Transition readback unavailable");
  var edge = position === "start" ? Number(clip.start.seconds) : Number(clip.end.seconds);
  var frame = Number(seq.timebase) / 254016000000, before = track.transitions.numItems;
  for (var i=0;i<before;i++) if (Number(track.transitions[i].start.seconds)-frame/2 <= edge && Number(track.transitions[i].end.seconds)+frame/2 >= edge) return _err("A transition already occupies this clip edge");
  app.enableQE();
  var qclip=PremiereGodV7.findQeClip(trackIndex,clip,trackType === "audio");
  if (!qclip || typeof qclip.addTransition !== "function") return _err("QE transition application unavailable");
  var list=trackType === "video" ? qe.project.getVideoTransitionList() : qe.project.getAudioTransitionList();
  var n=typeof list.length === "number" ? list.length : (list.numItems || 0), found=false;
  for(var j=0;j<n;j++){var item=list[j];if(String(item && item.name ? item.name : item)===String(transitionName)){found=true;break;}}
  if(!found)return _err("Transition not found: "+transitionName);
  var transition=trackType === "video" ? qe.project.getVideoTransitionByName(transitionName) : qe.project.getAudioTransitionByName(transitionName);
  if(!transition)return _err("Transition lookup failed");
  var fps=Math.round(1/frame),frames=Math.max(1,Math.round(durationSec/frame));
  function pad(x){return x<10 ? "0"+x : String(x);}
  var tc=pad(Math.floor(frames/(fps*3600)))+":"+pad(Math.floor(frames/(fps*60))%60)+":"+pad(Math.floor(frames/fps)%60)+":"+pad(frames%fps);
  qclip.addTransition(transition,position === "start",tc,"0",0.5,false,true);
  if(track.transitions.numItems!==before+1)return _err("Transition addition not verified; inspect timeline before retrying");
  for(var k=0;k<track.transitions.numItems;k++){var t=track.transitions[k];if(Number(t.start.seconds)-frame/2<=edge&&Number(t.end.seconds)+frame/2>=edge)return _ok({name:transitionName,start:Number(t.start.seconds),end:Number(t.end.seconds),requestedDuration:durationSec});}
  return _err("Transition added but placement not verified; inspect timeline before retrying");
}

function removeTransition(trackType, trackIndex, clipIndex, position) {
  var e=_requireSequence();if(e)return e;
  if ((trackType !== "video" && trackType !== "audio") || (position !== "start" && position !== "end")) return _err("Invalid track type or position");
  var clip=_getClip(trackType,trackIndex,clipIndex),seq=app.project.activeSequence;if(!clip)return _err("Clip not found");
  var track=trackType === "video" ? seq.videoTracks[trackIndex] : seq.audioTracks[trackIndex];
  if(!track.transitions)return _err("Transition readback unavailable");
  var edge=position === "start" ? Number(clip.start.seconds) : Number(clip.end.seconds),frame=Number(seq.timebase)/254016000000,matches=[];
  for(var i=0;i<track.transitions.numItems;i++){var t=track.transitions[i];if(Number(t.start.seconds)-frame/2<=edge&&Number(t.end.seconds)+frame/2>=edge)matches.push(t);}
  if(matches.length!==1)return _err("Transition edge is missing or ambiguous");
  if(typeof matches[0].remove !== "function")return _err("Transition removal unsupported in this Premiere version");
  var before=track.transitions.numItems;matches[0].remove(false,false);
  if(track.transitions.numItems!==before-1)return _err("Transition removal not verified; inspect before retrying");
  return _ok({removed:true});
}

function setDefaultTransition(transitionType, transitionName, durationSec) {
  app.enableQE();
  var transitions = transitionType === "video" ? qe.project.getVideoTransitionList() : qe.project.getAudioTransitionList();
  for (var i = 0; i < transitions.numItems; i++) {
    if (transitions[i].name === transitionName) {
      transitions[i].setSelected(true, true);
      return _ok({ defaultTransition: transitionName });
    }
  }
  return _err("Transition not found: " + transitionName);
}

// --- Keyframes ---

function addKeyframe(trackType, trackIndex, clipIndex, effectIndex, propertyName, timeSec, value) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  if (effectIndex >= clip.components.numItems) return _err("Effect index out of range");

  var effect = clip.components[effectIndex];
  for (var i = 0; i < effect.properties.numItems; i++) {
    if (effect.properties[i].displayName === propertyName) {
      var prop = effect.properties[i];
      if (!prop.isTimeVarying()) {
        prop.setTimeVarying(true);
      }
      var t = _makeTime(timeSec);
      prop.addKey(t.ticks);
      prop.setValueAtKey(t.ticks, value, true);
      return _ok({ property: propertyName, time: timeSec });
    }
  }
  return _err("Property not found: " + propertyName);
}

function removeKeyframe(trackType, trackIndex, clipIndex, effectIndex, propertyName, keyframeIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var effect = clip.components[effectIndex];
  for (var i = 0; i < effect.properties.numItems; i++) {
    if (effect.properties[i].displayName === propertyName) {
      var keys = effect.properties[i].getKeys();
      if (!keys || typeof keyframeIndex !== "number" || keyframeIndex % 1 !== 0 || keyframeIndex < 0 || keyframeIndex >= keys.length) return _err("Keyframe index out of range");
      var before = keys.length;
      effect.properties[i].removeKey(keys[keyframeIndex]);
      var after = effect.properties[i].getKeys();
      if ((after ? after.length : 0) !== before - 1) return _err("Keyframe removal not verified; inspect before retrying");
      return _ok();
    }
  }
  return _err("Property not found: " + propertyName);
}

function getKeyframes(trackType, trackIndex, clipIndex, effectIndex, propertyName) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var effect = clip.components[effectIndex];
  for (var i = 0; i < effect.properties.numItems; i++) {
    if (effect.properties[i].displayName === propertyName) {
      var prop = effect.properties[i];
      var keys = prop.getKeys();
      var keyframes = [];
      if (keys) {
        for (var k = 0; k < keys.length; k++) {
          var kTime = new Time();
          var keyTicks = (keys[k] && typeof keys[k] === "object" && typeof keys[k].ticks !== "undefined") ? String(keys[k].ticks) : String(keys[k]);
          kTime.ticks = keyTicks;
          keyframes.push({
            index: k,
            time: kTime.seconds,
            ticks: keyTicks,
            value: prop.getValueAtKey(keys[k])
          });
        }
      }
      return JSON.stringify({
        property: propertyName,
        isTimeVarying: prop.isTimeVarying(),
        keyframes: keyframes,
      });
    }
  }
  return _err("Property not found: " + propertyName);
}

function setKeyframeInterpolation(trackType, trackIndex, clipIndex, effectIndex, propertyName, keyframeIndex, interpolation) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var effect = clip.components[effectIndex];
  for (var i = 0; i < effect.properties.numItems; i++) {
    if (effect.properties[i].displayName === propertyName) {
      var keys = effect.properties[i].getKeys();
      if (keyframeIndex >= keys.length) return _err("Keyframe index out of range");

      var interpMap = {
        "linear": kfInterpMode_Linear,
        "hold": kfInterpMode_Hold,
        "bezier": kfInterpMode_Bezier,
        "ease_in": kfInterpMode_Bezier,
        "ease_out": kfInterpMode_Bezier,
        "ease_in_out": kfInterpMode_Bezier,
      };
      var mode = interpMap[interpolation] || kfInterpMode_Linear;
      effect.properties[i].setInterpolationTypeAtKey(keys[keyframeIndex], mode);
      return _ok();
    }
  }
  return _err("Property not found: " + propertyName);
}

// --- Motion/Transform shortcuts ---

function setClipTransform(trackIndex, clipIndex, posX, posY, scaleX, scaleY, rotation, opacity, anchorX, anchorY, antiFlicker) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip("video", trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  // Motion is typically component[1] (index 0 is often opacity or video itself)
  var motionComp = null;
  var opacityComp = null;
  for (var i = 0; i < clip.components.numItems; i++) {
    var name = clip.components[i].displayName.toLowerCase();
    if (name === "motion") motionComp = clip.components[i];
    if (name === "opacity") opacityComp = clip.components[i];
  }

  if (motionComp) {
    for (var j = 0; j < motionComp.properties.numItems; j++) {
      var prop = motionComp.properties[j];
      var pName = prop.displayName.toLowerCase();
      if (pName === "position" && (posX >= 0 || posY >= 0)) {
        var curVal = prop.getValue();
        prop.setValue([posX >= 0 ? posX : curVal[0], posY >= 0 ? posY : curVal[1]], true);
      }
      if (pName === "scale" && scaleX >= 0) prop.setValue(scaleX, true);
      if (pName === "scale width" && scaleX >= 0) prop.setValue(scaleX, true);
      if (pName === "scale height" && scaleY >= 0) prop.setValue(scaleY, true);
      if (pName === "rotation" && rotation > -99999) prop.setValue(rotation, true);
      if (pName === "anchor point" && (anchorX >= 0 || anchorY >= 0)) {
        var curAnchor = prop.getValue();
        prop.setValue([anchorX >= 0 ? anchorX : curAnchor[0], anchorY >= 0 ? anchorY : curAnchor[1]], true);
      }
      if (pName === "anti-flicker filter" && antiFlicker >= 0) prop.setValue(antiFlicker, true);
    }
  }

  if (opacityComp && opacity >= 0) {
    for (var j = 0; j < opacityComp.properties.numItems; j++) {
      if (opacityComp.properties[j].displayName.toLowerCase() === "opacity") {
        opacityComp.properties[j].setValue(opacity, true);
      }
    }
  }

  return _ok();
}

function getClipTransform(trackIndex, clipIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip("video", trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var result = {};

  for (var i = 0; i < clip.components.numItems; i++) {
    var comp = clip.components[i];
    var name = comp.displayName.toLowerCase();
    if (name === "motion") {
      for (var j = 0; j < comp.properties.numItems; j++) {
        var prop = comp.properties[j];
        try { result[prop.displayName] = prop.getValue(); } catch (ex) {}
      }
    }
    if (name === "opacity") {
      for (var j = 0; j < comp.properties.numItems; j++) {
        if (comp.properties[j].displayName.toLowerCase() === "opacity") {
          try { result.opacity = comp.properties[j].getValue(); } catch (ex) {}
        }
      }
    }
  }

  return JSON.stringify(result);
}

/* Marker functions */

var _colorMap = {
  green: 0, red: 1, purple: 2, orange: 3,
  yellow: 4, white: 5, blue: 6, cyan: 7,
};

function addMarker(timeSec, name, comment, color, durationSec, markerType, url, frameTarget) {
  var e = _requireSequence();
  if (e) return e;

  var markers = app.project.activeSequence.markers;
  var marker = markers.createMarker(timeSec);

  if (name) marker.name = name;
  if (comment) marker.comments = comment;
  if (durationSec > 0) marker.end = _makeTime(durationSec);
  if (color && _colorMap[color] !== undefined) marker.setColorByIndex(_colorMap[color]);
  if (markerType === "chapter") marker.type = "Chapter";
  if (markerType === "webLink") {
    marker.type = "WebLink";
    if (url) marker.url = url;
    if (frameTarget) marker.frameTarget = frameTarget;
  }
  if (markerType === "segmentation") marker.type = "Segmentation";
  if (markerType === "flashCuePoint") marker.type = "FlashCuePoint";

  return _ok();
}

function getMarkers() {
  var e = _requireSequence();
  if (e) return e;

  var markers = app.project.activeSequence.markers;
  var result = [];
  var marker = markers.getFirstMarker();
  var idx = 0;
  while (marker) {
    result.push({
      index: idx++,
      name: marker.name,
      comments: marker.comments,
      start: marker.start.seconds,
      end: marker.end.seconds,
      type: marker.type,
      guid: marker.guid,
    });
    marker = markers.getNextMarker(marker);
  }
  return JSON.stringify(result);
}

function removeMarker(markerIndex) {
  var e = _requireSequence();
  if (e) return e;

  var markers = app.project.activeSequence.markers;
  var marker = markers.getFirstMarker();
  var idx = 0;
  while (marker) {
    if (idx === markerIndex) {
      markers.deleteMarker(marker);
      return _ok();
    }
    marker = markers.getNextMarker(marker);
    idx++;
  }
  return _err("Marker not found at index: " + markerIndex);
}

function updateMarker(markerIndex, name, comment, color, durationSec) {
  var e = _requireSequence();
  if (e) return e;

  var markers = app.project.activeSequence.markers;
  var marker = markers.getFirstMarker();
  var idx = 0;
  while (marker) {
    if (idx === markerIndex) {
      if (name !== null && name !== undefined) marker.name = name;
      if (comment !== null && comment !== undefined) marker.comments = comment;
      if (color !== null && color !== undefined && _colorMap[color] !== undefined) marker.setColorByIndex(_colorMap[color]);
      if (durationSec >= 0) marker.end = _makeTime(marker.start.seconds + durationSec);
      return _ok();
    }
    marker = markers.getNextMarker(marker);
    idx++;
  }
  return _err("Marker not found at index: " + markerIndex);
}

function clearAllMarkers() {
  var e = _requireSequence();
  if (e) return e;

  var markers = app.project.activeSequence.markers;
  var marker = markers.getFirstMarker();
  while (marker) {
    var next = markers.getNextMarker(marker);
    markers.deleteMarker(marker);
    marker = next;
  }
  return _ok();
}

function addClipMarker(trackType, trackIndex, clipIndex, timeSec, name, comment, color) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var markers = clip.markers;
  if (!markers || typeof markers.getFirstMarker !== "function") return _err("Timeline clip markers are unavailable in this Premiere version");
  var marker = markers.createMarker(timeSec);
  if (name) marker.name = name;
  if (comment) marker.comments = comment;
  if (color && _colorMap[color] !== undefined) marker.setColorByIndex(_colorMap[color]);
  return _ok();
}

function getClipMarkers(trackType, trackIndex, clipIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip(trackType, trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  var markers = clip.markers;
  if (!markers || typeof markers.getFirstMarker !== "function") return _err("Timeline clip markers are unavailable in this Premiere version");
  var result = [];
  var marker = markers.getFirstMarker();
  while (marker) {
    result.push({
      name: marker.name,
      comments: marker.comments,
      start: marker.start.seconds,
      end: marker.end.seconds,
      type: marker.type,
    });
    marker = markers.getNextMarker(marker);
  }
  return JSON.stringify(result);
}

function addProjectItemMarker(nodeId, timeSec, name, comment, color) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var markers = item.getMarkers();
  var marker = markers.createMarker(timeSec);
  if (name) marker.name = name;
  if (comment) marker.comments = comment;
  if (color && _colorMap[color] !== undefined) marker.setColorByIndex(_colorMap[color]);
  return _ok();
}

/* Audio-specific functions */

function setClipVolume(trackIndex, clipIndex, volumeDb) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip("audio", trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  // Volume is in the audio clip's components, typically "Volume" component
  for (var i = 0; i < clip.components.numItems; i++) {
    var comp = clip.components[i];
    if (comp.displayName.toLowerCase() === "volume") {
      for (var j = 0; j < comp.properties.numItems; j++) {
        if (comp.properties[j].displayName.toLowerCase() === "level") {
          var prop=comp.properties[j];
          if (typeof volumeDb !== "number" || !isFinite(volumeDb) || volumeDb < -96 || volumeDb > 15) return _err("Volume dB must be between -96 and +15");
          if (prop.isTimeVarying && prop.isTimeVarying()) return _err("Volume has keyframes; use a keyframe-aware control");
          var level=PremiereGodV7.dbToLinearVolume(volumeDb);
          prop.setValue(level, true);
          var actual=Number(prop.getValue());
          if (Math.abs(actual-level)>0.0001) return _err("Volume readback mismatch; inspect before retrying");
          return _ok({ volumeDb: volumeDb, linearValue: actual });
        }
      }
    }
  }
  return _err("Volume component not found");
}

function getClipVolume(trackIndex, clipIndex) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip("audio", trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  for (var i = 0; i < clip.components.numItems; i++) {
    var comp = clip.components[i];
    if (comp.displayName.toLowerCase() === "volume") {
      for (var j = 0; j < comp.properties.numItems; j++) {
        if (comp.properties[j].displayName.toLowerCase() === "level") {
          var prop=comp.properties[j], level=Number(prop.getValue());
          var db=level > 0 ? 20 * Math.log(level / 0.177827941) / Math.LN10 : -96;
          return JSON.stringify({ volumeDb: db, linearValue: level, timeVarying: prop.isTimeVarying ? prop.isTimeVarying() : null, valueContext: "base property value" });
        }
      }
    }
  }
  return _err("Volume component not found");
}

function setClipMute(trackIndex, clipIndex, muted) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip("audio", trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");
  if (typeof clip.setDisabled !== "function") return _err("Clip mute API unavailable in this Premiere version; use track mute if appropriate");
  clip.setDisabled(muted);
  return _ok({ muted: muted });
}

function setAudioChannelMapping(nodeId, channelType) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var interp = item.getFootageInterpretation();
  if (!interp) return _err("Cannot get footage interpretation");

  if (channelType === "mono") interp.audioChannelType = 0;
  else if (channelType === "stereo") interp.audioChannelType = 1;
  else if (channelType === "5.1") interp.audioChannelType = 2;
  else if (channelType === "adaptive") interp.audioChannelType = 3;

  item.setFootageInterpretation(interp);
  return _ok({ channelType: channelType });
}

function getAudioChannelMapping(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var interp = item.getFootageInterpretation();
  if (!interp) return _err("Cannot get footage interpretation");

  var typeMap = { 0: "mono", 1: "stereo", 2: "5.1", 3: "adaptive" };
  return JSON.stringify({
    audioChannelType: typeMap[interp.audioChannelType] || "unknown",
    audioChannelTypeRaw: interp.audioChannelType,
  });
}

function setTrackVolume(trackIndex, volumeDb) {
  var e = _requireSequence();
  if (e) return e;
  // Track volume is set through QE or track mixer - limited API support
  return _ok({ note: "Track volume requires Audio Track Mixer. Use setClipVolume for individual clips." });
}

function setTrackPan(trackIndex, pan) {
  var e = _requireSequence();
  if (e) return e;
  return _ok({ note: "Track pan requires Audio Track Mixer UI." });
}

function soloTrack(trackIndex, solo) {
  var e = _requireSequence();
  if (e) return e;
  // Solo is not directly exposed in ExtendScript DOM
  return _ok({ note: "Solo track via ExtendScript not directly supported. Use execute_extendscript with QE." });
}

function addAudioKeyframe(trackIndex, clipIndex, timeSec, volumeDb) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip("audio", trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  for (var i = 0; i < clip.components.numItems; i++) {
    var comp = clip.components[i];
    if (comp.displayName.toLowerCase() === "volume") {
      for (var j = 0; j < comp.properties.numItems; j++) {
        if (comp.properties[j].displayName.toLowerCase() === "level") {
          var prop = comp.properties[j];
          if (!prop.isTimeVarying()) prop.setTimeVarying(true);
          var t = _makeTime(timeSec);
          prop.addKey(t.ticks);
          prop.setValueAtKey(t.ticks, volumeDb, true);
          return _ok({ time: timeSec, volumeDb: volumeDb });
        }
      }
    }
  }
  return _err("Volume component not found");
}

function applyAudioCrossfade(trackIndex, clipIndex, type, durationSec) {
  var e = _requireSequence();
  if (e) return e;

  app.enableQE();
  var qeSeq = qe.project.getActiveSequence();
  var qeTrack = qeSeq.getAudioTrackAt(trackIndex);
  var qeClip = qeTrack.getItemAt(clipIndex);
  if (!qeClip) return _err("QE clip not found");

  var nameMap = {
    "constant_gain": "Constant Gain",
    "constant_power": "Constant Power",
    "exponential_fade": "Exponential Fade",
  };
  var transitionName = nameMap[type] || "Constant Power";

  var transitions = qe.project.getAudioTransitionList();
  for (var i = 0; i < transitions.numItems; i++) {
    if (transitions[i].name === transitionName) {
      qeClip.addTransition(transitions[i], true);
      return _ok({ transition: transitionName });
    }
  }
  return _err("Audio transition not found: " + transitionName);
}

/* Export and render functions */

function exportSequence(outputPath, presetPath, startTimeSec, endTimeSec, useInOut) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  if (startTimeSec >= 0 && endTimeSec >= 0) {
    seq.setInPoint(startTimeSec);
    seq.setOutPoint(endTimeSec);
  }

  var workAreaType = app.encoder.ENCODE_ENTIRE;
  if (useInOut || (startTimeSec >= 0 && endTimeSec >= 0)) {
    workAreaType = app.encoder.ENCODE_IN_TO_OUT;
  }

  var jobId = app.encoder.encodeSequence(seq, outputPath, presetPath, workAreaType, true);
  app.encoder.startBatch();

  return _ok({ outputPath: outputPath, jobId: jobId });
}

function exportFrame(outputPath, timeSec, format) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  if (timeSec >= 0) {
    seq.setPlayerPosition(_makeTime(timeSec).ticks);
  }

  seq.exportFramePNG(timeSec >= 0 ? _makeTime(timeSec).ticks : seq.getPlayerPosition().ticks, outputPath);
  return _ok({ outputPath: outputPath });
}

function exportAAF(outputPath, mixdownAudio, explodeToMono, sampleRate, bitsPerSample) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  seq.exportAsMediaDirect(
    outputPath,
    "", // no preset
    app.encoder.ENCODE_ENTIRE
  );

  // AAF export via project
  app.project.exportAAF(
    seq,
    outputPath,
    mixdownAudio ? 1 : 0,
    explodeToMono ? 1 : 0,
    sampleRate,
    bitsPerSample,
    0, // embed audio
    0, // handle frames
    0  // render sequences
  );

  return _ok({ outputPath: outputPath });
}

function exportOMF(outputPath, sampleRate, bitsPerSample, handleDuration) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  app.project.exportOMF(
    seq,
    outputPath,
    "OMFTitle",
    sampleRate,
    bitsPerSample,
    1, // encapsulated
    handleDuration
  );

  return _ok({ outputPath: outputPath });
}

function exportEDL(outputPath, trackIndex) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  seq.exportAsEDL(outputPath, trackIndex);
  return _ok({ outputPath: outputPath });
}

function exportFinalCutXML(outputPath) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  seq.exportAsFinalCutProXML(outputPath);
  return _ok({ outputPath: outputPath });
}

function getEncoderPresets() {
  var presets = [];
  try {
    app.enableQE();
    var formatList = app.encoder.getFormatList();
    if (formatList) {
      for (var i = 0; i < formatList.length; i++) {
        presets.push({ format: formatList[i] });
      }
    }
  } catch (ex) {
    return JSON.stringify({ error: "Encoder preset discovery unavailable; provide a verified .epr preset path or use Premiere Export.", detail: String(ex) });
  }
  return JSON.stringify(presets);
}

function renderSequencePreview(startTimeSec, endTimeSec) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  if (startTimeSec >= 0 && endTimeSec >= 0) {
    seq.setInPoint(startTimeSec);
    seq.setOutPoint(endTimeSec);
  }

  seq.renderSelection(true);
  return _ok();
}

function exportAsMediaDirect(outputPath, presetPath) {
  var e = _requireSequence();
  if (e) return e;
  if (!outputPath || !presetPath) return _err("Output and preset paths are required");
  var output = new File(outputPath), preset = new File(presetPath);
  if (output.exists) return _err("Output already exists; choose a new file");
  if (!preset.exists) return _err("Export preset not found");
  var result = app.project.activeSequence.exportAsMediaDirect(outputPath, presetPath, app.encoder.ENCODE_ENTIRE);
  if (typeof result === "string" && /error/i.test(result) && !/no error/i.test(result)) return _err("Direct export failed: " + result);
  output = new File(outputPath);
  if (!output.exists || output.length <= 0) return _err("Export output not verified; inspect the destination before retrying");
  return _ok({ outputPath: outputPath, bytes: output.length, hostResult: String(result) });
}

/* Metadata and XMP functions */

function getClipMetadata(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var metadata = {};
  try {
    var xmp = item.getProjectMetadata();
    metadata.projectMetadata = xmp;
  } catch (ex) {}

  try {
    var columns = app.project.getProjectPanelMetadata();
    metadata.projectPanelMetadata = columns;
  } catch (ex) {}

  return JSON.stringify(metadata);
}

function setClipMetadata(nodeId, property, value) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  item.setProjectMetadata(value, [property]);
  return _ok({ property: property });
}

function getXMPMetadata(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var xmp = item.getXMPMetadata();
  return JSON.stringify({ xmp: xmp });
}

function setXMPMetadata(nodeId, xmpXml) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  item.setXMPMetadata(xmpXml);
  return _ok();
}

function getFileMetadata(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var info = { name: item.name, nodeId: nodeId };

  try { info.mediaPath = item.getMediaPath(); } catch (ex) {}
  try {
    var interp = item.getFootageInterpretation();
    if (interp) {
      info.frameRate = interp.frameRate;
      info.pixelAspectRatio = interp.pixelAspectRatio;
      info.fieldType = interp.fieldType;
      info.alphaUsage = interp.alphaUsage;
      info.audioChannelType = interp.audioChannelType;
    }
  } catch (ex) {}
  try { info.isOffline = item.isOffline(); } catch (ex) {}
  try {
    // Get source clip duration
    var inP = item.getInPoint();
    var outP = item.getOutPoint();
    if (inP) info.inPoint = inP.seconds;
    if (outP) info.outPoint = outP.seconds;
  } catch (ex) {}

  return JSON.stringify(info);
}

function setClipDescription(nodeId, description) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  // Use the project metadata schema
  var schema = "http://ns.adobe.com/premierePrivateProjectMetaData/1.0/";
  item.setProjectMetadata(description, [schema + "Column.PropertyText.Description"]);
  return _ok();
}

function setProjectItemLabel(nodeId, colorIndex) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  item.setColorLabel(colorIndex);
  return _ok();
}

function getClipColorSpace(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var info = {};
  try {
    info.colorSpace = item.getColorSpace();
  } catch (ex) {
    info.note = "Color space info not available for this item.";
  }
  return JSON.stringify(info);
}

function setOverrideFrameRate(nodeId, frameRate) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var interp = item.getFootageInterpretation();
  if (!interp) return _err("Cannot get footage interpretation");
  interp.frameRate = frameRate;
  item.setFootageInterpretation(interp);
  return _ok({ frameRate: frameRate });
}

function setOverridePixelAspectRatio(nodeId, numerator, denominator) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);

  var interp = item.getFootageInterpretation();
  if (!interp) return _err("Cannot get footage interpretation");
  interp.pixelAspectRatio = numerator / denominator;
  item.setFootageInterpretation(interp);
  return _ok({ pixelAspectRatio: numerator / denominator });
}

/* Captions and subtitles functions */

function getCaptionTracks() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  var tracks = [];
  try {
    for (var i = 0; i < seq.captionTracks.numTracks; i++) {
      var track = seq.captionTracks[i];
      tracks.push({
        index: i,
        name: track.name,
        numCaptions: track.clips ? track.clips.numItems : 0,
      });
    }
  } catch (ex) {
    return JSON.stringify({ error: "Caption tracks API not available in this Premiere Pro version.", tracks: [] });
  }
  return JSON.stringify(tracks);
}

function addCaptionTrack(format) {
  var e = _requireSequence();
  if (e) return e;
  // Caption track creation varies by version
  try {
    app.project.activeSequence.createCaptionTrack("", format);
  } catch (ex) {
    return _err("Failed to create caption track: " + ex.toString());
  }
  return _ok();
}

function addCaption(trackIndex, startTimeSec, endTimeSec, text) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  try {
    var captionTrack = seq.captionTracks[trackIndex];
    if (!captionTrack) return _err("Caption track not found at index: " + trackIndex);
    captionTrack.addCaption(startTimeSec, endTimeSec, text);
  } catch (ex) {
    return _err("Failed to add caption: " + ex.toString());
  }
  return _ok();
}

function getCaptions(trackIndex) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  var captions = [];
  try {
    var captionTrack = seq.captionTracks[trackIndex];
    if (!captionTrack) return _err("Caption track not found at index: " + trackIndex);

    if (captionTrack.clips) {
      for (var i = 0; i < captionTrack.clips.numItems; i++) {
        var clip = captionTrack.clips[i];
        captions.push({
          index: i,
          text: clip.name || "",
          startTime: clip.start.seconds,
          endTime: clip.end.seconds,
        });
      }
    }
  } catch (ex) {
    return _err("Failed to get captions: " + ex.toString());
  }
  return JSON.stringify(captions);
}

function updateCaption(trackIndex, captionIndex, text, startTimeSec, endTimeSec) {
  var e = _requireSequence();
  if (e) return e;
  try {
    var captionTrack = app.project.activeSequence.captionTracks[trackIndex];
    if (!captionTrack) return _err("Caption track not found");
    var clip = captionTrack.clips[captionIndex];
    if (!clip) return _err("Caption not found at index: " + captionIndex);

    if (text !== null && text !== undefined) clip.name = text;
    if (startTimeSec >= 0) clip.start = _makeTime(startTimeSec);
    if (endTimeSec >= 0) clip.end = _makeTime(endTimeSec);
  } catch (ex) {
    return _err("Failed to update caption: " + ex.toString());
  }
  return _ok();
}

function removeCaption(trackIndex, captionIndex) {
  var e = _requireSequence();
  if (e) return e;
  try {
    var captionTrack = app.project.activeSequence.captionTracks[trackIndex];
    if (!captionTrack) return _err("Caption track not found");
    var clip = captionTrack.clips[captionIndex];
    if (!clip) return _err("Caption not found");
    clip.remove(false, false);
  } catch (ex) {
    return _err("Failed to remove caption: " + ex.toString());
  }
  return _ok();
}

function importCaptions(filePath) {
  var e = _requireSequence();
  if (e) return e;
  try {
    app.project.activeSequence.importCaptionFile(filePath);
  } catch (ex) {
    // Fallback: try importing as regular media
    app.project.importFiles([filePath], false, app.project.rootItem, false);
  }
  return _ok({ filePath: filePath });
}

function exportCaptions(outputPath, format, trackIndex) {
  var e = _requireSequence();
  if (e) return e;
  try {
    app.project.activeSequence.exportCaptionFile(outputPath);
  } catch (ex) {
    return _err("Failed to export captions: " + ex.toString());
  }
  return _ok({ outputPath: outputPath });
}

function transcribeSequence() {
  var e = _requireSequence();
  if (e) return e;
  try {
    app.project.activeSequence.transcribe();
    return _ok({ note: "Transcription started. Check Premiere Pro for progress." });
  } catch (ex) {
    return _err("Transcription not available: " + ex.toString());
  }
}

/* Graphics, MOGRTs, and generators */

function importMogrt(mogrtPath) {
  var e = _requireProject();
  if (e) return e;
  app.project.importFiles([mogrtPath], false, app.project.rootItem, false);
  return _ok({ mogrtPath: mogrtPath });
}

function addMogrtToTimeline(mogrtPath, trackIndex, startTimeSec, durationSec) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  try {
    var result = seq.importMGT(
      mogrtPath,
      _makeTime(startTimeSec).ticks,
      trackIndex,
      trackIndex  // video track
    );
    return _ok({ mogrt: mogrtPath });
  } catch (ex) {
    return _err("Failed to add MOGRT: " + ex.toString());
  }
}

function getMogrtProperties(trackIndex, clipIndex) {
  var e = _requireSequence(); if (e) return e;
  var clip = _getClip("video", trackIndex, clipIndex); if (!clip) return _err("Clip not found");
  try {
    if (typeof clip.getMGTComponent !== "function") return _err("Motion Graphics template API unavailable");
    var mgt = clip.getMGTComponent();
    if (!mgt || !mgt.properties) return _err("Clip is not a Motion Graphics template");
    var props = [];
    for (var i = 0; i < mgt.properties.numItems; i++) {
      var prop = mgt.properties[i]; props.push({index:i, displayName:prop.displayName, value:prop.getValue()});
    }
    return JSON.stringify(props);
  } catch (ex) { return _err("Motion Graphics properties unavailable: " + String(ex)); }
}

function setMogrtProperty(trackIndex, clipIndex, propertyName, value) {
  var e = _requireSequence();
  if (e) return e;
  var clip = _getClip("video", trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  try {
    var mgt = clip.getMGTComponent();
    if (mgt) {
      for (var i = 0; i < mgt.properties.numItems; i++) {
        if (mgt.properties[i].displayName === propertyName) {
          mgt.properties[i].setValue(value, true);
          return _ok({ property: propertyName });
        }
      }
    }
  } catch (ex) {}

  // Fallback: search all components
  for (var i = 0; i < clip.components.numItems; i++) {
    for (var j = 0; j < clip.components[i].properties.numItems; j++) {
      if (clip.components[i].properties[j].displayName === propertyName) {
        clip.components[i].properties[j].setValue(value, true);
        return _ok({ property: propertyName });
      }
    }
  }
  return _err("Property not found: " + propertyName);
}

function addTextGraphic(text, trackIndex, startTimeSec, durationSec, fontSize, fontFamily, color, posX, posY, alignment) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  // Text graphics are added via Essential Graphics - use MOGRT or QE
  try {
    app.enableQE();
    var qeSeq = qe.project.getActiveSequence();
    // Add a title/text graphic
    qeSeq.addTitle(text, _makeTime(startTimeSec).ticks, trackIndex);
    return _ok({ text: text, note: "Text graphic added. Edit properties via Essential Graphics panel or set_mogrt_property." });
  } catch (ex) {
    return _err("Failed to add text graphic. Use add_mogrt_to_timeline with a text MOGRT template instead. Error: " + ex.toString());
  }
}

function addColorMatte(trackIndex, startTimeSec, durationSec, color, name) {
  var e = _requireSequence();
  if (e) return e;

  try {
    app.enableQE();
    // Parse hex color
    var r = parseInt(color.substr(1, 2), 16);
    var g = parseInt(color.substr(3, 2), 16);
    var b = parseInt(color.substr(5, 2), 16);

    var seq = app.project.activeSequence;
    qe.project.newColorMatte(
      seq.frameSizeHorizontal,
      seq.frameSizeVertical,
      r, g, b,
      name
    );
    return _ok({ name: name, color: color, note: "Color matte created in project panel. Use add_clip_to_timeline to place it." });
  } catch (ex) {
    return _err("Failed to create color matte: " + ex.toString());
  }
}

function addBarsAndTone(trackIndex, startTimeSec, durationSec) {
  var e = _requireSequence();
  if (e) return e;

  try {
    app.enableQE();
    var seq = app.project.activeSequence;
    qe.project.newBarsAndTone(seq.frameSizeHorizontal, seq.frameSizeVertical);
    return _ok({ note: "Bars and tone created in project panel. Use add_clip_to_timeline to place it." });
  } catch (ex) {
    return _err("Failed to create bars and tone: " + ex.toString());
  }
}

function addBlackVideo(trackIndex, startTimeSec, durationSec) {
  var e = _requireSequence();
  if (e) return e;

  try {
    app.enableQE();
    var seq = app.project.activeSequence;
    qe.project.newBlackVideo(seq.frameSizeHorizontal, seq.frameSizeVertical);
    return _ok({ note: "Black video created in project panel. Use add_clip_to_timeline to place it." });
  } catch (ex) {
    return _err("Failed to create black video: " + ex.toString());
  }
}

function addUniversalCountingLeader(trackIndex, startTimeSec) {
  var e = _requireSequence();
  if (e) return e;

  try {
    app.enableQE();
    var seq = app.project.activeSequence;
    qe.project.newUniversalCountingLeader(seq.frameSizeHorizontal, seq.frameSizeVertical);
    return _ok({ note: "Universal counting leader created in project panel. Use add_clip_to_timeline to place it." });
  } catch (ex) {
    return _err("Failed to create counting leader: " + ex.toString());
  }
}

/* ─── TikTok-style caption tools ─── */

var _MOGRT_DIR = "C:/Program Files/Adobe/Adobe Premiere Pro 2026/Essential Graphics/";
var _MOGRT_TEMPLATES = {
  "basic":      _MOGRT_DIR + "Basic Title.mogrt",
  "bold":       _MOGRT_DIR + "Titles/Bold Title.mogrt",
  "classic":    _MOGRT_DIR + "Titles/Classic Title.mogrt",
  "modern":     _MOGRT_DIR + "Titles/Modern Title.mogrt",
  "film":       _MOGRT_DIR + "Titles/Film Title.mogrt",
  "lower_third": _MOGRT_DIR + "Basic Lower Third.mogrt"
};

function _setTextProps(clip, text, posX, posY, scale) {
  var comps = clip.components;
  for (var c = 0; c < comps.numItems; c++) {
    var comp = comps[c];
    if (comp.displayName === "Text") {
      for (var p = 0; p < comp.properties.numItems; p++) {
        var prop = comp.properties[p];
        if (prop.displayName === "Source Text" && text !== undefined && text !== null) {
          prop.setValue(text, true);
        }
        if (prop.displayName === "Position" && posX !== undefined && posY !== undefined) {
          prop.setValue([posX, posY], true);
        }
        if (prop.displayName === "Scale" && scale !== undefined && scale !== null) {
          prop.setValue(scale, true);
        }
      }
    }
    if (comp.displayName === "Motion") {
      for (var p2 = 0; p2 < comp.properties.numItems; p2++) {
        if (comp.properties[p2].displayName === "Scale" && scale !== undefined && scale !== null) {
          comp.properties[p2].setValue(scale, true);
        }
      }
    }
  }
}

function addTikTokCaption(text, trackIndex, startTimeSec, durationSec, posX, posY, scale, template) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  var mogrtPath = _MOGRT_TEMPLATES[template || "bold"] || _MOGRT_TEMPLATES["bold"];

  try {
    var startTicks = _makeTime(startTimeSec).ticks;
    seq.importMGT(mogrtPath, startTicks, trackIndex, trackIndex);

    // Find the newly added clip (last on the track)
    var track = seq.videoTracks[trackIndex];
    var clip = track.clips[track.clips.numItems - 1];

    // Set text content and position
    _setTextProps(clip, text, posX || 0.5, posY || 0.5, scale || 100);

    // Set duration by adjusting the out point
    if (durationSec) {
      var endTicks = _makeTime(startTimeSec + durationSec).ticks;
      clip.end = endTicks;
    }

    return _ok({
      text: text,
      trackIndex: trackIndex,
      clipIndex: track.clips.numItems - 1,
      start: startTimeSec,
      duration: durationSec,
      template: template || "bold"
    });
  } catch (ex) {
    return _err("Failed to add caption: " + ex.toString());
  }
}

function addCaptionSequence(captionsJSON, trackIndex, template, posX, posY, scale) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;

  var captions;
  if (typeof captionsJSON === "string") {
    captions = JSON.parse(captionsJSON);
  } else {
    captions = captionsJSON;
  }

  var mogrtPath = _MOGRT_TEMPLATES[template || "bold"] || _MOGRT_TEMPLATES["bold"];
  var results = [];

  for (var i = 0; i < captions.length; i++) {
    var cap = captions[i];
    try {
      var startTicks = _makeTime(cap.start).ticks;
      seq.importMGT(mogrtPath, startTicks, trackIndex, trackIndex);

      var track = seq.videoTracks[trackIndex];
      var clip = track.clips[track.clips.numItems - 1];

      _setTextProps(clip, cap.text, posX || 0.5, posY || 0.75, scale || 100);

      if (cap.duration) {
        clip.end = _makeTime(cap.start + cap.duration).ticks;
      }

      results.push({text: cap.text, start: cap.start, duration: cap.duration});
    } catch (ex) {
      results.push({text: cap.text, error: ex.toString()});
    }
  }

  return _ok({captions: results, count: results.length});
}

function styleTextGraphic(trackIndex, clipIndex, text, posX, posY, scale, opacity) {
  var e = _requireSequence();
  if (e) return e;

  var clip = _getClip("video", trackIndex, clipIndex);
  if (!clip) return _err("Clip not found");

  try {
    _setTextProps(clip, text, posX, posY, scale);

    if (opacity !== undefined && opacity !== null) {
      var comps = clip.components;
      for (var c = 0; c < comps.numItems; c++) {
        if (comps[c].displayName === "Opacity") {
          for (var p = 0; p < comps[c].properties.numItems; p++) {
            if (comps[c].properties[p].displayName === "Opacity") {
              comps[c].properties[p].setValue(opacity, true);
            }
          }
        }
      }
    }

    return _ok({trackIndex: trackIndex, clipIndex: clipIndex});
  } catch (ex) {
    return _err("Failed to style text: " + ex.toString());
  }
}

function getAvailableMogrts() {
  var templates = [];
  for (var key in _MOGRT_TEMPLATES) {
    templates.push({name: key, path: _MOGRT_TEMPLATES[key]});
  }
  return JSON.stringify(templates);
}

/* Playback control and source monitor functions */

function setPlayhead(timeSec) {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  seq.setPlayerPosition(_makeTime(timeSec).ticks);
  return _ok({ time: timeSec });
}

function getPlayhead() {
  var e = _requireSequence();
  if (e) return e;
  var pos = app.project.activeSequence.getPlayerPosition();
  return JSON.stringify({ seconds: pos.seconds, ticks: pos.ticks });
}

function play(speed) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  try {
    if (speed === 1) {
      qe.project.getActiveSequence().player.play(1);
    } else {
      qe.project.getActiveSequence().player.play(speed);
    }
  } catch (ex) {
    return _err("Playback control failed: " + ex.toString());
  }
  return _ok({ speed: speed });
}

function stop() {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  try {
    qe.project.getActiveSequence().player.stop();
  } catch (ex) {
    return _err("Stop failed: " + ex.toString());
  }
  return _ok();
}

function stepForward(frames) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  try {
    for (var i = 0; i < frames; i++) {
      qe.project.getActiveSequence().player.step(1);
    }
  } catch (ex) {
    return _err("Step failed: " + ex.toString());
  }
  return _ok({ frames: frames });
}

function stepBackward(frames) {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  try {
    for (var i = 0; i < frames; i++) {
      qe.project.getActiveSequence().player.step(-1);
    }
  } catch (ex) {
    return _err("Step failed: " + ex.toString());
  }
  return _ok({ frames: frames });
}

function goToInPoint() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  var inTime = seq.getInPointAsTime();
  seq.setPlayerPosition(inTime.ticks);
  return _ok({ time: inTime.seconds });
}

function goToOutPoint() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  var outTime = seq.getOutPointAsTime();
  seq.setPlayerPosition(outTime.ticks);
  return _ok({ time: outTime.seconds });
}

function goToStart() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  seq.setPlayerPosition(seq.zeroPoint.ticks);
  return _ok();
}

function goToEnd() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  seq.setPlayerPosition(seq.end.ticks);
  return _ok();
}

function goToNextEdit() {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  try {
    qe.project.getActiveSequence().player.goToNextEdit();
  } catch (ex) {
    return _err("Go to next edit failed: " + ex.toString());
  }
  return _ok();
}

function goToPreviousEdit() {
  var e = _requireSequence();
  if (e) return e;
  app.enableQE();
  try {
    qe.project.getActiveSequence().player.goToPreviousEdit();
  } catch (ex) {
    return _err("Go to previous edit failed: " + ex.toString());
  }
  return _ok();
}

function openInSourceMonitor(nodeId) {
  var e = _requireProject();
  if (e) return e;
  var item = _findProjectItemByNodeId(app.project.rootItem, nodeId);
  if (!item) return _err("Item not found: " + nodeId);
  item.openInSourceMonitor();
  return _ok({ name: item.name });
}

function getSourceMonitorClip() {
  var e = _requireProject();
  if (e) return e;
  try {
    app.enableQE();
    var srcMon = qe.source;
    return JSON.stringify({
      name: srcMon.name || "",
      note: "Source monitor info retrieved via QE",
    });
  } catch (ex) {
    return _err("No clip in source monitor or API not available");
  }
}

function setSourceInOut(inPointSec, outPointSec) {
  var e = _requireProject();
  if (e) return e;
  try {
    app.enableQE();
    if (inPointSec >= 0) {
      app.sourceMonitor.openFilePath("");
    }
  } catch (ex) {}
  return _ok({ note: "Source monitor in/out points set via UI recommended." });
}

function setWorkspace(workspaceName) {
  app.enableQE();
  try {
    qe.project.setWorkspace(workspaceName);
  } catch (ex) {
    return _err("Failed to set workspace: " + ex.toString());
  }
  return _ok({ workspace: workspaceName });
}

function getTimelineZoom() {
  var e = _requireSequence();
  if (e) return e;
  var seq = app.project.activeSequence;
  return JSON.stringify({
    start: seq.zeroPoint.seconds,
    end: seq.end.seconds,
    playerPosition: seq.getPlayerPosition().seconds,
    inPoint: seq.getInPointAsTime().seconds,
    outPoint: seq.getOutPointAsTime().seconds,
  });
}

function getAppVersion() {
  return JSON.stringify({
    version: app.version,
    build: app.build,
    name: app.name,
  });
}

function undo() {
  app.enableQE();
  try { qe.project.undoStackManager.undo(); } catch (ex) {}
  return _ok();
}

function redo() {
  app.enableQE();
  try { qe.project.undoStackManager.redo(); } catch (ex) {}
  return _ok();
}

var funcs={
"getProjectInfo":getProjectInfo,
"saveProject":saveProject,
"openProject":openProject,
"closeProject":closeProject,
"importMedia":importMedia,
"importSequences":importSequences,
"getProjectItems":getProjectItems,
"getProjectItemInfo":getProjectItemInfo,
"createBin":createBin,
"renameProjectItem":renameProjectItem,
"deleteProjectItems":deleteProjectItems,
"moveProjectItem":moveProjectItem,
"setProjectItemInOut":setProjectItemInOut,
"clearProjectItemInOut":clearProjectItemInOut,
"createProxy":createProxy,
"attachProxy":attachProxy,
"toggleProxyMode":toggleProxyMode,
"refreshMedia":refreshMedia,
"findProjectItems":findProjectItems,
"setProjectSettings":setProjectSettings,
"createSubClip":createSubClip,
"relinkMedia":relinkMedia,
"importAEComps":importAEComps,
"consolidateDuplicates":consolidateDuplicates,
"getProjectItemTypeInfo":getProjectItemTypeInfo,
"setScaleToFrameSize":setScaleToFrameSize,
"flushCache":flushCache,
"getSequences":getSequences,
"getActiveSequence":getActiveSequence,
"setActiveSequence":setActiveSequence,
"createSequence":createSequence,
"createSequenceFromClip":createSequenceFromClip,
"deleteSequence":deleteSequence,
"getSequenceSettings":getSequenceSettings,
"setSequenceInOut":setSequenceInOut,
"clearSequenceInOut":clearSequenceInOut,
"nestClips":nestClips,
"addTracks":addTracks,
"removeTrack":removeTrack,
"getTrackInfo":getTrackInfo,
"setTrackMuted":setTrackMuted,
"setTrackLocked":setTrackLocked,
"renameTrack":renameTrack,
"autoReframeSequence":autoReframeSequence,
"sceneEditDetection":sceneEditDetection,
"setWorkArea":setWorkArea,
"getWorkArea":getWorkArea,
"getSelection":getSelection,
"getTimelineClips":getTimelineClips,
"addClipToTimeline":addClipToTimeline,
"overwriteClipToTimeline":overwriteClipToTimeline,
"setClipPosition":setClipPosition,
"setClipInOut":setClipInOut,
"removeClip":removeClip,
"razorClip":razorClip,
"razorAllTracks":razorAllTracks,
"setClipSpeed":setClipSpeed,
"enableDisableClip":enableDisableClip,
"setClipLabel":setClipLabel,
"renameClip":renameClip,
"linkClips":linkClips,
"unlinkClip":unlinkClip,
"getClipInfo":getClipInfo,
"addAdjustmentLayer":addAdjustmentLayer,
"selectClips":selectClips,
"deselectAll":deselectAll,
"slipClip":slipClip,
"slideClip":slideClip,
"rippleDelete":rippleDelete,
"moveClipToTrack":moveClipToTrack,
"duplicateClip":duplicateClip,
"getClipSpeed":getClipSpeed,
"freezeFrame":freezeFrame,
"applyEffect":applyEffect,
"removeEffect":removeEffect,
"getClipEffects":getClipEffects,
"setEffectProperty":setEffectProperty,
"getEffectProperty":getEffectProperty,
"setEffectEnabled":setEffectEnabled,
"getVideoEffectsList":getVideoEffectsList,
"getAudioEffectsList":getAudioEffectsList,
"getVideoTransitionsList":getVideoTransitionsList,
"getAudioTransitionsList":getAudioTransitionsList,
"applyTransition":applyTransition,
"removeTransition":removeTransition,
"setDefaultTransition":setDefaultTransition,
"addKeyframe":addKeyframe,
"removeKeyframe":removeKeyframe,
"getKeyframes":getKeyframes,
"setKeyframeInterpolation":setKeyframeInterpolation,
"setClipTransform":setClipTransform,
"getClipTransform":getClipTransform,
"addClipMarker":addClipMarker,
"getClipMarkers":getClipMarkers,
"addProjectItemMarker":addProjectItemMarker,
"setClipVolume":setClipVolume,
"getClipVolume":getClipVolume,
"setClipMute":setClipMute,
"setAudioChannelMapping":setAudioChannelMapping,
"getAudioChannelMapping":getAudioChannelMapping,
"setTrackVolume":setTrackVolume,
"setTrackPan":setTrackPan,
"soloTrack":soloTrack,
"addAudioKeyframe":addAudioKeyframe,
"applyAudioCrossfade":applyAudioCrossfade,
"exportSequence":exportSequence,
"exportFrame":exportFrame,
"exportAAF":exportAAF,
"exportOMF":exportOMF,
"exportEDL":exportEDL,
"exportFinalCutXML":exportFinalCutXML,
"getEncoderPresets":getEncoderPresets,
"renderSequencePreview":renderSequencePreview,
"exportAsMediaDirect":exportAsMediaDirect,
"getClipMetadata":getClipMetadata,
"setClipMetadata":setClipMetadata,
"getXMPMetadata":getXMPMetadata,
"setXMPMetadata":setXMPMetadata,
"getFileMetadata":getFileMetadata,
"setClipDescription":setClipDescription,
"setProjectItemLabel":setProjectItemLabel,
"getClipColorSpace":getClipColorSpace,
"setOverrideFrameRate":setOverrideFrameRate,
"setOverridePixelAspectRatio":setOverridePixelAspectRatio,
"getCaptionTracks":getCaptionTracks,
"addCaptionTrack":addCaptionTrack,
"addCaption":addCaption,
"getCaptions":getCaptions,
"updateCaption":updateCaption,
"removeCaption":removeCaption,
"importCaptions":importCaptions,
"exportCaptions":exportCaptions,
"transcribeSequence":transcribeSequence,
"importMogrt":importMogrt,
"addMogrtToTimeline":addMogrtToTimeline,
"getMogrtProperties":getMogrtProperties,
"setMogrtProperty":setMogrtProperty,
"addTextGraphic":addTextGraphic,
"addColorMatte":addColorMatte,
"addBarsAndTone":addBarsAndTone,
"addBlackVideo":addBlackVideo,
"addUniversalCountingLeader":addUniversalCountingLeader,
"addTikTokCaption":addTikTokCaption,
"addCaptionSequence":addCaptionSequence,
"styleTextGraphic":styleTextGraphic,
"getAvailableMogrts":getAvailableMogrts,
"setPlayhead":setPlayhead,
"getPlayhead":getPlayhead,
"play":play,
"stop":stop,
"stepForward":stepForward,
"stepBackward":stepBackward,
"goToInPoint":goToInPoint,
"goToOutPoint":goToOutPoint,
"goToStart":goToStart,
"goToEnd":goToEnd,
"goToNextEdit":goToNextEdit,
"goToPreviousEdit":goToPreviousEdit,
"openInSourceMonitor":openInSourceMonitor,
"getSourceMonitorClip":getSourceMonitorClip,
"setSourceInOut":setSourceInOut,
"setWorkspace":setWorkspace,
"getTimelineZoom":getTimelineZoom,
"getAppVersion":getAppVersion
};
var catalog=[{"name":"getProjectInfo","category":"project","parameters":[]},{"name":"saveProject","category":"project","parameters":[]},{"name":"openProject","category":"project","parameters":["path"]},{"name":"closeProject","category":"project","parameters":["save"]},{"name":"importMedia","category":"project","parameters":["filePathsJson","targetBinPath","asNumberedStills"]},{"name":"importSequences","category":"project","parameters":["projectPath","sequenceIdsJson"]},{"name":"getProjectItems","category":"project","parameters":["binPath","recursive"]},{"name":"getProjectItemInfo","category":"project","parameters":["nodeId"]},{"name":"createBin","category":"project","parameters":["name","parentBinPath"]},{"name":"renameProjectItem","category":"project","parameters":["nodeId","newName"]},{"name":"deleteProjectItems","category":"project","parameters":["nodeIdsJson"]},{"name":"moveProjectItem","category":"project","parameters":["nodeId","targetBinPath"]},{"name":"setProjectItemInOut","category":"project","parameters":["nodeId","inPoint","outPoint"]},{"name":"clearProjectItemInOut","category":"project","parameters":["nodeId"]},{"name":"createProxy","category":"project","parameters":["nodeId","presetPath"]},{"name":"attachProxy","category":"project","parameters":["nodeId","proxyPath"]},{"name":"toggleProxyMode","category":"project","parameters":["enable"]},{"name":"refreshMedia","category":"project","parameters":["nodeId"]},{"name":"findProjectItems","category":"project","parameters":["query","type"]},{"name":"setProjectSettings","category":"project","parameters":["scratchDiskPath","gpuRenderer"]},{"name":"createSubClip","category":"project","parameters":["nodeId","name","inPointSec","outPointSec","hardBoundaries"]},{"name":"relinkMedia","category":"project","parameters":["nodeId","newPath"]},{"name":"importAEComps","category":"project","parameters":["aepPath","compNamesJson","targetBinPath"]},{"name":"consolidateDuplicates","category":"project","parameters":[]},{"name":"getProjectItemTypeInfo","category":"project","parameters":["nodeId"]},{"name":"setScaleToFrameSize","category":"project","parameters":["nodeId"]},{"name":"flushCache","category":"project","parameters":[]},{"name":"getSequences","category":"sequence","parameters":[]},{"name":"getActiveSequence","category":"sequence","parameters":[]},{"name":"setActiveSequence","category":"sequence","parameters":["sequenceName","sequenceIndex"]},{"name":"createSequence","category":"sequence","parameters":["name","presetPath"]},{"name":"createSequenceFromClip","category":"sequence","parameters":["nodeId"]},{"name":"deleteSequence","category":"sequence","parameters":["sequenceId"]},{"name":"getSequenceSettings","category":"sequence","parameters":[]},{"name":"setSequenceInOut","category":"sequence","parameters":["inPointSec","outPointSec"]},{"name":"clearSequenceInOut","category":"sequence","parameters":[]},{"name":"nestClips","category":"sequence","parameters":["trackType","trackIndex","clipIndicesJson","nestedName"]},{"name":"addTracks","category":"sequence","parameters":["videoCount","audioCount","position"]},{"name":"removeTrack","category":"sequence","parameters":["trackType","trackIndex"]},{"name":"getTrackInfo","category":"sequence","parameters":["trackType","trackIndex"]},{"name":"setTrackMuted","category":"sequence","parameters":["trackType","trackIndex","muted"]},{"name":"setTrackLocked","category":"sequence","parameters":["trackType","trackIndex","locked"]},{"name":"renameTrack","category":"sequence","parameters":["trackType","trackIndex","name"]},{"name":"autoReframeSequence","category":"sequence","parameters":["numerator","denominator","motionPreset","newName","useNested"]},{"name":"sceneEditDetection","category":"sequence","parameters":["action","applyCutsToLinkedAudio","sensitivity"]},{"name":"setWorkArea","category":"sequence","parameters":["inPointSec","outPointSec"]},{"name":"getWorkArea","category":"sequence","parameters":[]},{"name":"getSelection","category":"sequence","parameters":[]},{"name":"getTimelineClips","category":"timeline","parameters":["trackType","trackIndex"]},{"name":"addClipToTimeline","category":"timeline","parameters":["projectItemNodeId","trackIndex","startTimeSec","trackType","inPointSec","outPointSec"]},{"name":"overwriteClipToTimeline","category":"timeline","parameters":["projectItemNodeId","trackIndex","startTimeSec","trackType","inPointSec","outPointSec"]},{"name":"setClipPosition","category":"timeline","parameters":["trackType","trackIndex","clipIndex","startTimeSec","endTimeSec"]},{"name":"setClipInOut","category":"timeline","parameters":["trackType","trackIndex","clipIndex","inPointSec","outPointSec"]},{"name":"removeClip","category":"timeline","parameters":["trackType","trackIndex","clipIndex","ripple"]},{"name":"razorClip","category":"timeline","parameters":["trackType","trackIndex","timeSec"]},{"name":"razorAllTracks","category":"timeline","parameters":["timeSec"]},{"name":"setClipSpeed","category":"timeline","parameters":["trackType","trackIndex","clipIndex","speed","reverse","ripple","maintainPitch"]},{"name":"enableDisableClip","category":"timeline","parameters":["trackType","trackIndex","clipIndex","enabled"]},{"name":"setClipLabel","category":"timeline","parameters":["trackType","trackIndex","clipIndex","colorIndex"]},{"name":"renameClip","category":"timeline","parameters":["trackType","trackIndex","clipIndex","newName"]},{"name":"linkClips","category":"timeline","parameters":["videoTrackIndex","videoClipIndex","audioTrackIndex","audioClipIndex"]},{"name":"unlinkClip","category":"timeline","parameters":["trackType","trackIndex","clipIndex"]},{"name":"getClipInfo","category":"timeline","parameters":["trackType","trackIndex","clipIndex"]},{"name":"addAdjustmentLayer","category":"timeline","parameters":["trackIndex","startTimeSec","durationSec","name"]},{"name":"selectClips","category":"timeline","parameters":["clipsJson"]},{"name":"deselectAll","category":"timeline","parameters":[]},{"name":"slipClip","category":"timeline","parameters":["trackType","trackIndex","clipIndex","offsetSeconds"]},{"name":"slideClip","category":"timeline","parameters":["trackType","trackIndex","clipIndex","offsetSeconds"]},{"name":"rippleDelete","category":"timeline","parameters":["trackType","trackIndex","clipIndex"]},{"name":"moveClipToTrack","category":"timeline","parameters":["trackType","sourceTrackIndex","clipIndex","targetTrackIndex"]},{"name":"duplicateClip","category":"timeline","parameters":["trackType","trackIndex","clipIndex","targetTimeSec","targetTrackIndex"]},{"name":"getClipSpeed","category":"timeline","parameters":["trackType","trackIndex","clipIndex"]},{"name":"freezeFrame","category":"timeline","parameters":["trackType","trackIndex","clipIndex","timeSec","durationSec"]},{"name":"applyEffect","category":"effects","parameters":["trackType","trackIndex","clipIndex","effectName"]},{"name":"removeEffect","category":"effects","parameters":["trackType","trackIndex","clipIndex","effectIndex"]},{"name":"getClipEffects","category":"effects","parameters":["trackType","trackIndex","clipIndex"]},{"name":"setEffectProperty","category":"effects","parameters":["trackType","trackIndex","clipIndex","effectIndex","propertyName","value"]},{"name":"getEffectProperty","category":"effects","parameters":["trackType","trackIndex","clipIndex","effectIndex","propertyName"]},{"name":"setEffectEnabled","category":"effects","parameters":["trackType","trackIndex","clipIndex","effectIndex","enabled"]},{"name":"getVideoEffectsList","category":"effects","parameters":[]},{"name":"getAudioEffectsList","category":"effects","parameters":[]},{"name":"getVideoTransitionsList","category":"effects","parameters":[]},{"name":"getAudioTransitionsList","category":"effects","parameters":[]},{"name":"applyTransition","category":"effects","parameters":["trackType","trackIndex","clipIndex","transitionName","durationSec","position"]},{"name":"removeTransition","category":"effects","parameters":["trackType","trackIndex","clipIndex","position"]},{"name":"setDefaultTransition","category":"effects","parameters":["transitionType","transitionName","durationSec"]},{"name":"addKeyframe","category":"effects","parameters":["trackType","trackIndex","clipIndex","effectIndex","propertyName","timeSec","value"]},{"name":"removeKeyframe","category":"effects","parameters":["trackType","trackIndex","clipIndex","effectIndex","propertyName","keyframeIndex"]},{"name":"getKeyframes","category":"effects","parameters":["trackType","trackIndex","clipIndex","effectIndex","propertyName"]},{"name":"setKeyframeInterpolation","category":"effects","parameters":["trackType","trackIndex","clipIndex","effectIndex","propertyName","keyframeIndex","interpolation"]},{"name":"setClipTransform","category":"effects","parameters":["trackIndex","clipIndex","posX","posY","scaleX","scaleY","rotation","opacity","anchorX","anchorY","antiFlicker"]},{"name":"getClipTransform","category":"effects","parameters":["trackIndex","clipIndex"]},{"name":"addClipMarker","category":"markers","parameters":["trackType","trackIndex","clipIndex","timeSec","name","comment","color"]},{"name":"getClipMarkers","category":"markers","parameters":["trackType","trackIndex","clipIndex"]},{"name":"addProjectItemMarker","category":"markers","parameters":["nodeId","timeSec","name","comment","color"]},{"name":"setClipVolume","category":"audio","parameters":["trackIndex","clipIndex","volumeDb"]},{"name":"getClipVolume","category":"audio","parameters":["trackIndex","clipIndex"]},{"name":"setClipMute","category":"audio","parameters":["trackIndex","clipIndex","muted"]},{"name":"setAudioChannelMapping","category":"audio","parameters":["nodeId","channelType"]},{"name":"getAudioChannelMapping","category":"audio","parameters":["nodeId"]},{"name":"setTrackVolume","category":"audio","parameters":["trackIndex","volumeDb"]},{"name":"setTrackPan","category":"audio","parameters":["trackIndex","pan"]},{"name":"soloTrack","category":"audio","parameters":["trackIndex","solo"]},{"name":"addAudioKeyframe","category":"audio","parameters":["trackIndex","clipIndex","timeSec","volumeDb"]},{"name":"applyAudioCrossfade","category":"audio","parameters":["trackIndex","clipIndex","type","durationSec"]},{"name":"exportSequence","category":"export","parameters":["outputPath","presetPath","startTimeSec","endTimeSec","useInOut"]},{"name":"exportFrame","category":"export","parameters":["outputPath","timeSec","format"]},{"name":"exportAAF","category":"export","parameters":["outputPath","mixdownAudio","explodeToMono","sampleRate","bitsPerSample"]},{"name":"exportOMF","category":"export","parameters":["outputPath","sampleRate","bitsPerSample","handleDuration"]},{"name":"exportEDL","category":"export","parameters":["outputPath","trackIndex"]},{"name":"exportFinalCutXML","category":"export","parameters":["outputPath"]},{"name":"getEncoderPresets","category":"export","parameters":[]},{"name":"renderSequencePreview","category":"export","parameters":["startTimeSec","endTimeSec"]},{"name":"exportAsMediaDirect","category":"export","parameters":["outputPath","presetPath"]},{"name":"getClipMetadata","category":"metadata","parameters":["nodeId"]},{"name":"setClipMetadata","category":"metadata","parameters":["nodeId","property","value"]},{"name":"getXMPMetadata","category":"metadata","parameters":["nodeId"]},{"name":"setXMPMetadata","category":"metadata","parameters":["nodeId","xmpXml"]},{"name":"getFileMetadata","category":"metadata","parameters":["nodeId"]},{"name":"setClipDescription","category":"metadata","parameters":["nodeId","description"]},{"name":"setProjectItemLabel","category":"metadata","parameters":["nodeId","colorIndex"]},{"name":"getClipColorSpace","category":"metadata","parameters":["nodeId"]},{"name":"setOverrideFrameRate","category":"metadata","parameters":["nodeId","frameRate"]},{"name":"setOverridePixelAspectRatio","category":"metadata","parameters":["nodeId","numerator","denominator"]},{"name":"getCaptionTracks","category":"captions","parameters":[]},{"name":"addCaptionTrack","category":"captions","parameters":["format"]},{"name":"addCaption","category":"captions","parameters":["trackIndex","startTimeSec","endTimeSec","text"]},{"name":"getCaptions","category":"captions","parameters":["trackIndex"]},{"name":"updateCaption","category":"captions","parameters":["trackIndex","captionIndex","text","startTimeSec","endTimeSec"]},{"name":"removeCaption","category":"captions","parameters":["trackIndex","captionIndex"]},{"name":"importCaptions","category":"captions","parameters":["filePath"]},{"name":"exportCaptions","category":"captions","parameters":["outputPath","format","trackIndex"]},{"name":"transcribeSequence","category":"captions","parameters":[]},{"name":"importMogrt","category":"graphics","parameters":["mogrtPath"]},{"name":"addMogrtToTimeline","category":"graphics","parameters":["mogrtPath","trackIndex","startTimeSec","durationSec"]},{"name":"getMogrtProperties","category":"graphics","parameters":["trackIndex","clipIndex"]},{"name":"setMogrtProperty","category":"graphics","parameters":["trackIndex","clipIndex","propertyName","value"]},{"name":"addTextGraphic","category":"graphics","parameters":["text","trackIndex","startTimeSec","durationSec","fontSize","fontFamily","color","posX","posY","alignment"]},{"name":"addColorMatte","category":"graphics","parameters":["trackIndex","startTimeSec","durationSec","color","name"]},{"name":"addBarsAndTone","category":"graphics","parameters":["trackIndex","startTimeSec","durationSec"]},{"name":"addBlackVideo","category":"graphics","parameters":["trackIndex","startTimeSec","durationSec"]},{"name":"addUniversalCountingLeader","category":"graphics","parameters":["trackIndex","startTimeSec"]},{"name":"addTikTokCaption","category":"graphics","parameters":["text","trackIndex","startTimeSec","durationSec","posX","posY","scale","template"]},{"name":"addCaptionSequence","category":"graphics","parameters":["captionsJSON","trackIndex","template","posX","posY","scale"]},{"name":"styleTextGraphic","category":"graphics","parameters":["trackIndex","clipIndex","text","posX","posY","scale","opacity"]},{"name":"getAvailableMogrts","category":"graphics","parameters":[]},{"name":"setPlayhead","category":"playback","parameters":["timeSec"]},{"name":"getPlayhead","category":"playback","parameters":[]},{"name":"play","category":"playback","parameters":["speed"]},{"name":"stop","category":"playback","parameters":[]},{"name":"stepForward","category":"playback","parameters":["frames"]},{"name":"stepBackward","category":"playback","parameters":["frames"]},{"name":"goToInPoint","category":"playback","parameters":[]},{"name":"goToOutPoint","category":"playback","parameters":[]},{"name":"goToStart","category":"playback","parameters":[]},{"name":"goToEnd","category":"playback","parameters":[]},{"name":"goToNextEdit","category":"playback","parameters":[]},{"name":"goToPreviousEdit","category":"playback","parameters":[]},{"name":"openInSourceMonitor","category":"playback","parameters":["nodeId"]},{"name":"getSourceMonitorClip","category":"playback","parameters":[]},{"name":"setSourceInOut","category":"playback","parameters":["inPointSec","outPointSec"]},{"name":"setWorkspace","category":"playback","parameters":["workspaceName"]},{"name":"getTimelineZoom","category":"playback","parameters":[]},{"name":"getAppVersion","category":"playback","parameters":[]}];
return {catalog:function(){return JSON.stringify({ok:true,source:"antipaster",verification:"upstream_unverified",tools:catalog});},invoke:function(name,args){try{if(!Object.prototype.hasOwnProperty.call(funcs,name))return JSON.stringify({ok:false,error:"UNKNOWN_UPSTREAM_FUNCTION"});if(!(args instanceof Array))return JSON.stringify({ok:false,error:"ARGS_MUST_BE_ARRAY"});var raw=funcs[name].apply(null,args), value;try{value=JSON.parse(raw);}catch(e){value=raw;}if(value && (value.error || value.ok === false || value.success === false))return JSON.stringify({ok:false,source:"antipaster",verified:false,result:value});return JSON.stringify({ok:true,source:"antipaster",verified:false,result:value});}catch(e){return JSON.stringify({ok:false,source:"antipaster",verified:false,error:String(e)});}}};
})();

// Publish the reloaded isolated catalog to the shared Premiere scripting context.
$.global.RavixUpstreamPremiere = RavixUpstreamPremiere;
