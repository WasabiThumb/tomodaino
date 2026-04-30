
type GraphicsExtensions = {
    fontFamily: string,
    fontSize: number,
    fontWeight: string | number
};

const INITIAL_EXT: GraphicsExtensions = Object.freeze({
    fontFamily: "system-ui, sans-serif",
    fontSize: 12,
    fontWeight: "normal"
});

const PATCHED_SYMBOL = Symbol("graphicsPatched");

/**
 * Canvas 2D rendering context
 * extended with custom properties
 */
export type Graphics = Omit<CanvasRenderingContext2D, "font"> & GraphicsExtensions;

/** @internal */
export const intoGraphics = ((ctx: CanvasRenderingContext2D): Graphics => {
    if (PATCHED_SYMBOL in ctx) return ctx as unknown as Graphics;

    const stack: GraphicsExtensions[] = [];
    const ext: GraphicsExtensions = {...INITIAL_EXT};
    const updateFont = (() => ctx.font = `${ext.fontWeight} ${ext.fontSize}px ${ext.fontFamily}`);
    updateFont();

    if (!("fontFamily" in ctx)) {
        Object.defineProperty(ctx, "fontFamily", {
            enumerable: true,
            configurable: false,
            get(): any {
                return ext.fontFamily;
            },
            set(v: any) {
                ext.fontFamily = !!v ? `${v}` : INITIAL_EXT.fontFamily;
                updateFont();
            }
        });
    }

    if (!("fontSize" in ctx)) {
        Object.defineProperty(ctx, "fontSize", {
            enumerable: true,
            configurable: false,
            get(): any {
                return ext.fontSize;
            },
            set(v: any) {
                ext.fontSize = Number(v);
                updateFont();
            }
        });
    }

    if (!("fontWeight" in ctx)) {
        Object.defineProperty(ctx, "fontWeight", {
            enumerable: true,
            configurable: false,
            get(): any {
                return ext.fontWeight;
            },
            set(v: any) {
                ext.fontWeight = !!v ? `${v}` : INITIAL_EXT.fontWeight;
                updateFont();
            }
        });
    }

    // Patch #save()
    if ("save" in ctx) {
        const baseSave = ctx.save;
        const newSave = (() => {
            baseSave.apply(ctx);
            stack.push({...ext});
        });
        Object.defineProperty(ctx, "save", { value: newSave });
    }

    // Patch #restore()
    if ("restore" in ctx) {
        const baseRestore = ctx.restore;
        const newRestore = (() => {
            baseRestore.apply(ctx);
            if (stack.length === 0) return;
            const old = stack.splice(stack.length - 1, 1)[0];
            Object.assign(ext, old);
        });
        Object.defineProperty(ctx, "restore", { value: newRestore });
    }

    // Patch #reset()
    if ("reset" in ctx) {
        const baseReset = ctx.reset;
        const newReset = (() => {
            baseReset.apply(ctx);
            Object.assign(ext, INITIAL_EXT);
            stack.length = 0;
            updateFont();
        });
        Object.defineProperty(ctx, "reset", { value: newReset });
    }

    Object.defineProperty(ctx, PATCHED_SYMBOL, {
        enumerable: false,
        writable: false,
        value: true
    });

    return ctx as unknown as Graphics;
});
