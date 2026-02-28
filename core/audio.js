/* ========================================
   Audio System — Playback, Analysis & EQ
   ======================================== */
import { state, audioData } from './state.js';

// ====== Initialization (audio file) ======
export async function initAudio(audioFile) {
    _initAudioContext();

    // Decode audio
    const arrayBuffer = await audioFile.arrayBuffer();
    state.audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
    state.videoMode = false;

    // Pre-allocate frequency data arrays
    audioData.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    audioData.frequencyDataL = new Uint8Array(state.analyserL.frequencyBinCount);
    audioData.frequencyDataR = new Uint8Array(state.analyserR.frequencyBinCount);

    return state.audioBuffer.duration;
}

// ====== Initialization (video element as audio source) ======
export function initAudioFromVideo(videoElement) {
    _initAudioContext();

    // Use the video element as audio source
    videoElement.muted = false; // unmute so we hear it
    state.videoMediaSource = state.audioContext.createMediaElementSource(videoElement);

    // Route: videoMediaSource → splitter / analyser / EQ chain → destination
    state.videoMediaSource.connect(state.splitter);
    state.splitter.connect(state.analyserL, 0);
    state.splitter.connect(state.analyserR, 1);

    state.videoMediaSource.connect(state.analyser);
    state.analyser.connect(state.eqLow);
    state.eqLow.connect(state.eqMid);
    state.eqMid.connect(state.eqHigh);
    state.eqHigh.connect(state.bassBoost);
    state.bassBoost.connect(state.compressor);
    state.compressor.connect(state.delayDry);
    state.delayDry.connect(state.gainNode);
    state.compressor.connect(state.delayNode);
    state.delayNode.connect(state.delayWet);
    state.delayWet.connect(state.gainNode);
    state.delayNode.connect(state.delayFeedback);
    state.delayFeedback.connect(state.delayNode);

    state.videoMode = true;
    state.videoElement = videoElement;

    // Pre-allocate frequency data arrays
    audioData.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    audioData.frequencyDataL = new Uint8Array(state.analyserL.frequencyBinCount);
    audioData.frequencyDataR = new Uint8Array(state.analyserR.frequencyBinCount);

    return videoElement.duration || 0;
}

function _initAudioContext() {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Main analyser
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 2048;
    state.analyser.smoothingTimeConstant = 0.8;

    // L/R analysers
    state.analyserL = state.audioContext.createAnalyser();
    state.analyserL.fftSize = 2048;
    state.analyserL.smoothingTimeConstant = 0.8;
    state.analyserR = state.audioContext.createAnalyser();
    state.analyserR.fftSize = 2048;
    state.analyserR.smoothingTimeConstant = 0.8;

    // Channel splitter
    state.splitter = state.audioContext.createChannelSplitter(2);

    // EQ - 3 band
    state.eqLow = state.audioContext.createBiquadFilter();
    state.eqLow.type = 'lowshelf';
    state.eqLow.frequency.value = 200;
    state.eqLow.gain.value = 0;

    state.eqMid = state.audioContext.createBiquadFilter();
    state.eqMid.type = 'peaking';
    state.eqMid.frequency.value = 1000;
    state.eqMid.Q.value = 1;
    state.eqMid.gain.value = 0;

    state.eqHigh = state.audioContext.createBiquadFilter();
    state.eqHigh.type = 'highshelf';
    state.eqHigh.frequency.value = 4000;
    state.eqHigh.gain.value = 0;

    // Bass boost
    state.bassBoost = state.audioContext.createBiquadFilter();
    state.bassBoost.type = 'lowshelf';
    state.bassBoost.frequency.value = 100;
    state.bassBoost.gain.value = 0;

    // Compressor
    state.compressor = state.audioContext.createDynamicsCompressor();
    state.compressor.threshold.value = -24;
    state.compressor.ratio.value = 4;

    // Delay (Echo)
    state.delayNode = state.audioContext.createDelay(2.0);
    state.delayNode.delayTime.value = 0;
    state.delayFeedback = state.audioContext.createGain();
    state.delayFeedback.gain.value = 0;
    state.delayDry = state.audioContext.createGain();
    state.delayDry.gain.value = 1;
    state.delayWet = state.audioContext.createGain();
    state.delayWet.gain.value = 0;

    // Gain (master)
    state.gainNode = state.audioContext.createGain();
    state.gainNode.connect(state.audioContext.destination);
}

// ====== Audio Routing ======
function connectAudioChain() {
    // source → splitter (for L/R analysis)
    state.source.connect(state.splitter);
    state.splitter.connect(state.analyserL, 0);
    state.splitter.connect(state.analyserR, 1);

    // source → analyser (mixed) → EQ chain → compressor → delay → gain → destination
    state.source.connect(state.analyser);
    state.analyser.connect(state.eqLow);
    state.eqLow.connect(state.eqMid);
    state.eqMid.connect(state.eqHigh);
    state.eqHigh.connect(state.bassBoost);
    state.bassBoost.connect(state.compressor);

    // Dry path
    state.compressor.connect(state.delayDry);
    state.delayDry.connect(state.gainNode);

    // Wet path (echo)
    state.compressor.connect(state.delayNode);
    state.delayNode.connect(state.delayWet);
    state.delayWet.connect(state.gainNode);
    state.delayNode.connect(state.delayFeedback);
    state.delayFeedback.connect(state.delayNode);
}

export function createSource(offset = 0) {
    if (state.source) {
        try { state.source.stop(); } catch (e) { }
        state.source.disconnect();
    }
    state.source = state.audioContext.createBufferSource();
    state.source.buffer = state.audioBuffer;
    connectAudioChain();
    return state.source;
}

