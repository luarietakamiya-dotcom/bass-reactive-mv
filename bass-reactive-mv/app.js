/* ========================================
   Bass Reactive MV Visualizer - Core App
   ======================================== */

// ====== State ======
const state = {
    imageFile: null,
    audioFile: null,
    image: null,
    isPlaying: false,
    isRecording: false,

    // Audio
    audioContext: null,
    analyser: null,
    analyserL: null,
    analyserR: null,
    splitter: null,
    merger: null,
    source: null,
    audioBuffer: null,
    startTime: 0,
    pauseOffset: 0,
    gainNode: null,

    // Canvas
    canvas: null,
    ctx: null,
    animFrameId: null,

    // Effects
    particles: [],
    rippleWaves: [],
    orbitSquares: [],
    bassLevel: 0,
    bassLevelL: 0,
    bassLevelR: 0,
    prevBassLevel: 0,
    beatDetected: false,
    beatCooldown: 0,
    bassTextAlpha: 0,
    bassTextScale: 1,
    ringShakeX: 0,
    ringShakeY: 0,
    smoothBassRadius: 0,
    smoothBassVelocity: 0,
    smoothBassRadiusR: 0,
    smoothBassVelocityR: 0,

    // Settings
    settings: {
        sensitivity: 1.5,
        shakeIntensity: 15,
        zoomIntensity: 0.05,
        ringSize: 0.3,
        ringHue: 270,
        fxShake: true,
        fxRing: true,
        fxParticles: true,
        fxGlow: true,
        fxText: true,
        fxRainbow: false,
    },

    // Recording
    mediaRecorder: null,
    recordedChunks: [],
};

// ====== ffmpeg.wasm ======
let ffmpegInstance = null;
let ffmpegLoading = false;

// ====== DOM Elements ======
const dom = {};

function cacheDom() {
    dom.uploadScreen = document.getElementById('upload-screen');
    dom.visualizerScreen = document.getElementById('visualizer-screen');
    dom.imageDropZone = document.getElementById('image-drop-zone');
    dom.audioDropZone = document.getElementById('audio-drop-zone');
    dom.imageInput = document.getElementById('image-input');
    dom.audioInput = document.getElementById('audio-input');
    dom.imagePreview = document.getElementById('image-preview');
    dom.audioPreview = document.getElementById('audio-preview');
    dom.startBtn = document.getElementById('start-btn');
    dom.canvas = document.getElementById('main-canvas');
    dom.playBtn = document.getElementById('play-btn');
    dom.stopBtn = document.getElementById('stop-btn');
    dom.progressFill = document.getElementById('progress-fill');
    dom.currentTime = document.getElementById('current-time');
    dom.totalTime = document.getElementById('total-time');
    dom.togglePanel = document.getElementById('toggle-panel');
    dom.controlPanel = document.getElementById('control-panel');
    dom.backBtn = document.getElementById('back-btn');
    dom.recordBtn = document.getElementById('record-btn');
    dom.recordStatus = document.getElementById('record-status');
    dom.meterFill = document.getElementById('meter-fill');
    dom.sensitivity = document.getElementById('sensitivity');
    dom.sensitivityVal = document.getElementById('sensitivity-val');
    dom.shakeIntensity = document.getElementById('shake-intensity');
    dom.shakeVal = document.getElementById('shake-val');
    dom.zoomIntensity = document.getElementById('zoom-intensity');
    dom.zoomVal = document.getElementById('zoom-val');
    dom.ringSize = document.getElementById('ring-size');
    dom.ringSizeVal = document.getElementById('ring-size-val');
    dom.ringHue = document.getElementById('ring-hue');
    dom.ringHueVal = document.getElementById('ring-hue-val');
    dom.fxShake = document.getElementById('fx-shake');
    dom.fxRing = document.getElementById('fx-ring');
    dom.fxParticles = document.getElementById('fx-particles');
    dom.fxGlow = document.getElementById('fx-glow');
    dom.fxText = document.getElementById('fx-text');
    dom.fxRainbow = document.getElementById('fx-rainbow');
}

// ====== Initialization ======
document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    state.canvas = dom.canvas;
    state.ctx = dom.canvas.getContext('2d');
    setupEventListeners();
});

