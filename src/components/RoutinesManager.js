import { Events } from "../core/Events.js";
import { DomUtils } from "../utils/DomUtils.js";

export class RoutinesManager {
  constructor(elementId, store) {
    this.store = store;
    this.containerId = elementId;
    this.root = null;

    this.presets = [
      {
        id: "preset-workday",
        name: "Standard Workday",
        icon: "work",
        items: [
          {
            id: "1",
            label: "Commute",
            start: "08:00",
            end: "09:00",
            color: "#8AB4F8",
            completed: false,
          },
          {
            id: "2",
            label: "Deep Work",
            start: "09:00",
            end: "12:00",
            color: "#F28B82",
            completed: false,
          },
          {
            id: "3",
            label: "Lunch",
            start: "12:00",
            end: "13:00",
            color: "#FDD663",
            completed: false,
          },
          {
            id: "4",
            label: "Meetings",
            start: "13:00",
            end: "17:00",
            color: "#81C995",
            completed: false,
          },
          {
            id: "5",
            label: "Commute",
            start: "17:00",
            end: "18:00",
            color: "#8AB4F8",
            completed: false,
          },
          {
            id: "6",
            label: "Wind Down",
            start: "21:00",
            end: "22:30",
            color: "#C58AF9",
            completed: false,
          },
        ],
      },
      {
        id: "preset-weekend",
        name: "Relaxed Weekend",
        icon: "weekend",
        items: [
          {
            id: "1",
            label: "Sleep In",
            start: "08:00",
            end: "10:00",
            color: "#FDD663",
            completed: false,
          },
          {
            id: "2",
            label: "Brunch",
            start: "10:30",
            end: "12:00",
            color: "#F28B82",
            completed: false,
          },
          {
            id: "3",
            label: "Chores",
            start: "13:00",
            end: "15:00",
            color: "#81C995",
            completed: false,
          },
          {
            id: "4",
            label: "Hobbies",
            start: "15:00",
            end: "19:00",
            color: "#8AB4F8",
            completed: false,
          },
        ],
      },
    ];

    this.init();
  }

  init() {
    this.createModal();
    this.store.on(Events.ROUTINE_LOAD, (payload) => {
      if (payload && payload.mode === "presets") this.open();
    });
  }

