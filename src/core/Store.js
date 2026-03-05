import { Events } from './Events.js';
import { get, set, del } from 'idb-keyval';

export class Store {
    constructor() {
        this.listeners = {};
        this.state = {
            items: [],
            userRoutines: [],
            activeId: null,
            defaultRoutineId: null,
            defaultRoutineType: null,
        };
    }

    /**
     * Initialize store, load data from IndexedDB
     */
    async init() {
        this.state.userRoutines = await this.load('chronos_user_routines', []);
        this.state.defaultRoutineId = await this.load('chronos_default_id');
        this.state.defaultRoutineType = await this.load('chronos_default_type');
        
        const savedItems = await this.load('chronos_m3_data');
        if (savedItems && Array.isArray(savedItems)) {
            this.state.items = savedItems;
        } else {
            this.state.items = []; // Will need to load template elsewhere
        }
        
        // Emit change so UI renders asynchronously loaded data
        this.emit(Events.STATE_CHANGE, this.state);
    }

    /**
     * Subscribe to events
     */
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    /**
     * Unsubscribe from events
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Emit events
     */
    emit(event, payload) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(payload));
        }
    }

    /* --- Actions --- */

    setItems(items) {
        this.state.items = items;
        this.save('chronos_m3_data', items);
        this.emit(Events.STATE_CHANGE, this.state);
    }

    upsertItem(item) {
        const idx = this.state.items.findIndex(i => i.id === item.id);
        if (idx >= 0) {
            this.state.items[idx] = item;
        } else {
            this.state.items.push(item);
        }
        this.setItems(this.state.items);
    }

    removeItem(id) {
        const prev = [...this.state.items];
        this.state.items = this.state.items.filter(i => i.id !== id);
        if (this.state.activeId === id) this.state.activeId = null;
        this.save('chronos_m3_data', this.state.items);
        this.emit(Events.STATE_CHANGE, this.state);
        // Undo capability callback could be returned here
        return () => this.setItems(prev); 
    }

    setActive(id) {
        this.state.activeId = id;
        this.emit(Events.TASK_SELECT, id);
        this.emit(Events.STATE_CHANGE, this.state);
    }

    getUserRoutines() {
        return this.state.userRoutines;
    }

    saveRoutine(routine) {
        // Upsert
        const idx = this.state.userRoutines.findIndex(r => r.id === routine.id);
        if (idx >= 0) this.state.userRoutines[idx] = routine;
        else this.state.userRoutines.push(routine);
        
        this.save('chronos_user_routines', this.state.userRoutines);
        this.emit(Events.STATE_CHANGE, this.state); 
    }

    deleteRoutine(id) {
        this.state.userRoutines = this.state.userRoutines.filter(r => r.id !== id);
        this.save('chronos_user_routines', this.state.userRoutines);
        
        if (this.state.defaultRoutineId === id) {
            this.state.defaultRoutineId = null;
            this.remove('chronos_default_id');
        }
        this.emit(Events.STATE_CHANGE, this.state);
    }

    setDefault(id, type) {
        if (this.state.defaultRoutineId === id) {
             this.state.defaultRoutineId = null;
             this.state.defaultRoutineType = null;
             this.remove('chronos_default_id');
             this.remove('chronos_default_type');
        } else {
            this.state.defaultRoutineId = id;
            this.state.defaultRoutineType = type;
            this.save('chronos_default_id', id);
            this.save('chronos_default_type', type);
        }
        this.emit(Events.STATE_CHANGE, this.state);
    }

    /* --- Storage Helpers (IndexedDB) --- */

    async save(key, data) {
        try {
            await set(key, data);
            return true;
        } catch (e) {
            console.error("Save failed:", e);
            return false;
        }
    }

    async load(key, fallback = null) {
        try {
            const data = await get(key);
            return data !== undefined ? data : fallback;
        } catch (e) {
            return fallback;
        }
    }

    async remove(key) {
        try {
            await del(key);
        } catch(e) {}
    }
}
