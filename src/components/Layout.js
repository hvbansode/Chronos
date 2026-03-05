import { Events } from '../core/Events.js';

export class Layout {
    constructor(store) {
        this.store = store;
        this.drawer = document.getElementById('drawer');
        this.scrim = document.getElementById('scrim');
        this.appBar = document.querySelector('.app-bar');
        this.menuBtn = document.querySelector('.icon-btn[aria-label="Open Schedule Menu"]');
        this.closeBtn = document.querySelector('.icon-btn[aria-label="Close Menu"]');
        this.presetsBtn = document.querySelector('.icon-btn[aria-label="Manage Routines"]');
        this.fab = document.querySelector('.fab');

        this.toggleDrawer = this.toggleDrawer.bind(this);
        this.openPresets = this.openPresets.bind(this);
        this.openSmartAdd = this.openSmartAdd.bind(this);

        this.init();
    }

    init() {
        if (this.menuBtn) this.menuBtn.addEventListener('click', this.toggleDrawer);
        if (this.closeBtn) this.closeBtn.addEventListener('click', this.toggleDrawer);
        if (this.scrim) this.scrim.addEventListener('click', this.toggleDrawer);

        if (this.presetsBtn) this.presetsBtn.addEventListener('click', this.openPresets);
        if (this.fab) {
            this.fab.addEventListener('click', this.openSmartAdd);
            this.fab.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openSmartAdd();
                }
            });
        }

        // M3 AppBar scrolled state: watch drawer list for scroll
        const listContainer = document.getElementById('list');
        if (listContainer) {
            listContainer.addEventListener('scroll', () => {
                const scrolled = listContainer.scrollTop > 0;
                this.appBar?.classList.toggle('scrolled', scrolled);
            }, { passive: true });
        }
    }

    toggleDrawer() {
        this.drawer.classList.toggle('open');
        this.scrim.classList.toggle('open');

        // B1: Read new state after toggle, not old state before
        const isNowOpen = this.drawer.classList.contains('open');

        // M3: Update aria-expanded on menu button
        if (this.menuBtn) {
            this.menuBtn.setAttribute('aria-expanded', String(isNowOpen));
        }

        // M3: Focus Trap when drawer is open
        const focusableElements = 'button, [href], input, select, textarea, [tabindex]';
        const mainContent = document.querySelector('.main-content');
        if (isNowOpen) {
            // Disable focus on main content safely
            if (mainContent) {
                const mainFocusable = mainContent.querySelectorAll(focusableElements);
                mainFocusable.forEach(el => {
                    // Only modify if it isn't already trapped or intentionally -1
                    if (el.getAttribute('tabindex') !== '-1') {
                        const currentTab = el.getAttribute('tabindex');
                        if (currentTab !== null) {
                            el.dataset.originalTabindex = currentTab;
                        }
                        el.setAttribute('tabindex', '-1');
                    }
                });
                mainContent.setAttribute('aria-hidden', 'true');
            }
            // Focus the close button in the drawer automatically
            if (this.closeBtn) this.closeBtn.focus();
        } else {
            // Restore focus on main content accurately
            if (mainContent) {
                const mainFocusable = mainContent.querySelectorAll(focusableElements);
                mainFocusable.forEach(el => {
                    if (el.dataset.originalTabindex !== undefined) {
                        el.setAttribute('tabindex', el.dataset.originalTabindex);
                        delete el.dataset.originalTabindex;
                    } else if (el.getAttribute('tabindex') === '-1' && !el.hasAttribute('data-original-tabindex')) {
                        // Only remove if we just set it and there wasn't a prior one
                        el.removeAttribute('tabindex');
                    }
                });
                mainContent.removeAttribute('aria-hidden');
            }
            // Return focus to menu btn
            if (this.menuBtn) this.menuBtn.focus();
        }
    }

    openPresets() {
        this.store.emit(Events.ROUTINE_LOAD, { mode: 'presets' });
    }

    openSmartAdd() {
        this.store.emit(Events.TASK_EDIT, { mode: 'smart-add' });
    }
}
