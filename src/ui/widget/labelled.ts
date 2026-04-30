import {Widget, type WidgetContext} from "../widget.ts";
import type {Graphics} from "../graphics.ts";
import {HoverState} from "../hover.ts";
import {isDarkMode} from "../../util/theme.ts";

//

const EM_FRACTION = 0.6;

/** Identifies special action types */
namespace SpecialActions {

    const SYMBOL = Symbol("specialAction");

    export enum Kind {
        DRAG,
        DELETE
    }

    export const check = ((action: LabelledWidget.Action<any>, kind: Kind): boolean => {
        return SYMBOL in action &&
            kind === (action as unknown as { [SYMBOL]: Kind })[SYMBOL];
    })

    export const mark = ((action: LabelledWidget.Action<any>, kind: Kind): void => {
        Object.defineProperty(action, SYMBOL, {
            value: kind,
            writable: false,
            enumerable: false
        });
    });

}

//

export abstract class LabelledWidget extends Widget {

    readonly abstract label: string;
    readonly abstract labelHeight: number;
    private readonly _parent: WidgetContext;
    private readonly _actions: readonly LabelledWidget.Action<any>[];
    private _dragging: boolean;

    //

    protected constructor(ctx: WidgetContext) {
        super(ctx);
        this._parent = ctx;
        this._actions = ((array: LabelledWidget.Action<any>[]) => {
            this.registerActions((a) => array.push(a));
            array.reverse(); // insertion order = draw order = encounter order
            return Object.freeze(array);
        })([]);
        this._dragging = false;
    }

    //

    protected registerActions(register: LabelledWidget.ActionRegisterFunction<this>): void {
        register(LabelledWidget.StandardActions.DRAG);
        register(LabelledWidget.StandardActions.DELETE);
    }

    render(g: Graphics, delta: number) {
        super.render(g, delta);
        const { width, label, labelHeight } = this;
        const em = Math.round(labelHeight * EM_FRACTION);
        const pad = Math.floor((labelHeight - em) / 2);

        // Push
        g.save();

        // Clear the area
        // g.clearRect(0, 0, width, labelHeight);

        // Set fill and stroke
        const color = isDarkMode() ? `#fff8` : `#000b`;
        g.fillStyle = color;
        g.strokeStyle = color;

        // Draw the label
        g.fontFamily = `"Mozilla Text", system-ui, sans-serif`;
        g.fontSize = em;
        g.textAlign = "left";
        g.textBaseline = "top";
        g.fillText(label, pad, pad);

        // Draw the actions
        let right: number = width - pad;
        for (const action of this._actions) {
            const left = right - em;
            g.save();
            g.transform(em, 0, 0, em, left, pad);
            action.drawIcon(g);
            g.restore();
            right = left - pad;
        }

        // Pop
        g.restore();
    }

    hover(x: number, y: number): HoverState {
        if (this._dragging) return HoverState.cursor("grabbing");
        const action = this._actionAt(x, y);
        if (action != null) {
            return HoverState.builder()
                .tooltip(action.name)
                .cursor(SpecialActions.check(action, SpecialActions.Kind.DRAG) ? "grab" : "pointer")
                .build();
        }
        return super.hover(x, y);
    }

    pointerDown(x: number, y: number, capture: () => void) {
        const action = this._actionAt(x, y);
        if (!action) {
            super.pointerDown(x, y, capture);
            return;
        }

        if (SpecialActions.check(action, SpecialActions.Kind.DRAG)) {
            // Drag
            this._dragging = true;
            capture();
            return;
        }

        if (SpecialActions.check(action, SpecialActions.Kind.DELETE)) {
            // Delete
            this._parent.removeWidget(this);
            return;
        }

        // Other
        action.execute(this);
    }

    pointerMove(x: number, y: number, dx: number, dy: number, captured: boolean) {
        if (!this._dragging || !captured) return super.pointerMove(x, y, dx, dy, captured);
        this.x += dx;
        this.y += dy;
    }

    pointerUp(x: number, y: number, captured: boolean) {
        if (!this._dragging || !captured) return super.pointerUp(x, y, captured);
        this._dragging = false;
    }

    private _actionAt(x: number, y: number): LabelledWidget.Action<any> | null {
        const { width, labelHeight } = this;
        const em = Math.round(labelHeight * EM_FRACTION);
        const pad = Math.floor((labelHeight - em) / 2);
        if (y < pad || y > (pad + em)) return null;

        let right: number = width - pad;
        if (x >= right) return null;

        for (const action of this._actions) {
            const left = right - em;
            if (x >= left) return action;
            right = left - pad;
            if (x >= right) break;
        }

        return null;
    }

}

//

export namespace LabelledWidget {

    export type ActionRegisterFunction<Target extends LabelledWidget> =
        (action: Action<Target>) => void;

    export interface Action<W extends LabelledWidget> {

        /** Name of the action, shown as a tooltip */
        readonly name: string;

        /** Run the click action for this widget */
        execute(widget: W): void;

        /**
         * Draw the action icon.
         * The target area is normalized in [0, 1] and the fill/stroke color is set appropriately.
         */
        drawIcon(graphics: Graphics): void;

    }

    export namespace StandardActions {

        /** Allows the widget to be dragged around the workspace */
        export const DRAG: Action<LabelledWidget> = new class implements Action<LabelledWidget> {

            readonly name = "Drag";

            constructor() {
                SpecialActions.mark(this, SpecialActions.Kind.DRAG);
            }

            execute(_widget: LabelledWidget) {
                // Special action
            }

            drawIcon(g: Graphics) {
                // Draw a waffle
                for (let yi = 0; yi < 3; yi++) {
                    const y = 0.125 + 0.375 * yi;
                    for (let xi = 0; xi < 3; xi++) {
                        const x = 0.125 + 0.375 * xi;
                        g.beginPath();
                        g.ellipse(x, y, 0.125, 0.125, 0, 0, 2 * Math.PI);
                        g.fill();
                    }
                }
            }

        };

        /** Allows the widget to be removed from the workspace */
        export const DELETE: Action<LabelledWidget> = new class implements Action<LabelledWidget> {

            readonly name = "Delete";

            constructor() {
                SpecialActions.mark(this, SpecialActions.Kind.DELETE);
            }

            execute(_widget: LabelledWidget) {
                // Special action
            }

            drawIcon(g: Graphics) {
                // Draw an X
                g.beginPath();
                g.moveTo(0.2, 0.0);
                g.lineTo(0.0, 0.2);
                g.lineTo(0.3, 0.5);
                g.lineTo(0.0, 0.8);
                g.lineTo(0.2, 1.0);
                g.lineTo(0.5, 0.7);
                g.lineTo(0.8, 1.0);
                g.lineTo(1.0, 0.8);
                g.lineTo(0.7, 0.5);
                g.lineTo(1.0, 0.2);
                g.lineTo(0.8, 0.0);
                g.lineTo(0.5, 0.3);
                g.fill();
            }

        }

    }

}
