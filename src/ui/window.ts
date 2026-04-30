import {type WidgetContext, AbstractWidgetContext, Widget} from "./widget.ts";
import {UIMetrics} from "./metrics.ts";
import {type Graphics, intoGraphics} from "./graphics.ts";
import {popcnt32} from "../util/bit.ts";
import type {HoverState} from "./hover.ts";
import {Color} from "./color.ts";

/**
 * Manage the viewport,
 * events and rendering for widgets
 */
export interface Window extends WidgetContext {

    rendering: boolean;

    polling: boolean;

}

//

class Camera {

    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;

    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 640;
        this.height = 480;
        this.zoom = 1;
    }

    //

    get matrix(): [ number, number, number, number, number, number ] {
        const dim = Math.max(this.width, this.height);
        const scale = (this.zoom * dim) / UIMetrics.VIEWPORT;
        const ox = (this.width / 2) - (this.x * scale);
        const oy = (this.height / 2) - (this.y * scale);
        return [ scale, 0, 0, scale, ox, oy ];
    }

    screenToWorld(x: number, y: number): [ number, number ] {
        const dim = Math.max(this.width, this.height);
        const factor = UIMetrics.VIEWPORT / (this.zoom * dim);
        const ox = x - (this.width / 2);
        const oy = y - (this.height / 2);
        return [ this.x + ox * factor, this.y + oy * factor ];
    }

    screenScalarToWorld(v: number): number {
        const dim = Math.max(this.width, this.height);
        const factor = UIMetrics.VIEWPORT / (this.zoom * dim);
        return factor * v;
    }

    worldToScreen(x: number, y: number): [ number, number ] {
        const dim = Math.max(this.width, this.height);
        const factor = (this.zoom * dim) / UIMetrics.VIEWPORT;
        const rx = (x - this.x) * factor + (this.width / 2);
        const ry = (y - this.y) * factor + (this.height / 2);
        return [ rx, ry ];
    }

}

class Pointers {

    private _down: number;
    private _over: number;
    private _positions: Float64Array;
    capture: { widget: Widget, pointer: number } | null;

    constructor() {
        this._down = 0;
        this._over = 0;
        this._positions = new Float64Array(2);
        this.capture = null;
    }

    //

    get downCount(): number {
        return popcnt32(this._down);
    }

    get downPoints(): Iterable<[number, number]> {
        return this._generateFlaggedPoints(this._down);
    }

    get overCount(): number {
        return popcnt32(this._over);
    }

    get overPoints(): Iterable<[number, number]> {
        return this._generateFlaggedPoints(this._over);
    }

    isDown(id: number): boolean {
        if (!this._checkAdmissiblePointerId(id)) return false;
        return !!(this._down & (1 << id));
    }

    isOver(id: number) {
        if (!this._checkAdmissiblePointerId(id)) return false;
        return !!(this._over & (1 << id));
    }

    delta(id: number, x: number, y: number): [ number, number ] {
        if (!this.isOver(id)) return [ 0, 0 ];
        const offset = id << 1;
        const ox = this._positions[offset];
        const oy = this._positions[offset | 1];
        return [ x - ox, y - oy ];
    }

    pointerDown(id: number, x: number, y: number): void {
        if (!this._checkAdmissiblePointerId(id)) return;
        this._down |= (1 << id);
        this._updatePosition(id, x, y);
    }

    pointerMove(id: number, x: number, y: number): void {
        if (this._checkAdmissiblePointerId(id)) this._updatePosition(id, x, y);
    }

    pointerUp(id: number, x: number, y: number) {
        if (!this._checkAdmissiblePointerId(id)) return;
        this._down &= (~(1 << id));
        this._updatePosition(id, x, y);
    }

    pointerEnter(id: number, x: number, y: number) {
        if (!this._checkAdmissiblePointerId(id)) return;
        this._over |= (1 << id);
        this._updatePosition(id, x, y);
    }

    pointerLeave(id: number) {
        if (!this._checkAdmissiblePointerId(id)) return;
        this._over &= (~(1 << id));
    }

    private _updatePosition(id: number, x: number, y: number): void {
        const required = (id + 1) << 1;
        let target: number = this._positions.length;
        if (target < required) {
            do {
                target <<= 1;
            } while (target < required);
            const cpy = new Float64Array(target);
            cpy.set(this._positions, 0);
            this._positions = cpy;
        }
        const s = id << 1;
        this._positions[s] = x;
        this._positions[s | 1] = y;
    }

