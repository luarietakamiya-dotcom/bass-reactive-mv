/* ========================================
   Bass Reactive MV Visualizer — Entry Point
   Modular Visual Engine v2.0
   ======================================== */
import { state, audioData } from './core/state.js';
import { initAudio, initAudioFromVideo, play, pause, stop, seekTo, getCurrentTime, getDuration, analyzeFrame, setEQ, setEcho, setCompressor } from './core/audio.js';
import { initRenderer, startLoop, stopLoop } from './core/renderer.js';
import { ModuleManager } from './modules/module-manager.js';
import { SpeakerModule } from './modules/speaker.js';
import { SpectrumModule } from './modules/spectrum.js';
import { NeonModule } from './modules/neon.js';
import { initDrag } from './utils/drag.js';
import { startRecording, stopRecording } from './utils/recorder.js';
import { formatTime, createSlider, createToggle } from './utils/helpers.js';
import { buildSFXPanel } from './panels/sfx-panel.js';

// ====== Module Manager ======
const moduleManager = new ModuleManager();

// ====== DOM Cache ======
const dom = {};

function cacheDom() {
    dom.uploadScreen = document.getElementById('upload-screen');
    dom.visualizerScreen = document.getElementById('visualizer-screen');
    dom.canvas = document.getElementById('main-canvas');
    dom.imageZone = document.getElementById('image-zone');
    dom.audioZone = document.getElementById('audio-zone');
    dom.videoZone = document.getElementById('video-zone');
    dom.imageInput = document.getElementById('image-input');
    dom.audioInput = document.getElementById('audio-input');
    dom.videoInput = document.getElementById('video-input');
    dom.imagePreview = document.getElementById('image-preview');
    dom.audioPreview = document.getElementById('audio-preview');
    dom.startBtn = document.getElementById('start-btn');
    dom.backBtn = document.getElementById('back-btn');
    dom.playBtn = document.getElementById('play-btn');
    dom.stopBtn = document.getElementById('stop-btn');
    dom.recordBtn = document.getElementById('record-btn');
    dom.progressFill = document.getElementById('progress-fill');
    dom.currentTime = document.getElementById('current-time');
    dom.totalTime = document.getElementById('total-time');
    dom.meterFill = document.getElementById('meter-fill');
    dom.moduleList = document.getElementById('module-list'); // fallback
    dom.speakerModuleList = document.getElementById('speaker-module-list');
    dom.spectrumModuleList = document.getElementById('spectrum-module-list');
    dom.addSpeaker = document.getElementById('add-speaker');
    dom.addSpectrum = document.getElementById('add-spectrum');
    dom.addNeon = document.getElementById('add-neon');
    dom.panelToggle = document.getElementById('panel-toggle');
    dom.spectrumToggle = document.getElementById('spectrum-toggle');
    dom.speakerPanel = document.getElementById('speaker-panel');
    dom.spectrumPanel = document.getElementById('spectrum-panel');
    dom.eqPanel = document.getElementById('eq-panel');
    dom.eqToggle = document.getElementById('eq-toggle');
    dom.sfxToggle = document.getElementById('sfx-toggle');
    dom.sfxPanel = document.getElementById('sfx-panel');
    dom.sfxPanelBody = document.getElementById('sfx-panel-body');
    dom.recordQuality = document.getElementById('record-quality');
    dom.sensitivity = document.getElementById('sensitivity');
    dom.sensitivityVal = document.getElementById('sensitivity-val');
    // Top bar
    dom.tbImageInput = document.getElementById('tb-image-input');
    dom.tbAudioInput = document.getElementById('tb-audio-input');
    dom.tbVideoInput = document.getElementById('tb-video-input');
    dom.saveSettingsBtn = document.getElementById('save-settings-btn');
    dom.tbSettingsInput = document.getElementById('tb-settings-input');
}

// ====== Init ======
document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    state.canvas = dom.canvas;
    state.ctx = dom.canvas.getContext('2d');

    // Splash screen — Enter or click to proceed
    const splash = document.getElementById('splash-screen');
    const uploadScreen = document.getElementById('upload-screen');
    const goToTitle = () => {
        splash.classList.remove('active');
        uploadScreen.classList.add('active');
    };
    if (splash) {
        splash.addEventListener('click', goToTitle);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && splash.classList.contains('active')) goToTitle();
        }, { once: false });
    }

    // Manual modal
    const manualBtn = document.getElementById('manual-btn');
    const manualModal = document.getElementById('manual-modal');
    const manualClose = document.getElementById('manual-close');
    if (manualBtn) manualBtn.addEventListener('click', () => manualModal.style.display = 'flex');
    if (manualClose) manualClose.addEventListener('click', () => manualModal.style.display = 'none');
    if (manualModal) manualModal.addEventListener('click', (e) => {
        if (e.target === manualModal) manualModal.style.display = 'none';
    });

    setupEventListeners();
});


