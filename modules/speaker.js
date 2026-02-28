/* ========================================
   Speaker Module — Shape presets, 4-layer cones, cyber donut
   ======================================== */
import { BaseModule } from './base-module.js';
import { drawShapePath, createSlider, createToggle, createSelect, createColorPicker, hsl, clamp } from '../utils/helpers.js';

const SHAPES = [
    { value: 'circle', label: '◯ 円形' },
    { value: 'triangle', label: '△ 三角' },
    { value: 'square', label: '⬜ 四角' },
    { value: 'star', label: '⭐ 星' },
    { value: 'heart', label: '♡ ハート' },
    { value: 'donut', label: '🍩 サイバードーナツ' },
];

const CONE_DEFAULTS = {
    enabled: true,
    size: 0.8,
    stretch: 0.15,
    jitter: 0.5,
    sensitivity: 1.0,
    color: '#a855f7',
    opacity: 0.6,
};

const SPEAKER_DEFAULTS = {
    shape: 'circle',
    size: 0.25,
    scaleX: 1.0,
    scaleY: 1.0,
    rotation: 0,
    rotationSpeed: 0,
    color: '#a855f7',
    rainbow: true,
    rainbowSpeed: 0.5,
    hue: 270,
    saturation: 100,
    stereoMode: 'both', // 'left', 'right', 'both'

    // Cone layers — 2リング（外側 + 内側）
    cones: [
        // 外側リング
        { ...CONE_DEFAULTS, size: 0.82, stretch: 0.55, opacity: 0.85, enabled: true },
        // 内側リング
        { ...CONE_DEFAULTS, size: 0.5, stretch: 0.55, opacity: 0.75, enabled: true },
        { ...CONE_DEFAULTS, size: 0.35, opacity: 0.6, enabled: false },
        { ...CONE_DEFAULTS, size: 0.2, opacity: 0.9, enabled: false },
    ],

    // Vibration
    vibrationSensitivity: 2, // 0=none, 1=weak, 2=mid, 3=strong, 4=extreme

    // Glow
    glow: true,
    glowIntensity: 1.0,

    // Orbit squares
    orbitSquares: true,
    orbitSquareMax: 500,

    // Ring ripple / pulse
    ringRipple: true,

    // Cyber HUD donut extras
    donutGap: 0,
    donutRotationSpeed: 0.008,
    donutPulse: true,
    donutWaveSquares: true,
    donutTextEnabled: true,
    donutRingCount: 3,
};

export class SpeakerModule extends BaseModule {
    constructor() {
        super('speaker', 'Speaker', JSON.parse(JSON.stringify(SPEAKER_DEFAULTS)));
        this._currentRotation = 0;
        this._coneOffsets = [0, 0, 0, 0];
        this._donutAngle = 0;
        this._donutAngle2 = 0;
        this._donutAngle3 = 0;
        this._waveSquares = [];
        this._orbitSquares = [];
        this._hudParticles = [];
        this._beatParticles = [];   // circle / spark type beat particles
        this._ripples = [];  // expanding ring pulses
        this._smoothBass = 0;
        this._smoothBassV = 0;
        this._audioData = null;
    }

