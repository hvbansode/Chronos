/**
 * DOM Utilities for safe element creation
 */
export const DomUtils = {
    /**
     * Create an element with text content (safe from XSS)
     * @param {string} tag 
     * @param {string|string[]} classes 
     * @param {string} [text] 
     * @param {object} [attributes] 
     */
    create: (tag, classes = [], text = '', attributes = {}) => {
        const el = document.createElement(tag);
        
        if (Array.isArray(classes)) {
            if (classes.length) el.classList.add(...classes);
        } else if (classes) {
            el.className = classes;
        }

        if (text) el.textContent = text; // Safe

        Object.entries(attributes).forEach(([key, val]) => {
            if (key.startsWith('on') && typeof val === 'function') {
                // Event listener
                el.addEventListener(key.substring(2).toLowerCase(), val);
            } else if (key === 'dataset') {
                Object.entries(val).forEach(([dKey, dVal]) => el.dataset[dKey] = dVal);
            } else {
                el.setAttribute(key, val);
            }
        });

        return el;
    },

    /**
     * Safe inner HTML replacement (only if absolutely needed, prefer create)
     * @param {HTMLElement} el 
     * @param {string} html 
     */
    setInnerHtmlUnsafe: (el, html) => {
        // Warning: Only use for trusted static content
        el.innerHTML = html;
    }
};