    private _checkAdmissiblePointerId(id: number): boolean {
        if (!Number.isSafeInteger(id) || id < 0 || id > 31) {
            console.warn(`ignoring atypical pointer id ${id}`);
            return false;
        }
        return true;
    }

    private _generateFlaggedPoints(f: number): Generator<[number, number]> {
        return (function *(p: Float64Array, f: number) {
            for (let i = 0; i < 32; i++) {
                if (!(f & (1 << i))) continue;
                const s = i << 1;
                yield [ p[s], p[s | 1] ];
            }
        })(this._positions, f);
    }

}

//

class WindowImpl extends AbstractWidgetContext implements Window {

    private static readonly S_RENDERING = 1 << 0;
    private static readonly S_POLLING = 1 << 1;
    private static readonly S_IN_RENDER_LOOP = 1 << 2;

    private readonly element: HTMLCanvasElement;
    private readonly graphics: Graphics;
    private readonly camera: Camera;
    private readonly pointers: Pointers;
    private panPointer: number;
    private font: string;
    private state: number;
    private pollController: AbortController | null;

    constructor(element: HTMLCanvasElement) {
        super();
        const ctx = element.getContext("2d");
        if (!ctx) throw new Error("Failed to acquire 2D rendering context");
        this.element = element;
        this.graphics = intoGraphics(ctx);
        this.pointers = new Pointers();
        this.panPointer = -1;
        this.font = "";
        this.camera = new Camera();
        this.state = 0;
        this.pollController = null;
    }

    //

    get rendering(): boolean {
        return this.getState(WindowImpl.S_RENDERING);
    }

    set rendering(value: boolean) {
        this.setState(WindowImpl.S_RENDERING, value);
        // Bootstrap the render loop
        if (value && !this.getState(WindowImpl.S_IN_RENDER_LOOP)) {
            this.setState(WindowImpl.S_IN_RENDER_LOOP, true);
            this.queueFrame(window.performance.now());
        }
    }

    get polling(): boolean {
        return this.getState(WindowImpl.S_POLLING);
    }

    set polling(value: boolean) {
        this.setState(WindowImpl.S_POLLING, value);
        if (value) {
            // Setup events
            if (!!this.pollController) return;
            const controller = new AbortController();
            this.setupEvents(controller.signal);
            this.pollController = controller;
        } else {
            // Destroy events
            const controller = this.pollController;
            if (!!controller) {
                controller.abort();
                this.pollController = null;
            }
        }
    }

    private getState(flag: number): boolean {
        return (this.state & flag) !== 0;
    }

    private setState(flag: number, value: boolean) {
        if (value) {
            this.state |= flag;
        } else {
            this.state &= ~flag;
        }
    }

    private queueFrame(last: number): void {
        const me = this;
        window.requestAnimationFrame(() => {
            const now = window.performance.now();
            const delta = (now - last) / 1000;
            me.frame(now, delta);
        });
    }

    private frame(now: number, delta: number): void {
        // Clear
        const { width, height } = this.element;
        this.graphics.clearRect(0, 0, width, height);

        // Render
        this.onRenderWidgets(delta);
        this.onRenderOverlay(delta);

        // Queue the next frame or clear the render loop flag
        if (this.getState(WindowImpl.S_RENDERING)) {
            this.queueFrame(now);
        } else {
            this.setState(WindowImpl.S_IN_RENDER_LOOP, false);
        }
    }

    private setupEvents(signal: AbortSignal) {
        const me = this;

        // Pointer events
        this.element.addEventListener("pointerdown", (e) => me.onPointerDown(e), { signal });
        this.element.addEventListener("pointerup", (e) => me.onPointerUp(e), { signal });
        this.element.addEventListener("pointermove", (e) => me.onPointerMove(e), { signal });
        this.element.addEventListener("pointerenter", (e) => me.onPointerEnter(e), { signal });
        this.element.addEventListener("pointerleave", (e) => me.onPointerLeave(e), { signal });
        this.element.addEventListener("contextmenu", (e) => e.preventDefault(), { signal });
        this.element.addEventListener("wheel", (e) => me.onWheel(e), { signal });

        // Resize events
        const updateSize = (() => me.onUpdateSize());
        window.addEventListener("resize", updateSize, { signal });
        updateSize();

        // Style events
        const updateFont = (() => me.onUpdateFont());
        const mutationObserver = new MutationObserver((records, self) => {
            if (signal.aborted) {
                self.disconnect();
            } else if (records.find((r) => r.type === "attributes")) {
                updateFont();
            }
        });
        mutationObserver.observe(this.element, {
            attributes: true,
            attributeFilter: [ "class", "style" ]
        });
        updateFont();
    }

