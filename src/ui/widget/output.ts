import {LabelledWidget} from "./labelled.ts";
import type {WidgetContext} from "../widget.ts";
import type {Graphics} from "../graphics.ts";
import {Color} from "../color.ts";
import TraitsWidget from "./traits.ts";
import {Personality} from "../../struct/personality.ts";

//

/** Height of the widget label */
const LABEL_HEIGHT = 12;

/** Used to pass render state from the PersonalityQueue to the OutputWidget */
type PersonalityRenderCommand = {
    readonly personality: Personality,
    readonly visibility: number
};

/** Keeps track of transitions when the personality to display changes */
class PersonalityQueue {

    private readonly _buf: Personality[];
    private _head: number;
    private _progress: number;

    constructor(initial: Personality) {
        this._buf = new Array(3);
        this._buf[0] = initial;
        this._head = 0;
        this._progress = 1;
    }

    //

    setTarget(personality: Personality): void {
        if (personality.value === this._buf[this._head].value) return;
        if (this._head == 0) this._progress = 0;
        this._buf[this._head === 2 ? 2 : ++this._head] = personality;
    }

    update(delta: number): PersonalityRenderCommand[] {
        if (this._head === 0)
            return [ { personality: this._buf[0], visibility: 1 } ];

        const rateOfChange = 6 * delta;
        const n = this._progress + rateOfChange;
        if (n >= 1) {
            if (this._head === 1) {
                this._buf[0] = this._buf[1];
                this._head = 0;
            } else {
                for (let i = 0; i < 2; i++) this._buf[i] = this._buf[i + 1];
                this._head = 1;
            }
            this._progress = 0;
            return [ { personality: this._buf[0], visibility: 1 } ];
        }

        this._progress = n;
        return [
            { personality: this._buf[0], visibility: 1 },
            { personality: this._buf[1], visibility: 1 - Math.pow(n - 1, 4) }
        ];
    }

}

//

export default class OutputWidget extends LabelledWidget {

    readonly label = "Output";
    readonly labelHeight = LABEL_HEIGHT;
    readonly width = 128;
    readonly height = LABEL_HEIGHT + 128;
    private readonly _traitsWidget: TraitsWidget;
    private readonly _queue: PersonalityQueue;

    constructor(ctx: WidgetContext) {
        super(ctx);
        this._traitsWidget = ctx.findWidget(TraitsWidget);
        this._queue = new PersonalityQueue(Personality.fromTraits(this._traitsWidget.traits));
    }

    //

    protected registerActions(register: LabelledWidget.ActionRegisterFunction<this>) {
        register(LabelledWidget.StandardActions.DRAG);
    }

    render(g: Graphics, delta: number) {
        super.render(g, delta);
        g.translate(0, LABEL_HEIGHT);

        const queue = this._queue;
        queue.setTarget(Personality.fromTraits(this._traitsWidget.traits));
        for (const cmd of queue.update(delta)) {
            const size = 128 * cmd.visibility;
            const pad = (128 - size) / 2;
            const scale = size / 128;
            g.save();
            g.transform(scale, 0, 0, scale, pad, pad);
            this.renderPersonality(g, cmd.personality);
            g.restore();
        }
    }

    private renderPersonality(g: Graphics, personality: Personality) {
        // TODO: this is rather verbose and can be easily deduplicated

        g.strokeStyle = personality.color;
        g.fillStyle = Color.PANEL_BG_WHITE;
        g.lineWidth = 12;

        g.beginPath();
        g.roundRect(8, 8, 112, 112, 24);
        g.stroke();
        g.fill();

        g.fillStyle = personality.rank.color;
        g.beginPath();
        g.roundRect(32, 0, 64, 16, 8);
        g.fill();

        g.fillStyle = Color.PANEL_FG_WHITE;
        g.fontSize = 8;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fontWeight = 700;
        g.fillText(personality.rank.name, 64, 8);

        g.fillStyle = personality.rank.color;
        g.beginPath();
        g.roundRect(11, 24, 40, 12, 6);
        g.fill();

        g.fillStyle = Color.PANEL_FG_WHITE;
        g.fontSize = 6;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fontWeight = 700;
        g.fillText("At a glance", 31, 30);

        g.fillStyle = Color.PANEL_FG_BLACK;
        g.fontSize = 5;
        g.textAlign = "left";
        g.textBaseline = "middle";
        g.fillText(personality.rank.description[0], 53.5, 30);

        g.fillStyle = personality.rank.color;
        g.beginPath();
        g.roundRect(11, 44, 40, 12, 6);
        g.fill();

        g.fillStyle = Color.PANEL_FG_WHITE;
        g.fontSize = 6;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fontWeight = 700;
        g.fillText("Traits", 31, 50);

        g.fillStyle = Color.PANEL_FG_BLACK;
        g.fontSize = 4.5;
        g.textAlign = "left";
        g.textBaseline = "middle";
        g.fillText(personality.rank.description[1], 53.5, 47);

        g.fillStyle = Color.PANEL_FG_BLACK;
        g.fontSize = 4.5;
        g.textAlign = "left";
        g.textBaseline = "middle";
        g.fillText(personality.rank.description[2], 53.5, 53);

        g.fillStyle = personality.color;
        g.beginPath();
        g.roundRect(11, 67, 106, 49, 24);
        g.fill();

        g.fillStyle = personality.rank.color;
        g.strokeStyle = Color.PANEL_FG_WHITE;
        g.lineWidth = 1.5;
        g.miterLimit = 2;
        g.textAlign = "center";
        g.textBaseline = "top";
        g.fontSize = 7;
        g.strokeText(personality.name, 64, 73);
        g.fillText(personality.name, 64, 73);

        g.fillStyle = Color.PANEL_FG_BLACK;
        g.fontSize = 5;
        g.textAlign = "left";
        g.textBaseline = "top";

        let y: number = 85;
        let maxWidth: number = -1;
        for (const line of personality.description) {
            const { width } = g.measureText(line);
            maxWidth = Math.max(maxWidth, width);
        }

        const x = 11 + (106 - maxWidth) / 2;
        for (const line of personality.description) {
            g.fillText(line, x, y);
            y += 5.5;
        }
    }

}