    update(audioData) {
        this._audioData = audioData;
        const s = this.settings;
        const bass = s.stereoMode === 'left' ? audioData.bassLevelL
            : s.stereoMode === 'right' ? audioData.bassLevelR
                : audioData.bassLevel;

        // Smooth bass with spring physics
        const targetR = bass * 50;
        const force = (targetR - this._smoothBass) * 0.25;
        this._smoothBassV = (this._smoothBassV + force) * 0.7;
        this._smoothBass += this._smoothBassV;

        // Orbit squares — 毎フレーム連続生成（旧動作）
        if (s.orbitSquares && bass > 0) {
            const freq = audioData.frequencyData;
            const spawnCount = Math.floor(1 + bass * 4);
            for (let n = 0; n < spawnCount; n++) {
                const angle = Math.random() * Math.PI * 2;
                const freqIdx = freq ? Math.floor(Math.random() * freq.length * 0.6) : 0;
                const freqVal = freq ? freq[freqIdx] / 255 : 0.5;
                this._orbitSquares.push({
                    angle: angle,
                    orbitSpeed: 0.005 + Math.random() * 0.02 + bass * 0.01,  // 公転連度（渦巻）
                    dist: 0,
                    outSpeed: 0.5 + freqVal * 2.5 + bass * 1.5,  // 外向き飛翔速度
                    size: 2 + freqVal * 4 + bass * 3,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.3,
                    life: 1.0,
                    decay: 0.003 + Math.random() * 0.004,
                    hue: s.hue + (Math.random() - 0.5) * 80,
                    brightness: 60 + freqVal * 40,
                    twinklePhase: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.1 + Math.random() * 0.2,
                });
            }
        }

        // Update orbit squares — 公転(angle)しながら外向きに飛ぶ
        for (let i = this._orbitSquares.length - 1; i >= 0; i--) {
            const sq = this._orbitSquares[i];
            sq.angle += sq.orbitSpeed;   // 公転（渦巻弧動作）
            sq.dist += sq.outSpeed;      // 外向きに飛ぶ
            sq.outSpeed *= 0.998;        // 徐々に減速
            sq.rotation += sq.rotSpeed;
            sq.twinklePhase += sq.twinkleSpeed;
            sq.life -= sq.decay;
            sq.size *= 0.9995;
            if (sq.life <= 0) this._orbitSquares.splice(i, 1);
        }
        if (this._orbitSquares.length > s.orbitSquareMax) {
            this._orbitSquares.splice(0, this._orbitSquares.length - s.orbitSquareMax);
        }

        // Ring ripple — 旧動作: beat時+毎フレーム確率ベース
        if (s.ringRipple) {
            if (audioData.beatDetected) {
                // ビート橋に必ず生成
                this._ripples.push({
                    radius: 0,
                    speed: 8 + bass * 10,
                    life: 1.0,
                    decay: 0.006 + bass * 0.002,
                    hue: s.hue,
                    lineWidth: 2.5 + bass * 3,
                });
            } else if (bass > 0.2 && Math.random() < bass * 0.12) {
                // bassが高い時は毎フレームの確率で追加生成（波が連続する）
                this._ripples.push({
                    radius: 0,
                    speed: 4 + bass * 6,
                    life: 0.7,
                    decay: 0.010 + bass * 0.003,
                    hue: s.hue,
                    lineWidth: 1.5 + bass * 2,
                });
            }
        }

        // Update ripples — 速度ほぼ維持、lifeが尽きるまで拡大
        for (let i = this._ripples.length - 1; i >= 0; i--) {
            const r = this._ripples[i];
            r.radius += r.speed;
            // 減速なし (0.999 ≒ 等速)
            r.life -= r.decay;
            r.lineWidth *= 0.985;
            if (r.life <= 0) this._ripples.splice(i, 1);
        }
        if (this._ripples.length > 20) this._ripples.splice(0, this._ripples.length - 20);

        // Rotation
        this._currentRotation += s.rotationSpeed * 0.02;

        // Rainbow
        if (s.rainbow) {
            s.hue = (s.hue + s.rainbowSpeed) % 360;
        }

        // Cone vibration
        const sensMultiplier = [0, 0.3, 0.7, 1.2, 2.5][s.vibrationSensitivity] || 0.7;
        for (let i = 0; i < 4; i++) {
            if (s.cones[i].enabled) {
                const cSens = s.cones[i].sensitivity * sensMultiplier;
                const vibration = bass * cSens + (s.cones[i].jitter > 0 ? (Math.random() - 0.5) * s.cones[i].jitter * 0.02 : 0);
                this._coneOffsets[i] += (vibration - this._coneOffsets[i]) * 0.4;
            }
        }

        // Donut rotation (multi-ring, counter-rotating)
        if (s.shape === 'donut') {
            this._donutAngle += s.donutRotationSpeed;
            this._donutAngle2 -= s.donutRotationSpeed * 0.7;
            this._donutAngle3 += s.donutRotationSpeed * 1.5;

            // Spawn HUD particles on beat
            if (audioData.beatDetected && s.donutWaveSquares) {
                for (let n = 0; n < 4 + Math.floor(bass * 8); n++) {
                    const angle = Math.random() * Math.PI * 2;
                    this._hudParticles.push({
                        angle: angle,
                        dist: 0,
                        speed: 1.2 + Math.random() * 2.5 + bass * 2,
                        size: 1.5 + Math.random() * 3,
                        life: 1.0,
                        decay: 0.01 + Math.random() * 0.015,
                        hue: s.hue + (Math.random() < 0.5 ? 0 : 180),
                        fromInner: Math.random() < 0.5,
                    });
                }
            }
            // Update HUD particles
            for (let i = this._hudParticles.length - 1; i >= 0; i--) {
                const p = this._hudParticles[i];
                p.dist += p.speed;
                p.life -= p.decay;
                if (p.life <= 0) this._hudParticles.splice(i, 1);
            }
            if (this._hudParticles.length > 200) this._hudParticles.splice(0, this._hudParticles.length - 200);
        }
    }

