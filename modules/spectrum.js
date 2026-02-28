/* ========================================
   Spectrum Analyzer Module — 8 visualization types
   ======================================== */
import { BaseModule } from './base-module.js';
import { createSlider, createToggle, createSelect, hsl, clamp } from '../utils/helpers.js';
import { state } from '../core/state.js';

const SPECTRUM_TYPES = [
    { value: 'particle', label: '✨ パーティクル' },
    { value: 'edm-bar', label: '📊 EDM縦バー' },
    { value: 'circular', label: '⭕ 円形スペクトラム' },
    { value: 'pulse-line', label: '🌊 パルスライン' },
    { value: 'lr-bar', label: '⇔ L/Rバー' },
    { value: 'mirror', label: '↕ 中央対称型' },
    { value: 'glitch', label: '👾 グリッチ型' },
    { value: 'wind', label: '🍃 風パーティクル' },
    { value: 'matrix', label: '🟢 マトリックス' },
];


const DEFAULTS = {
    type: 'edm-bar',
    size: 1.0,
    rotation: 0,
    opacity: 0.9,
    rainbowSpeed: 0.5,
    rainbow: true,
    hue: 270,
    sensitivity: 1.5,
    barCount: 64,
    windDirection: 'right', // 'left' or 'right'
};

export class SpectrumModule extends BaseModule {
    constructor() {
        super('spectrum', 'Spectrum', JSON.parse(JSON.stringify(DEFAULTS)));
        this._particles = [];
        this._matrixColumns = [];
        this._hue = 270;
        this._glitchTimer = 0;
        this._glitchIntensity = 0;
        this._glitchSlices = [];
        this._glitchTextParticles = [];
        this._audioData = null;
    }

    update(audioData) {
        this._audioData = audioData;
        const s = this.settings;
        if (s.rainbow) this._hue = (this._hue + s.rainbowSpeed) % 360;
        else this._hue = s.hue;

        const freq = audioData.frequencyData;
        if (!freq) return;

        // Type-specific updates
        switch (s.type) {
            case 'particle': this._updateParticles(audioData); break;
            case 'wind': this._updateWind(audioData); break;
            case 'matrix': this._updateMatrix(audioData); break;
            case 'glitch': this._updateGlitch(audioData); break;
        }
    }

    draw(ctx, w, h) {
        const s = this.settings;
        const cx = this.position.x * w;
        const cy = this.position.y * h;
        const freq = this._getFrequencySlice();
        if (!freq || freq.length === 0) return;

        // Glitch draws globally (no translate/clip)
        if (s.type === 'glitch') {
            this._drawGlitch(ctx, w, h, freq);
            return;
        }

        ctx.save();
        ctx.globalAlpha = s.opacity;
        ctx.translate(cx, cy);
        ctx.rotate(s.rotation);

        switch (s.type) {
            case 'particle': this._drawParticles(ctx, w, h); break;
            case 'edm-bar': this._drawEDMBars(ctx, w, h, freq); break;
            case 'circular': this._drawCircular(ctx, w, h, freq); break;
            case 'pulse-line': this._drawPulseLine(ctx, w, h, freq); break;
            case 'lr-bar': this._drawLRBars(ctx, w, h); break;
            case 'mirror': this._drawMirror(ctx, w, h, freq); break;
            case 'wind': this._drawWind(ctx, w, h); break;
            case 'matrix': this._drawMatrix(ctx, w, h); break;
        }

        ctx.restore();
    }

    _getFrequencySlice() {
        if (!this._audioData || !this._audioData.frequencyData) return null;
        const frequencyData = this._audioData.frequencyData;
        const count = this.settings.barCount;
        const step = Math.max(1, Math.floor(frequencyData.length / count));
        const result = new Array(count);
        for (let i = 0; i < count; i++) {
            result[i] = (frequencyData[i * step] || 0) / 255;
        }
        return result;
    }