function setupEventListeners() {
    dom.imageDropZone.addEventListener('click', () => dom.imageInput.click());
    dom.imageInput.addEventListener('change', (e) => handleImageUpload(e.target.files[0]));
    dom.imageDropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-primary)'; });
    dom.imageDropZone.addEventListener('dragleave', (e) => { e.currentTarget.style.borderColor = ''; });
    dom.imageDropZone.addEventListener('drop', (e) => { e.preventDefault(); e.currentTarget.style.borderColor = ''; if (e.dataTransfer.files[0]) handleImageUpload(e.dataTransfer.files[0]); });

    dom.audioDropZone.addEventListener('click', () => dom.audioInput.click());
    dom.audioInput.addEventListener('change', (e) => handleAudioUpload(e.target.files[0]));
    dom.audioDropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-secondary)'; });
    dom.audioDropZone.addEventListener('dragleave', (e) => { e.currentTarget.style.borderColor = ''; });
    dom.audioDropZone.addEventListener('drop', (e) => { e.preventDefault(); e.currentTarget.style.borderColor = ''; if (e.dataTransfer.files[0]) handleAudioUpload(e.dataTransfer.files[0]); });

    dom.startBtn.addEventListener('click', startVisualizer);
    dom.playBtn.addEventListener('click', togglePlayback);
    dom.stopBtn.addEventListener('click', stopPlayback);
    dom.backBtn.addEventListener('click', goBack);

    dom.togglePanel.addEventListener('click', () => {
        dom.controlPanel.classList.toggle('collapsed');
        dom.togglePanel.textContent = dom.controlPanel.classList.contains('collapsed') ? '▶' : '◀';
    });

    dom.sensitivity.addEventListener('input', (e) => { state.settings.sensitivity = parseFloat(e.target.value); dom.sensitivityVal.textContent = e.target.value; });
    dom.shakeIntensity.addEventListener('input', (e) => { state.settings.shakeIntensity = parseInt(e.target.value); dom.shakeVal.textContent = e.target.value; });
    dom.zoomIntensity.addEventListener('input', (e) => { state.settings.zoomIntensity = parseFloat(e.target.value); dom.zoomVal.textContent = e.target.value; });
    dom.ringSize.addEventListener('input', (e) => { state.settings.ringSize = parseFloat(e.target.value); dom.ringSizeVal.textContent = e.target.value; });
    dom.ringHue.addEventListener('input', (e) => { state.settings.ringHue = parseInt(e.target.value); dom.ringHueVal.textContent = e.target.value; });

    dom.fxShake.addEventListener('change', (e) => state.settings.fxShake = e.target.checked);
    dom.fxRing.addEventListener('change', (e) => state.settings.fxRing = e.target.checked);
    dom.fxParticles.addEventListener('change', (e) => state.settings.fxParticles = e.target.checked);
    dom.fxGlow.addEventListener('change', (e) => state.settings.fxGlow = e.target.checked);
    dom.fxText.addEventListener('change', (e) => state.settings.fxText = e.target.checked);
    dom.fxRainbow.addEventListener('change', (e) => state.settings.fxRainbow = e.target.checked);

    dom.recordBtn.addEventListener('click', toggleRecording);

    document.querySelector('.progress-bar').addEventListener('click', (e) => {
        if (!state.audioBuffer) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        seekTo(ratio * state.audioBuffer.duration);
    });

    window.addEventListener('resize', resizeCanvas);
}

// ====== File Handling ======
function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) return;
    state.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            state.image = img;
            dom.imagePreview.innerHTML = '';
            const previewImg = document.createElement('img');
            previewImg.src = e.target.result;
            dom.imagePreview.appendChild(previewImg);
            dom.imagePreview.classList.add('active');
            dom.imageDropZone.classList.add('has-file');
            checkReady();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleAudioUpload(file) {
    if (!file || !file.type.startsWith('audio/')) return;
    state.audioFile = file;
    dom.audioPreview.innerHTML = `<div class="audio-name">🎵 ${file.name}</div>`;
    dom.audioPreview.classList.add('active');
    dom.audioDropZone.classList.add('has-file');
    checkReady();
}

function checkReady() {
    dom.startBtn.disabled = !(state.imageFile && state.audioFile);
}

