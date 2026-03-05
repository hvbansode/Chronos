import { Events } from "../core/Events.js";
import { MathUtils } from "../utils/MathUtils.js";
import { TimeUtils } from "../utils/TimeUtils.js";
import { PALETTE } from "../utils/Palette.js";

// Fallback palette index — cycles for ring-tap additions
let _paletteIdx = 0;

export class Clock {
  constructor(elementId, store) {
    this.svg = document.getElementById(elementId);
    this.store = store;

    this.cx = 210;
    this.cy = 210;
    this.r = 162;
    this.snap = 15;
    this.mag = 15;

    this.layers = {
      slices: document.getElementById("slicesLayer"),
      knobs: document.getElementById("knobsLayer"),
      ticks: document.getElementById("ticks"),
      nowMarker: document.getElementById("nowMarker"),
      guideLine: document.getElementById("guideLine"),
      hub: document.getElementById("hub"),
      hTime: document.getElementById("hubTime"),
      hAmPm: document.getElementById("hubAmPm"),
      hTask: document.getElementById("hubTask"),
      hCount: document.getElementById("hubCountdown"),
      hFill: document.getElementById("hubProgressFill"),
    };

    this.drag = { active: false, type: null, id: null, offset: 0 };
    this.lastClickTime = 0;

    // Caching for requestAnimationFrame optimization
    this._lastHubState = {
      hTime: null,
      hTimeFontSize: null,
      hTask: null,
      hTaskClass: null,
      hTaskColor: null,
      hAmPm: null,
      hAmPmColor: null,
      hCount: null,
      hFillPct: null,
      hFillColor: null,
    };

    // Bound handlers
    this.render = () => this._render();
    this.updateLoop = () => this._updateLoop();
    this.handlePointerMove = (e) => this._handlePointerMove(e);
    this.handlePointerUp = (e) => this._handlePointerUp(e);
    this.stateChanged = () => this._stateChanged();
    
    // Performance: decoupling hub update from every 60fps tick
    this._hubDirty = true;
    this._rafId = null;

    this.init();
  }

  destroy() {
    this.store.off(Events.STATE_CHANGE, this.stateChanged);
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  init() {
    this.drawTicks();
    this.drawNowPulseRing();
    this.store.on(Events.STATE_CHANGE, this.stateChanged);

    this.svg.addEventListener("pointermove", this.handlePointerMove);
    this.svg.addEventListener("pointerup", this.handlePointerUp);

    // Track (ring area) click → add task
    const bg = this.svg.querySelector(".track-bg");
    if (bg) {
      bg.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.trackClick(e);
      });
    }

