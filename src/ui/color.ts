
/** Unused dummy class */
class ColorImpl { }

/** A color for use in an HTML5 canvas */
export type Color = ColorImpl;

declare global {
    interface CanvasRenderingContext2D {
        fillStyle: Color | string;
        strokeStyle: Color | string;
    }
}

//

const COLOR_CONSTANTS = {
    PANEL_FG_BLACK:   `#022240`,
    PANEL_FG_WHITE:   `#fefefd`,
    PANEL_BG_WHITE:   `#fffaeb`,
    PANEL_BG_YELLOW:  `#fff2cb`,
    RADIO_0:          `#73d291`,
    RADIO_1:          `#8be3a5`,
    RADIO_2:          `#a9edbc`,
    RADIO_3:          `#c2edcf`,
    RADIO_4:          `#ffcd98`,
    RADIO_5:          `#ffbe76`,
    RADIO_6:          `#fdaf56`,
    RADIO_7:          `#ffa238`,
    RADIO_SELECTION:  `#fd5800`,
};

type ColorConstants = {
    [k in keyof typeof COLOR_CONSTANTS]: Color
};

type ColorUtil = ColorConstants & {
    hex(value: string): Color;
};

const colorFromHex = ((hex: string): Color => {
    const { length } = hex;

    if (length > 9 || !(0x2B0 & (1 << length)))
        throw new Error(`hex literal has illegal length (expected 4, 5, 7 or 9; got ${length})`);

    if (0x23 !== hex.charCodeAt(0))
        throw new Error(`hex literal does not start with # symbol`);

    let c: number;
    for (let i = 1; i < length; i++) {
        c = hex.charCodeAt(i);
        if (0x30 <= c && c <= 0x39) continue;
        if (0x41 <= c && c <= 0x46) continue;
        if (0x61 <= c && c <= 0x66) continue;
        throw new Error(`hex literal has illegal character at index ${i}`);
    }

    return hex as unknown as Color;
});

export const Color: ColorUtil = (() => {
    const util: Partial<ColorUtil> = {
        hex: colorFromHex
    };

    for (const key of Object.keys(COLOR_CONSTANTS)) {
        const qual: keyof ColorConstants = key as keyof ColorConstants;
        util[qual] = colorFromHex(COLOR_CONSTANTS[qual]);
    }

    return Object.freeze(util as ColorUtil);
})();