    draw(ctx, w, h) {
        const s = this.settings;
        const cx = this.position.x * w;
        const cy = this.position.y * h;
        const baseRadius = Math.min(w, h) * s.size + this._smoothBass;
        const hue = s.hue;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._currentRotation);
        ctx.scale(s.scaleX, s.scaleY);

        if (s.shape === 'donut') {
            this._drawDonut(ctx, baseRadius, hue, w, h);
        } else {
            this._drawStandardSpeaker(ctx, baseRadius, hue);
        }

        ctx.restore();

        // Beat particles — spawn from ring edge, fly outward (screen space)
        {
            const adBeat = this._audioData && this._audioData.beatDetected;
            const bass = this._audioData ? this._audioData.bassLevel : 0;

            if (adBeat) {
                const count = 15 + Math.floor(bass * 25);
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 2 + Math.random() * 5 * bass;
                    this._beatParticles.push({
                        x: cx + Math.cos(angle) * baseRadius,
                        y: cy + Math.sin(angle) * baseRadius,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 1.5 + Math.random() * 3,
                        life: 1.0,
                        decay: 0.010 + Math.random() * 0.025,
                        hue: hue + (Math.random() - 0.5) * 60,
                        type: Math.random() > 0.5 ? 'circle' : 'spark',
                    });
                }
            }

            // Update
            for (let i = this._beatParticles.length - 1; i >= 0; i--) {
                const p = this._beatParticles[i];
                p.x += p.vx; p.y += p.vy;
                p.vx *= 0.97; p.vy *= 0.97;
                p.life -= p.decay;
                if (p.life <= 0) this._beatParticles.splice(i, 1);
            }
            if (this._beatParticles.length > 600) this._beatParticles.splice(0, this._beatParticles.length - 600);

