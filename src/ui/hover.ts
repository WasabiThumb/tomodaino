
type CursorState = "pointer" | "grab" | "grabbing";

/**
 * Determines what to do when
 * hovering over a widget
 */
export type HoverState = {
    readonly cursor: CursorState | null;
    readonly tooltip: string | null;
};

//

export namespace HoverState {

    export interface Builder {
        cursor(cursor: CursorState | null): this;
        tooltip(tooltip: string | null): this;
        build(): HoverState;
    }

    class BuilderImpl implements Builder {

        private _cursor: CursorState | null = null;
        private _tooltip: string | null = null;

        //

        cursor(cursor: CursorState | null): this {
            this._cursor = !!cursor ? cursor : null;
            return this;
        }

        tooltip(tooltip: string | null): this {
            this._tooltip = !!tooltip ? tooltip : null;
            return this;
        }

        build(): HoverState {
            return Object.freeze({
                cursor: this._cursor,
                tooltip: this._tooltip
            });
        }

    }

    const EMPTY: HoverState = Object.freeze({
        cursor: null,
        tooltip: null
    });

    export function builder(): Builder {
        return new BuilderImpl();
    }

    export function empty(): HoverState {
        return EMPTY;
    }

    export function cursor(cursor: CursorState | null): HoverState {
        return HoverState.builder()
            .cursor(cursor)
            .build();
    }

    export function tooltip(tooltip: string | null): HoverState {
        return HoverState.builder()
            .tooltip(tooltip)
            .build();
    }

}