    // ====== EDM Bars ======
    _drawEDMBars(ctx, w, h, freq) {
        const s = this.settings;
        const count = freq.length;
        const totalW = w * s.size * 0.8;
        const barW = totalW / count * 0.7;
        const gap = totalW / count * 0.3;
        const maxH = h * 0.4 * s.size;
        const startX = -totalW / 2;

        for (let i = 0; i < count; i++) {
            const val = freq[i] * s.sensitivity;
            const barH = val * maxH;
            const x = startX + i * (barW + gap);
            const hue = (this._hue + i * (360 / count)) % 360;

            ctx.fillStyle = hsl(hue, 100, 60, 0.8);
            ctx.shadowColor = hsl(hue, 100, 50, 0.5);
            ctx.shadowBlur = 8;
            ctx.fillRect(x, -barH, barW, barH);

            // Reflection
            ctx.fillStyle = hsl(hue, 100, 60, 0.2);
            ctx.fillRect(x, 0, barW, barH * 0.3);
        }
        ctx.shadowBlur = 0;
    }

    // ====== Circular Spectrum ======
    _drawCircular(ctx, w, h, freq) {
        const s = this.settings;
        const radius = Math.min(w, h) * 0.15 * s.size;
        const count = freq.length;
        const maxBarH = radius * 0.8;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const val = freq[i] * s.sensitivity;
            const barH = val * maxBarH;
            const hue = (this._hue + i * (360 / count)) % 360;

            const x1 = Math.cos(angle) * radius;
            const y1 = Math.sin(angle) * radius;
            const x2 = Math.cos(angle) * (radius + barH);
            const y2 = Math.sin(angle) * (radius + barH);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = hsl(hue, 100, 65, 0.8);
            ctx.lineWidth = Math.max(2, (Math.PI * 2 * radius) / count * 0.5);
            ctx.shadowColor = hsl(hue, 100, 50, 0.4);
            ctx.shadowBlur = 6;
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    // ====== Pulse Line ======
    _drawPulseLine(ctx, w, h, freq) {
        const s = this.settings;
        const count = freq.length;
        const totalW = w * s.size;
        const step = totalW / (count - 1);
        const maxAmp = h * 0.35 * s.size;
        const startX = -totalW / 2;

        // 上ライン: 左端u0=0に収束 → ピーク → 右端に収束
        ctx.beginPath();
        ctx.moveTo(startX, 0);  // 左端y=0
        for (let i = 0; i < count; i++) {
            const val = Math.min(1, freq[i] * s.sensitivity);
            const x = startX + i * step;
            const y = -Math.sin(val * Math.PI) * maxAmp * val;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(startX + totalW, 0);  // 右端Y=0に収束
        ctx.strokeStyle = hsl(this._hue, 100, 65, 0.9);
        ctx.lineWidth = 2.5;
        ctx.shadowColor = hsl(this._hue, 100, 65, 0.5);
        ctx.shadowBlur = 12;
        ctx.stroke();

        // 下ライン(反転)
        ctx.beginPath();
        ctx.moveTo(startX, 0);  // 左端Y=0に収束
        for (let i = 0; i < count; i++) {
            const val = Math.min(1, freq[i] * s.sensitivity);
            const x = startX + i * step;
            const y = Math.sin(val * Math.PI) * maxAmp * val;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(startX + totalW, 0);  // 右端Y=0
        ctx.strokeStyle = hsl((this._hue + 180) % 360, 100, 65, 0.5);
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // ====== L/R Bar (左端・右端から横に伸びるバー) ======
    _drawLRBars(ctx, w, h) {
        if (!this._audioData) return;
        const s = this.settings;
        const freq = this._audioData.frequencyData;
        const freqL = this._audioData.frequencyDataL;
        const freqR = this._audioData.frequencyDataR;
        if (!freq) return;

        const count = Math.min(s.barCount, 64);
        const halfW = w * 0.48 * s.size;   // 片側の最大長さ
        const totalH = h * 0.85 * s.size;   // バー群の合計高さ
        const barH = (totalH / count) * 0.7;
        const gap = (totalH / count) * 0.3;
        const startY = -totalH / 2;
        const step = Math.max(1, Math.floor((freqL ? freqL.length : freq.length) / count));

        const getVal = (data, i) => data ? (data[i * step] || 0) / 255 : 0;

        ctx.shadowBlur = 8;
        for (let i = 0; i < count; i++) {
            const vL = Math.min(1, getVal(freqL, i) * s.sensitivity);
            const vR = Math.min(1, getVal(freqR, i) * s.sensitivity);
            const y = startY + i * (barH + gap);
            const hueL = (this._hue + i * (180 / count)) % 360;
            const hueR = (this._hue + 180 + i * (180 / count)) % 360;

            // 左バー: 左端から右方向に伸びる
            const lenL = vL * halfW;
            ctx.fillStyle = hsl(hueL, 100, 60, 0.85);
            ctx.shadowColor = hsl(hueL, 100, 55, 0.5);
            ctx.fillRect(-halfW, y, lenL, barH);

            // 右バー: 右端から左方向に伸びる
            const lenR = vR * halfW;
            ctx.fillStyle = hsl(hueR, 100, 60, 0.85);
            ctx.shadowColor = hsl(hueR, 100, 55, 0.5);
            ctx.fillRect(halfW - lenR, y, lenR, barH);
        }
        ctx.shadowBlur = 0;
    }


    // ====== Mirror (Center Symmetric) ======
    _drawMirror(ctx, w, h, freq) {
        const s = this.settings;
        const count = freq.length;
        const totalW = w * 0.8 * s.size;
        const barW = totalW / count * 0.7;
        const gap = totalW / count * 0.3;
        const maxH = h * 0.25 * s.size;
        const startX = -totalW / 2;

        for (let i = 0; i < count; i++) {
            const val = freq[i] * s.sensitivity;
            const barH = val * maxH;
            const hue = (this._hue + i * (360 / count)) % 360;
            const x = startX + i * (barW + gap);

            ctx.fillStyle = hsl(hue, 100, 60, 0.8);
            ctx.shadowColor = hsl(hue, 100, 50, 0.3);
            ctx.shadowBlur = 5;
            // Up
            ctx.fillRect(x, -barH, barW, barH);
            // Down (mirrored)
            ctx.fillRect(x, 0, barW, barH);
        }
        ctx.shadowBlur = 0;
    }

    // ====== Glitch — Full Screen ======
    _updateGlitch(audioData) {
        this._glitchTimer++;
        const bass = audioData.bassLevel;
        const s = this.settings;

        // Intensity: smooth bass tracking
        this._glitchIntensity += (bass * s.sensitivity - this._glitchIntensity) * 0.2;

        // Spawn random horizontal slice descriptors
        const sliceCount = Math.floor(2 + this._glitchIntensity * 8);
        this._glitchSlices = [];
        for (let i = 0; i < sliceCount; i++) {
            const y = Math.random();
            const height = 0.005 + Math.random() * 0.04;
            const offset = (Math.random() - 0.5) * 60 * this._glitchIntensity;
            const r = Math.random() < 0.4; // random chance to double slice
            this._glitchSlices.push({ y, height, offset, double: r });
        }

        // Digital text noise particles
        if (audioData.beatDetected || this._glitchIntensity > 0.5) {
            const chars = '01アイウエオカキクケコ<>{}[]|/\\ABCDEFXYZ';
            const count = Math.floor(this._glitchIntensity * 12);
            for (let i = 0; i < count; i++) {
                this._glitchTextParticles.push({
                    x: Math.random(),
                    y: Math.random(),
                    char: chars[Math.floor(Math.random() * chars.length)],
                    life: 1.0,
                    decay: 0.05 + Math.random() * 0.1,
                    hue: Math.random() < 0.5 ? this._hue : (this._hue + 180) % 360,
                    size: 10 + Math.random() * 20,
                });
            }
        }
        for (let i = this._glitchTextParticles.length - 1; i >= 0; i--) {
            this._glitchTextParticles[i].life -= this._glitchTextParticles[i].decay;
            if (this._glitchTextParticles[i].life <= 0) this._glitchTextParticles.splice(i, 1);
        }
        if (this._glitchTextParticles.length > 60) this._glitchTextParticles.splice(0, this._glitchTextParticles.length - 60);
    }

    _drawGlitch(ctx, w, h, freq) {
        const s = this.settings;
        const intensity = this._glitchIntensity;
        if (intensity < 0.01) return;

        const bass = this._audioData ? this._audioData.bassLevel : 0;
        const beatDetected = this._audioData ? this._audioData.beatDetected : false;

        // ── 1. Screen Flicker on beat ──
        if (beatDetected && intensity > 0.3) {
            ctx.fillStyle = `rgba(255,255,255,${intensity * 0.06})`;
            ctx.fillRect(0, 0, w, h);
        }

        // ── 2. Horizontal slice displacement ──
        try {
            for (const slice of this._glitchSlices) {
                const sy = Math.floor(slice.y * h);
                const sh = Math.max(1, Math.floor(slice.height * h));
                if (sy + sh > h || sy < 0) continue;
                const imgData = ctx.getImageData(0, sy, w, sh);
                ctx.putImageData(imgData, Math.round(slice.offset), sy);
                // Duplicate with slight vertical shift if double
                if (slice.double && sy + 2 + sh <= h) {
                    ctx.putImageData(imgData, Math.round(slice.offset * 0.5), sy + 2);
                }
            }
        } catch (e) { /* cross-origin safety */ }

        // ── 3. RGB color separation ──
        if (intensity > 0.2) {
            const rgbShift = Math.floor(intensity * 12 * s.sensitivity);
            try {
                const imgFull = ctx.getImageData(0, 0, w, h);
                // Red channel shifted right
                ctx.save();
                ctx.globalAlpha = intensity * 0.25;
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'transparent';
                ctx.putImageData(imgFull, rgbShift, 0);
                // Cyan (G+B) shifted left
                ctx.putImageData(imgFull, -rgbShift, 0);
                ctx.restore();
            } catch (e) { }

            // Simpler overlay approach: color tint rects
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = intensity * 0.08;
            ctx.fillStyle = `rgba(255,0,0,1)`;
            ctx.fillRect(rgbShift, 0, w, h);
            ctx.fillStyle = `rgba(0,255,255,1)`;
            ctx.fillRect(-rgbShift, 0, w, h);
            ctx.restore();
        }

        // ── 4. Scan lines ──
        ctx.save();
        ctx.globalAlpha = 0.04 + intensity * 0.06;
        const scanSpeed = this._glitchTimer * (1 + bass * 3);
        for (let y = 0; y < h; y += 4) {
            if ((Math.floor(y + scanSpeed) % 8) < 4) {
                ctx.fillStyle = 'rgba(0,0,0,1)';
                ctx.fillRect(0, y, w, 2);
            }
        }
        ctx.restore();

        // ── 5. Random block noise ──
        if (intensity > 0.35) {
            const blockCount = Math.floor(intensity * 8 * s.sensitivity);
            ctx.save();
            ctx.globalAlpha = intensity * 0.5;
            for (let i = 0; i < blockCount; i++) {
                const bx = Math.random() * w;
                const by = Math.random() * h;
                const bw = 10 + Math.random() * 80;
                const bh = 4 + Math.random() * 20;
                const blockHue = Math.random() < 0.5 ? this._hue : (this._hue + 150) % 360;
                ctx.fillStyle = hsl(blockHue, 100, 60, 0.7);
                ctx.fillRect(bx, by, bw, bh);
                // Black glitch block
                if (Math.random() < 0.3) {
                    ctx.fillStyle = 'rgba(0,0,0,0.9)';
                    ctx.fillRect(Math.random() * w, Math.random() * h,
                        15 + Math.random() * 60, 2 + Math.random() * 8);
                }
            }
            ctx.restore();
        }

        // ── 6. Digital text noise ──
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (const p of this._glitchTextParticles) {
            ctx.globalAlpha = p.life * intensity * 0.8;
            ctx.font = `bold ${p.size}px monospace`;
            ctx.fillStyle = hsl(p.hue, 100, 70, 1);
            ctx.shadowColor = hsl(p.hue, 100, 60, 0.5);
            ctx.shadowBlur = 8;
            ctx.fillText(p.char, p.x * w, p.y * h);
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── 7. Vignette pulse on beat ──
        if (beatDetected && intensity > 0.4) {
            const vgrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
            vgrad.addColorStop(0, 'transparent');
            vgrad.addColorStop(0.7, 'transparent');
            vgrad.addColorStop(1, `hsla(${this._hue}, 100%, 50%, ${intensity * 0.15})`);
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = vgrad;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }
    }

    // ====== Wind Particles ======
    _updateWind(audioData) {
        const freq = audioData.frequencyData;
        if (!freq) return;
        const bass = audioData.bassLevel;

        // Spawn particles
        const spawnCount = 1 + Math.floor(bass * 3);
        for (let n = 0; n < spawnCount; n++) {
            const freqIdx = Math.floor(Math.random() * freq.length);
            const val = freq[freqIdx] / 255;
            if (val < 0.1) continue;
            this._particles.push({
                x: this.settings.windDirection === 'right' ? -0.5 : 0.5,
                y: (Math.random() - 0.5),
                vx: this.settings.windDirection === 'right'
                    ? 0.002 + Math.random() * 0.006
                    : -(0.002 + Math.random() * 0.006),
                vy: (Math.random() - 0.5) * 0.003,
                size: 2 + val * 6,
                life: 1.0,
                decay: 0.003 + Math.random() * 0.005,
                hue: (this._hue + freqIdx * 2) % 360,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.05,
            });
        }

        // Update
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.x += p.vx;
            p.wobble += p.wobbleSpeed;
            p.y += p.vy + Math.sin(p.wobble) * 0.001;
            p.life -= p.decay;
            if (p.life <= 0 || Math.abs(p.x) > 0.7) this._particles.splice(i, 1);
        }
        if (this._particles.length > 500) this._particles.splice(0, this._particles.length - 500);
    }

    _drawWind(ctx, w, h) {
        for (const p of this._particles) {
            const x = p.x * w;
            const y = p.y * h;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = hsl(p.hue, 100, 70, p.life * 0.7);
            ctx.shadowColor = hsl(p.hue, 100, 60, p.life * 0.3);
            ctx.shadowBlur = 6;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // ====== Simple Particles ======
    _updateParticles(audioData) {
        const freq = audioData.frequencyData;
        if (!freq) return;
        const bass = audioData.bassLevel;
        const s = this.settings;

        if (bass > 0.2) {
            const count = Math.floor(bass * 8);
            for (let n = 0; n < count; n++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5 * bass * s.sensitivity;
                const freqIdx = Math.floor(Math.random() * freq.length);
                this._particles.push({
                    x: 0, y: 0,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 1.5 + Math.random() * 3,
                    life: 1.0,
                    decay: 0.010 + Math.random() * 0.025,
                    hue: (this._hue + freqIdx * 3) % 360,
                    type: Math.random() > 0.5 ? 'circle' : 'spark',
                });
            }
        }

        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.97; p.vy *= 0.97;
            p.life -= p.decay;
            if (p.life <= 0) this._particles.splice(i, 1);
        }
        if (this._particles.length > 600) this._particles.splice(0, this._particles.length - 600);
    }

    _drawParticles(ctx, w, h) {
        for (const p of this._particles) {
            ctx.save();
            const alpha = p.life * 0.85;
            if (p.type === 'spark') {
                // spark: 速度方向に延びる線
                const len = p.size * 3 * p.life;
                const ang = Math.atan2(p.vy || 0, p.vx || 0);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
                ctx.strokeStyle = hsl(p.hue, 100, 80, alpha);
                ctx.lineWidth = p.size * 0.5;
                ctx.shadowColor = hsl(p.hue, 100, 80, alpha * 0.5);
                ctx.shadowBlur = 6;
                ctx.stroke();
            } else {
                // circle: 丸
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = hsl(p.hue, 100, 70, alpha);
                ctx.shadowColor = hsl(p.hue, 100, 70, alpha * 0.5);
                ctx.shadowBlur = 8;
                ctx.fill();
            }
            ctx.restore();
        }
        ctx.shadowBlur = 0;
    }

    // ====== Matrix ======
    _updateMatrix(audioData) {
        const freq = audioData.frequencyData;
        if (!freq) return;
        const cols = 30;
        while (this._matrixColumns.length < cols) {
            this._matrixColumns.push({
                y: -Math.random() * 20,
                speed: 0.2 + Math.random() * 0.5,
                chars: [],
            });
        }
        for (let c = 0; c < cols; c++) {
            const col = this._matrixColumns[c];
            const freqIdx = Math.floor((c / cols) * freq.length);
            const val = freq[freqIdx] / 255;
            col.y += col.speed * (0.5 + val * 2);
            col.brightness = val;
            if (col.y > 30 || Math.random() < 0.01) {
                col.y = -Math.random() * 5;
                col.speed = 0.2 + Math.random() * 0.5;
            }
        }
    }

    _drawMatrix(ctx, w, h) {
        const s = this.settings;
        const cols = this._matrixColumns.length;
        const colW = (w * s.size * 0.8) / cols;
        const charH = 16;
        const startX = -(w * s.size * 0.8) / 2;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>{}[]|/\\';

        ctx.font = `bold ${charH - 2}px monospace`;
        for (let c = 0; c < cols; c++) {
            const col = this._matrixColumns[c];
            const x = startX + c * colW;
            const trailLen = 12;
            for (let r = 0; r < trailLen; r++) {
                const y = (col.y - r) * charH;
                if (y < -h / 2 || y > h / 2) continue;
                const alpha = (1 - r / trailLen) * (0.3 + col.brightness * 0.7);
                const hue = (this._hue + c * 5) % 360;
                ctx.fillStyle = r === 0
                    ? hsl(hue, 60, 95, alpha)
                    : hsl(hue, 100, 60, alpha * 0.6);
                const ch = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(ch, x, y);
            }
        }
    }

    buildSettingsUI(container) {
        const s = this.settings;
        container.appendChild(createSelect('タイプ', SPECTRUM_TYPES, s.type, (v) => {
            s.type = v;
            this._particles = [];
            this._matrixColumns = [];
        }).element);
        container.appendChild(createSlider('サイズ', 0.3, 2, 0.05, s.size, (v) => s.size = v).element);
        container.appendChild(createSlider('X位置', 0, 1, 0.01, this.position.x, (v) => this.position.x = v).element);
        container.appendChild(createSlider('Y位置', 0, 1, 0.01, this.position.y, (v) => this.position.y = v).element);
        container.appendChild(createSlider('回転角度', 0, 6.28, 0.05, s.rotation, (v) => s.rotation = v).element);
        container.appendChild(createSlider('透明度', 0, 1, 0.05, s.opacity, (v) => s.opacity = v).element);
        container.appendChild(createSlider('感度', 0.5, 5, 0.1, s.sensitivity, (v) => s.sensitivity = v).element);
        container.appendChild(createSlider('バー数', 16, 128, 1, s.barCount, (v) => s.barCount = v).element);
        container.appendChild(createToggle('🌈 レインボー', s.rainbow, (v) => s.rainbow = v).element);
        container.appendChild(createSlider('レインボー速度', 0.1, 5, 0.1, s.rainbowSpeed, (v) => s.rainbowSpeed = v).element);
        container.appendChild(createSlider('色相', 0, 360, 1, s.hue, (v) => s.hue = v).element);
        container.appendChild(createSelect('風方向', [
            { value: 'right', label: '→ 右へ' }, { value: 'left', label: '← 左へ' },
        ], s.windDirection, (v) => s.windDirection = v).element);
    }
}