// ====== Event Listeners ======
function setupEventListeners() {
    // File uploads
    dom.imageZone.addEventListener('click', () => dom.imageInput.click());
    dom.audioZone.addEventListener('click', () => dom.audioInput.click());
    if (dom.videoZone) dom.videoZone.addEventListener('click', () => dom.videoInput && dom.videoInput.click());

    dom.imageInput.addEventListener('change', (e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); });
    dom.audioInput.addEventListener('change', (e) => { if (e.target.files[0]) handleAudioUpload(e.target.files[0]); });
    if (dom.videoInput) dom.videoInput.addEventListener('change', (e) => { if (e.target.files[0]) handleVideoUpload(e.target.files[0]); });

    // Drag & drop
    [dom.imageZone, dom.audioZone, dom.videoZone].filter(Boolean).forEach(zone => {
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = '#a855f7'; });
        zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    });
    dom.imageZone.addEventListener('drop', (e) => { e.preventDefault(); dom.imageZone.style.borderColor = ''; if (e.dataTransfer.files[0]) handleImageUpload(e.dataTransfer.files[0]); });
    dom.audioZone.addEventListener('drop', (e) => { e.preventDefault(); dom.audioZone.style.borderColor = ''; if (e.dataTransfer.files[0]) handleAudioUpload(e.dataTransfer.files[0]); });
    if (dom.videoZone) dom.videoZone.addEventListener('drop', (e) => { e.preventDefault(); dom.videoZone.style.borderColor = ''; if (e.dataTransfer.files[0]) handleVideoUpload(e.dataTransfer.files[0]); });

    // Start
    dom.startBtn.addEventListener('click', startVisualizer);
    dom.backBtn.addEventListener('click', goBack);
    dom.playBtn.addEventListener('click', togglePlayback);
    dom.stopBtn.addEventListener('click', () => { stop(); syncVideoStop(); dom.playBtn.textContent = '▶ 再生'; });
    dom.recordBtn.addEventListener('click', toggleRecording);

    // Panel toggles
    dom.panelToggle.addEventListener('click', () => dom.speakerPanel.classList.toggle('collapsed'));
    if (dom.spectrumToggle) dom.spectrumToggle.addEventListener('click', () => dom.spectrumPanel.classList.toggle('collapsed'));
    if (dom.eqToggle) dom.eqToggle.addEventListener('click', () => dom.eqPanel.classList.toggle('collapsed'));
    if (dom.sfxToggle) dom.sfxToggle.addEventListener('click', () => dom.sfxPanel.classList.toggle('collapsed'));

    // Module add buttons
    dom.addSpeaker.addEventListener('click', () => addModule('speaker'));
    dom.addSpectrum.addEventListener('click', () => addModule('spectrum'));
    dom.addNeon.addEventListener('click', () => addModule('neon'));

    // Sensitivity
    dom.sensitivity.addEventListener('input', (e) => {
        state.settings.sensitivity = parseFloat(e.target.value);
        dom.sensitivityVal.textContent = e.target.value;
    });

    // Top bar — file reload
    if (dom.tbImageInput) dom.tbImageInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleImageUpload(e.target.files[0]);
    });
    if (dom.tbAudioInput) dom.tbAudioInput.addEventListener('change', async (e) => {
        if (!e.target.files[0]) return;
        const file = e.target.files[0];
        state.audioFile = file;
        const wasPlaying = state.isPlaying;
        if (wasPlaying) { pause(); }
        await initAudio(file);
        dom.totalTime.textContent = formatTime(getDuration());
        if (wasPlaying) { play(); syncVideoPlay(); }
    });
    if (dom.tbVideoInput) dom.tbVideoInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleVideoUpload(e.target.files[0]);
    });

    // Top bar — save settings
    if (dom.saveSettingsBtn) dom.saveSettingsBtn.addEventListener('click', saveSettings);
    if (dom.tbSettingsInput) dom.tbSettingsInput.addEventListener('change', (e) => {
        if (e.target.files[0]) loadSettings(e.target.files[0]);
    });

    document.querySelector('.progress-bar').addEventListener('click', (e) => {
        if (!state.audioBuffer) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const time = ratio * state.audioBuffer.duration;
        seekTo(time);
        syncVideoSeek(time);
    });

    // Resize
    window.addEventListener('resize', resizeCanvas);

    // EQ sliders
    setupEQ();
}

