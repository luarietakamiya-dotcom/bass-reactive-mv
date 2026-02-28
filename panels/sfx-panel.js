/* ========================================
   SFX Panel — Synthesized Sound Effects
   ======================================== */
import { state } from '../core/state.js';

// ====== Preset SE definitions ======
const SFX_PRESETS = [
    {
        id: 'laser',
        label: '⚡ レーザー',
        fn: (ctx, vol) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        },
    },
    {
        id: 'explosion',
        label: '💥 爆発',
        fn: (ctx, vol) => {
            const bufLen = ctx.sampleRate * 0.5;
            const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
            const src = ctx.createBufferSource();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass'; filter.frequency.value = 400;
            src.buffer = buf;
            src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
            gain.gain.setValueAtTime(vol * 2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            src.start(); src.stop(ctx.currentTime + 0.6);
        },
    },
    {
        id: 'powerup',
        label: '⭐ パワーアップ',
        fn: (ctx, vol) => {
            const freqs = [300, 400, 500, 700, 900, 1200];
            freqs.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.value = f;
                const t = ctx.currentTime + i * 0.06;
                gain.gain.setValueAtTime(0.001, t);
                gain.gain.linearRampToValueAtTime(vol * 0.4, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.start(t); osc.stop(t + 0.12);
            });
        },
    },
    {
        id: 'coin',
        label: '🪙 コイン',
        fn: (ctx, vol) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(988, ctx.currentTime);
            osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(); osc.stop(ctx.currentTime + 0.35);
        },
    },
    {
        id: 'hit',
        label: '👊 ヒット',
        fn: (ctx, vol) => {
            const bufLen = ctx.sampleRate * 0.08;
            const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
            const src = ctx.createBufferSource();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.5;
            src.buffer = buf;
            src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
            gain.gain.setValueAtTime(vol * 1.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            src.start(); src.stop(ctx.currentTime + 0.12);
        },
    },
    {
        id: 'synth',
        label: '🎹 シンセ',
        fn: (ctx, vol) => {
            const osc = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass'; filter.frequency.value = 2000;
            osc.connect(filter); osc2.connect(filter);
            filter.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sawtooth'; osc.frequency.value = 220;
            osc2.type = 'sawtooth'; osc2.frequency.value = 221.5;
            gain.gain.setValueAtTime(0.001, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(vol * 0.6, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(vol * 0.6, ctx.currentTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.start(); osc2.start();
            osc.stop(ctx.currentTime + 0.7); osc2.stop(ctx.currentTime + 0.7);
        },
    },
    {
        id: 'zap',
        label: '⚡ ザップ',
        fn: (ctx, vol) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(80, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.start(); osc.stop(ctx.currentTime + 0.25);
        },
    },
    {
        id: 'alarm',
        label: '🚨 アラーム',
        fn: (ctx, vol) => {
            for (let i = 0; i < 3; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.value = i % 2 === 0 ? 880 : 660;
                const t = ctx.currentTime + i * 0.12;
                gain.gain.setValueAtTime(vol * 0.5, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.start(t); osc.stop(t + 0.12);
            }
        },
    },
];

// ====== SFX Volume (shared, persists) ======
let sfxVolume = 1.0;

// ====== Play a preset ======
function playSFX(preset) {
    // Get or reuse audio context (same as state.audioContext if available)
    const ctx = state.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    preset.fn(ctx, sfxVolume);
}

// ====== Build SFX Panel UI ======
export function buildSFXPanel(container) {
    container.innerHTML = '';

    // Volume control
    const volDiv = document.createElement('div');
    volDiv.className = 'control-section';
    volDiv.innerHTML = '<h3>🔊 音量</h3>';
    const volRow = document.createElement('div');
    volRow.className = 'slider-group';
    volRow.innerHTML = `
        <label>音量</label>
        <input type="range" id="sfx-volume" min="0" max="2" step="0.05" value="${sfxVolume}">
        <span id="sfx-volume-val">${sfxVolume}</span>
    `;

    volRow.querySelector('#sfx-volume').addEventListener('input', (e) => {
        sfxVolume = parseFloat(e.target.value);
        volRow.querySelector('#sfx-volume-val').textContent = sfxVolume.toFixed(2);
    });
    volDiv.appendChild(volRow);
    container.appendChild(volDiv);

    // SE buttons grid
    const seDiv = document.createElement('div');
    seDiv.className = 'control-section';
    seDiv.innerHTML = '<h3>🎵 サウンドエフェクト</h3>';

    const grid = document.createElement('div');
    grid.className = 'sfx-grid';

    for (const preset of SFX_PRESETS) {
        const btn = document.createElement('button');
        btn.className = 'btn-sfx';
        btn.textContent = preset.label;
        btn.id = `sfx-btn-${preset.id}`;
        btn.addEventListener('click', () => {
            playSFX(preset);
            // Flash effect
            btn.classList.add('sfx-active');
            setTimeout(() => btn.classList.remove('sfx-active'), 200);
        });
        grid.appendChild(btn);
    }

    seDiv.appendChild(grid);
    container.appendChild(seDiv);
}