  createModal() {
    const modal = DomUtils.create("div", "dialog-surface", "", {
      id: "modalRoutines",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "routinesTitle",
    });

    // ── Headline ─────────────────────────────────────────────
    const headline = DomUtils.create("div", "dialog-headline");
    const titleGroup = DomUtils.create("div", "", "", {
      style: "display:flex;align-items:center;gap:12px;",
    });
    titleGroup.appendChild(
      DomUtils.create(
        "span",
        ["material-symbols-rounded", "dialog-icon"],
        "dashboard",
      ),
    );
    titleGroup.appendChild(
      DomUtils.create("span", "", "Routines", { id: "routinesTitle" }),
    );
    headline.appendChild(titleGroup);

    // Header Actions (Import/Export)
    const headerActions = DomUtils.create("div", "", "", {
      style: "display:flex; gap:8px;",
    });

    const exportBtn = DomUtils.create("button", ["icon-btn"], "", {
      "aria-label": "Export routines",
      title: "Export Routines",
    });
    exportBtn.innerHTML = `<span class="material-symbols-rounded">download</span>`;
    exportBtn.addEventListener("click", () => this.exportRoutines());

    const importBtn = DomUtils.create("button", ["icon-btn"], "", {
      "aria-label": "Import routines",
      title: "Import Routines",
    });
    importBtn.innerHTML = `<span class="material-symbols-rounded">upload</span>`;
    importBtn.addEventListener("click", () => this.importRoutines());

    const closeBtn = DomUtils.create("button", ["icon-btn"], "", {
      "aria-label": "Close dialog",
    });
    closeBtn.innerHTML = `<span class="material-symbols-rounded">close</span>`;
    closeBtn.addEventListener("click", () => this.close());

    headerActions.appendChild(importBtn);
    headerActions.appendChild(exportBtn);
    headerActions.appendChild(closeBtn);

    headline.style.justifyContent = "space-between";
    headline.appendChild(headerActions);
    modal.appendChild(headline);

    // Description
    const desc = DomUtils.create("div", "", "", {
      style:
        "font-size:var(--md-sys-typescale-body-small-size); color:var(--md-sys-color-on-surface-variant); line-height:1.6; margin-bottom: 24px;",
    });
    desc.textContent = "Load a preset to replace your current schedule.";
    modal.appendChild(desc);

    // ── Preset List ───────────────────────────────────────────
    const sectionLabel = DomUtils.create("div", "", "PRESETS", {
      style:
        "font-size:var(--md-sys-typescale-title-small-size); font-weight:var(--md-sys-typescale-title-small-weight); color:var(--md-sys-color-primary); margin: 32px 0 16px 0;",
    });
    modal.appendChild(sectionLabel);

    this.listContainer = DomUtils.create("div", "routines-list");
    modal.appendChild(this.listContainer);

    // ── Custom Routines ───────────────────────────────────────
    const customLabel = DomUtils.create("div", "", "CUSTOM", {
      style:
        "font-size:var(--md-sys-typescale-title-small-size); font-weight:var(--md-sys-typescale-title-small-weight); color:var(--md-sys-color-primary); margin: 32px 0 16px 0;",
    });
    modal.appendChild(customLabel);

    this.customListContainer = DomUtils.create("div", "routines-list", "", {
      style: "display:flex; flex-direction:column; gap:8px;",
    });
    modal.appendChild(this.customListContainer);

    this.renderList();

    // ── Divider ───────────────────────────────────────────────
    const divider = DomUtils.create("div", "", "", {
      style:
        "height:1px; background:var(--md-sys-color-outline-variant); margin: 32px 0 24px 0;",
    });
    modal.appendChild(divider);

    // ── I7: Clear All — distinct danger section ───────────────
    const clearLabel = DomUtils.create("div", "", "DANGER ZONE", {
      style:
        "font-size:var(--md-sys-typescale-title-small-size); font-weight:var(--md-sys-typescale-title-small-weight); color:var(--md-sys-color-error); margin: 0 0 16px 0;",
    });
    modal.appendChild(clearLabel);

    const clearBtn = DomUtils.create("button", "routines-clear-btn", "", {
      style:
        "display:flex;align-items:center;gap:10px;width:100%;padding:14px 16px;border-radius:var(--md-sys-shape-corner-medium);border:1px solid var(--md-sys-color-error);background:transparent;color:var(--md-sys-color-error);cursor:pointer;font-size:var(--md-sys-typescale-label-large-size);font-weight:500;letter-spacing:0.1px;text-align:left;transition:background var(--md-sys-motion-duration-short4);position:relative;isolation:isolate;",
    });
    clearBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size:20px;">delete_sweep</span>Clear All Tasks`;

    // State layer
    const clearLayer = DomUtils.create("div", "", "", {
      style:
        "position:absolute;inset:0;border-radius:inherit;background:var(--md-sys-color-error);opacity:0;transition:opacity var(--md-sys-motion-duration-short4);pointer-events:none;",
    });
    clearBtn.appendChild(clearLayer);
    clearBtn.addEventListener(
      "mouseenter",
      () => (clearLayer.style.opacity = "0.08"),
    );
    clearBtn.addEventListener(
      "mouseleave",
      () => (clearLayer.style.opacity = "0"),
    );
    clearBtn.addEventListener(
      "mousedown",
      () => (clearLayer.style.opacity = "0.12"),
    );
    clearBtn.addEventListener(
      "mouseup",
      () => (clearLayer.style.opacity = "0.08"),
    );

    clearBtn.addEventListener("click", () => {
      if (confirm("Remove all tasks from your schedule?")) {
        this.store.setItems([]);
        this.store.emit(Events.TOAST, { message: "Schedule cleared" });
        this.close();
      }
    });
    modal.appendChild(clearBtn);

    // Bottom Actions removed to avoid duplicate Close buttons. M3 allows just a header dismiss.

    this.root = modal;

    const backdrop = document.getElementById("modalBackdrop");
    if (backdrop) {
      backdrop.appendChild(modal);
    }
  }

