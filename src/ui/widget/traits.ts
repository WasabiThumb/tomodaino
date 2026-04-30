import {type WidgetContext} from "../widget.ts";
import {Color} from "../color.ts";
import {Traits} from "../../struct/trait.ts";
import type {Graphics} from "../graphics.ts";
import {HoverState} from "../hover.ts";
import {LabelledWidget} from "./labelled.ts";

//

/** Height of the widget label */
const LABEL_HEIGHT = 12;

/** Simple SVG for the radio tick */
const drawRadioTick = ((d: string) => {
    const path = new Path2D(d);
    return ((g: Graphics, x: number, y: number, w: number, h: number) => {
        if (w <= 0 || h <= 0) return;
        g.save();
        g.transform(w / 64, 0, 0, h / 64, x, y);
        g.lineWidth = 12;
        g.strokeStyle = `#fff`;
        g.lineCap = `round`;
        g.lineJoin = `round`;
        g.stroke(path);
        g.restore();
    });
})(`m9 31s6.9 13.8 13 13c8-1 31-28 31-28`);

/** Index of a cell in a bar */
type CellIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Describes how to draw a bar */
type BarSpec = {
    /** Label for the bar */
    label: string,

    /** Label for the low extent of the bar */
    labelLo: string,

    /** Label for the high extent of the bar */
    labelHi: string,

    /** Y offset to draw the bar at */
    y: number,

    /** Getter for opacity of a cell (0 - 1) */
    getOpacity(buf: Uint8Array, cell: CellIndex): number,

    /** Setter for opacity of a cell (0 - 1) */
    setOpacity(buf: Uint8Array, cell: CellIndex, opacity: number): void,

    /** Getter for the trait value */
    value(traits: Traits): number
};

/** Helper to create a new bar */
const barSpec = ((label: string, labelLo: string, labelHi: string, index: number, key: keyof Traits): BarSpec => {
    const opacityOffset = index << 3;
    return Object.freeze({
        label,
        labelLo,
        labelHi,
        y: LABEL_HEIGHT + 18 * index,
        getOpacity(buf: Uint8Array, cell: number): number {
            return buf[opacityOffset | cell] / 255;
        },
        setOpacity(buf: Uint8Array, cell: CellIndex, opacity: number) {
            let v = opacity * 255;
            v = v < 127 ? Math.floor(v) : Math.ceil(v);
            buf[opacityOffset | cell] = v;
        },
        value(traits: Traits): number {
            return traits[key];
        }
    });
});

/** List of bars */
const BARS: readonly BarSpec[] = Object.freeze([
    barSpec("Movement", "Slow",    "Quick",  0, "movement"),
    barSpec("Speech",   "Polite",  "Honest", 1, "speech"  ),
    barSpec("Energy",   "Flat",    "Varied", 2, "energy"  ),
    barSpec("Thinking", "Serious", "Chill",  3, "thinking")
]);

const RANDOMIZE_ACTION = new class implements LabelledWidget.Action<TraitsWidget> {

    readonly name: string = "Randomize";

    drawIcon(g: Graphics): void {
        // Draw a die

        g.beginPath();
        g.moveTo(0.0625, 0.1875);
        g.lineTo(0.5, 0.0625);
        g.lineTo(0.9375, 0.1875);
        g.lineTo(0.9375, 0.8125);
        g.lineTo(0.5, 0.9375);
        g.lineTo(0.0625, 0.8125);
        g.fill();

        g.globalCompositeOperation = "destination-out";

        g.beginPath();
        g.ellipse(0.171875, 0.375, 0.046875, 0.0625, 0, 0, 2 * Math.PI);
        g.fill();

        g.beginPath();
        g.ellipse(0.390625, 0.75, 0.046875, 0.0625, 0, 0, 2 * Math.PI);
        g.fill();

        g.beginPath();
        g.ellipse(0.5, 0.1875, 0.0625, 0.03125, 0, 0, 2 * Math.PI);
        g.fill();

        g.beginPath();
        g.ellipse(0.828125, 0.375, 0.046875, 0.0625, 0, 0, 2 * Math.PI);
        g.fill();

        g.beginPath();
        g.ellipse(0.734375, 0.5625, 0.046875, 0.0625, 0, 0, 2 * Math.PI);
        g.fill();

        g.beginPath();
        g.ellipse(0.609375, 0.75, 0.046875, 0.0625, 0, 0, 2 * Math.PI);
        g.fill();

        g.globalCompositeOperation = "source-over";

        g.fillStyle = `#0002`;
        g.beginPath();
        g.moveTo(0.0625, 0.1875);
        g.lineTo(0.5, 0.0625);
        g.lineTo(0.9375, 0.1875);
        g.lineTo(0.5, 0.3125);
        g.fill();

        g.fillStyle = `#0003`;
        g.beginPath();
        g.moveTo(0.0625, 0.1875);
        g.lineTo(0.5, 0.3125);
        g.lineTo(0.5, 0.9375);
        g.lineTo(0.0625, 0.8125);
        g.fill();
    }

    execute(w: TraitsWidget): void {
        w.traits.value = Math.floor(Math.random() * 0o10000);
    }

}

