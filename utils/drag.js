/* ========================================
   Drag & Drop Positioning for Modules
   ======================================== */

let _activeModule = null;
let _dragOffset = { x: 0, y: 0 };

export function initDrag(canvas, moduleManager) {
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const w = canvas.width;
        const h = canvas.height;

        // Find topmost module at click point (reverse order = topmost)
        for (let i = moduleManager.modules.length - 1; i >= 0; i--) {
            const mod = moduleManager.modules[i];
            if (!mod.enabled) continue;
            const px = mod.position.x * w;
            const py = mod.position.y * h;
            const hitRadius = 60; // generous hit area
            if (Math.abs(mx - px) < hitRadius && Math.abs(my - py) < hitRadius) {
                _activeModule = mod;
                _dragOffset.x = mx - px;
                _dragOffset.y = my - py;
                e.preventDefault();
                return;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!_activeModule) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        _activeModule.position.x = (mx - _dragOffset.x) / canvas.width;
        _activeModule.position.y = (my - _dragOffset.y) / canvas.height;
    });

    canvas.addEventListener('mouseup', () => { _activeModule = null; });
    canvas.addEventListener('mouseleave', () => { _activeModule = null; });
}