  getCustomRoutines() {
    try {
      const data = localStorage.getItem("chronos_custom_routines");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  setCustomRoutines(routines) {
    localStorage.setItem("chronos_custom_routines", JSON.stringify(routines));
    this.renderList();
  }

  saveCurrentRoutine() {
    const items = this.store.state.items;
    if (items.length === 0) {
      this.store.emit(Events.TOAST, { message: "Schedule is empty" });
      return;
    }

    const name = prompt("Name your routine:");
    if (!name) return;

    const custom = this.getCustomRoutines();
    custom.push({
      id: "custom-" + Date.now(),
      name: name,
      icon: "star",
      items: JSON.parse(JSON.stringify(items)), // deep copy
    });

    this.setCustomRoutines(custom);
    this.store.emit(Events.TOAST, { message: `Saved "${name}"` });
  }

  deleteCustomRoutine(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this custom routine?")) return;
    const custom = this.getCustomRoutines();
    this.setCustomRoutines(custom.filter((r) => r.id !== id));
  }

  exportRoutines() {
    const custom = this.getCustomRoutines();
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(custom, null, 2));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", "chronos_routines.json");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    this.store.emit(Events.TOAST, { message: "Routines exported" });
  }

  importRoutines() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!Array.isArray(imported)) throw new Error("Invalid format");
          const current = this.getCustomRoutines();
          // Basic merge
          this.setCustomRoutines([...current, ...imported]);
          this.store.emit(Events.TOAST, {
            message: "Routines imported successfully",
          });
        } catch (err) {
          this.store.emit(Events.TOAST, {
            message: "Failed to import routines",
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  renderList() {
    this.listContainer.innerHTML = "";
    this.customListContainer.innerHTML = "";

    // Preset Grid
    const presetGrid = DomUtils.create("div", "routines-grid");
    this.presets.forEach((preset) => {
      const card = DomUtils.create("div", "routine-card");

      const iconWrapper = DomUtils.create("div", "routine-card-icon-wrapper");
      iconWrapper.innerHTML = `<span class="material-symbols-rounded">${preset.icon}</span>`;

      const title = DomUtils.create("div", "routine-card-title", preset.name);
      const subtitle = DomUtils.create(
        "div",
        "routine-card-subtitle",
        `${preset.items.length} tasks`,
      );

      card.appendChild(iconWrapper);
      card.appendChild(title);
      card.appendChild(subtitle);

      card.addEventListener("click", () => {
        if (
          confirm(`Load "${preset.name}"? This replaces your current schedule.`)
        ) {
          this.store.setItems(
            preset.items.map((i) => ({
              ...i,
              id: "id-" + Math.random().toString(36).substr(2, 9),
            })),
          );
          this.store.emit(Events.TOAST, { message: `Loaded ${preset.name}` });
          this.close();
        }
      });
      presetGrid.appendChild(card);
    });
    this.listContainer.appendChild(presetGrid);

    // Custom Grid
    const customGrid = DomUtils.create("div", "routines-grid");

    // Always show the 'Save Current' card first in the Custom grid
    const addCard = DomUtils.create("div", ["routine-card", "add-card"]);
    const addIconWrapper = DomUtils.create("div", "routine-card-icon-wrapper");
    addIconWrapper.innerHTML = `<span class="material-symbols-rounded">add</span>`;
    const addTitle = DomUtils.create(
      "div",
      "routine-card-title",
      "Save Current",
    );
    addCard.appendChild(addIconWrapper);
    addCard.appendChild(addTitle);
    addCard.addEventListener("click", () => this.saveCurrentRoutine());
    customGrid.appendChild(addCard);

    const customRoutines = this.getCustomRoutines();
    // Append all custom routines as cards next to Add
    customRoutines.forEach((routine) => {
      const card = DomUtils.create("div", "routine-card");

      const iconWrapper = DomUtils.create("div", "routine-card-icon-wrapper");
      iconWrapper.innerHTML = `<span class="material-symbols-rounded">${routine.icon || "star"}</span>`;

      const title = DomUtils.create("div", "routine-card-title", routine.name);
      const subtitle = DomUtils.create(
        "div",
        "routine-card-subtitle",
        `${routine.items.length} tasks`,
      );

      // Delete button inside card
      const delBtn = DomUtils.create("button", "routine-card-delete-btn");
      delBtn.innerHTML =
        '<span class="material-symbols-rounded" style="font-size:20px;">delete</span>';
      delBtn.title = "Delete Routine";
      delBtn.addEventListener("click", (e) =>
        this.deleteCustomRoutine(routine.id, e),
      );

      card.appendChild(delBtn);
      card.appendChild(iconWrapper);
      card.appendChild(title);
      card.appendChild(subtitle);

      card.addEventListener("click", (e) => {
        if (e.target.closest(".routine-card-delete-btn")) return;
        if (
          confirm(
            `Load "${routine.name}"? This replaces your current schedule.`,
          )
        ) {
          this.store.setItems(
            routine.items.map((i) => ({
              ...i,
              id: "id-" + Math.random().toString(36).substr(2, 9),
            })),
          );
          this.store.emit(Events.TOAST, { message: `Loaded ${routine.name}` });
          this.close();
        }
      });

      customGrid.appendChild(card);
    });

    this.customListContainer.appendChild(customGrid);
  }

  open() {
    this.root.classList.add("visible");
    document.getElementById("modalBackdrop").classList.add("open");
  }

  close() {
    this.root.classList.remove("visible");
    document.getElementById("modalBackdrop").classList.remove("open");
  }
}
