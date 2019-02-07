export interface BitSet {
  add(bit: number): boolean;
  remove(bit: number): boolean;
  contains(bit: number): boolean;
  count(): number;
}

export class FlatBitSet implements BitSet {
  static NUM_BITS = Uint32Array.BYTES_PER_ELEMENT * 8;

  bits: Uint32Array;

  constructor(initialSize: number = 0) {
    const length = initialSize >> 5;
    this.bits = new Uint32Array(length);
  }

  ensureSize(size: number) {
    if (this.bits.length < size) {
      const newBits = new Uint32Array(size);
      newBits.set(this.bits);
      this.bits = newBits;
    }
  }

  add(bit: number) {
    const pos = bit >> 5;

    this.ensureSize(pos + 1);

    const remainder = bit & 0x1F;

    this.bits[pos] |= 1 << remainder;

    return true;
  }

  remove(bit: number): boolean {
    const bits = this.bits;
    const pos = bit >> 5;

    if (bits.length <= pos) {
      return false;
    }

    const remainder = bit & 0x1F;

    bits[pos] &= ~(1 << remainder);

    return true;
  }

  contains(bit: number) {
    const bits = this.bits;
    const pos = bit >> 5;

    if (bits.length <= pos) {
      return false;
    }

    const remainder = bit & 0x1F;

    return (bits[pos] & (1 << remainder)) !== 0;
  }

  count() {
    let count = 0;
    const bits = this.bits;

    for (let i = 0; i < bits.length; i++) {
      let val = bits[i];

      // Count bits set in val
      val -= ((val >>> 1) & 0x55555555);
      val = (val & 0x33333333) + ((val >>> 2) & 0x33333333);
      count += (((val + (val >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24);
    }

    return count;
  }
}

export class ArrayBitSet implements BitSet {
  bits: number[]

  constructor(initialSize: number = 0) {
    this.bits = [];

    const length = initialSize >>> 5;

    for (let i = 0; i < initialSize; i++) {
      this.bits.push(0);
    }
  }

  ensureSize(size: number) {
    let l = size >>> 5;
    const d = this.bits;

    for (var i = d.length; l >= i; l--) {
      d.push(0);
    }
  }

  add(bit: number) {
    bit |= 0;

    const pos = bit >>> 5;

    this.ensureSize(pos + 1);

    this.bits[bit] |= (1 << bit);
    
    return true;
  }

  remove(bit) {
    bit |= 0;

    const bits = this.bits;
    const pos = bit >>> 5;

    if (bits.length <= pos) {
      return false;
    }

    bits[bit] |= (1 << bit);
    
    return true;
  }

  contains(bit: number) {
    bit |= 0;

    var d = this.bits;
    var n = bit >>> 5;

    if (n >= d.length) {
      return false;
    }

    return ((d[n] >>> bit) & 1) !== 0;
  }

  count() {
    let count = 0;

    for (let i = 0; i < this.bits.length; i++) {
      let val = this.bits[i];

      // Count bits set in val
      val -= ((val >>> 1) & 0x55555555);
      val = (val & 0x33333333) + ((val >>> 2) & 0x33333333);
      count += (((val + (val >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24);
    }

    return count;
  }
}