// ====== Audio Setup ======
async function initAudio() {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Main analyser (mixed)
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 2048;
    state.analyser.smoothingTimeConstant = 0.8;

    // L/R analysers for stereo
    state.analyserL = state.audioContext.createAnalyser();
    state.analyserL.fftSize = 2048;
    state.analyserL.smoothingTimeConstant = 0.8;
    state.analyserR = state.audioContext.createAnalyser();
    state.analyserR.fftSize = 2048;
    state.analyserR.smoothingTimeConstant = 0.8;

    // Channel splitter (stereo -> L, R)
    state.splitter = state.audioContext.createChannelSplitter(2);
    state.merger = state.audioContext.createChannelMerger(2);

    state.gainNode = state.audioContext.createGain();
    state.gainNode.connect(state.audioContext.destination);

    const arrayBuffer = await state.audioFile.arrayBuffer();
    state.audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
    dom.totalTime.textContent = formatTime(state.audioBuffer.duration);
}

function createSource(offset = 0) {
    if (state.source) { try { state.source.stop(); } catch (e) { } state.source.disconnect(); }
    state.source = state.audioContext.createBufferSource();
    state.source.buffer = state.audioBuffer;

    // Connect: source -> splitter -> L analyser + R analyser
    //          source -> main analyser -> gain -> destination
    state.source.connect(state.splitter);
    state.splitter.connect(state.analyserL, 0);
    state.splitter.connect(state.analyserR, 1);

    state.source.connect(state.analyser);
    state.analyser.connect(state.gainNode);

    state.source.onended = () => {
        if (state.isPlaying) {
            state.isPlaying = false;
            state.pauseOffset = 0;
            dom.playBtn.textContent = '▶ 再生';
            if (state.isRecording) stopRecording();
        }
    };
    return state.source;
}

// ====== Playback ======
function togglePlayback() { state.isPlaying ? pausePlayback() : play(); }

function play() {
    if (!state.audioContext || !state.audioBuffer) return;
    if (state.audioContext.state === 'suspended') state.audioContext.resume();
    const src = createSource(state.pauseOffset);
    src.start(0, state.pauseOffset);
    state.startTime = state.audioContext.currentTime - state.pauseOffset;
    state.isPlaying = true;
    dom.playBtn.textContent = '⏸ 一時停止';
    if (!state.animFrameId) animate();
}

function pausePlayback() {
    if (!state.isPlaying) return;
    state.pauseOffset = state.audioContext.currentTime - state.startTime;
    state.source.stop();
    state.isPlaying = false;
    dom.playBtn.textContent = '▶ 再生';
}

function stopPlayback() {
    if (state.source) { try { state.source.stop(); } catch (e) { } }
    state.isPlaying = false;
    state.pauseOffset = 0;
    state.startTime = 0;
    dom.playBtn.textContent = '▶ 再生';
    dom.progressFill.style.width = '0%';
    dom.currentTime.textContent = '0:00';
    state.bassLevel = 0;
    state.prevBassLevel = 0;
    state.particles = [];
    if (state.isRecording) stopRecording();
    drawFrame(0);
}

function seekTo(time) {
    const wasPlaying = state.isPlaying;
    if (state.isPlaying) { state.source.stop(); state.isPlaying = false; }
    state.pauseOffset = Math.max(0, Math.min(time, state.audioBuffer.duration));
    if (wasPlaying) play();
}

function getCurrentTime() {
    if (!state.isPlaying || !state.audioContext) return state.pauseOffset;
    return state.audioContext.currentTime - state.startTime;
}

// ====== Visualizer ======
async function startVisualizer() {
    dom.uploadScreen.classList.remove('active');
    dom.visualizerScreen.classList.add('active');
    resizeCanvas();
    await initAudio();
    drawFrame(0);
}

function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    state.canvas.width = wrapper.clientWidth;
    state.canvas.height = wrapper.clientHeight;
}

function goBack() {
    stopPlayback();
    if (state.animFrameId) { cancelAnimationFrame(state.animFrameId); state.animFrameId = null; }
    if (state.audioContext) { state.audioContext.close(); state.audioContext = null; }
    dom.visualizerScreen.classList.remove('active');
    dom.uploadScreen.classList.add('active');
}

