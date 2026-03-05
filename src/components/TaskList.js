import { Events } from '../core/Events.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { DomUtils } from '../utils/DomUtils.js';

export class TaskList {
    constructor(elementId, store) {
        this.root = document.getElementById(elementId);
        this.store = store;
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this._anims = []; // B6: track pending animation timers

        this.render = this.render.bind(this);
        this.init();
    }

    init() {
        this.store.on(Events.STATE_CHANGE, () => this.render());

        const resetBtn = document.querySelector('.reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                const items = this.store.state.items;
                if (items.some(i => i.completed)) {
                    items.forEach(i => i.completed = false);
                    this.store.setItems(items);
                    this.store.emit(Events.TOAST, { message: 'Progress reset' });
                }
            });
        }
    }

    render() {
        if (!this.root) return;
        // B6: Cancel any pending stagger animations from the previous render
        this._anims.forEach(id => clearTimeout(id));
        this._anims = [];

        const items = this.store.state.items || [];
        const activeId = this.store.state.activeId;

        this.root.innerHTML = '';

        if (items.length === 0) {
            this.root.appendChild(this._emptyState());
            this.updateProgress(items);
            return;
        }

        const sorted = [...items].sort((a, b) => TimeUtils.toMins(a.start) - TimeUtils.toMins(b.start));
        sorted.forEach((it, index) => {
            const el = this.createItem(it, activeId);
            const id = setTimeout(() => {
                if (document.body.contains(el)) {
                    el.classList.add('animate-in');
                }
            }, index * 60 + 50);
            this._anims.push(id); // B6: store for cancellation
            this.root.appendChild(el);
        });

        this.updateProgress(items);
    }

    _emptyState() {
        const wrapper = DomUtils.create('div', 'empty-state');
        const icon = DomUtils.create('span', ['material-symbols-rounded', 'empty-state-icon'], 'event_busy');
        const text = DomUtils.create('div', 'empty-state-text', 'No tasks yet');
        const hint = DomUtils.create('div', 'empty-state-hint', 'Tap the ring or + to add one');
        wrapper.appendChild(icon);
        wrapper.appendChild(text);
        wrapper.appendChild(hint);
        return wrapper;
    }

    createItem(it, activeId) {
        const isActive = it.id === activeId;

        const baseClasses = ['list-item'];
        if (isActive) baseClasses.push('active');
        if (it.completed) baseClasses.push('completed');

        const itemEl = DomUtils.create('div', baseClasses, '', {
            role: 'button',
            tabindex: '0',
            'aria-label': it.label,
            'aria-pressed': isActive ? 'true' : 'false'
        });

        itemEl.addEventListener('click', () => this.focusItem(it.id));
        itemEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') this.focusItem(it.id);
        });

        // Color accent bar
        const colorBar = DomUtils.create('div', 'list-color-bar');
        colorBar.style.background = it.color;

        // Checkbox Wrapper (48x48dp Touch Target)
        const checkWrapper = DomUtils.create('div', 'checkbox-wrapper');
        const checkClasses = ['task-checkbox'];
        if (it.completed) checkClasses.push('checked');
        const checkbox = DomUtils.create('div', checkClasses, '', {
            style: `color: ${it.color}`,
            role: 'checkbox',
            'aria-checked': it.completed ? 'true' : 'false',
            tabindex: '0'
        });
        checkWrapper.addEventListener('click', (e) => { e.stopPropagation(); this.toggleComplete(it.id); });
        checkbox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); this.toggleComplete(it.id); }
        });
        
        // Proper SVG checkmark instead of rotated text font
        const checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        checkIcon.setAttribute('viewBox', '0 0 24 24');
        checkIcon.classList.add('check-icon');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z');
        path.setAttribute('fill', 'currentColor');
        checkIcon.appendChild(path);
        
        checkbox.appendChild(checkIcon);
        checkWrapper.appendChild(checkbox);

        // Content
        const content = DomUtils.create('div', 'list-item-content');
        const headline = DomUtils.create('div', 'list-headline', it.label);

        // Duration info
        const sm = TimeUtils.toMins(it.start);
        const em = TimeUtils.toMins(it.end);
        const dur = (em - sm + 1440) % 1440;
        const durH = Math.floor(dur / 60);
        const durM = dur % 60;
        const durStr = durH > 0
            ? (durM > 0 ? `${durH}h ${durM}m` : `${durH}h`)
            : `${durM}m`;
        const timeText = `${TimeUtils.toDisplayTime(it.start)} – ${TimeUtils.toDisplayTime(it.end)} · ${durStr}`;
        const supporting = DomUtils.create('div', ['list-supporting', 'mono'], timeText);

        content.appendChild(headline);
        content.appendChild(supporting);

        // Edit button
        const editBtn = DomUtils.create('button', 'list-action-btn', '', {
            title: 'Edit',
            'aria-label': `Edit ${it.label}`
        });
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // I4: Close drawer first so the editor is the hero
            const drawer = document.getElementById('drawer');
            const scrim = document.getElementById('scrim');
            if (drawer?.classList.contains('open')) {
                drawer.classList.remove('open');
                scrim?.classList.remove('open');
            }
            this.store.emit(Events.TASK_EDIT, { id: it.id });
        });
        const editIcon = DomUtils.create('span', 'material-symbols-rounded', 'edit');
        editIcon.style.fontSize = '20px';
        editBtn.appendChild(editIcon);

        itemEl.appendChild(colorBar);
        itemEl.appendChild(checkWrapper);
        itemEl.appendChild(content);
        itemEl.appendChild(editBtn);

        return itemEl;
    }

    focusItem(id) {
        this.store.setActive(id);
        const drawer = document.getElementById('drawer');
        const scrim = document.getElementById('scrim');
        if (drawer && drawer.classList.contains('open')) {
            drawer.classList.remove('open');
            scrim.classList.remove('open');
        }
    }

    toggleComplete(id) {
        const item = this.store.state.items.find(i => i.id === id);
        if (item) {
            item.completed = !item.completed;
            this.store.upsertItem(item);
            this.store.emit(Events.TOAST, {
                message: item.completed ? `"${item.label}" completed ✓` : `"${item.label}" unchecked`
            });
        }
    }

    updateProgress(items) {
        const total = items.length;
        const completed = items.filter(i => i.completed).length;
        const pct = total > 0 ? (completed / total) * 100 : 0;
        if (this.progressBar) this.progressBar.style.width = `${pct}%`;
        if (this.progressText) this.progressText.textContent = `${completed}/${total}`;
    }
}