//

export default class TraitsWidget extends LabelledWidget {

    readonly label: string = "Input";
    readonly labelHeight: number = LABEL_HEIGHT;
    readonly traits: Traits;
    private readonly radioOpacity: Uint8Array;

    constructor(ctx: WidgetContext) {
        super(ctx);
        this.traits = Traits();
        this.radioOpacity = new Uint8Array(32);
    }

    //

    protected registerActions(register: LabelledWidget.ActionRegisterFunction<this>) {
        register(RANDOMIZE_ACTION);
        register(LabelledWidget.StandardActions.DRAG);
    }

    get width(): number {
        return 192;
    }

    get height(): number {
        return LABEL_HEIGHT + 70;
    }

    render(g: Graphics, delta: number) {
        super.render(g, delta);
        for (const bar of BARS) {
            this.renderBar(g, delta, bar);
        }
    }

    hover(x: number, y: number): HoverState {
        const cell = this.cellAt(x, y);
        return !cell ? super.hover(x, y) : HoverState.cursor("pointer");
    }

    pointerDown(x: number, y: number, capture: () => void) {
        super.pointerDown(x, y, capture);
        const cell = this.cellAt(x, y);
        if (!cell) return;
        const [ level, row ] = cell;
        switch (row) {
            case 0:
                this.traits.movement = level;
                break;
            case 1:
                this.traits.speech = level;
                break;
            case 2:
                this.traits.energy = level;
                break;
            case 3:
                this.traits.thinking = level;
                break;
        }
    }

    private renderBar(g: Graphics, delta: number, bar: BarSpec) {
        const { label, labelLo, labelHi, y } = bar;
        const value = bar.value(this.traits);
        const u = Math.min(delta * 24, 1);
        const v = 1 - u;

        g.fillStyle = Color.PANEL_BG_YELLOW;
        g.beginPath();
        g.roundRect(0, y, 192, 16, 8);
        g.fill();

        g.fillStyle = Color.PANEL_FG_BLACK;
        g.fontSize = 8;
        g.fontWeight = 900;
        g.textBaseline = "top";
        g.textAlign = "left";
        g.fillText(label, 6, y + 5);

        g.fontWeight = 700;
        g.fontSize = 6;
        g.fillText(labelHi, 166, y + 6);

        g.textAlign = "right";
        g.fillText(labelLo, 75, y + 6);

        for (let i = 0; i < 8; i++) {
            let curOpacity: number = bar.getOpacity(this.radioOpacity, i as CellIndex);
            const targetOpacity: number = (i === value) ? 1 : 0;

            if (curOpacity !== targetOpacity) {
                curOpacity = v * curOpacity + u * targetOpacity;
                bar.setOpacity(this.radioOpacity, i as CellIndex, curOpacity);
            }

            if (curOpacity !== 1) {
                g.fillStyle = Color[("RADIO_" + i) as keyof Color];
                g.beginPath();
                g.roundRect(78 + 11 * i, y + 4, 8, 8, 2);
                g.fill();
            }

            if (curOpacity !== 0) {
                const bs = 8 + 2 * curOpacity;
                const bp = (10 - bs) / 2;

                g.globalAlpha = curOpacity;
                g.fillStyle = Color.RADIO_SELECTION;
                g.beginPath();
                g.roundRect(77 + 11 * i + bp, y + 3 + bp, bs, bs, 2);
                g.fill();
                g.globalAlpha = 1;

                const f = 3 * Math.pow(curOpacity, 2) - 2 * Math.pow(curOpacity, 3);
                const ts = 8 * f;
                const tp = (8 - ts) / 2;
                drawRadioTick(g, 78 + 11 * i + tp, y + 4 + tp, ts, ts);
            }
        }
    }

    private cellAt(x: number, y: number): [ number, number ] | null {
        y -= LABEL_HEIGHT;
        if (x < 77 || x >= 164) return null;
        let by: number = 3;
        for (let row = 0; row < 4; row++) {
            if (y >= by && y < (by + 10)) {
                let column: number;
                if (x < 78) {
                    column = 0;
                } else if (x >= 163) {
                    column = 7;
                } else {
                    column = Math.floor((x - 78) * (8 / 85));
                }
                return [ column, row ];
            }
            by += 18;
        }
        return null;
    }

}
