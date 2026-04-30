
/** Personality traits in 0-7 */
export interface Traits {

    /** Packed integer representing all 4 traits in 0-4095 */
    value: number;

    /** Movement trait in 0-7 */
    movement: number;

    /** Speech trait in 0-7 */
    speech: number;

    /** Energy trait in 0-7 */
    energy: number;

    /** Thinking trait in 0-7 */
    thinking: number;

}

class TraitsImpl implements Traits {

    private _value: number;

    constructor() {
        this._value = 0;
    }

    //

    get value(): number {
        return this._value;
    }

    set value(n: number) {
        this._value = n & 0o7777;
    }

    get movement(): number {
        return this._getTrait(9);
    }

    set movement(n: number) {
        this._setTrait(9, n);
    }

    get speech(): number {
        return this._getTrait(6);
    }

    set speech(n: number) {
        this._setTrait(6, n);
    }

    get energy(): number {
        return this._getTrait(3);
    }

    set energy(n: number) {
        this._setTrait(3, n);
    }

    get thinking(): number {
        return this._getTrait(0);
    }

    set thinking(n: number) {
        this._setTrait(0, n);
    }

    private _getTrait(shift: 0 | 3 | 6 | 9): number {
        return (this._value >> shift) & 7;
    }

    private _setTrait(shift: 0 | 3 | 6 | 9, value: number): void {
        this._value = (this._value & (~(7 << shift))) | ((value & 7) << shift);
    }

    [Symbol.toPrimitive](hint: string) {
        if ("string" === hint) return this.toString();
        return this._value;
    }

    get [Symbol.toStringTag](): string {
        return "Traits";
    }

}

export const Traits = ((): Traits => {
    return new TraitsImpl();
});
