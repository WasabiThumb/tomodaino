import {HoverState} from "./hover.ts";
import type {Graphics} from "./graphics.ts";

//

export interface WidgetContext {
    readonly widgets: Iterable<Widget>;
    addWidget<T extends Widget>(type: WidgetClass<T>): T;
    findWidget<T extends Widget>(type: WidgetClass<T>): T;
    removeWidget(widget: Widget): boolean;
}

export abstract class AbstractWidgetContext implements WidgetContext {

    private readonly _registry: { [k: string]: Widget[] } = { };

    //

    get widgets(): Iterable<Widget> {
        const values = Object.values(this._registry);
        return (function *() {
           for (const arr of values) {
               for (const widget of arr) yield widget;
           }
        })();
    }

    addWidget<T extends Widget>(type: WidgetClass<T>): T {
        const instance = new type(this as WidgetContext);
        const className = type.name;
        let array: Widget[];
        if (className in this._registry) {
            array = this._registry[className];
        } else {
            this._registry[className] = array = [];
        }
        array.push(instance);
        return instance;
    }

    findWidget<T extends Widget>(type: WidgetClass<T>): T {
        const array = this._registry[type.name];
        if (!array || array.length === 0) throw new Error(`no widget found with type: ${type.name}`);
        if (array.length !== 1) throw new Error(`multiple widgets found with type: ${type.name}`);
        return array[0] as unknown as T;
    }

    removeWidget(widget: Widget): boolean {
        const className = (widget as unknown as { constructor: Function }).constructor.name;
        const array = this._registry[className];
        if (!array) return false;
        const idx = array.indexOf(widget);
        if (idx === -1) return false;
        array.splice(idx, 1);
        if (array.length === 0) delete this._registry[className];
        return true;
    }

}

export type WidgetClass<T extends Widget> = {
    readonly name: string;
    new(ctx: WidgetContext): T;
};

export interface WidgetEventTarget {
    render(g: Graphics, delta: number): void;
    pointerDown(x: number, y: number, capture: () => void): void;
    pointerUp(x: number, y: number, captured: boolean): void;
    pointerMove(x: number, y: number, dx: number, dy: number, captured: boolean): void;
    hover(x: number, y: number): HoverState;
}

export abstract class Widget implements WidgetEventTarget {

    private readonly position: Float64Array;

    protected constructor(_ctx: WidgetContext) {
        this.position = new Float64Array(2);
    }

    //

    get x(): number {
        return this.position[0];
    }

    set x(value: number) {
        this.position[0] = value;
    }

    get y(): number {
        return this.position[1];
    }

    set y(value: number) {
        this.position[1] = value;
    }

    abstract get width(): number;

    abstract get height(): number;

    render(_g: Graphics, _delta: number): void { }

    pointerDown(_x: number, _y: number, _capture: () => void): void { }

    pointerUp(_x: number, _y: number, _captured: boolean): void { }

    pointerMove(_x: number, _y: number, _dx: number, _dy: number, _captured: boolean): void { }

    hover(_x: number, _y: number): HoverState {
        return HoverState.empty();
    }

}
