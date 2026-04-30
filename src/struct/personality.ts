import {Rank} from "./rank.ts";
import type {Traits} from "./trait.ts";
import traitLut from "../data/traitLut.ts";
import {Color} from "../ui/color.ts";

//

/**
 * 3 lines of personality description.
 */
type PersonalityDescription = readonly [ string, string, string ];

/**
 * Represents a full personality type
 * with category (rank) and sub-category (file).
 */
export interface Personality {

    /** Print name of this personality (e.g. Dynamo) */
    readonly name: string;

    /** Category (rank) of this personality */
    readonly rank: Rank;

    /** Sub-category (file) of this personality in 0-3 */
    readonly file: number;

    /** Internal ordinal value in 0-15 */
    readonly value: number;

    /** Color which uniquely represents this personality type */
    readonly color: Color;

    /** Description of this personality type */
    readonly description: PersonalityDescription;

    /** Full name of this personality (e.g. Outgoing: Dynamo) */
    toString(): string;

}

class PersonalityImpl implements Personality {

    readonly name: string;
    readonly rank: Rank;
    readonly file: number;
    readonly color: Color;
    readonly description: PersonalityDescription;

    constructor(name: string, rank: Rank, file: number, color: Color, description: PersonalityDescription) {
        if (file < 0 || file > 3)
            throw new Error(`value out of range (expected 0-3, got ${file})`);

        this.name = name;
        this.rank = rank;
        this.file = file;
        this.color = color;
        this.description = description;
    }

    //

    get value(): number {
        return (this.rank.value << 2) | this.file;
    }

    toString(): string {
        return `${this.rank.name}: ${this.name}`;
    }

    get [Symbol.toStringTag](): string {
        return "Personality";
    }

}

type PersonalityUtil = {
    values(rank?: Rank): Personality[];
    of(value: number): Personality;
    fromTraits(traits: Traits): Personality;
};

export const Personality: PersonalityUtil = (() => {
    const values: Personality[] = new Array(16);
    const register = ((name: string, rank: Rank, file: number, hexColor: string, d0: string, d1: string, d2: string) => {
        const instance = new PersonalityImpl(name, rank, file, Color.hex(hexColor), Object.freeze([ d0, d1, d2 ]));
        values[instance.value] = instance;
    });

    register("Sweetie",       Rank.CONSIDERATE, 0, `#feeac1`, `Empathetic and sentimental.`, `Sensitive, emotional, and in`, `tune with the feelings of others.`);
    register("Buddy",         Rank.CONSIDERATE, 1, `#fee5a0`, `Trustworthy and considerate. Puts`, `their friends first and works hard to`, `make sure everyone gets along.`);
    register("Cheerleader",   Rank.CONSIDERATE, 2, `#fef1a0`, `Positive, enthusiastic, and always`, `beaming. Smiles for their own sake`, `and to help others smile too.`);
    register("Daydreamer",    Rank.CONSIDERATE, 3, `#fed9ab`, `Idealistic and romantic. Often has`, `their head in the clouds, but finds`, `a lot of great ideas up there.`);
    register("Charmer",       Rank.OUTGOING,    0, `#fec6cf`, `Radiant and always on form. Their`, `effortless style is admired by all.`, `Easily adapts to new situations.`);
    register("Go-Getter",     Rank.OUTGOING,    1, `#fcaca5`, `Bold and captivating. Their wit and`, `charm light up a room. It's never a`, `dull moment when they're around!`);
    register("Merrymaker",    Rank.OUTGOING,    2, `#febeae`, `Outgoing and pleasant to be around.`, `Makes friends easily, and can turn`, `any bad situation into a good one.`);
    register("Dynamo",        Rank.OUTGOING,    3, `#fcb79d`, `Assertive and highly regarded.`, `Trusts their own instincts, and easily`, `commands the respect of others.`);
    register("Strategist",    Rank.RESERVED,    0, `#c8e7a5`, `Unique, carefree, creative, laid-back.`, `They're self-reliant, doing things their`, `own way and thinking outside the box.`);
    register("Perfectionist", Rank.RESERVED,    1, `#a4dfc1`, `Imaginative and inspired. Happiest`, `when creating something. Finds`, `beauty in everyone and everything.`);
    register("Observer",      Rank.RESERVED,    2, `#aac2ba`, `Self-sufficient and highly individual.`, `Doesn't show much outward emotion,`, `but has a lot going on deep down.`);
    register("Thinker",       Rank.RESERVED,    3, `#a6cea6`, `Thoughtful and introspective. Great`, `at thinking things through and`, `analyzing issues from every angle.`);
    register("Achiever",      Rank.AMBITIOUS,   0, `#bae9f1`, `Diligent, productive, and highly`, `efficient. Equally as skilled at`, `planning and executing plans.`);
    register("Visionary",     Rank.AMBITIOUS,   1, `#aac9f2`, `Risk taking and ambitious, Full of`, `energy and acts on many whims.`, `Once they start, they don't stop!`);
    register("Rogue",         Rank.AMBITIOUS,   2, `#b6b8f1`, `Intelligent and not afraid to show it.`, `Knowledgeable in a wide range of`, `subjects. Answers with confidence.`);
    register("Maverick",      Rank.AMBITIOUS,   3, `#cbbaf2`, `A determined self-starter. Cuts their`, `own path, letting nothing stand in`, `their way. Quick to execute plans.`);

    return Object.freeze({
        values(rank?: Rank): Personality[] {
            if (!rank) return [...values];
            const start = rank.value << 2;
            return values.slice(start, start + 4);
        },
        of(value: number): Personality {
            if (value < 0 || value > 15) throw new Error(`illegal value (expected 0-15, got ${value})`);
            return values[value];
        },
        fromTraits(traits: Traits): Personality {
            return values[traitLut(traits.value)];
        }
    });
})();
