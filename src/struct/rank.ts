import {Color} from "../ui/color.ts";

//

/**
 * 3 lines of description
 * (1 line for "at a glance", 2 for "traits")
 */
type RankDescription = readonly [ string, string, string ];

/**
 * Represents a personality
 * type category.
 */
export interface Rank {

    /** Print name of this rank (Considerate, Outgoing, Reserved, Ambitious) */
    readonly name: string;

    /** Internal ordinal value in 0-3 */
    readonly value: number;

    /** Color which uniquely represents this personality type category */
    readonly color: Color;

    /** Description of this rank */
    readonly description: RankDescription;

}

class RankImpl implements Rank {

    readonly name: string;
    readonly value: number;
    readonly color: Color;
    readonly description: RankDescription;

    constructor(name: string, value: number, color: Color, description: RankDescription) {
        if (value < 0 || value > 3)
            throw new Error(`value out of range (expected 0-3, got ${value})`);

        this.name = name;
        this.value = value;
        this.color = color;
        this.description = description;
    }

    //

    toString(): string {
        return this.name;
    }

    [Symbol.toPrimitive](hint: string) {
        if ("string" === hint) return this.name;
        return this.value;
    }

    get [Symbol.toStringTag](): string {
        return "Rank";
    }

}

type RankUtil = {
    readonly CONSIDERATE: Rank;
    readonly OUTGOING: Rank;
    readonly RESERVED: Rank;
    readonly AMBITIOUS: Rank;
    values(): Rank[];
    of(value: number): Rank;
};

export const Rank: RankUtil = (() => {
    const I_CONSIDERATE = 0;
    const I_OUTGOING = 1;
    const I_RESERVED = 2;
    const I_AMBITIOUS = 3;

    const values: Rank[] = new Array(4);
    const register = ((index: number, name: string, hexColor: string, d1: string, d2: string, d3: string) => {
        values[index] = new RankImpl(name, index, Color.hex(hexColor), Object.freeze([ d1, d2, d3 ]));
    });

    register(I_CONSIDERATE, "Considerate", `#f4a400`, `Amicable`,  `Thoughtful, honest, innocent.`,  `Does things at their own pace.`);
    register(I_OUTGOING,    "Outgoing",    `#d90d00`, `Sociable`,  `Optimistic and passionate.`,     `Follows their instincts.`      );
    register(I_RESERVED,    "Reserved",    `#008032`, `Aloof`,     `Logical, tenacious, cautious.`,  `Speaks matter-of-factly.`      );
    register(I_AMBITIOUS,   "Ambitious",   `#1c55cd`, `Confident`, `A by-the-book straight-talker.`, `Puts a premium on results.`    );

    return Object.freeze({
        get CONSIDERATE(): Rank {
            return values[I_CONSIDERATE];
        },
        get OUTGOING(): Rank {
           return values[I_OUTGOING];
        },
        get RESERVED(): Rank {
            return values[I_RESERVED];
        },
        get AMBITIOUS(): Rank {
            return values[I_AMBITIOUS];
        },
        values(): Rank[] {
            return [...values];
        },
        of(value: number): Rank {
            if (value < 0 || value > 3) throw new Error(`illegal value (expected 0-3, got ${value})`);
            return values[value];
        }
    });
})();
