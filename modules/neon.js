/* ========================================
   Neon Module — Text/PNG/Outline neon effects
   ======================================== */
import { BaseModule } from './base-module.js';
import { createSlider, createToggle, createSelect, createColorPicker, hsl } from '../utils/helpers.js';

const NEON_TYPES = [
    { value: 'text', label: '📝 テキスト' },
    { value: 'png', label: '🖼 透過PNG' },
];

const DEFAULTS = {
    neonType: 'text',
    text: 'BASS DROP',
    fontFamily: 'Orbitron',
    fontSize: 48,
    size: 1.0,
    color: '#a855f7',
    rainbow: true,
    rainbowSpeed: 0.5,
    hue: 270,
    glowIntensity: 2.0,
    opacity: 1.0,
    flicker: false,
    flickerRate: 0.03,
    sparks: false,
    sparkCount: 3,
    rotation: 0,
    // PNG ripples
    pngRipple: true,
};

const FONTS = [
    { value: 'Orbitron', label: 'Orbitron' },
    { value: 'Impact', label: 'Impact' },
    { value: 'Arial Black', label: 'Arial Black' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Noto Sans JP', label: 'Noto Sans JP' },
];

export class NeonModule extends BaseModule {
    constructor() {
        super('neon', 'Neon', JSON.parse(JSON.stringify(DEFAULTS)));
        this._hue = 270;
        this._flickerOn = true;
        this._flickerTimer = 0;
        this._sparks = [];
        this._pngImage = null;
        this._pngRipples = [];   // PNG波紋リスト
        this._audioData = null;
    }

    update(audioData) {
        this._audioData = audioData;
        const s = this.settings;
        if (s.rainbow) this._hue = (this._hue + s.rainbowSpeed) % 360;
        else this._hue = s.hue;

        // Flicker
        if (s.flicker) {
            this._flickerTimer++;
            if (Math.random() < s.flickerRate) {
                this._flickerOn = !this._flickerOn;
            }
            if (this._flickerTimer % 10 === 0) this._flickerOn = true;
        } else {
            this._flickerOn = true;
        }

        // Sparks
        if (s.sparks && s.flicker && !this._flickerOn) {
            for (let i = 0; i < s.sparkCount; i++) {
                this._sparks.push({
                    x: (Math.random() - 0.5) * 50,
                    y: (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 3,
                    vy: Math.random() * -3 - 1,
                    life: 1.0,
                    hue: this._hue + (Math.random() - 0.5) * 40,
                });
            }
        }

        // Update sparks
        for (let i = this._sparks.length - 1; i >= 0; i--) {
            const sp = this._sparks[i];
            sp.x += sp.vx; sp.y += sp.vy;
            sp.vy += 0.15;
            sp.life -= 0.04;
            if (sp.life <= 0) this._sparks.splice(i, 1);
        }
        if (this._sparks.length > 50) this._sparks.splice(0, this._sparks.length - 50);

        // PNG ripples — beat時+bass確率ベースで頻度増加
        if (s.pngRipple) {
            const bass = audioData.bassLevel;
            if (audioData.beatDetected) {
                this._pngRipples.push({
                    radius: 0,
                    speed: 6 + bass * 8,
                    life: 1.0,
                    decay: 0.014 + bass * 0.006,
                    lineWidth: 2.5 + bass * 2,
                    hue: this._hue,
                });
            } else if (bass > 0.25 && Math.random() < bass * 0.1) {
                // bass高い時は毎フレーム確率で追加生成
                this._pngRipples.push({
                    radius: 0,
                    speed: 4 + bass * 5,
                    life: 0.75,
                    decay: 0.020 + bass * 0.005,
                    lineWidth: 1.5 + bass * 1.5,
                    hue: this._hue,
                });
            }
        }

        // Update PNG ripples
        for (let i = this._pngRipples.length - 1; i >= 0; i--) {
            const r = this._pngRipples[i];
            r.radius += r.speed;
            r.life -= r.decay;
            r.lineWidth *= 0.97;
            if (r.life <= 0) this._pngRipples.splice(i, 1);
        }
        if (this._pngRipples.length > 15) this._pngRipples.splice(0, this._pngRipples.length - 15);
    }

    draw(ctx, w, h) {
        const s = this.settings;
        const cx = this.position.x * w;
        const cy = this.position.y * h;

        // Ripples — flickerの状態に関わらず常に描画
        if (s.pngRipple && this._pngRipples.length > 0) {
            this._drawPNGRipples(ctx, cx, cy);
        }

        if (!this._flickerOn) {
            this._drawSparks(ctx, w, h);
            return;
        }

        ctx.save();
        ctx.globalAlpha = s.opacity;
        ctx.translate(cx, cy);
        ctx.rotate(s.rotation);

        if (s.neonType === 'text') {
            this._drawText(ctx);
        } else if (s.neonType === 'png' && this._pngImage) {
            this._drawPNG(ctx);
        }

        ctx.restore();

        // Sparks
        this._drawSparks(ctx, w, h);
    }

    _drawText(ctx) {
        const s = this.settings;
        const hue = this._hue;
        const color = s.rainbow ? hsl(hue, 100, 70) : s.color;

        ctx.font = `900 ${s.fontSize * s.size}px '${s.fontFamily}', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Multi-layer glow
        for (let layer = 3; layer >= 0; layer--) {
            ctx.shadowColor = s.rainbow
                ? hsl(hue, 100, 60, 0.4 + layer * 0.1)
                : s.color;
            ctx.shadowBlur = (4 + layer * 8) * s.glowIntensity;
            ctx.strokeStyle = s.rainbow ? hsl(hue, 100, 80, 0.3) : s.color + '4d';
            ctx.lineWidth = 3 - layer * 0.5;
            if (layer > 0) ctx.strokeText(s.text, 0, 0);
        }

        // Core text
        ctx.shadowBlur = 15 * s.glowIntensity;
        ctx.shadowColor = s.rainbow ? hsl(hue, 100, 60, 0.8) : s.color;
        ctx.fillStyle = s.rainbow ? hsl(hue, 60, 95) : '#fff';
        ctx.fillText(s.text, 0, 0);
        ctx.shadowBlur = 0;
    }

    _drawPNG(ctx) {
        const s = this.settings;
        const img = this._pngImage;
        const scale = s.size * 0.5;
        const dw = img.width * scale;
        const dh = img.height * scale;

        // Glow layers
        ctx.shadowColor = s.rainbow ? hsl(this._hue, 100, 60, 0.6) : s.color;
        ctx.shadowBlur = 20 * s.glowIntensity;
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

        // Second pass for stronger glow
        ctx.globalAlpha = 0.4;
        ctx.shadowBlur = 40 * s.glowIntensity;
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.shadowBlur = 0;
    }

    _drawPNGRipples(ctx, cx, cy) {
        const s = this.settings;
        for (const r of this._pngRipples) {
            ctx.save();
            // easeOut: lifeが高い時に明るく、外側に向かってフェードアウト
            ctx.strokeStyle = hsl(r.hue, 100, 72, r.life * 0.8);
            ctx.lineWidth = r.lineWidth;
            ctx.shadowColor = hsl(r.hue, 100, 65, r.life * 0.4);
            ctx.shadowBlur = 10 * s.glowIntensity;
            ctx.beginPath();
            ctx.arc(cx, cy, r.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        ctx.shadowBlur = 0;
    }

    _drawSparks(ctx, w, h) {
        const cx = this.position.x * w;
        const cy = this.position.y * h;
        for (const sp of this._sparks) {
            ctx.beginPath();
            ctx.arc(cx + sp.x, cy + sp.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = hsl(sp.hue, 100, 80, sp.life);
            ctx.shadowColor = hsl(sp.hue, 100, 60, sp.life * 0.5);
            ctx.shadowBlur = 4;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    /** Load a PNG image for neon outline */
    loadPNG(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this._pngImage = img;
                    resolve();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    buildSettingsUI(container) {
        const s = this.settings;
        container.appendChild(createSelect('タイプ', NEON_TYPES, s.neonType, (v) => s.neonType = v).element);

        // Text input
        const textGroup = document.createElement('div');
        textGroup.className = 'slider-group';
        const textLabel = document.createElement('label');
        textLabel.textContent = 'テキスト';
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = s.text;
        textInput.style.cssText = 'flex:1;padding:4px 8px;background:rgba(255,255,255,0.1);color:#e2e8f0;border:1px solid rgba(255,255,255,0.2);border-radius:6px;font-size:0.8rem;';
        textInput.addEventListener('input', () => s.text = textInput.value);
        textGroup.append(textLabel, textInput);
        container.appendChild(textGroup);

        container.appendChild(createSelect('フォント', FONTS, s.fontFamily, (v) => s.fontFamily = v).element);
        container.appendChild(createSlider('文字サイズ', 12, 120, 1, s.fontSize, (v) => s.fontSize = v).element);

        // PNG upload
        const pngGroup = document.createElement('div');
        pngGroup.className = 'slider-group';
        const pngLabel = document.createElement('label');
        pngLabel.textContent = 'PNG';
        const pngInput = document.createElement('input');
        pngInput.type = 'file';
        pngInput.accept = 'image/png';
        pngInput.style.cssText = 'flex:1;font-size:0.7rem;color:#94a3b8;';
        pngInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.loadPNG(e.target.files[0]);
        });
        pngGroup.append(pngLabel, pngInput);
        container.appendChild(pngGroup);

        // PNG ripple toggle
        container.appendChild(createToggle('💧 PNG波紋', s.pngRipple, (v) => s.pngRipple = v).element);

        // Common settings
        container.appendChild(createSlider('サイズ', 0.2, 3, 0.05, s.size, (v) => s.size = v).element);
        container.appendChild(createSlider('X位置', 0, 1, 0.01, this.position.x, (v) => this.position.x = v).element);
        container.appendChild(createSlider('Y位置', 0, 1, 0.01, this.position.y, (v) => this.position.y = v).element);
        container.appendChild(createSlider('回転角度', 0, 6.28, 0.05, s.rotation, (v) => s.rotation = v).element);
        container.appendChild(createSlider('透明度', 0, 1, 0.05, s.opacity, (v) => s.opacity = v).element);
        container.appendChild(createSlider('グロー強度', 0, 5, 0.1, s.glowIntensity, (v) => s.glowIntensity = v).element);

        // Color
        container.appendChild(createToggle('🌈 レインボー', s.rainbow, (v) => s.rainbow = v).element);
        container.appendChild(createSlider('レインボー速度', 0.1, 5, 0.1, s.rainbowSpeed, (v) => s.rainbowSpeed = v).element);
        container.appendChild(createColorPicker('色', s.color, (v) => s.color = v).element);

        // Flicker & Sparks
        container.appendChild(createToggle('⚡ 点滅', s.flicker, (v) => s.flicker = v).element);
        container.appendChild(createSlider('点滅レート', 0.01, 0.15, 0.01, s.flickerRate, (v) => s.flickerRate = v).element);
        container.appendChild(createToggle('✨ 火花', s.sparks, (v) => s.sparks = v).element);
    }
}
