/* ========================================
   Main Renderer — Animation Loop & Frame Drawing
   ======================================== */
import { state, audioData } from './state.js';
import { analyzeFrame } from './audio.js';

let _moduleManager = null;
let _onFrame = null;

export function initRenderer(moduleManager, onFrame) {
    _moduleManager = moduleManager;
    _onFrame = onFrame;
}

// ====== Background Drawing ======
function drawBackground(ctx, w, h) {
    if (state.videoElement && !state.videoElement.paused) {
        // Video background
        const vw = state.videoElement.videoWidth || w;
        const vh = state.videoElement.videoHeight || h;
        const vRatio = vw / vh;
        const cRatio = w / h;
        let dw, dh, dx, dy;
        if (vRatio > cRatio) { dh = h; dw = h * vRatio; dx = (w - dw) / 2; dy = 0; }
        else { dw = w; dh = w / vRatio; dx = 0; dy = (h - dh) / 2; }
        ctx.drawImage(state.videoElement, dx, dy, dw, dh);
    } else if (state.image) {
        ctx.drawImage(state.image, 0, 0, w, h);
    } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);
    }
}

function drawVignette(ctx, w, h) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

// ====== Main Loop ======
function animate() {
    // Audio analysis
    analyzeFrame();

    // Rainbow cycling
    if (state.settings.fxRainbow) {
        state.settings.rainbowHue = (state.settings.rainbowHue + 0.5) % 360;
    }

    // Update all modules
    _moduleManager.updateAll(audioData);

    // Call external onFrame (for UI updates like progress bar)
    if (_onFrame) _onFrame();

    // Draw
    const ctx = state.ctx;
    const w = state.canvas.width;
    const h = state.canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    drawBackground(ctx, w, h);
    drawVignette(ctx, w, h);

    // Draw all modules
    _moduleManager.drawAll(ctx, w, h);

    ctx.restore();

    state.animFrameId = requestAnimationFrame(animate);
}

export function startLoop() {
    if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
    animate();
}

export function stopLoop() {
    if (state.animFrameId) {
        cancelAnimationFrame(state.animFrameId);
        state.animFrameId = null;
    }
}
