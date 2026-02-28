/* ========================================
   Utility Helpers
   ======================================== */

let _idCounter = 0;
export function uid() { return `mod_${++_idCounter}_${Date.now().toString(36)}`; }

export function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function lerp(a, b, t) { return a + (b - a) * t; }

export function hsl(h, s = 100, l = 70, a = 1) {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

// Draw a shape path (used by speakers)
export function drawShapePath(ctx, cx, cy, radius, shape, rotation = 0) {
    ctx.beginPath();
    switch (shape) {
        case 'circle':
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            break;
        case 'triangle':
            for (let i = 0; i < 3; i++) {
                const angle = rotation + (i / 3) * Math.PI * 2 - Math.PI / 2;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            break;
        case 'square':
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            const half = radius * 0.85;
            ctx.rect(-half, -half, half * 2, half * 2);
            ctx.restore();
            break;
        case 'star': {
            const spikes = 5;
            const innerRadius = radius * 0.45;
            for (let i = 0; i < spikes * 2; i++) {
                const angle = rotation + (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 === 0 ? radius : innerRadius;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            break;
        }
        case 'heart': {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            const r = radius * 0.85;
            const dy = r * 0.05;
            // 上中央の谷から時計回り
            ctx.moveTo(0, -r * 0.3 - dy);
            // 右バンプ
            ctx.bezierCurveTo(r * 0.2, -r - dy, r, -r - dy, r, -r * 0.3 - dy);
            // 右下→底の尖り
            ctx.bezierCurveTo(r, r * 0.3 - dy, r * 0.5, r * 0.65 - dy, 0, r - dy);
            // 底→左下
            ctx.bezierCurveTo(-r * 0.5, r * 0.65 - dy, -r, r * 0.3 - dy, -r, -r * 0.3 - dy);
            // 左バンプ→谷へ
            ctx.bezierCurveTo(-r, -r - dy, -r * 0.2, -r - dy, 0, -r * 0.3 - dy);
            ctx.closePath();
            ctx.restore();
            break;
        }
        case 'donut':
            // Donut is drawn separately by cyber-donut code
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            break;
        default:
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    }
}

// Create a slider UI element
export function createSlider(label, min, max, step, value, onChange) {
    const group = document.createElement('div');
    group.className = 'slider-group';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step; input.value = value;
    const val = document.createElement('span');
    val.textContent = value;
    input.addEventListener('input', () => {
        val.textContent = input.value;
        onChange(parseFloat(input.value));
    });
    group.append(lbl, input, val);
    return { element: group, input, valSpan: val };
}

// Create a toggle checkbox
export function createToggle(label, checked, onChange) {
    const group = document.createElement('div');
    group.className = 'toggle-group';
    const lbl = document.createElement('label');
    lbl.className = 'toggle-label';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    const sw = document.createElement('span');
    sw.className = 'toggle-switch';
    lbl.append(input, sw, document.createTextNode(` ${label}`));
    group.appendChild(lbl);
    input.addEventListener('change', () => onChange(input.checked));
    return { element: group, input };
}

// Create a color picker
export function createColorPicker(label, value, onChange) {
    const group = document.createElement('div');
    group.className = 'slider-group';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value;
    input.style.width = '40px';
    input.style.height = '24px';
    input.style.border = 'none';
    input.style.background = 'transparent';
    input.style.cursor = 'pointer';
    input.addEventListener('input', () => onChange(input.value));
    group.append(lbl, input);
    return { element: group, input };
}

// Create a select dropdown
export function createSelect(label, options, value, onChange) {
    const group = document.createElement('div');
    group.className = 'slider-group';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const select = document.createElement('select');
    select.style.cssText = 'flex:1;padding:4px;background:rgba(255,255,255,0.1);color:#e2e8f0;border:1px solid rgba(255,255,255,0.2);border-radius:6px;font-size:0.75rem;';
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === value) o.selected = true;
        select.appendChild(o);
    });
    select.addEventListener('change', () => onChange(select.value));
    group.append(lbl, select);
    return { element: group, select };
}
