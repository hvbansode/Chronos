import { Store } from './core/Store.js';
import { Layout } from './components/Layout.js';
import { Clock } from './components/Clock.js';
import { TaskList } from './components/TaskList.js';
import { SmartAdd } from './components/SmartAdd.js';
import { TaskEditor } from './components/TaskEditor.js';
import { RoutinesManager } from './components/RoutinesManager.js';
import { Toast } from './components/Toast.js';
import { Events } from './core/Events.js';
import { TimeUtils } from './utils/TimeUtils.js';

const init = () => {
    // 1. Core Store
    const store = new Store();
    store.init();

    // 2. Components
    new Layout(store);
    new Clock('svg', store);
    new TaskList('list', store);
    new SmartAdd('modalBackdrop', store);
    new TaskEditor('modalBackdrop', store);
    new RoutinesManager('modalBackdrop', store);
    new Toast(store);

    // 3. Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Don't intercept when typing in an input/textarea
        const tag = document.activeElement?.tagName;
        const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        if (e.key === 'Escape') {
            // Close any open modal/backdrop/drawer first
            const backdrop = document.getElementById('modalBackdrop');
            const drawer = document.getElementById('drawer');
            const scrim = document.getElementById('scrim');

            if (backdrop && backdrop.classList.contains('open')) {
                backdrop.classList.remove('open');
                // Hide all visible dialogs inside
                backdrop.querySelectorAll('.dialog-surface.visible').forEach(d => {
                    d.classList.remove('visible');
                });
                return;
            }
            if (drawer && drawer.classList.contains('open')) {
                drawer.classList.remove('open');
                scrim?.classList.remove('open');
                return;
            }
            // Deselect active task
            if (store.state.activeId) {
                store.setActive(null);
            }
            return;
        }

        // Don't handle further keys when in an input
        if (inInput) return;

        if (e.key === 'n' || e.key === 'N') {
            // Smart Add shortcut
            store.emit(Events.TASK_EDIT, { mode: 'smart-add' });
            e.preventDefault();
        }
    });

    // Hub click deselects (wired in Clock.js already), but also add hub keyboard
    const hub = document.getElementById('hub');
    if (hub) {
        hub.setAttribute('tabindex', '0');
    }

    // 4. Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('chronos_theme', next);
            document.querySelector('meta[name="theme-color"]').setAttribute('content', next === 'light' ? '#f9f9ff' : '#0d1117');
            const icon = themeBtn.querySelector('.material-symbols-rounded');
            if (icon) icon.textContent = next === 'light' ? 'dark_mode' : 'light_mode';
        });
        const saved = localStorage.getItem('chronos_theme') || 'dark';
        const icon = themeBtn.querySelector('.material-symbols-rounded');
        if (icon) icon.textContent = saved === 'light' ? 'dark_mode' : 'light_mode';
    }

    // 5. Notifications setup
    if ('Notification' in window) {
        // Request on first click anywhere if not granted/denied
        document.body.addEventListener('click', () => {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }, { once: true });
    }

    let activeNotifTaskId = null;
    const notifInterval = setInterval(() => {
        if (!store.state.items.length || Notification.permission !== 'granted') return;
        
        const nowMins = TimeUtils.getCurrentMins();
        const current = store.state.items.find(it => {
            const sm = TimeUtils.toMins(it.start);
            const em = TimeUtils.toMins(it.end);
            return em < sm
                ? (nowMins >= sm || nowMins < em)
                : (nowMins >= sm && nowMins < em);
        });

        if (current && current.id !== activeNotifTaskId) {
            new Notification('Task Started', {
                body: `${current.label} (${current.start} - ${current.end})`,
                icon: '/icon-192x192.png'
            });
            activeNotifTaskId = current.id;
        } else if (!current && activeNotifTaskId) {
            const pastTask = store.state.items.find(i => i.id === activeNotifTaskId);
            if (pastTask) {
                new Notification('Task Ended', {
                    body: `${pastTask.label} has finished.`,
                    icon: '/icon-192x192.png'
                });
            }
            activeNotifTaskId = null;
        }
    }, 60000); // Check every minute

    // B5: Clear the interval on page hide to prevent leaks
    window.addEventListener('pagehide', () => clearInterval(notifInterval), { once: true });

    // Expose store for debugging (dev only)
    if (import.meta.env.DEV) {
        window.chronoStore = store;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