// ====== Save / Load Settings ======
function saveSettings() {
    const data = {
        version: '2.0',
        sensitivity: state.settings.sensitivity,
        modules: moduleManager.modules.map(m => ({
            type: m.type,
            settings: JSON.parse(JSON.stringify(m.settings)),
            position: { ...m.position },
        })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zunzun-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadSettings(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.sensitivity != null) {
                state.settings.sensitivity = data.sensitivity;
                if (dom.sensitivity) {
                    dom.sensitivity.value = data.sensitivity;
                    dom.sensitivityVal.textContent = data.sensitivity;
                }
            }
            if (Array.isArray(data.modules)) {
                // Try to apply settings to existing modules in order
                data.modules.forEach((saved, i) => {
                    const existing = moduleManager.modules[i];
                    if (existing && existing.type === saved.type) {
                        Object.assign(existing.settings, saved.settings);
                        existing.position = { ...saved.position };
                        if (existing._buildUI) existing._buildUI();
                    }
                });
            }
        } catch (err) {
            alert('設定ファイルの読み込みに失敗しました: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ====== Module Management ======
function addModule(type) {
    let mod;
    switch (type) {
        case 'speaker': mod = new SpeakerModule(); break;
        case 'spectrum': mod = new SpectrumModule(); break;
        case 'neon': mod = new NeonModule(); break;
        default: return;
    }

    const added = moduleManager.add(mod);
    if (!added) {
        alert(`${type}モジュールは最大4つまでです`);
        return;
    }

    // Route to correct panel list
    const targetList = type === 'speaker'
        ? dom.speakerModuleList
        : dom.spectrumModuleList;
    mod.createUI(targetList || dom.moduleList);
    updateAddButtons();
}

function updateAddButtons() {
    dom.addSpeaker.disabled = moduleManager.countOf('speaker') >= 4;
    dom.addSpectrum.disabled = moduleManager.countOf('spectrum') >= 4;
    dom.addNeon.disabled = moduleManager.countOf('neon') >= 4;

    // Re-hook delete to also update buttons
    for (const mod of moduleManager.modules) {
        const origDelete = mod.onDelete;
        mod.onDelete = (id) => {
            origDelete(id);
            updateAddButtons();
        };
    }
}

// ====== File Handling ======
function handleImageUpload(file) {
    state.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const prev = dom.imagePreview;
        prev.innerHTML = `<img src="${e.target.result}">`;
        prev.classList.add('active');
        dom.imageZone.classList.add('has-file');
        const img = new Image();
        img.onload = () => { state.image = img; checkReady(); };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleAudioUpload(file) {
    state.audioFile = file;
    const prev = dom.audioPreview;
    prev.innerHTML = `<div class="audio-name">🎵 ${file.name}</div>`;
    prev.classList.add('active');
    dom.audioZone.classList.add('has-file');
    checkReady();
}

function handleVideoUpload(file) {
    state.videoFile = file;
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    state.videoElement = video;

    // Show preview
    const zone = dom.videoZone;
    if (zone) {
        zone.classList.add('has-file');
        const preview = document.createElement('div');
        preview.className = 'upload-preview active';
        preview.innerHTML = `<div class="audio-name">🎬 ${file.name}</div>`;
        // Remove previous preview if any
        const old = zone.querySelector('.upload-preview');
        if (old) old.remove();
        zone.appendChild(preview);
    }
    checkReady();
}

function checkReady() {
    // Need at least (audioFile) OR (videoFile) to start
    // If no audioFile, we'll use video's audio track
    dom.startBtn.disabled = !(state.audioFile || state.videoFile);
}

// ====== Video Sync Helpers ======
function syncVideoPlay() {
    if (!state.videoElement) return;
    state.videoElement.currentTime = getCurrentTime();
    state.videoElement.play().catch(() => { });
}

function syncVideoPause() {
    if (!state.videoElement) return;
    state.videoElement.pause();
}

function syncVideoStop() {
    if (!state.videoElement) return;
    state.videoElement.pause();
    state.videoElement.currentTime = 0;
}

function syncVideoSeek(time) {
    if (!state.videoElement) return;
    state.videoElement.currentTime = time;
}

// ====== Visualizer ======
async function startVisualizer() {
    dom.uploadScreen.classList.remove('active');
    dom.visualizerScreen.classList.add('active');

    let duration;
    if (state.audioFile) {
        // Standard mode: separate audio file
        duration = await initAudio(state.audioFile);
    } else if (state.videoElement) {
        // Video-only mode: use video's audio track
        // Wait for video metadata to be ready
        if (!state.videoElement.duration || isNaN(state.videoElement.duration)) {
            await new Promise(resolve => {
                state.videoElement.addEventListener('loadedmetadata', resolve, { once: true });
                // Fallback timeout
                setTimeout(resolve, 3000);
            });
        }
        duration = initAudioFromVideo(state.videoElement);
    }

    resizeCanvas();
    dom.totalTime.textContent = formatTime(duration || 0);

    // Set source onended (only for buffer mode)
    if (!state.videoMode) {
        state.source && (state.source.onended = () => {
            if (state.isPlaying) {
                state.isPlaying = false;
                syncVideoPause();
                dom.playBtn.textContent = '▶ 再生';
                if (state.isRecording) toggleRecording();
            }
        });
    } else {
        // Video mode: listen for video ended
        state.videoElement.addEventListener('ended', () => {
            state.isPlaying = false;
            dom.playBtn.textContent = '▶ 再生';
            if (state.isRecording) toggleRecording();
        });
    }

    // Add default speaker if none exist
    if (moduleManager.modules.length === 0) {
        addModule('speaker');
    }

    // Init drag
    initDrag(state.canvas, moduleManager);

    // Init renderer
    initRenderer(moduleManager, onFrame);

    // Do NOT auto-play video — it syncs with audio playback
    startLoop();
}

function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    const wrapperW = wrapper.clientWidth;
    const wrapperH = wrapper.clientHeight;

    let ratio = null;
    if (state.image) {
        ratio = state.image.width / state.image.height;
    } else if (state.videoElement && state.videoElement.videoWidth) {
        ratio = state.videoElement.videoWidth / state.videoElement.videoHeight;
    }

    if (ratio) {
        const wrapperRatio = wrapperW / wrapperH;
        let canvasW, canvasH;
        if (ratio > wrapperRatio) {
            canvasW = wrapperW;
            canvasH = wrapperW / ratio;
        } else {
            canvasH = wrapperH;
            canvasW = wrapperH * ratio;
        }
        state.canvas.width = Math.round(canvasW);
        state.canvas.height = Math.round(canvasH);
    } else {
        state.canvas.width = wrapperW;
        state.canvas.height = wrapperH;
    }
}

function goBack() {
    stop();
    syncVideoStop();
    stopLoop();
    moduleManager.clear();
    dom.visualizerScreen.classList.remove('active');
    dom.uploadScreen.classList.add('active');
}

function onFrame() {
    const currentTime = getCurrentTime();
    const duration = getDuration();
    if (duration > 0) {
        dom.progressFill.style.width = `${Math.min((currentTime / duration) * 100, 100)}%`;
        dom.currentTime.textContent = formatTime(currentTime);
    }
    dom.meterFill.style.width = `${audioData.bassLevel * 100}%`;
}

// ====== Playback ======
function togglePlayback() {
    if (state.isPlaying) {
        pause();
        syncVideoPause();
        dom.playBtn.textContent = '▶ 再生';
    } else {
        play();
        syncVideoPlay();
        dom.playBtn.textContent = '⏸ 一時停止';
    }
}

// ====== Recording ======
function toggleRecording() {
    const bitrate = dom.recordQuality ? parseInt(dom.recordQuality.value) : 2000000;
    if (state.isRecording) {
        stopRecording((status) => {
            dom.recordBtn.textContent = status === 'converting' ? '🔄 変換中...' : '⏺ 録画';
            dom.recordBtn.classList.remove('recording');
        });
    } else {
        // 録画開始時：頭出し → 再生 → 録画スタート
        seekTo(0);
        syncVideoSeek(0);
        if (!state.isPlaying) {
            play();
            syncVideoPlay();
            dom.playBtn.textContent = '⏸ 一時停止';
        }
        startRecording(state.canvas, () => {
            dom.recordBtn.textContent = '⏹ 録画停止';
            dom.recordBtn.classList.add('recording');
        }, bitrate);
    }
}


// ====== EQ Setup ======
function setupEQ() {
    const eqBody = document.querySelector('#eq-panel .bottom-panel-body');
    if (!eqBody) return;

    eqBody.appendChild(createSlider('Low', -12, 12, 0.5, 0, (v) => setEQ('low', v)).element);
    eqBody.appendChild(createSlider('Mid', -12, 12, 0.5, 0, (v) => setEQ('mid', v)).element);
    eqBody.appendChild(createSlider('High', -12, 12, 0.5, 0, (v) => setEQ('high', v)).element);
    eqBody.appendChild(createSlider('Bass Boost', 0, 24, 1, 0, (v) => setEQ('bassBoost', v)).element);

    const echoSection = document.createElement('div');
    echoSection.innerHTML = '<h3>Echo</h3>';
    echoSection.appendChild(createSlider('ディレイ', 0, 1, 0.05, 0, (v) => setEcho(v, 0.3, v > 0 ? 0.4 : 0)).element);
    eqBody.appendChild(echoSection);

    const compSection = document.createElement('div');
    compSection.innerHTML = '<h3>Compressor</h3>';
    compSection.appendChild(createSlider('しきい値', -50, 0, 1, -24, (v) => setCompressor(v, 4)).element);
    eqBody.appendChild(compSection);
    // SFX Panel
    if (dom.sfxPanelBody) buildSFXPanel(dom.sfxPanelBody);
}
