/* ========================================
   Global State Manager
   ======================================== */

export const state = {
    // Files
    imageFile: null,
    audioFile: null,
    videoFile: null,
    image: null,
    videoElement: null,
    isPlaying: false,
    isRecording: false,

    // Audio
    audioContext: null,
    analyser: null,
    analyserL: null,
    analyserR: null,
    splitter: null,
    source: null,
    audioBuffer: null,
    startTime: 0,
    pauseOffset: 0,
    gainNode: null,

    // EQ nodes
    eqLow: null,
    eqMid: null,
    eqHigh: null,
    bassBoost: null,
    compressor: null,
    delayNode: null,
    reverbNode: null,

    // Canvas
    canvas: null,
    ctx: null,
    animFrameId: null,

    // Global bass
    bassLevel: 0,
    bassLevelL: 0,
    bassLevelR: 0,
    prevBassLevel: 0,
    beatDetected: false,
    beatCooldown: 0,

    // Global settings
    settings: {
        sensitivity: 0.7,       // デフォルト感度0.7（高すぎると常にコーンが広がる）
        fxRainbow: false,
        rainbowHue: 270,
    },

    // Recording
    mediaRecorder: null,
    recordedChunks: [],
};

// Frequency data cache (updated once per frame, shared across modules)
export const audioData = {
    frequencyData: null,
    frequencyDataL: null,
    frequencyDataR: null,
    bassLevel: 0,
    bassLevelL: 0,
    bassLevelR: 0,
    beatDetected: false,
};
