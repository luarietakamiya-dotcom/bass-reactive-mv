/* ========================================
   Base Module — Abstract class for all modules
   ======================================== */
import { uid } from '../utils/helpers.js';

export class BaseModule {
    constructor(type, name, defaults = {}) {
        this.id = uid();
        this.type = type;     // 'speaker', 'spectrum', 'neon', etc.
        this.name = name;
        this.enabled = true;
        this.position = { x: 0.5, y: 0.5 }; // normalized 0-1
        this.settings = { ...defaults };
        this.uiPanel = null;
        this._dragState = null;
    }

    /** Called every frame with shared audio data */
    update(audioData) { /* override */ }

    /** Draw to canvas */
    draw(ctx, canvasW, canvasH) { /* override */ }

    /** Build settings UI into a container, returns the panel element */
    createUI(container) {
        const panel = document.createElement('div');
        panel.className = 'module-card';
        panel.dataset.moduleId = this.id;

        // Header
        const header = document.createElement('div');
        header.className = 'module-card-header';

        const title = document.createElement('span');
        title.className = 'module-card-title';
        title.textContent = `${this.getIcon()} ${this.name}`;

        const controls = document.createElement('div');
        controls.className = 'module-card-controls';

        // Enable toggle
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'module-btn-toggle';
        toggleBtn.textContent = this.enabled ? '👁' : '👁‍🗨';
        toggleBtn.title = 'ON/OFF';
        toggleBtn.addEventListener('click', () => {
            this.enabled = !this.enabled;
            toggleBtn.textContent = this.enabled ? '👁' : '👁‍🗨';
            panel.classList.toggle('disabled', !this.enabled);
        });

        // Collapse toggle
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'module-btn-toggle';
        collapseBtn.textContent = '▼';
        collapseBtn.addEventListener('click', () => {
            const body = panel.querySelector('.module-card-body');
            body.classList.toggle('collapsed');
            collapseBtn.textContent = body.classList.contains('collapsed') ? '▶' : '▼';
        });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'module-btn-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', () => {
            if (this.onDelete) this.onDelete(this.id);
        });

        controls.append(toggleBtn, collapseBtn, deleteBtn);
        header.append(title, controls);

        // Body (settings go here)
        const body = document.createElement('div');
        body.className = 'module-card-body';

        // Let subclass fill in settings
        this.buildSettingsUI(body);

        panel.append(header, body);
        container.appendChild(panel);
        this.uiPanel = panel;
        return panel;
    }

    /** Override to add specific settings controls */
    buildSettingsUI(container) { /* override */ }

    /** Icon for this module type */
    getIcon() {
        switch (this.type) {
            case 'speaker': return '🔊';
            case 'spectrum': return '📊';
            case 'neon': return '💡';
            default: return '⚡';
        }
    }

    /** Remove UI panel */
    destroyUI() {
        if (this.uiPanel) {
            this.uiPanel.remove();
            this.uiPanel = null;
        }
    }

    /** Clean up resources */
    destroy() {
        this.destroyUI();
    }

    /** Callback set by ModuleManager */
    onDelete = null;
}