// ====== Audio Analysis ======
function getBassFromAnalyser(analyserNode) {
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    const sampleRate = state.audioContext.sampleRate;
    const binWidth = sampleRate / analyserNode.fftSize;
    const bassBins = Math.ceil(200 / binWidth);

    let bassSum = 0, bassCount = 0;
    for (let i = 1; i < bassBins && i < bufferLength; i++) {
        const weight = 1 + (bassBins - i) / bassBins;
        bassSum += dataArray[i] * weight;
        bassCount += weight;
    }
    return bassCount > 0 ? (bassSum / bassCount) / 255 : 0;
}

function smoothBass(current, target) {
    if (target > current) return current + (target - current) * 0.4;
    return current + (target - current) * 0.15;
}

function analyzeBass() {
    if (!state.analyser || !state.isPlaying) {
        state.bassLevel = Math.max(0, state.bassLevel - 0.05);
        state.bassLevelL = Math.max(0, state.bassLevelL - 0.05);
        state.bassLevelR = Math.max(0, state.bassLevelR - 0.05);
        return;
    }

    // Mixed bass
    const rawBass = getBassFromAnalyser(state.analyser);
    const targetBass = Math.min(1, rawBass * state.settings.sensitivity);
    state.bassLevel = smoothBass(state.bassLevel, targetBass);

    // L channel bass
    const rawL = getBassFromAnalyser(state.analyserL);
    state.bassLevelL = smoothBass(state.bassLevelL, Math.min(1, rawL * state.settings.sensitivity));

    // R channel bass
    const rawR = getBassFromAnalyser(state.analyserR);
    state.bassLevelR = smoothBass(state.bassLevelR, Math.min(1, rawR * state.settings.sensitivity));

    // Beat detection (from mixed)
    if (state.beatCooldown > 0) state.beatCooldown--;
    const bassIncrease = state.bassLevel - state.prevBassLevel;
    state.beatDetected = bassIncrease > 0.08 && state.bassLevel > 0.35 && state.beatCooldown <= 0;
    if (state.beatDetected) {
        state.beatCooldown = 8;
        spawnBeatParticles();
        spawnRippleWave();
        state.bassTextAlpha = 1.0;
        state.bassTextScale = 1.5;
    }
    state.prevBassLevel = state.bassLevel;
    dom.meterFill.style.width = `${state.bassLevel * 100}%`;
}

// ====== Ripple Waves ======
function spawnRippleWave() {
    const cx = state.canvas.width / 2, cy = state.canvas.height / 2;
    const ringRadius = Math.min(cx, cy) * state.settings.ringSize;
    state.rippleWaves.push({
        x: cx, y: cy, radius: ringRadius,
        maxRadius: Math.max(state.canvas.width, state.canvas.height) * 0.8,
        life: 1.0, decay: 0.012, speed: 4 + state.bassLevel * 6,
        lineWidth: 2 + state.bassLevel * 4, hue: state.settings.ringHue,
    });
}

function updateRippleWaves() {
    for (let i = state.rippleWaves.length - 1; i >= 0; i--) {
        const r = state.rippleWaves[i];
        r.radius += r.speed; r.life -= r.decay; r.lineWidth *= 0.98;
        if (r.life <= 0 || r.radius > r.maxRadius) state.rippleWaves.splice(i, 1);
    }
}