// ====== Playback Controls ======
export function play() {
    if (!state.audioContext) return;
    if (state.audioContext.state === 'suspended') state.audioContext.resume();

    if (state.videoMode) {
        // Video mode: play the video element
        state.videoElement.play().catch(() => { });
        state.isPlaying = true;
        return;
    }

    // Buffer mode
    if (!state.audioBuffer) return;
    const src = createSource(state.pauseOffset);
    src.start(0, state.pauseOffset);
    state.startTime = state.audioContext.currentTime - state.pauseOffset;
    state.isPlaying = true;
}

export function pause() {
    if (!state.isPlaying) return;

    if (state.videoMode) {
        state.videoElement.pause();
        state.isPlaying = false;
        return;
    }

    state.pauseOffset = state.audioContext.currentTime - state.startTime;
    state.source.stop();
    state.isPlaying = false;
}

export function stop() {
    if (state.videoMode) {
        if (state.videoElement) {
            state.videoElement.pause();
            state.videoElement.currentTime = 0;
        }
    } else {
        if (state.source) { try { state.source.stop(); } catch (e) { } }
    }
    state.isPlaying = false;
    state.pauseOffset = 0;
    state.startTime = 0;
    state.bassLevel = 0;
    state.bassLevelL = 0;
    state.bassLevelR = 0;
    state.prevBassLevel = 0;
}

export function seekTo(time) {
    if (state.videoMode) {
        const wasPlaying = state.isPlaying;
        state.videoElement.currentTime = time;
        if (!wasPlaying) state.videoElement.pause();
        return;
    }

    const wasPlaying = state.isPlaying;
    if (state.isPlaying) { state.source.stop(); state.isPlaying = false; }
    state.pauseOffset = Math.max(0, Math.min(time, state.audioBuffer.duration));
    if (wasPlaying) play();
}

export function getCurrentTime() {
    if (state.videoMode) {
        return state.videoElement ? state.videoElement.currentTime : 0;
    }
    if (!state.isPlaying || !state.audioContext) return state.pauseOffset;
    return state.audioContext.currentTime - state.startTime;
}

export function getDuration() {
    if (state.videoMode) {
        return state.videoElement ? state.videoElement.duration || 0 : 0;
    }
    return state.audioBuffer ? state.audioBuffer.duration : 0;
}

// ====== Audio Analysis (called once per frame) ======
function getBassFromAnalyser(analyserNode, dataArray) {
    analyserNode.getByteFrequencyData(dataArray);
    const sampleRate = state.audioContext.sampleRate;
    const binWidth = sampleRate / analyserNode.fftSize;
    const bassBins = Math.ceil(200 / binWidth);
    let bassSum = 0, bassCount = 0;
    for (let i = 1; i < bassBins && i < dataArray.length; i++) {
        const weight = 1 + (bassBins - i) / bassBins;
        bassSum += dataArray[i] * weight;
        bassCount += weight;
    }
    return bassCount > 0 ? (bassSum / bassCount) / 255 : 0;
}

function smoothBass(current, target) {
    return target > current
        ? current + (target - current) * 0.4
        : current + (target - current) * 0.15;
}

export function analyzeFrame() {
    if (!state.analyser || !state.isPlaying) {
        state.bassLevel = Math.max(0, state.bassLevel - 0.05);
        state.bassLevelL = Math.max(0, state.bassLevelL - 0.05);
        state.bassLevelR = Math.max(0, state.bassLevelR - 0.05);
        audioData.bassLevel = state.bassLevel;
        audioData.bassLevelL = state.bassLevelL;
        audioData.bassLevelR = state.bassLevelR;
        audioData.beatDetected = false;
        return;
    }

    const sens = state.settings.sensitivity;

    // Mixed
    const rawMix = getBassFromAnalyser(state.analyser, audioData.frequencyData);
    state.bassLevel = smoothBass(state.bassLevel, Math.min(1, rawMix * sens));

    // L/R
    const rawL = getBassFromAnalyser(state.analyserL, audioData.frequencyDataL);
    state.bassLevelL = smoothBass(state.bassLevelL, Math.min(1, rawL * sens));
    const rawR = getBassFromAnalyser(state.analyserR, audioData.frequencyDataR);
    state.bassLevelR = smoothBass(state.bassLevelR, Math.min(1, rawR * sens));

    // Beat detection
    if (state.beatCooldown > 0) state.beatCooldown--;
    const bassIncrease = state.bassLevel - state.prevBassLevel;
    state.beatDetected = bassIncrease > 0.08 && state.bassLevel > 0.35 && state.beatCooldown <= 0;
    if (state.beatDetected) state.beatCooldown = 8;
    state.prevBassLevel = state.bassLevel;

    // Copy to shared audioData
    audioData.bassLevel = state.bassLevel;
    audioData.bassLevelL = state.bassLevelL;
    audioData.bassLevelR = state.bassLevelR;
    audioData.beatDetected = state.beatDetected;
}

// ====== EQ API ======
export function setEQ(band, value) {
    switch (band) {
        case 'low': state.eqLow.gain.value = value; break;
        case 'mid': state.eqMid.gain.value = value; break;
        case 'high': state.eqHigh.gain.value = value; break;
        case 'bassBoost': state.bassBoost.gain.value = value; break;
    }
}

export function setEcho(time, feedback, wetGain) {
    state.delayNode.delayTime.value = time;
    state.delayFeedback.gain.value = feedback;
    state.delayWet.gain.value = wetGain;
}

export function setCompressor(threshold, ratio) {
    state.compressor.threshold.value = threshold;
    state.compressor.ratio.value = ratio;
}