            // Draw
            for (const p of this._beatParticles) {
                ctx.save();
                const alpha = p.life * 0.85;
                if (p.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                    ctx.fillStyle = hsl(p.hue, 100, 70, alpha);
                    ctx.shadowColor = hsl(p.hue, 100, 70, alpha * 0.5);
                    ctx.shadowBlur = 8;
                    ctx.fill();
                } else {
                    const len = p.size * 3 * p.life;
                    const ang = Math.atan2(p.vy, p.vx);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
                    ctx.strokeStyle = hsl(p.hue, 100, 80, alpha);
                    ctx.lineWidth = p.size * 0.5;
                    ctx.shadowColor = hsl(p.hue, 100, 80, alpha * 0.5);
                    ctx.shadowBlur = 6;
                    ctx.stroke();
                }
                ctx.restore();
            }
            ctx.shadowBlur = 0;
        }

        // Draw orbit squares (outside transform so they fly in screen space)
        if (s.orbitSquares) {
            this._drawOrbitSquares(ctx, cx, cy, baseRadius);
        }

        // Draw ripples (screen space, no clip → expand beyond canvas)
        if (s.ringRipple && this._ripples.length > 0) {
            this._drawRipples(ctx, cx, cy);
        }
    }

    _drawRipples(ctx, cx, cy) {
        const s = this.settings;
        for (const r of this._ripples) {
            ctx.save();
            ctx.strokeStyle = hsl(r.hue, 100, 72, r.life * 0.85);
            ctx.lineWidth = r.lineWidth;
            ctx.shadowColor = hsl(r.hue, 100, 65, r.life * 0.5);
            ctx.shadowBlur = 12 * s.glowIntensity;
            ctx.beginPath();
            ctx.arc(cx, cy, r.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        ctx.shadowBlur = 0;
    }

    _drawOrbitSquares(ctx, cx, cy, baseRadius) {
        for (const sq of this._orbitSquares) {
            const x = cx + Math.cos(sq.angle) * sq.dist;
            const y = cy + Math.sin(sq.angle) * sq.dist;
            const twinkle = 0.5 + 0.5 * Math.sin(sq.twinklePhase);
            const alpha = sq.life * twinkle;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(sq.rotation);

            // Glow
            ctx.shadowColor = hsl(sq.hue, 100, 60, alpha * 0.6);
            ctx.shadowBlur = 8 + sq.size;

            // Square shape
            ctx.fillStyle = hsl(sq.hue, 100, 75, alpha * 0.9);
            const half = sq.size / 2;
            ctx.fillRect(-half, -half, sq.size, sq.size);

            ctx.restore();
        }
        ctx.shadowBlur = 0;
    }

    _drawStandardSpeaker(ctx, baseRadius, hue) {
        const s = this.settings;

        // Outer glow
        if (s.glow) {
            const glowR = baseRadius * 1.3;
            const grad = ctx.createRadialGradient(0, 0, baseRadius * 0.5, 0, 0, glowR);
            grad.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.08 * s.glowIntensity})`);
            grad.addColorStop(1, `hsla(${hue}, 100%, 30%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Outer ring
        ctx.strokeStyle = hsl(hue, s.saturation, 70, 0.9);
        ctx.lineWidth = 3 + this._smoothBass * 0.05;
        ctx.shadowColor = hsl(hue, 100, 60, 0.5);
        ctx.shadowBlur = 15 * s.glowIntensity;
        drawShapePath(ctx, 0, 0, baseRadius, s.shape, 0);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Cone layers — リングスタイル（fillは極小・ strokeを太く际立てる）
        for (let i = 0; i < 4; i++) {
            const cone = s.cones[i];
            if (!cone.enabled) continue;

            // ストレッチは bassに応じて大きく伸縮
            const coneRadius = baseRadius * cone.size * (1 + this._coneOffsets[i] * cone.stretch);
            const coneHue = s.rainbow ? (hue + i * 40) % 360 : s.hue;

            ctx.save();

            // Fill: 極小のラジアルグラデーション（輪郭の存在感を残す）
            const grad = ctx.createRadialGradient(0, 0, coneRadius * 0.5, 0, 0, coneRadius);
            const fillAlpha = s.rainbow ? 0.06 : 0.05;
            grad.addColorStop(0, `hsla(${coneHue}, 100%, 60%, ${fillAlpha * 2})`);
            grad.addColorStop(1, `hsla(${coneHue}, 100%, 40%, 0)`);
            ctx.fillStyle = grad;
            ctx.globalAlpha = cone.opacity;
            drawShapePath(ctx, 0, 0, coneRadius, s.shape, 0);
            ctx.fill();

            // Stroke: クリアなリング線
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = hsl(coneHue, s.saturation, 72, cone.opacity);
            ctx.lineWidth = 2.5 + (i === 0 ? 1 : 0); // 外側は少し太め
            ctx.shadowColor = hsl(coneHue, 100, 65, 0.6);
            ctx.shadowBlur = 12 * s.glowIntensity;
            drawShapePath(ctx, 0, 0, coneRadius, s.shape, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.restore();
        }

        // Center dot
        const dotR = baseRadius * 0.08;
        ctx.beginPath();
        ctx.arc(0, 0, dotR, 0, Math.PI * 2);
        ctx.fillStyle = hsl(hue, 100, 80, 0.8);
        ctx.fill();
    }

    _drawDonut(ctx, baseRadius, hue, w, h) {
        const s = this.settings;
        const bass = this._audioData ? this._audioData.bassLevel : 0;
        const pulseScale = s.donutPulse ? 1 + this._smoothBass * 0.002 : 1;
        const freq = this._audioData ? this._audioData.frequencyData : null;

        ctx.save();
        ctx.scale(pulseScale, pulseScale);

        // ── Radii for multi-ring system ──
        const R1 = baseRadius;               // outer ring
        const R2 = baseRadius * 0.78;         // mid ring
        const R3 = baseRadius * 0.55;         // inner ring
        const Rc = baseRadius * 0.22;         // center mini ring

        // ── Ambient inner glow ──
        const ambGrad = ctx.createRadialGradient(0, 0, Rc, 0, 0, R1);
        ambGrad.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.12 + bass * 0.1})`);
        ambGrad.addColorStop(0.5, `hsla(${(hue + 30) % 360}, 100%, 50%, 0.04)`);
        ambGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = ambGrad;
        ctx.beginPath();
        ctx.arc(0, 0, R1, 0, Math.PI * 2);
        ctx.fill();

        // ── Helper: draw segmented ring ──
        const drawSegRing = (radius, thickness, segments, gapFrac, angle, color, glowColor, glowBlur) => {
            const TAU = Math.PI * 2;
            const segArc = (TAU / segments) * (1 - gapFrac);
            const gapArc = (TAU / segments) * gapFrac;
            ctx.lineWidth = thickness;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = glowBlur;
            ctx.strokeStyle = color;
            for (let i = 0; i < segments; i++) {
                const start = angle + i * (segArc + gapArc);
                ctx.beginPath();
                ctx.arc(0, 0, radius, start, start + segArc);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        };

        // ── RING 1: outer — thick cyan segments ──
        const r1Segs = 6;
        drawSegRing(
            R1, 4 + bass * 4, r1Segs, 0.06,
            this._donutAngle,
            hsl(hue, 100, 75, 0.9),
            hsl(hue, 100, 65, 0.8), 20 * s.glowIntensity
        );

        // ── RING 1b: outer fill band ──
        ctx.lineWidth = 12 + bass * 6;
        ctx.strokeStyle = hsl(hue, 80, 50, 0.15);
        ctx.beginPath();
        ctx.arc(0, 0, R1, 0, Math.PI * 2);
        ctx.stroke();

        // ── RING 2: mid — thin counter-rotating segments (red/magenta accent) ──
        const accentHue = (hue + 150) % 360;
        drawSegRing(
            R2, 2.5, 12, 0.3,
            this._donutAngle2,
            hsl(accentHue, 100, 70, 0.85),
            hsl(accentHue, 100, 60, 0.6), 12 * s.glowIntensity
        );

        // ── RING 2b: frequency-reactive bars on ring 2 ──
        if (freq) {
            const barCount = 64;
            const TAU = Math.PI * 2;
            ctx.save();
            ctx.rotate(this._donutAngle2);
            for (let i = 0; i < barCount; i++) {
                const fIdx = Math.floor(i * freq.length / barCount);
                const val = (freq[fIdx] || 0) / 255 * s.sensitivity || 0.01;
                if (val < 0.05) continue;
                const angle = (i / barCount) * TAU;
                const barLen = val * baseRadius * 0.18;
                const barHue = (hue + i * (360 / barCount)) % 360;
                ctx.save();
                ctx.rotate(angle);
                ctx.fillStyle = hsl(barHue, 100, 70, val * 0.7);
                ctx.shadowColor = hsl(barHue, 100, 60, val * 0.4);
                ctx.shadowBlur = 6;
                // bar from ring outward
                ctx.fillRect(-1, -(R2 + barLen), 2, barLen);
                ctx.restore();
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ── RING 3: inner glow ring ──
        drawSegRing(
            R3, 2, 24, 0.35,
            this._donutAngle3,
            hsl(hue, 60, 90, 0.6),
            hsl(hue, 100, 80, 0.4), 8 * s.glowIntensity
        );

        // ── TICK MARKS on R1 ──
        const tickCount = 72;
        ctx.save();
        ctx.rotate(this._donutAngle);
        for (let i = 0; i < tickCount; i++) {
            const angle = (i / tickCount) * Math.PI * 2;
            const isMajor = i % 6 === 0;
            const tickLen = isMajor ? 10 : 5;
            const alpha = isMajor ? (0.8 + bass * 0.2) : 0.3;
            ctx.save();
            ctx.rotate(angle);
            ctx.strokeStyle = hsl(hue, isMajor ? 100 : 60, isMajor ? 90 : 70, alpha);
            ctx.lineWidth = isMajor ? 2 : 1;
            ctx.shadowColor = isMajor ? hsl(hue, 100, 80, 0.5) : 'transparent';
            ctx.shadowBlur = isMajor ? 6 : 0;
            ctx.beginPath();
            ctx.moveTo(0, -(R1 - 6));
            ctx.lineTo(0, -(R1 - 6 - tickLen));
            ctx.stroke();
            ctx.restore();
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── HUD TEXT along ring R1 ──
        if (s.donutTextEnabled) {
            const texts = [
                'DATA ANALYTICS // NETWORK LINK // R.I.N.G. V7.1',
                'SYSTEM STATUS: ACTIVE // NODE 07A // ENCRYPTION: LEVEL 9 // SYNCING...',
            ];
            ctx.save();
            ctx.font = `${Math.max(8, baseRadius * 0.045)}px monospace`;
            ctx.fillStyle = hsl(hue, 80, 80, 0.55);
            ctx.textAlign = 'center';
            const textR = R1 + 16;
            const text = texts[0];
            const charCount = text.length;
            const anglePerChar = (Math.PI * 2) / charCount;
            for (let i = 0; i < charCount; i++) {
                const charAngle = this._donutAngle * 0.3 + i * anglePerChar - Math.PI / 2;
                ctx.save();
                ctx.rotate(charAngle);
                ctx.translate(0, -textR);
                ctx.rotate(Math.PI / 2);
                ctx.fillText(text[i], 0, 0);
                ctx.restore();
            }
            // Inner text (counter-rotating)
            ctx.fillStyle = hsl(accentHue, 80, 75, 0.45);
            ctx.font = `${Math.max(7, baseRadius * 0.038)}px monospace`;
            const text2 = texts[1];
            const charCount2 = text2.length;
            const anglePerChar2 = (Math.PI * 2) / charCount2;
            for (let i = 0; i < charCount2; i++) {
                const charAngle = -this._donutAngle * 0.2 + i * anglePerChar2 - Math.PI / 2;
                ctx.save();
                ctx.rotate(charAngle);
                ctx.translate(0, -(R1 - 22));
                ctx.rotate(Math.PI / 2);
                ctx.fillText(text2[i], 0, 0);
                ctx.restore();
            }
            ctx.restore();
        }

        // ── CENTER MINI HUD ──
        // Outer mini ring
        ctx.lineWidth = 3;
        ctx.strokeStyle = hsl(hue, 100, 75, 0.7);
        ctx.shadowColor = hsl(hue, 100, 65, 0.5);
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, Rc, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner mini ring (counter-rotating segments)
        drawSegRing(
            Rc * 0.6, 2, 4, 0.2,
            -this._donutAngle3 * 2,
            hsl(accentHue, 100, 70, 0.8),
            hsl(accentHue, 100, 60, 0.5), 8
        );

        // Center dot
        const dotPulse = Rc * 0.25 * (1 + bass * 0.5);
        const dotGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, dotPulse);
        dotGrad.addColorStop(0, hsl(hue, 100, 95, 0.9));
        dotGrad.addColorStop(1, hsl(hue, 100, 60, 0));
        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.arc(0, 0, dotPulse, 0, Math.PI * 2);
        ctx.fill();

        // ── HUD PARTICLES ──
        for (const p of this._hudParticles) {
            const baseR = p.fromInner ? Rc : R2;
            const x = Math.cos(p.angle) * (baseR + p.dist);
            const y = Math.sin(p.angle) * (baseR + p.dist);
            ctx.beginPath();
            ctx.arc(x, y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = hsl(p.hue, 100, 75, p.life * 0.8);
            ctx.shadowColor = hsl(p.hue, 100, 65, p.life * 0.5);
            ctx.shadowBlur = 6;
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    buildSettingsUI(container) {
        const s = this.settings;

        // Shape
        createSelect('形状', SHAPES, s.shape, (v) => { s.shape = v; }).element
            && container.appendChild(createSelect('形状', SHAPES, s.shape, (v) => { s.shape = v; }).element);

        // Size & position
        container.appendChild(createSlider('サイズ', 0.05, 0.6, 0.01, s.size, (v) => s.size = v).element);
        container.appendChild(createSlider('X位置', 0, 1, 0.01, this.position.x, (v) => this.position.x = v).element);
        container.appendChild(createSlider('Y位置', 0, 1, 0.01, this.position.y, (v) => this.position.y = v).element);
        container.appendChild(createSlider('横伸縮', 0.3, 3, 0.05, s.scaleX, (v) => s.scaleX = v).element);
        container.appendChild(createSlider('縦伸縮', 0.3, 3, 0.05, s.scaleY, (v) => s.scaleY = v).element);
        container.appendChild(createSlider('回転角度', 0, 6.28, 0.05, s.rotation, (v) => { s.rotation = v; this._currentRotation = v; }).element);
        container.appendChild(createSlider('回転速度', 0, 5, 0.1, s.rotationSpeed, (v) => s.rotationSpeed = v).element);

        // Vibration
        container.appendChild(createSelect('振動感度', [
            { value: '0', label: '無振動' }, { value: '1', label: '弱' }, { value: '2', label: '中' },
            { value: '3', label: '強' }, { value: '4', label: '過激' },
        ], String(s.vibrationSensitivity), (v) => s.vibrationSensitivity = parseInt(v)).element);

        // Stereo mode
        container.appendChild(createSelect('チャンネル', [
            { value: 'both', label: 'ミックス' }, { value: 'left', label: 'Lチャンネル' }, { value: 'right', label: 'Rチャンネル' },
        ], s.stereoMode, (v) => s.stereoMode = v).element);

        // Color
        container.appendChild(createToggle('🌈 レインボー', s.rainbow, (v) => s.rainbow = v).element);
        container.appendChild(createSlider('レインボー速度', 0.1, 5, 0.1, s.rainbowSpeed, (v) => s.rainbowSpeed = v).element);
        container.appendChild(createSlider('色相', 0, 360, 1, s.hue, (v) => s.hue = v).element);
        container.appendChild(createToggle('グロー', s.glow, (v) => s.glow = v).element);
        container.appendChild(createSlider('グロー強度', 0, 3, 0.1, s.glowIntensity, (v) => s.glowIntensity = v).element);

        // Orbit squares
        container.appendChild(createToggle('⬜ 渦巻き四角パーティクル', s.orbitSquares, (v) => s.orbitSquares = v).element);

        // Cone layers
        const coneSection = document.createElement('div');
        coneSection.innerHTML = '<h4 style="color:#06b6d4;font-size:0.7rem;margin:8px 0 4px;letter-spacing:0.1em;">コーンレイヤー</h4>';
        for (let i = 0; i < 4; i++) {
            const cone = s.cones[i];
            const coneDiv = document.createElement('div');
            coneDiv.style.cssText = 'border-left:2px solid rgba(6,182,212,0.3);padding-left:8px;margin-bottom:6px;';
            coneDiv.appendChild(createToggle(`コーン ${i + 1}`, cone.enabled, (v) => cone.enabled = v).element);
            coneDiv.appendChild(createSlider('サイズ', 0.1, 1, 0.05, cone.size, (v) => cone.size = v).element);
            coneDiv.appendChild(createSlider('伸縮幅', 0, 1, 0.05, cone.stretch, (v) => cone.stretch = v).element);
            coneDiv.appendChild(createSlider('揺れ幅', 0, 2, 0.1, cone.jitter, (v) => cone.jitter = v).element);
            coneDiv.appendChild(createSlider('感度', 0, 3, 0.1, cone.sensitivity, (v) => cone.sensitivity = v).element);
            coneDiv.appendChild(createSlider('透明度', 0, 1, 0.05, cone.opacity, (v) => cone.opacity = v).element);
            coneDiv.appendChild(createColorPicker('色', cone.color, (v) => cone.color = v).element);
            coneSection.appendChild(coneDiv);
        }
        container.appendChild(coneSection);

        // Donut extras (shown conditionally)
        const donutSection = document.createElement('div');
        donutSection.innerHTML = '<h4 style="color:#06b6d4;font-size:0.7rem;margin:8px 0 4px;letter-spacing:0.1em;">🛸 サイバーHUD設定</h4>';
        donutSection.appendChild(createSlider('回転速度', 0, 0.05, 0.001, s.donutRotationSpeed, (v) => s.donutRotationSpeed = v).element);
        donutSection.appendChild(createToggle('脈動', s.donutPulse, (v) => s.donutPulse = v).element);
        donutSection.appendChild(createToggle('パーティクル', s.donutWaveSquares, (v) => s.donutWaveSquares = v).element);
        donutSection.appendChild(createToggle('テキスト表示', s.donutTextEnabled, (v) => s.donutTextEnabled = v).element);
        container.appendChild(donutSection);
    }
}