function drawRippleWaves(ctx) {
    for (const r of state.rippleWaves) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${r.hue}, 100%, 75%, ${r.life * 0.5})`;
        ctx.lineWidth = r.lineWidth;
        ctx.shadowColor = `hsla(${r.hue}, 100%, 70%, ${r.life * 0.3})`;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
    }
}

// ====== Particles ======
function spawnBeatParticles() {
    if (!state.settings.fxParticles) return;
    const cx = state.canvas.width / 2, cy = state.canvas.height / 2;
    const ringRadius = Math.min(cx, cy) * state.settings.ringSize;
    const count = 15 + Math.floor(state.bassLevel * 25);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5 * state.bassLevel;
        state.particles.push({
            x: cx + Math.cos(angle) * ringRadius, y: cy + Math.sin(angle) * ringRadius,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: 1.5 + Math.random() * 3, life: 1.0,
            decay: 0.01 + Math.random() * 0.025,
            hue: state.settings.ringHue + (Math.random() - 0.5) * 60,
            type: Math.random() > 0.5 ? 'circle' : 'spark',
        });
    }
}

function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.life -= p.decay;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
}

function drawParticles(ctx) {
    if (!state.settings.fxParticles) return;
    for (const p of state.particles) {
        ctx.save();
        const alpha = p.life * 0.8;
        if (p.type === 'circle') {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
            ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, ${alpha * 0.5})`; ctx.shadowBlur = 8; ctx.fill();
        } else {
            const len = p.size * 3 * p.life;
            const angle = Math.atan2(p.vy, p.vx);
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - Math.cos(angle) * len, p.y - Math.sin(angle) * len);
            ctx.strokeStyle = `hsla(${p.hue}, 100%, 80%, ${alpha})`;
            ctx.lineWidth = p.size * 0.5;
            ctx.shadowColor = `hsla(${p.hue}, 100%, 80%, ${alpha * 0.5})`; ctx.shadowBlur = 6; ctx.stroke();
        }
        ctx.restore();
    }
}

// ====== Drawing ======
function drawFrame(bass) {
    const ctx = state.ctx, w = state.canvas.width, h = state.canvas.height, s = state.settings;
    ctx.save(); ctx.clearRect(0, 0, w, h);

    // Background image - STATIC
    if (state.image) {
        const imgW = state.image.width, imgH = state.image.height;
        const canvasRatio = w / h, imgRatio = imgW / imgH;
        let drawW, drawH, drawX, drawY;
        if (imgRatio > canvasRatio) { drawH = h; drawW = h * imgRatio; drawX = (w - drawW) / 2; drawY = 0; }
        else { drawW = w; drawH = w / imgRatio; drawX = 0; drawY = (h - drawH) / 2; }
        ctx.drawImage(state.image, drawX, drawY, drawW, drawH);
    } else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h); }

    // Vignette
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)'); vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const baseRadius = Math.min(cx, cy) * s.ringSize;

    drawRippleWaves(ctx);
    if (s.fxGlow) drawGlow(ctx, cx, cy, baseRadius, bass);

    // Speaker Rings (Stereo: L = outer large, R = inner small)
    if (s.fxRing) {
        const targetShakeX = s.fxShake ? (Math.random() - 0.5) * bass * s.shakeIntensity : 0;
        const targetShakeY = s.fxShake ? (Math.random() - 0.5) * bass * s.shakeIntensity : 0;
        state.ringShakeX += (targetShakeX - state.ringShakeX) * 0.5;
        state.ringShakeY += (targetShakeY - state.ringShakeY) * 0.5;

        const shakeX = state.ringShakeX;
        const shakeY = state.ringShakeY;

        // L channel: outer large ring
        const bassL = state.bassLevelL;
        const targetRadiusL = bassL * baseRadius * s.zoomIntensity * 8;
        const forceL = (targetRadiusL - state.smoothBassRadius) * 0.25;
        state.smoothBassVelocity = (state.smoothBassVelocity + forceL) * 0.7;
        state.smoothBassRadius += state.smoothBassVelocity;
        drawSpeakerRing(ctx, cx + shakeX, cy + shakeY, baseRadius + state.smoothBassRadius, bassL);

        // R channel: inner small ring (45% size of outer)
        const bassR = state.bassLevelR;
        const innerBase = baseRadius * 0.4;
        const targetRadiusR = bassR * innerBase * s.zoomIntensity * 8;
        const forceR = (targetRadiusR - state.smoothBassRadiusR) * 0.25;
        state.smoothBassVelocityR = (state.smoothBassVelocityR + forceR) * 0.7;
        state.smoothBassRadiusR += state.smoothBassVelocityR;
        drawSpeakerRing(ctx, cx + shakeX, cy + shakeY, innerBase + state.smoothBassRadiusR, bassR);
    }

    drawOrbitSquares(ctx);
    drawParticles(ctx);
    if (s.fxText && state.bassTextAlpha > 0) drawBassText(ctx, cx + state.ringShakeX, cy + state.ringShakeY, bass);
    ctx.restore();
}