    // Hooks

    private onUpdateSize(): void {
        const { element } = this;
        let { width, height } = element.getBoundingClientRect();
        width = Math.round(width);
        height = Math.round(height);
        this.camera.width = element.width = width;
        this.camera.height = element.height = height;
    }

    private onUpdateFont(): void {
        const { element } = this;
        let { fontFamily } = window.getComputedStyle(element);
        if (!fontFamily) fontFamily = "";
        this.font = fontFamily;
    }

    private onRenderWidgets(delta: number): void {
        const { graphics, camera } = this;
        graphics.save();
        graphics.setTransform(...camera.matrix);
        graphics.fontFamily = this.font;

        for (const widget of this.widgets) {
            graphics.save();
            graphics.translate(widget.x, widget.y);
            widget.render(graphics, delta);
            graphics.restore();
        }

        graphics.restore();
    }

    private onRenderOverlay(delta: number): void {
        const { graphics } = this;
        graphics.save();
        this.element.style.cursor = this.onRenderOverlayInner(delta);
        graphics.restore();
    }

    /** Returns the cursor property to set */
    private onRenderOverlayInner(_delta: number): string {
        const { camera, pointers } = this;

        // Check if we are panning
        if (this.panPointer !== -1) return "move";

        // Check if the dropdown menu should open due to a hold gesture
        // TODO

        // Draw the dropdown menu
        // TODO

        // Check the cursor and hover state
        if (pointers.overCount === 1) {
            const [ point ] = pointers.overPoints;
            const [ px, py ] = point;
            let hover: HoverState | null = null;

            const [ wx, wy ] = camera.screenToWorld(px, py);
            for (const widget of this.widgets) {
                if (wx < widget.x || wy < widget.y) continue;
                const lx = wx - widget.x;
                const ly = wy - widget.y;
                if (lx >= widget.width || ly >= widget.height) continue;
                hover = widget.hover(lx, ly);
                break;
            }

            if (hover) {
                const { tooltip, cursor } = hover;
                if (tooltip) this.onRenderTooltip(px, py, tooltip);
                if (cursor) return cursor;
            }
        }

        return "";
    }

    private onRenderTooltip(x: number, y: number, text: string): void {
        const { graphics, camera } = this;
        const dim = Math.round(Math.min(camera.width, camera.height) * 0.025);

        // Setup font
        graphics.fontFamily = `"Mozilla Text", system-ui, sans-serif`;
        graphics.fontSize = dim;
        graphics.fontWeight = 400;
        graphics.textAlign = "left";
        graphics.textBaseline = "top";

        // Draw bubble
        const metrics = graphics.measureText(text);
        const pad = Math.round(dim / 4);
        const left = x - pad - (metrics.width / 2);
        const top = y + 2 * dim;
        const width = metrics.width + 2 * pad;
        const height = metrics.actualBoundingBoxDescent + 2 * pad;
        graphics.fillStyle = Color.PANEL_FG_BLACK;
        graphics.globalAlpha = 0.4;
        graphics.beginPath();
        graphics.roundRect(left, top, width, height, pad);
        graphics.fill();

        // Draw text
        graphics.fillStyle = Color.PANEL_FG_WHITE;
        graphics.globalAlpha = 1;
        graphics.fillText(text, left + pad, top + pad);
    }

