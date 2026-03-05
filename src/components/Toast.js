import { Events } from '../core/Events.js';

/**
 * Toast / Snackbar Component — M3
 * Listens to Events.TOAST and shows a dismissible snackbar.
 */
export class Toast {
    constructor(store) {
        this.store = store;
        this.queue = [];
        this.visible = false;
        this.timer = null;

        this._create();
        this.store.on(Events.TOAST, (payload) => this.show(payload));
    }

    _create() {
        this.el = document.createElement('div');
        this.el.className = 'snackbar';
        this.el.setAttribute('role', 'status');
        this.el.setAttribute('aria-live', 'polite');
        this.el.setAttribute('aria-atomic', 'true');

        this.msgEl = document.createElement('span');
        this.msgEl.style.flex = '1';

        this.actionEl = document.createElement('button');
        this.actionEl.className = 'snackbar-action';
        this.actionEl.style.display = 'none';

        this.el.appendChild(this.msgEl);
        this.el.appendChild(this.actionEl);
        document.body.appendChild(this.el);
    }

    show(payload) {
        if (!payload || !payload.message) return;
        this.queue.push(payload);
        if (!this.visible) this._next();
    }

    _next() {
        if (this.queue.length === 0) return;
        const { message, action, onAction } = this.queue.shift();

        clearTimeout(this.timer);
        this.visible = true;

        this.msgEl.textContent = message;

        if (action && onAction) {
            this.actionEl.textContent = action;
            this.actionEl.style.display = '';
            this.actionEl.onclick = () => {
                onAction();
                this._dismiss();
            };
        } else {
            this.actionEl.style.display = 'none';
            this.actionEl.onclick = null;
        }

        this.el.classList.add('visible');

        this.timer = setTimeout(() => this._dismiss(), action ? 5000 : 3000);
    }

    _dismiss() {
        this.el.classList.remove('visible');
        this.visible = false;
        clearTimeout(this.timer);

        // Process next in queue after animation
        setTimeout(() => this._next(), 400);
    }
}