function drawSpeakerRing(ctx, cx, cy, baseRadius, bass) {
    const hue = state.settings.ringHue;
    const ringPulse = baseRadius + bass * 40;
    const lineWidth = 3 + bass * 8;

    // === Expanding outer rings (can go beyond screen) ===
    const outerRingCount = 5;
    for (let r = outerRingCount; r >= 1; r--) {
        const expansion = bass * 120 * r; // Each ring expands more
        const radius = ringPulse + 30 * r + expansion;
        const alpha = Math.max(0, (0.04 + bass * 0.08) * (1 - r * 0.15));
        const lw = Math.max(0.5, lineWidth * (0.3 + bass * 0.4) * (1 - r * 0.1));

        if (alpha <= 0.005) continue;

        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue + r * 10}, 100%, ${70 + r * 3}%, ${alpha})`;
        ctx.lineWidth = lw;
        ctx.shadowColor = `hsla(${hue + r * 10}, 100%, 60%, ${alpha * 0.6})`;
        ctx.shadowBlur = 15 + bass * 20;
        ctx.stroke(); ctx.restore();
    }

    // === Outermost glow halo ===
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ringPulse + 12, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.05 + bass * 0.12})`;
    ctx.lineWidth = lineWidth + 16; ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${bass * 0.5})`;
    ctx.shadowBlur = 40 + bass * 50; ctx.stroke(); ctx.restore();

    // === Outer glow ring ===
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ringPulse + 5, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.15 + bass * 0.2})`;
    ctx.lineWidth = lineWidth + 6; ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${bass * 0.4})`;
    ctx.shadowBlur = 30 + bass * 30; ctx.stroke(); ctx.restore();

    // === Main ring ===
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ringPulse, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 90%, 80%, ${0.7 + bass * 0.3})`;
    ctx.lineWidth = lineWidth; ctx.shadowColor = `hsla(${hue}, 100%, 75%, ${0.4 + bass * 0.5})`;
    ctx.shadowBlur = 20 + bass * 25; ctx.stroke(); ctx.restore();

    // === Inner ring ===
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ringPulse - 12 - bass * 8, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 80%, 80%, ${0.25 + bass * 0.25})`;
    ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();

    // === Second inner ring ===
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ringPulse * 0.65, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 70%, 75%, ${0.12 + bass * 0.15})`;
    ctx.lineWidth = 1; ctx.stroke(); ctx.restore();

    // === Innermost ring (speaker cone) ===
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ringPulse * 0.35, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 60%, 70%, ${0.15 + bass * 0.15})`;
    ctx.lineWidth = 1; ctx.stroke(); ctx.restore();

    // Orbiting sparkle squares (drawn by drawOrbitSquares)
}

// ====== Orbiting Sparkle Squares ======
function spawnOrbitSquares() {
    if (!state.isPlaying || !state.analyser) return;

    const cx = state.canvas.width / 2, cy = state.canvas.height / 2;
    const ringRadius = Math.min(cx, cy) * state.settings.ringSize;
    const bass = state.bassLevel;
    const hue = state.settings.ringHue;

    // Get frequency data for sparkle intensity
    const dataArray = new Uint8Array(state.analyser.frequencyBinCount);
    state.analyser.getByteFrequencyData(dataArray);

    // Spawn count based on bass level
    const spawnCount = Math.floor(1 + bass * 4);

    for (let i = 0; i < spawnCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const freqIndex = Math.floor(Math.random() * dataArray.length * 0.6);
        const freqVal = dataArray[freqIndex] / 255;

        // Start from the ring edge
        const startDist = ringRadius + 10 + Math.random() * 20;

        state.orbitSquares.push({
            cx: cx, cy: cy, // orbit center
            dist: startDist, // distance from center
            angle: angle, // current orbit angle
            speed: 0.005 + Math.random() * 0.02 + bass * 0.01, // orbit speed
            outSpeed: 0.5 + freqVal * 2.5 + bass * 1.5, // outward flying speed
            size: 2 + freqVal * 4 + bass * 3, // square size
            rotation: Math.random() * Math.PI * 2, // self-rotation
            rotSpeed: (Math.random() - 0.5) * 0.3, // self-rotation speed
            life: 1.0,
            decay: 0.003 + Math.random() * 0.004,
            hue: hue + (Math.random() - 0.5) * 80,
            brightness: 60 + freqVal * 40,
            twinkle: Math.random() * Math.PI * 2, // twinkle phase
            twinkleSpeed: 0.1 + Math.random() * 0.2,
        });
    }

    // Limit total count
    if (state.orbitSquares.length > 500) {
        state.orbitSquares.splice(0, state.orbitSquares.length - 500);
    }
}

function updateOrbitSquares() {
    for (let i = state.orbitSquares.length - 1; i >= 0; i--) {
        const sq = state.orbitSquares[i];
        sq.angle += sq.speed; // orbit rotation
        sq.dist += sq.outSpeed; // fly outward
        sq.rotation += sq.rotSpeed; // self-rotation
        sq.twinkle += sq.twinkleSpeed; // twinkle phase
        sq.life -= sq.decay;
        sq.outSpeed *= 0.998; // slow down very gradually (fly further)
        sq.size *= 0.998; // shrink very slowly
        // Only remove when life runs out - let them fly off screen
        if (sq.life <= 0) {
            state.orbitSquares.splice(i, 1);
        }
    }
}

function drawOrbitSquares(ctx) {
    for (const sq of state.orbitSquares) {
        const x = sq.cx + Math.cos(sq.angle) * sq.dist;
        const y = sq.cy + Math.sin(sq.angle) * sq.dist;

        // Twinkle effect: modulate opacity
        const twinkleAlpha = 0.5 + 0.5 * Math.sin(sq.twinkle);
        const alpha = sq.life * twinkleAlpha;

        if (alpha <= 0.01) continue;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(sq.rotation);

        const halfSize = sq.size / 2;

        // Glow
        ctx.shadowColor = `hsla(${sq.hue}, 100%, ${sq.brightness}%, ${alpha})`;
        ctx.shadowBlur = 8 + sq.size * 2;

        // Fill the square
        ctx.fillStyle = `hsla(${sq.hue}, 100%, ${sq.brightness}%, ${alpha * 0.9})`;
        ctx.fillRect(-halfSize, -halfSize, sq.size, sq.size);

        // Bright center dot for extra sparkle
        if (sq.size > 2) {
            ctx.fillStyle = `hsla(${sq.hue}, 50%, 95%, ${alpha * 0.7})`;
            ctx.fillRect(-halfSize * 0.3, -halfSize * 0.3, sq.size * 0.3, sq.size * 0.3);
        }

        ctx.restore();
    }
}

function drawGlow(ctx, cx, cy, baseRadius, bass) {
    const hue = state.settings.ringHue;
    const glowRadius = baseRadius * (1.5 + bass * 0.5);
    const grad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, glowRadius);
    grad.addColorStop(0, `hsla(${hue}, 100%, 50%, ${bass * 0.08})`);
    grad.addColorStop(0.5, `hsla(${hue}, 100%, 40%, ${bass * 0.04})`);
    grad.addColorStop(1, `hsla(${hue}, 100%, 30%, 0)`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawBassText(ctx, cx, cy, bass) {
    state.bassTextAlpha -= 0.02;
    state.bassTextScale += (1 - state.bassTextScale) * 0.1;
    if (state.bassTextAlpha <= 0) { state.bassTextAlpha = 0; return; }
    ctx.save();
    ctx.translate(cx, cy + Math.min(cx, cy) * state.settings.ringSize + 60);
    ctx.scale(state.bassTextScale, state.bassTextScale);
    ctx.font = `900 ${36 + bass * 20}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255, 255, 255, ${state.bassTextAlpha * 0.9})`;
    ctx.shadowColor = `hsla(${state.settings.ringHue}, 100%, 70%, ${state.bassTextAlpha * 0.7})`;
    ctx.shadowBlur = 20; ctx.fillText('BASS DROP', 0, 0);
    ctx.restore();
}

// ====== Animation Loop ======
function animate() {
    analyzeBass();
    updateParticles();
    updateRippleWaves();
    updateOrbitSquares();
    if (state.isPlaying) spawnOrbitSquares();

    // Gaming rainbow color cycling
    if (state.settings.fxRainbow) {
        state.settings.ringHue = (state.settings.ringHue + 0.5) % 360;
        dom.ringHue.value = Math.round(state.settings.ringHue);
        dom.ringHueVal.textContent = Math.round(state.settings.ringHue);
    }

    if (state.isPlaying && state.bassLevel > 0.2 && Math.random() < state.bassLevel * 0.08) spawnRippleWave();

    const currentTime = getCurrentTime();
    if (state.audioBuffer) {
        dom.progressFill.style.width = `${Math.min((currentTime / state.audioBuffer.duration) * 100, 100)}%`;
        dom.currentTime.textContent = formatTime(currentTime);
    }
    drawFrame(state.bassLevel);
    state.animFrameId = requestAnimationFrame(animate);
}

// ====== Recording (WebM → MP4 via ffmpeg.wasm) ======
function toggleRecording() {
    state.isRecording ? stopRecording() : startRecording();
}

function startRecording() {
    if (!state.audioBuffer) return;

    const canvasStream = state.canvas.captureStream(30);

    // Add audio track
    if (state.audioContext && state.audioContext.state === 'running') {
        const dest = state.audioContext.createMediaStreamDestination();
        state.analyser.connect(dest);
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) canvasStream.addTrack(audioTrack);
    }

    let mimeType = '';
    for (const mt of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) {
        if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
    }

    state.recordedChunks = [];
    state.mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 5_000_000,
    });
    state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.recordedChunks.push(e.data);
    };
    state.mediaRecorder.start(100);

    state.isRecording = true;
    dom.recordBtn.textContent = '⏹ 録画停止';
    dom.recordBtn.classList.add('recording');
    dom.recordStatus.textContent = '🔴 録画中...';

    if (!state.isPlaying) { state.pauseOffset = 0; play(); }
}

async function stopRecording() {
    if (!state.isRecording) return;
    state.isRecording = false;
    dom.recordBtn.textContent = '処理中...';
    dom.recordBtn.classList.remove('recording');
    dom.recordBtn.disabled = true;

    // Stop MediaRecorder and wait for data
    const webmBlob = await new Promise((resolve) => {
        state.mediaRecorder.onstop = () => {
            resolve(new Blob(state.recordedChunks, { type: 'video/webm' }));
        };
        state.mediaRecorder.stop();
    });

    dom.recordStatus.textContent = 'MP4に変換中...（初回は読み込みに時間がかかります）';

    try {
        const mp4Blob = await convertWebMToMP4(webmBlob);
        downloadBlob(mp4Blob, `bass_reactive_mv_${Date.now()}.mp4`);
        dom.recordStatus.textContent = 'MP4をダウンロードしました ✅';
    } catch (e) {
        console.error('MP4 conversion failed:', e);
        // Fallback: download WebM
        downloadBlob(webmBlob, `bass_reactive_mv_${Date.now()}.webm`);
        dom.recordStatus.textContent = 'MP4変換失敗 → WebMをダウンロードしました';
    }

    dom.recordBtn.textContent = '⏺ 録画開始';
    dom.recordBtn.disabled = false;
}

async function convertWebMToMP4(webmBlob) {
    // Load ffmpeg.wasm if not yet loaded
    if (!ffmpegInstance) {
        if (ffmpegLoading) {
            // Wait for existing load
            while (ffmpegLoading) await new Promise(r => setTimeout(r, 200));
            if (!ffmpegInstance) throw new Error('ffmpeg failed to load');
        } else {
            ffmpegLoading = true;
            dom.recordStatus.textContent = 'ffmpeg.wasm を読み込み中...';
            try {
                const { FFmpeg } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js');
                const { toBlobURL } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/dist/esm/index.js');

                ffmpegInstance = new FFmpeg();
                const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
                await ffmpegInstance.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
            } catch (e) {
                ffmpegLoading = false;
                throw e;
            }
            ffmpegLoading = false;
        }
    }

    dom.recordStatus.textContent = 'MP4に変換中...';

    const ffmpeg = ffmpegInstance;
    const webmData = new Uint8Array(await webmBlob.arrayBuffer());
    await ffmpeg.writeFile('input.webm', webmData);

    // Simple, fast conversion
    await ffmpeg.exec([
        '-i', 'input.webm',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        '-y', 'output.mp4'
    ]);

    const mp4Data = await ffmpeg.readFile('output.mp4');
    const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });

    // Cleanup
    await ffmpeg.deleteFile('input.webm');
    await ffmpeg.deleteFile('output.mp4');

    return mp4Blob;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ====== Utilities ======
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}