    private onPointerDown(event: PointerEvent): void {
        const { pointerId, pointerType, button, offsetX, offsetY } = event;
        const { pointers } = this;

        if (pointerType === "mouse" && button !== 0) {
            if (button !== 2) return;
            // TODO: open the dropdown menu
            return;
        }

        // Ensure that this is a single tap
        pointers.pointerDown(pointerId, offsetX, offsetY);
        if (pointers.downCount !== 1) return;

        // Tap
        const [ x, y ] = this.camera.screenToWorld(offsetX, offsetY);
        const shortCircuit: [boolean] = [ false ];
        let any: boolean = false;

        for (const widget of this.widgets) {
            if (shortCircuit[0]) break;
            const wx = widget.x;
            const wy = widget.y;
            if (x < wx || y < wy) continue;
            const lx = x - wx;
            const ly = y - wy;
            if (lx >= widget.width || ly >= widget.height) continue;
            any = true;
            widget.pointerDown(lx, ly, () => {
                this.element.setPointerCapture(pointerId);
                pointers.capture = { pointer: pointerId, widget };
                shortCircuit[0] = true;
            });
        }

        // No widget contacted, so we're panning
        if (!any) {
            this.element.setPointerCapture(pointerId);
            this.panPointer = pointerId;
        }
    }

    private onPointerUp(event: PointerEvent): void {
        const { pointers, camera } = this;
        const { pointerId, offsetX, offsetY } = event;
        const { capture } = pointers;

        // Pan
        if (pointerId === this.panPointer) {
            this.element.releasePointerCapture(pointerId);
            this.panPointer = -1;
            return;
        }

        pointers.pointerUp(pointerId, offsetX, offsetY);

        let [ x, y ] = camera.screenToWorld(offsetX, offsetY);
        if (!!capture && pointerId === capture.pointer) {
            const { widget } = capture;
            x -= widget.x;
            y -= widget.y;
            widget.pointerUp(x, y, true);
            // clear the capture state
            pointers.capture = null;
            this.element.releasePointerCapture(pointerId);
        } else {
            for (const widget of this.widgets) {
                const wx = widget.x;
                const wy = widget.y;
                if (x < wx || y < wy) continue;
                const lx = x - wx;
                const ly = y - wy;
                if (lx >= widget.width || ly >= widget.height) continue;
                widget.pointerUp(lx, ly, false);
            }
        }
    }

    private onPointerMove(event: PointerEvent): void {
        const { pointers, camera } = this;
        const { pointerId, offsetX, offsetY } = event;
        const { capture } = pointers;

        // Pan
        if (pointerId === this.panPointer) {
            const [ old ] = pointers.overPoints;
            const [ ox, oy ] = camera.screenToWorld(old[0], old[1]);
            const [ nx, ny ] = camera.screenToWorld(offsetX, offsetY);
            pointers.pointerMove(pointerId, offsetX, offsetY);
            camera.x += ox - nx;
            camera.y += oy - ny;
            return;
        }

        // Pinch
        if (pointers.downCount === 2 && pointers.isDown(pointerId)) {
            // TODO: pinch zoom gesture
        }

        let [ dx, dy ] = pointers.delta(pointerId, offsetX, offsetY);
        pointers.pointerMove(pointerId, offsetX, offsetY);

        let [ x, y ] = camera.screenToWorld(offsetX, offsetY);
        dx = camera.screenScalarToWorld(dx);
        dy = camera.screenScalarToWorld(dy);

        if (!!capture && pointerId === capture.pointer) {
            const { widget } = capture;
            x -= widget.x;
            y -= widget.y;
            widget.pointerMove(x, y, dx, dy, true);
        } else {
            for (const widget of this.widgets) {
                const wx = widget.x;
                const wy = widget.y;
                if (x < wx || y < wy) continue;
                const lx = x - wx;
                const ly = y - wy;
                if (lx >= widget.width || ly >= widget.height) continue;
                widget.pointerMove(lx, ly, dx, dy, false);
            }
        }
    }

    private onPointerEnter(event: PointerEvent) {
        const { pointerId, offsetX, offsetY } = event;
        this.pointers.pointerEnter(pointerId, offsetX, offsetY);
    }

    private onPointerLeave(event: PointerEvent) {
        this.pointers.pointerLeave(event.pointerId);
    }

    private onWheel(event: WheelEvent) {
        const { camera } = this;
        const { deltaY } = event;
        if (Math.abs(deltaY) < 1e-6) return;
        if (deltaY < 0) {
            camera.zoom *= 1.25;
        } else {
            camera.zoom = Math.max(camera.zoom / 1.25, 1e-6);
        }
    }

}

/**
 * Creates a new window for the given canvas.
 * Does nothing until the rendering or polling
 * properties are set.
 */
export const createWindow = ((element: HTMLCanvasElement): Window => {
    return new WindowImpl(element);
});