    // Hub click → deselect
    if (this.layers.hub) {
      this.layers.hub.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        const now = Date.now();
        if (this.store.state.activeId) {
          // Double tap to edit
          if (now - this._lastHubTap < 300) {
              this.store.emit(Events.TASK_EDIT, { id: this.store.state.activeId });
          } else {
              this.store.setActive(null);
          }
        }
        this._lastHubTap = now;
      });
      this.layers.hub.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && this.store.state.activeId) {
          this.store.setActive(null);
        }
      });
    }

    // Background deselect
    document
      .getElementById("stageBase")
      .addEventListener("pointerdown", (e) => {
        if (e.target.id === "stageBase" || e.target.tagName === "svg") {
          this.store.setActive(null);
        }
      });

    requestAnimationFrame(this.updateLoop);
  }

  _stateChanged() {
    this._hubDirty = true;
    this.render();
  }

  _render() {
    const items = this.store.state.items || [];
    const activeId = this.store.state.activeId;

    // Diff existing slices
    const map = new Map();
    Array.from(this.layers.slices.children).forEach((c) =>
      map.set(c.dataset.id, c),
    );

    items.forEach((it) => {
      let el = map.get(it.id);
      if (!el) {
        el = document.createElementNS("http://www.w3.org/2000/svg", "path");
        el.dataset.id = it.id;
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", it.label);
        el.addEventListener("pointerdown", (e) => this.slicePointerDown(e, it));
        this.layers.slices.append(el);
      }
      map.delete(it.id);

      const s = TimeUtils.toMins(it.start);
      const e = TimeUtils.toMins(it.end);
      const d = (e - s + 1440) % 1440;
      const sa = MathUtils.getAngle(s);
      const ea = sa + (d / 1440) * 360;
      const p1 = MathUtils.getPt(sa, this.r);
      const p2 = MathUtils.getPt(ea, this.r);
      const lg = d > 720 ? 1 : 0;

      if (d >= 1439) {
        el.setAttribute(
          "d",
          `M ${this.cx} ${this.cy - this.r} A ${this.r} ${this.r} 0 1 1 ${this.cx} ${this.cy + this.r} A ${this.r} ${this.r} 0 1 1 ${this.cx} ${this.cy - this.r}`,
        );
      } else {
        el.setAttribute(
          "d",
          `M ${this.cx} ${this.cy} L ${p1.x} ${p1.y} A ${this.r} ${this.r} 0 ${lg} 1 ${p2.x} ${p2.y} Z`,
        );
      }

      el.setAttribute("fill", it.color);

      let cls = "slice";
      if (it.id === activeId) cls += " active";
      if (this.drag.active && this.drag.id === it.id) cls += " dragging";
      el.setAttribute("class", cls);
    });

    map.forEach((el) => el.remove());

    // Knobs
    this.layers.knobs.innerHTML = "";
    if (activeId) {
      const it = items.find((i) => i.id === activeId);
      if (it) this.drawActiveOverlay(it);
    }

    this.updHub();
  }

  drawActiveOverlay(it) {
    const s = TimeUtils.toMins(it.start);
    const e = TimeUtils.toMins(it.end);
    const d = (e - s + 1440) % 1440;

    const mk = (m, type) => {
      const offset = d < 45 ? (type === "start" ? -18 : 18) : 0;
      const deg = MathUtils.getAngle(m);
      const p = MathUtils.getPt(deg, this.r + offset);

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute(
        "class",
        `knob-group visible ${this.drag.active && this.drag.type === type ? "dragging" : ""}`,
      );
      g.setAttribute("role", "slider");
      g.setAttribute("aria-label", `${type} time`);
      g.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="24" fill="transparent"/><circle cx="${p.x}" cy="${p.y}" r="10" class="knob-bg"/>`;

      g.addEventListener("pointerdown", (ev) => {
        ev.stopPropagation();
        this.svg.setPointerCapture(ev.pointerId);
        this.drag = {
          active: true,
          id: it.id,
          type,
          startM: m,
          initialStart: s,
          initialEnd: e,
          hasMoved: false,
        };
        this.layers.guideLine.classList.add("visible");
      });
      this.layers.knobs.append(g);
    };
    mk(s, "start");
    mk(e, "end");
  }

  slicePointerDown(e, it) {
    e.stopPropagation();
    const now = Date.now();
    if (this.store.state.activeId === it.id && now - this.lastClickTime < 300) {
      this.store.emit(Events.TASK_EDIT, { id: it.id });
      return;
    }
    this.lastClickTime = now;
    this.store.setActive(it.id);

    this.svg.setPointerCapture(e.pointerId);
    const angle = MathUtils.getPointerAngle(e.clientX, e.clientY, this.svg);
    const pm = MathUtils.getMins(angle);

    this.drag = {
      active: true,
      id: it.id,
      type: "move",
      startM: pm,
      offset: (pm - TimeUtils.toMins(it.start) + 1440) % 1440,
      initialStart: TimeUtils.toMins(it.start),
      initialEnd: TimeUtils.toMins(it.end),
      hasMoved: false,
    };
  }

  _handlePointerMove(e) {
    if (!this.drag.active) return;

    const angle = MathUtils.getPointerAngle(e.clientX, e.clientY, this.svg);
    let m = MathUtils.getMins(angle);

    if (!this.drag.hasMoved) {
      if (Math.abs(m - this.drag.startM) > 2) {
        this.drag.hasMoved = true;
        this.layers.guideLine.classList.add("visible");
      } else return;
    }

    m = Math.round(m / this.snap) * this.snap;
    if (m === 1440) m = 0;

    const pt = MathUtils.getPt(MathUtils.getAngle(m), this.r);
    this.layers.guideLine.setAttribute("x2", pt.x);
    this.layers.guideLine.setAttribute("y2", pt.y);

    const it = this.store.state.items.find((i) => i.id === this.drag.id);
    if (!it) return;

    // Snap to other items' edges
    this.store.state.items.forEach((o) => {
      if (o.id === this.drag.id) return;
      const os = TimeUtils.toMins(o.start);
      const oe = TimeUtils.toMins(o.end);
      if (Math.abs(m - os) <= this.mag) m = os;
      else if (Math.abs(m - oe) <= this.mag) m = oe;
    });

    if (this.drag.type === "move") {
      const dur = (this.drag.initialEnd - this.drag.initialStart + 1440) % 1440;
      let ns = (m - this.drag.offset + 1440) % 1440;
      it.start = TimeUtils.toStr(ns);
      it.end = TimeUtils.toStr((ns + dur) % 1440);
    } else {
      const tm = TimeUtils.toStr(m);
      if (this.drag.type === "start") {
        const em = TimeUtils.toMins(it.end);
        const dur = (em - m + 1440) % 1440;
        if (dur >= 15 && dur < 1440) it.start = tm;
      } else {
        const sm = TimeUtils.toMins(it.start);
        const dur = (m - sm + 1440) % 1440;
        if (dur >= 15 && dur < 1440) it.end = tm;
      }
    }

    this.render();
  }

  _handlePointerUp(e) {
    if (this.drag.active) {
      this.svg.releasePointerCapture(e.pointerId);
      this.drag.active = false;
      this.layers.guideLine.classList.remove("visible");
      this.store.setItems(this.store.state.items);
    }
  }

  trackClick(e) {
    const angle = MathUtils.getPointerAngle(e.clientX, e.clientY, this.svg);
    const m = Math.round(MathUtils.getMins(angle) / this.snap) * this.snap;

    const items = this.store.state.items;
    const occupied = items.some((i) => {
      const s = TimeUtils.toMins(i.start);
      const end = TimeUtils.toMins(i.end);
      return end < s ? m >= s || m < end : m >= s && m < end;
    });

    if (occupied) return;

    const PALETTE_COLORS = PALETTE;
    const color = PALETTE_COLORS[_paletteIdx++ % PALETTE_COLORS.length];

    const newItem = {
      id: "id-" + Math.random().toString(36).substr(2, 9),
      label: "New Task",
      start: TimeUtils.toStr(m),
      end: TimeUtils.toStr((m + 60) % 1440),
      color,
      completed: false,
    };

    this.store.upsertItem(newItem);
    this.store.setActive(newItem.id);
    this.store.emit(Events.TOAST, {
      message: "Task added — double-tap to edit",
      action: null,
    });
  }

  drawTicks() {
    const parent = this.layers.ticks;
    parent.innerHTML = "";

    for (let i = 0; i < 48; i++) {
      const isHour = i % 2 === 0;
      const hour = i / 2;
      const d = (i / 48) * 360 - 90;

      let rStart = 194,
        rEnd = 200;
      let color = "var(--md-sys-color-outline-variant)";
      let width = 1;

      if (isHour) {
        const isCardinal = hour % 6 === 0;
        const isMajor = hour % 3 === 0;

        if (isCardinal) {
          rStart = 198;
          rEnd = 220;
          width = 4;
          color = "var(--md-sys-color-on-surface)";
          // Cardinal label
          const t = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
          );
          const pt = MathUtils.getPt(d, 238, this.cx, this.cy);
          t.setAttribute("x", pt.x);
          t.setAttribute("y", pt.y);
          const labels = { 0: "12am", 6: "6am", 12: "12pm", 18: "6pm" };
          t.textContent = labels[hour] || "";
          t.setAttribute("class", "tick-label");
          parent.append(t);
        } else if (isMajor) {
          rStart = 196;
          rEnd = 208;
          width = 1.5;
          color = "var(--md-sys-color-outline)";
          // 3-hour minor labels
          const t = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
          );
          const pt = MathUtils.getPt(d, 228, this.cx, this.cy);
          t.setAttribute("x", pt.x);
          t.setAttribute("y", pt.y);
          t.textContent = `${hour % 12 || 12}`;
          t.setAttribute("class", "tick-label");
          t.style.opacity = "0.4";
          t.style.fontSize = "9px";
          parent.append(t);
        } else {
          rEnd = 202;
          width = 1;
        }
      } else {
        rStart = 194;
        rEnd = 196;
        color = "rgba(142, 144, 153, 0.15)";
      }

      const p1 = MathUtils.getPt(d, rStart, this.cx, this.cy);
      const p2 = MathUtils.getPt(d, rEnd, this.cx, this.cy);
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", p1.x);
      l.setAttribute("y1", p1.y);
      l.setAttribute("x2", p2.x);
      l.setAttribute("y2", p2.y);
      l.setAttribute("stroke", color);
      l.setAttribute("stroke-width", width);
      l.setAttribute("stroke-linecap", "round");
      parent.append(l);
    }
  }

  drawNowPulseRing() {
    // Pulse ring attached to nowMarker — animation driven by CSS .now-pulse class.
    // Using a CSS class instead of inline style.cssText avoids broken transform-origin
    // coordinates when the parent <g> is rotated.
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", "210");
    circle.setAttribute("cy", "12"); // tip of now-bar
    circle.setAttribute("r", "5");
    circle.setAttribute("fill", "var(--md-sys-color-error)");
    circle.setAttribute("opacity", "0.5");
    circle.id = "nowPulse";
    circle.classList.add("now-pulse"); // B7: CSS drives animation, not inline style

    const nowMarker = this.layers.nowMarker;
    if (nowMarker) nowMarker.prepend(circle);
  }

  updHub() {
    if (!this.layers.hTime) return;
    const activeId = this.store.state.activeId;

    if (activeId) {
      const it = this.store.state.items.find((i) => i.id === activeId);
      if (it) {
        const sm = TimeUtils.toMins(it.start);
        const em = TimeUtils.toMins(it.end);
        const total = (em - sm + 1440) % 1440;
        const now = TimeUtils.getCurrentMins();
        const elapsed = (now - sm + 1440) % 1440;

        let pct = 0;
        let countdownText = "";

        if (elapsed <= total) {
          // Task is currently active
          pct = Math.min((elapsed / total) * 100, 100);
          const remaining = total - elapsed;
          const rh = Math.floor(remaining / 60);
          const rm = remaining % 60;
          countdownText = rh > 0 ? `${rh}h ${rm}m left` : `${rm}m left`;
        } else {
          // Task is in the future
          const timeUntil = (sm - now + 1440) % 1440;
          const uh = Math.floor(timeUntil / 60);
          const um = timeUntil % 60;
          countdownText = uh > 0 ? `in ${uh}h ${um}m` : `in ${um}m`;
          pct = 0;
        }

        // Cache check and update
        if (this._lastHubState.hTime !== `${it.start}–${it.end}`) {
          this.layers.hTime.textContent = `${it.start}–${it.end}`;
          this._lastHubState.hTime = `${it.start}–${it.end}`;
        }
        const timeSize = "clamp(18px, 14cqw, 32px)";
        if (this._lastHubState.hTimeFontSize !== timeSize) {
          this.layers.hTime.style.fontSize = timeSize;
          this._lastHubState.hTimeFontSize = timeSize;
        }

        if (this._lastHubState.hTask !== it.label) {
          this.layers.hTask.textContent = it.label;
          this._lastHubState.hTask = it.label;
        }
        if (this._lastHubState.hTaskClass !== "hub-task-name md-typescale-title-large") {
          this.layers.hTask.className = "hub-task-name md-typescale-title-large";
          this._lastHubState.hTaskClass = "hub-task-name md-typescale-title-large";
        }
        if (this._lastHubState.hTaskColor !== "") {
          this.layers.hTask.style.color = ""; // let CSS govern
          this._lastHubState.hTaskColor = "";
        }

        if (this._lastHubState.hAmPm !== "TASK") {
          this.layers.hAmPm.textContent = "TASK";
          this._lastHubState.hAmPm = "TASK";
        }
        if (this._lastHubState.hAmPmColor !== it.color) {
          this.layers.hAmPm.style.color = it.color;
          this._lastHubState.hAmPmColor = it.color;
        }

        if (this._lastHubState.hCount !== countdownText) {
          this.layers.hCount.textContent = countdownText;
          this._lastHubState.hCount = countdownText;
        }

        // Context-aware ARIA
        const ariaLabel = `Selected task: ${it.label}. ${countdownText}. Start time ${TimeUtils.toDisplayTime(it.start)}, End time ${TimeUtils.toDisplayTime(it.end)}. Double tap to edit.`;
        if (this._lastHubState.ariaLabel !== ariaLabel) {
            this.layers.hub.setAttribute("aria-label", ariaLabel);
            this._lastHubState.ariaLabel = ariaLabel;
        }

        if (this._lastHubState.hFillPct !== pct) {
          this.layers.hFill.style.strokeDasharray = `${pct} 100`;
          this._lastHubState.hFillPct = pct;
        }
        if (this._lastHubState.hFillColor !== it.color) {
          this.layers.hFill.style.stroke = it.color;
          this._lastHubState.hFillColor = it.color;
        }
      }
    } else {
      const now = new Date();
      let h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const amp = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;

      const items = this.store.state.items || [];
      // Check if any task is currently running
      const nowMins = TimeUtils.getCurrentMins();
      const current = items.find((it) => {
        const sm = TimeUtils.toMins(it.start);
        const em = TimeUtils.toMins(it.end);
        return em < sm
          ? nowMins >= sm || nowMins < em
          : nowMins >= sm && nowMins < em;
      });

      const timeStr = `${h}:${m.toString().padStart(2, "0")}`;
      if (this._lastHubState.hTime !== timeStr) {
        this.layers.hTime.textContent = timeStr;
        this._lastHubState.hTime = timeStr;
      }
      const timeSize = "clamp(24px, 20cqw, 48px)";
      if (this._lastHubState.hTimeFontSize !== timeSize) {
        this.layers.hTime.style.fontSize = timeSize;
        this._lastHubState.hTimeFontSize = timeSize;
      }

      if (this._lastHubState.hAmPm !== amp) {
        this.layers.hAmPm.textContent = amp;
        this._lastHubState.hAmPm = amp;
      }
      const ampmColor = "var(--md-sys-color-on-surface-variant)";
      if (this._lastHubState.hAmPmColor !== ampmColor) {
        this.layers.hAmPm.style.color = ampmColor;
        this._lastHubState.hAmPmColor = ampmColor;
      }

      let taskStr, taskClass, taskColor;
      
      if (current) {
        taskStr = current.label;
        taskClass = "md-typescale-title-large";
        taskColor = ""; // Let CSS handle primary color
      } else if (items.length > 0) {
        // Find next upcoming task
        let nextTask = null;
        let minDiff = Infinity;
        items.forEach(it => {
            const sm = TimeUtils.toMins(it.start);
            const diff = (sm - nowMins + 1440) % 1440;
            if (diff > 0 && diff < minDiff) {
                minDiff = diff;
                nextTask = it;
            }
        });
        
        if (nextTask) {
            taskStr = `Next: ${nextTask.label}`;
            taskClass = "md-typescale-title-medium";
            taskColor = "var(--md-sys-color-on-surface-variant)";
        } else {
            taskStr = "Free schedule";
            taskClass = "md-typescale-title-medium";
            taskColor = "var(--md-sys-color-on-surface-variant)";
        }
      } else {
        taskStr = "Clear schedule";
        taskClass = "md-typescale-title-medium";
        taskColor = "var(--md-sys-color-on-surface-variant)";
      }

      if (this._lastHubState.hTask !== taskStr) {
        this.layers.hTask.textContent = taskStr;
        this._lastHubState.hTask = taskStr;
      }
      if (this._lastHubState.hTaskColor !== taskColor) {
        this.layers.hTask.style.color = taskColor;
        this._lastHubState.hTaskColor = taskColor;
      }
      if (this._lastHubState.hTaskClass !== `hub-task-name ${taskClass}`) {
        this.layers.hTask.className = `hub-task-name ${taskClass}`;
        this._lastHubState.hTaskClass = `hub-task-name ${taskClass}`;
      }

      // Context-aware ARIA for idle state
      const ariaLabel = `Current time: ${timeStr} ${amp}. ${taskStr}.`;
      if (this._lastHubState.ariaLabel !== ariaLabel) {
          this.layers.hub.setAttribute("aria-label", ariaLabel);
          this._lastHubState.ariaLabel = ariaLabel;
      }

      // I9: If a task is currently running, show its real progress instead of seconds
      if (current) {
        const csm = TimeUtils.toMins(current.start);
        const cem = TimeUtils.toMins(current.end);
        const ctotal = (cem - csm + 1440) % 1440;
        const celapsed = (nowMins - csm + 1440) % 1440;
        const cpct = ctotal > 0 ? Math.min((celapsed / ctotal) * 100, 100) : 0;

        if (this._lastHubState.hFillPct !== cpct) {
          this.layers.hFill.style.strokeDasharray = `${cpct} 100`;
          this._lastHubState.hFillPct = cpct;
        }
        const fillColor = current.color;
        if (this._lastHubState.hFillColor !== fillColor) {
          this.layers.hFill.style.stroke = fillColor;
          this._lastHubState.hFillColor = fillColor;
        }
      } else {
        // Continuous smooth seconds sweep using ms
        const ms = performance.now();
        const baseS = (now.getSeconds() + now.getMilliseconds() / 1000);
        const floatPct = (baseS / 60) * 100;
        const pct = Math.round(floatPct * 100) / 100; // cache optimization
        
        if (this._lastHubState.hFillPct !== pct) {
          this.layers.hFill.style.strokeDasharray = `${pct} 100`;
          this._lastHubState.hFillPct = pct;
        }
        const fillColor = "var(--md-sys-color-primary)";
        if (this._lastHubState.hFillColor !== fillColor) {
          this.layers.hFill.style.stroke = fillColor;
          this._lastHubState.hFillColor = fillColor;
        }
      }

      // Countdown text logic
      let countStr = "";
      if (current) {
         // Show time left for current running task
         const csm = TimeUtils.toMins(current.start);
         const cem = TimeUtils.toMins(current.end);
         const ctotal = (cem - csm + 1440) % 1440;
         const celapsed = (nowMins - csm + 1440) % 1440;
         const remaining = ctotal - celapsed;
         
         const rh = Math.floor(remaining / 60);
         const rm = remaining % 60;
         countStr = rh > 0 ? `${rh}h ${rm}m left` : `${rm}m left`;
      } else {
         // Default fallback count
         countStr = items.length > 0
            ? `${items.length} task${items.length > 1 ? "s" : ""}`
            : "Tap ring to add";
      }

      if (this._lastHubState.hCount !== countStr) {
        this.layers.hCount.textContent = countStr;
        this._lastHubState.hCount = countStr;
      }
    }
  }

  _updateLoop() {
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    const angle = (m / 1440) * 360;
    
    if (this.layers.nowMarker) {
      const transform = `rotate(${angle} 210 210)`;
      if (this._lastHubState.nowMarkerTransform !== transform) {
        this.layers.nowMarker.setAttribute("transform", transform);
        this._lastHubState.nowMarkerTransform = transform;
      }
    }
    
    // Throttle hub updates to seconds boundary or when dirty
    const currentSecond = now.getSeconds();
    if (this._lastHubState.lastUpdatedSecond !== currentSecond || this._hubDirty || this.store.state.items.length === 0 || !this.store.state.activeId) {
       this.updHub();
       this._lastHubState.lastUpdatedSecond = currentSecond;
       this._hubDirty = false;
    }
    
    this._rafId = requestAnimationFrame(this.updateLoop);
  }
}
