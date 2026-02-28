/* ========================================
   Module Manager — Add/Remove/Update/Draw
   ======================================== */

const MAX_PER_TYPE = 4;

export class ModuleManager {
    constructor() {
        this.modules = [];
        this._typeCount = {};
    }

    /** Add a module instance. Returns the module or null if at max. */
    add(module) {
        const count = this._typeCount[module.type] || 0;
        if (count >= MAX_PER_TYPE) {
            console.warn(`Max ${MAX_PER_TYPE} ${module.type} modules reached`);
            return null;
        }
        module.onDelete = (id) => this.remove(id);
        this.modules.push(module);
        this._typeCount[module.type] = count + 1;
        return module;
    }

    /** Remove module by ID */
    remove(id) {
        const idx = this.modules.findIndex(m => m.id === id);
        if (idx === -1) return;
        const mod = this.modules[idx];
        mod.destroy();
        this.modules.splice(idx, 1);
        this._typeCount[mod.type] = Math.max(0, (this._typeCount[mod.type] || 1) - 1);
    }

    /** Get count of a type */
    countOf(type) {
        return this._typeCount[type] || 0;
    }

    /** Get all modules of a type */
    getByType(type) {
        return this.modules.filter(m => m.type === type);
    }

    /** Update all enabled modules */
    updateAll(audioData) {
        for (const mod of this.modules) {
            if (mod.enabled) mod.update(audioData);
        }
    }

    /** Draw all enabled modules */
    drawAll(ctx, w, h) {
        for (const mod of this.modules) {
            if (mod.enabled) mod.draw(ctx, w, h);
        }
    }

    /** Remove all modules */
    clear() {
        while (this.modules.length) {
            this.remove(this.modules[0].id);
        }
    }
}
