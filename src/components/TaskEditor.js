import { Events } from "../core/Events.js";
import { DomUtils } from "../utils/DomUtils.js";
import { PALETTE } from "../utils/Palette.js";

// I5: Parse "HH:MM" 24h value to display "h:MM AM/PM" and back
function minsToDisplay(totalMins) {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}
function hhmm24ToMins(val) {
  if (!val) return null;
  const [h, m] = val.split(":").map(Number);
  return isNaN(h) || isNaN(m) ? null : h * 60 + m;
}

function minsToHHMM24(mins) {
  const clamped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
function getDurationFormat(mins) {
  if (mins < 0) mins += 1440; // Handle cross-midnight
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Replaced custom steppers with native `<input type="time">` styled as M3 text fields
function createM3TimeInput(id, label) {
  const group = DomUtils.create("div", "input-group", "", { style: "flex:1" });
  
  const input = DomUtils.create("input", "input-field", "", {
    type: "time",
    id: id,
    required: true
  });
  
  const outline = DomUtils.create("div", "md-outline");
  outline.appendChild(DomUtils.create("div", "md-outline-leading"));
  const notch = DomUtils.create("div", "md-outline-notch");
  notch.appendChild(
    DomUtils.create("label", "md-label", label, { for: id }),
  );
  outline.appendChild(notch);
  outline.appendChild(DomUtils.create("div", "md-outline-trailing"));
  
  group.appendChild(input);
  group.appendChild(outline);
  
  return { wrapper: group, input };
}

export class TaskEditor {
  constructor(elementId, store) {
    this.containerId = elementId;
    this.store = store;
    this.root = null;
    this.handleOpen = this.handleOpen.bind(this);
    this.close = this.close.bind(this);
    this.save = this.save.bind(this);
    this.delete = this.delete.bind(this);

    this.init();
  }

  init() {
    this.createModal();
    this.store.on(Events.TASK_EDIT, this.handleOpen);
  }

  createModal() {
    const modal = DomUtils.create("div", "dialog-surface", "", {
      id: "modalEdit",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "editDialogTitle",
    });

    // ── Headline ──────────────────────────────────────────────
    const headline = DomUtils.create("div", "dialog-headline");
    const titleGroup = DomUtils.create("div", "", "", {
      style: "display:flex; align-items:center; gap:12px;",
    });
    titleGroup.appendChild(
      DomUtils.create("span", ["material-symbols-rounded", "dialog-icon"], "edit"),
    );
    titleGroup.appendChild(
      DomUtils.create("span", "", "Edit Task", { id: "editDialogTitle" }),
    );
    headline.appendChild(titleGroup);

    const closeBtn = DomUtils.create("button", ["icon-btn"], "", {
      "aria-label": "Close dialog",
    });
    closeBtn.appendChild(
      DomUtils.create("span", "material-symbols-rounded", "close"),
    );
    closeBtn.addEventListener("click", this.close);
    headline.appendChild(closeBtn);
    headline.style.justifyContent = "space-between";
    modal.appendChild(headline);

    // ── Name Input ────────────────────────────────────────────
    const nameGroup = DomUtils.create("div", "input-group");
    this.nameInput = DomUtils.create("input", "input-field", "", {
      type: "text",
      placeholder: " ",
      id: "editTaskName",
      autocomplete: "off",
    });
    const nameOutline = DomUtils.create("div", "md-outline");
    nameOutline.appendChild(DomUtils.create("div", "md-outline-leading"));
    const nameNotch = DomUtils.create("div", "md-outline-notch");
    nameNotch.appendChild(
      DomUtils.create("label", "md-label", "Title", { for: "editTaskName" }),
    );
    nameOutline.appendChild(nameNotch);
    nameOutline.appendChild(DomUtils.create("div", "md-outline-trailing"));
    nameGroup.appendChild(this.nameInput);
    nameGroup.appendChild(nameOutline);
    modal.appendChild(nameGroup);

    // ── Time Row (M3 Native Native Inputs + Duration) ───────────────────────
    const timeRow = DomUtils.create("div", "", "", {
      style: "display:flex; gap:12px; margin-top:24px;",
    });

    const startGrp = createM3TimeInput("editStartTime", "Start Time");
    const endGrp = createM3TimeInput("editEndTime", "End Time");
    
    this.startInput = startGrp.input;
    this.endInput = endGrp.input;
    
    // Duration Input
    const durGrp = DomUtils.create("div", "input-group", "", { style: "flex:0.8" });
    this.durInput = DomUtils.create("input", "input-field", "", {
      type: "text",
      id: "editDuration",
      placeholder: "e.g. 1h 30m"
    });
    const durOutline = DomUtils.create("div", "md-outline");
    durOutline.appendChild(DomUtils.create("div", "md-outline-leading"));
    const durNotch = DomUtils.create("div", "md-outline-notch");
    durNotch.appendChild(DomUtils.create("label", "md-label", "Duration", { for: "editDuration" }));
    durOutline.appendChild(durNotch);
    durOutline.appendChild(DomUtils.create("div", "md-outline-trailing"));
    durGrp.appendChild(this.durInput);
    durGrp.appendChild(durOutline);

    // Auto-formatting validation hook
    this.startInput.addEventListener("change", () => {
      this._validateTimes();
      this._updateDurationFromTimes();
    });
    this.endInput.addEventListener("change", () => {
      this._validateTimes();
      this._updateDurationFromTimes();
    });
    // Handle duration input edits
    this.durInput.addEventListener("change", () => {
      this._updateEndTimeFromDuration();
    });

    timeRow.appendChild(startGrp.wrapper);
    timeRow.appendChild(durGrp);
    timeRow.appendChild(endGrp.wrapper);
    modal.appendChild(timeRow);

    // Validation hint
    this.timeHint = DomUtils.create("div", "", "", {
      style:
        "font-size:var(--md-sys-typescale-label-small-size); font-weight:var(--md-sys-typescale-label-small-weight); color:var(--md-sys-color-error); min-height:16px; margin-top:4px; padding-left:16px;",
    });
    modal.appendChild(this.timeHint);

    // ── Divider ───────────────────────────────────────────────
    const divider = DomUtils.create("div", "", "", {
      style: "height:1px; background:var(--md-sys-color-outline-variant); margin: 8px 0 24px;",
    });
    modal.appendChild(divider);

    // ── Color Picker (I6 polish) ──────────────────────────────
    const colorCol = DomUtils.create("div", "", "", {
      style: "display:flex; flex-direction:column; gap:10px",
    });
    colorCol.appendChild(
      DomUtils.create("span", "", "COLOR", {
        style:
          "font-size:var(--md-sys-typescale-label-small-size); font-weight:600; color:var(--md-sys-color-on-surface-variant); padding-left:2px; letter-spacing:1.4px;",
      }),
    );
    this.colorContainer = DomUtils.create("div", "color-picker");
    colorCol.appendChild(this.colorContainer);
    modal.appendChild(colorCol);

    // ── Actions (I6: aligned footer) ─────────────────────────
    const actions = DomUtils.create("div", "dialog-actions", "", {
      style: "display:flex; justify-content:flex-end; align-items:center; gap:8px; margin-top:32px;",
    });

    const delBtn = DomUtils.create("button", "btn-icon-footer", "", {
      "aria-label": "Delete Task",
      title: "Delete Task",
    });
    delBtn.innerHTML = `<span class="material-symbols-rounded">delete</span>`;
    delBtn.style.marginRight = "auto";
    delBtn.addEventListener("click", this.delete);

    const cancelBtn = DomUtils.create("button", ["btn", "btn-text"], "Cancel");
    cancelBtn.addEventListener("click", this.close);

    this.saveBtn = DomUtils.create("button", ["btn", "btn-filled"], "Save");
    this.saveBtn.addEventListener("click", this.save);

    actions.appendChild(delBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(this.saveBtn);
    modal.appendChild(actions);

    this.root = modal;

    const backdrop = document.getElementById("modalBackdrop");
    if (backdrop) {
      backdrop.appendChild(modal);
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) this.close();
      });
    }
  }

  _validateTimes() {
    const s = hhmm24ToMins(this.startInput.value);
    const e = hhmm24ToMins(this.endInput.value);
    if (s === null || e === null) {
      this.timeHint.textContent = "Invalid time";
      this.saveBtn.disabled = true;
      return false;
    }
    this.timeHint.textContent = "";
    this.saveBtn.disabled = false;
    return true;
  }

  _updateDurationFromTimes() {
    const s = hhmm24ToMins(this.startInput.value);
    const e = hhmm24ToMins(this.endInput.value);
    if (s !== null && e !== null) {
      let diff = e - s;
      if (diff < 0) diff += 1440; // Cross midnight
      this.durInput.value = getDurationFormat(diff);
    }
  }

  _updateEndTimeFromDuration() {
    const s = hhmm24ToMins(this.startInput.value);
    if (s === null) return;

    let text = this.durInput.value.toLowerCase().trim();
    let totalMins = 0;
    
    // Parse "1h 30m", "90m", "1.5h" etc.
    const hMatch = text.match(/([0-9\.]+)\s*h/);
    const mMatch = text.match(/([0-9]+)\s*m/);
    
    if (hMatch) totalMins += parseFloat(hMatch[1]) * 60;
    if (mMatch) totalMins += parseInt(mMatch[1], 10);
    
    // Fallback: if just a number is typed, assume minutes
    if (!hMatch && !mMatch && !isNaN(parseInt(text))) {
      totalMins = parseInt(text, 10);
    }

    if (totalMins > 0) {
      const newEnd = s + totalMins;
      this.endInput.value = minsToHHMM24(newEnd);
      this._validateTimes();
      this.durInput.value = getDurationFormat(totalMins); // Format neatly
    }
  }

  handleOpen(payload) {
    if (!payload || payload.mode) return;
    if (!payload.id) return;

    this.activeId = payload.id;
    const item = this.store.state.items.find((i) => i.id === this.activeId);
    if (!item) return;

    this.nameInput.value = item.label;

    // I5: Set native time inputs directly (they expect HH:MM)
    this.startInput.value = item.start || "09:00";
    this.endInput.value = item.end || "10:00";
    
    this._updateDurationFromTimes();

    this.timeHint.textContent = "";
    this.renderPalette(item.color);

    this.root.classList.add("visible");
    document.getElementById("modalBackdrop").classList.add("open");

    requestAnimationFrame(() => {
      this.nameInput.focus();
      this.nameInput.select();
    });
  }

  renderPalette(selectedColor) {
    this.colorContainer.innerHTML = "";
    PALETTE.forEach((c, i) => {
      // I6: Each chip wrapped in 48dp touch target button
      const btn = DomUtils.create("button", "color-chip-btn", "", {
        type: "button",
        "aria-label": `Color ${i + 1}`,
        "aria-pressed": c === selectedColor ? "true" : "false",
      });
      const chip = DomUtils.create(
        "div",
        ["color-chip", ...(c === selectedColor ? ["selected"] : [])],
        "",
        { style: `background:${c}`, "data-color": c },
      );
      
      // M3 Check icon inside the selected chip
      const checkIcon = DomUtils.create("span", "material-symbols-rounded", "check", { style: "color:var(--md-sys-color-surface); font-size:18px; font-weight:600;" });
      if (c === selectedColor) {
        chip.appendChild(checkIcon);
      }
      
      btn.appendChild(chip);
      btn.addEventListener("click", () => {
        // Deselect all
        Array.from(this.colorContainer.querySelectorAll(".color-chip-btn")).forEach((b) => {
          const innerChip = b.querySelector(".color-chip");
          innerChip.classList.remove("selected");
          // Remove checkmark
          const icon = innerChip.querySelector(".material-symbols-rounded");
          if (icon) innerChip.removeChild(icon);
          b.setAttribute("aria-pressed", "false");
        });
        
        // Select clicked
        chip.classList.add("selected");
        chip.appendChild(checkIcon);
        btn.setAttribute("aria-pressed", "true");
      });
      this.colorContainer.appendChild(btn);
    });
  }

  close() {
    this.root.classList.remove("visible");
    document.getElementById("modalBackdrop").classList.remove("open");
    this.activeId = null;
  }

  save() {
    if (!this.activeId) return;
    if (!this._validateTimes()) return;

    const item = this.store.state.items.find((i) => i.id === this.activeId);
    if (!item) return;

    item.label = this.nameInput.value.trim() || "Untitled";
    item.start = this.startInput.value;
    item.end = this.endInput.value;

    const selChip = this.colorContainer.querySelector(".color-chip.selected");
    if (selChip?.dataset.color) item.color = selChip.dataset.color;

    this.store.upsertItem(item);
    this.store.emit(Events.TOAST, { message: `"${item.label}" saved` });
    this.close();
  }

  delete() {
    if (!this.activeId) return;
    const item = this.store.state.items.find((i) => i.id === this.activeId);
    const label = item ? item.label : "Task";
    const undoFn = this.store.removeItem(this.activeId);
    this.close();
    this.store.emit(Events.TOAST, {
      message: `"${label}" deleted`,
      action: "Undo",
      onAction: undoFn,
    });
  }

  render() {}
}
