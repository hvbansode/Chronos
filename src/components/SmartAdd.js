import { Events } from "../core/Events.js";
import { DomUtils } from "../utils/DomUtils.js";
import { SmartParser } from "../utils/SmartParser.js";
import { TimeUtils } from "../utils/TimeUtils.js";
import { PALETTE } from "../utils/Palette.js"; // C6: shared palette

export class SmartAdd {
  constructor(elementId, store) {
    this.store = store;
    this.containerId = elementId;
    this.root = null;
    this.colorIdx = 0;

    this.init();
  }

  init() {
    this.createModal();
    this.store.on(Events.TASK_EDIT, (payload) => {
      if (payload && payload.mode === "smart-add") this.open();
    });
  }

  createModal() {
    const modal = DomUtils.create("div", "dialog-surface", "", {
      id: "modalSmartAdd",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "smartAddTitle",
    });

    // Headline
    const headline = DomUtils.create("div", "dialog-headline");
    const titleGroup = DomUtils.create("div", "", "", {
      style: "display:flex; align-items:center; gap:12px;",
    });
    titleGroup.appendChild(
      DomUtils.create(
        "span",
        ["material-symbols-rounded", "dialog-icon"],
        "auto_awesome",
      ),
    );
    titleGroup.appendChild(
      DomUtils.create("span", "", "Smart Add", { id: "smartAddTitle" }),
    );
    headline.appendChild(titleGroup);

    const closeBtn = DomUtils.create("button", "dialog-header-btn", "", {
      "aria-label": "Close dialog",
    });
    closeBtn.appendChild(
      DomUtils.create("span", "material-symbols-rounded", "close", {
        style: "font-size:20px;",
      }),
    );
    closeBtn.addEventListener("click", () => this.close());
    headline.appendChild(closeBtn);
    headline.style.justifyContent = "space-between";

    modal.appendChild(headline);

    // Description
    const desc = DomUtils.create("div", "md-typescale-body-small", "", {
      style:
        "color:var(--md-sys-color-on-surface-variant); margin-bottom:24px; line-height:1.7;",
    });
    desc.innerHTML = `Type naturally to schedule.<br><code class="md-typescale-label-small mono" style="background:var(--md-sys-color-surface-container-highest);color:var(--md-sys-color-on-surface);padding:3px 8px;border-radius:var(--md-sys-shape-corner-extra-small); margin-right:4px; border:1px solid var(--md-sys-color-outline-variant);">Gym 6pm 1h</code> <code class="md-typescale-label-small mono" style="background:var(--md-sys-color-surface-container-highest);color:var(--md-sys-color-on-surface);padding:3px 8px;border-radius:var(--md-sys-shape-corner-extra-small); border:1px solid var(--md-sys-color-outline-variant);">Lunch 45m</code>`;
    modal.appendChild(desc);

    // M3 Outlined Text Field
    const group = DomUtils.create("div", "input-group");
    this.input = DomUtils.create("input", "input-field", "", {
      type: "text",
      placeholder: " ",
      id: "smartInput",
      autocomplete: "off",
    });

    const outline = DomUtils.create("div", "md-outline");
    const leading = DomUtils.create("div", "md-outline-leading");
    const notch = DomUtils.create("div", "md-outline-notch");
    const trailing = DomUtils.create("div", "md-outline-trailing");

    const labelEl = DomUtils.create("label", "md-label", "What's next?", {
      for: "smartInput",
    });
    notch.appendChild(labelEl);

    outline.appendChild(leading);
    outline.appendChild(notch);
    outline.appendChild(trailing);

    this.input.addEventListener("input", () => this._updatePreview());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.process();
    });

    group.appendChild(this.input);
    group.appendChild(outline);
    modal.appendChild(group);

    // Live Preview
    this.preview = DomUtils.create("div", "smart-preview");
    this.preview.innerHTML = `
            <span class="material-symbols-rounded" style="font-size:16px;color:var(--md-sys-color-primary)">preview</span>
            <span id="smartPreviewLabel"></span>
            <span class="smart-preview-chip" id="smartPreviewTime"></span>
        `;
    modal.appendChild(this.preview);

    // Actions
    const actions = DomUtils.create("div", "dialog-actions");
    const cancel = DomUtils.create("button", ["btn", "btn-text"], "Cancel");
    cancel.addEventListener("click", () => this.close());
    const add = DomUtils.create("button", ["btn", "btn-filled"], "Add");
    add.addEventListener("click", () => this.process());
    actions.appendChild(cancel);
    actions.appendChild(add);
    modal.appendChild(actions);

    this.root = modal;

    const backdrop = document.getElementById("modalBackdrop");
    if (backdrop) {
      backdrop.appendChild(modal);
      // B3: Backdrop click-close handler
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) this.close();
      });
    }
  }

  _updatePreview() {
    const raw = this.input.value.trim();
    const previewLabel = document.getElementById("smartPreviewLabel");
    const previewTime = document.getElementById("smartPreviewTime");

    if (!raw) {
      this.preview.classList.remove("active");
      return;
    }

    let label = raw;
    let timeStr = "";

    const timeObj = SmartParser.parseTime(label);
    if (timeObj) {
      label = label.replace(timeObj.text, "");
      const h = Math.floor(timeObj.mins / 60);
      const m = timeObj.mins % 60;
      timeStr = `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
    }

    const durObj = SmartParser.parseDuration(label);
    if (durObj) {
      label = label.replace(durObj.text, "");
      const dh = Math.floor(durObj.mins / 60);
      const dm = durObj.mins % 60;
      const durStr = dh > 0 ? (dm > 0 ? `${dh}h ${dm}m` : `${dh}h`) : `${dm}m`;
      timeStr += (timeStr ? " · " : "") + durStr;
    }

    label = label
      .replace(/\b(at|from|to|for|in)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (previewLabel) previewLabel.textContent = label || raw;
    if (previewTime) previewTime.textContent = timeStr || "No time";
    this.preview.classList.add("active");
  }

  open() {
    this.input.value = "";
    this.preview.classList.remove("active");
    this.root.classList.add("visible");
    document.getElementById("modalBackdrop").classList.add("open");
    requestAnimationFrame(() => setTimeout(() => this.input.focus(), 50));
  }

  close() {
    this.root.classList.remove("visible");
    document.getElementById("modalBackdrop").classList.remove("open");
  }

  process() {
    const input = this.input.value.trim();
    if (!input) return;

    let label = input;
    let startM = null;
    let durationM = 60;

    const timeObj = SmartParser.parseTime(label);
    if (timeObj) {
      startM = timeObj.mins;
      label = label.replace(timeObj.text, "");
    }

    const durObj = SmartParser.parseDuration(label);
    if (durObj) {
      durationM = durObj.mins;
      label = label.replace(durObj.text, "");
    }

    label =
      label
        .replace(/\b(at|from|to|for|in)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim() || "New Task";

    if (startM !== null) {
      const endM = (startM + durationM) % 1440;
      const newItem = {
        id: "id-" + Math.random().toString(36).substr(2, 9),
        label,
        start: TimeUtils.toStr(startM),
        end: TimeUtils.toStr(endM),
        color: PALETTE[this.colorIdx++ % PALETTE.length], // C6: shared palette
        completed: false,
      };
      this.store.upsertItem(newItem);
      this.store.setActive(newItem.id);
      this.store.emit(Events.TOAST, { message: `"${label}" added` });
    } else {
      const added = this.findSlotAndAdd(label, durationM);
      if (!added) {
        this.store.emit(Events.TOAST, {
          message: "No free slot found for that duration",
        });
      }
    }
    this.close();
  }

  findSlotAndAdd(label, durationM) {
    const items = [...this.store.state.items].sort(
      (a, b) => TimeUtils.toMins(a.start) - TimeUtils.toMins(b.start),
    );
    let best = -1;

    if (items.length === 0) {
      best = 540; // 9:00 AM default
    } else {
      if (TimeUtils.toMins(items[0].start) >= durationM) {
        best = 0;
      } else {
        for (let i = 0; i < items.length; i++) {
          const c = items[i];
          const n = items[(i + 1) % items.length];
          const cEnd = TimeUtils.toMins(c.end);
          const nStart = TimeUtils.toMins(n.start);
          const gap =
            i === items.length - 1
              ? (nStart - cEnd + 1440) % 1440
              : nStart - cEnd;
          if (gap >= durationM) {
            best = cEnd;
            break;
          }
        }
      }
    }

    if (best !== -1) {
      const newItem = {
        id: "id-" + Math.random().toString(36).substr(2, 9),
        label,
        start: TimeUtils.toStr(best),
        end: TimeUtils.toStr((best + durationM) % 1440),
        color: PALETTE[this.colorIdx++ % PALETTE.length], // C6: shared palette
        completed: false,
      };
      this.store.upsertItem(newItem);
      this.store.setActive(newItem.id);
      this.store.emit(Events.TOAST, {
        message: `"${label}" scheduled at ${TimeUtils.toDisplayTime(newItem.start)}`,
      });
      return true;
    }
    return false;
  }
}
