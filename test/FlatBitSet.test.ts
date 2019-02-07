import test from "ava";
import { FlatBitSet } from "../src/BitSet";

test("new FlatBitSet()", t => {
  const bitset = new FlatBitSet();

  t.is(bitset.bits.length, 0);

  for (let i = 0; i < 100; i++) {
    t.false(bitset.contains(i));
  }
});

test("FlatBitSet#ensureSize", t => {
  const bitset = new FlatBitSet();

  t.is(bitset.bits.length, 0);

  bitset.ensureSize(5);

  t.is(bitset.bits.length, 5);

  bitset.ensureSize(3);

  t.is(bitset.bits.length, 5);
});

test("FlatBitSet#add()", t => {
  const bitset = new FlatBitSet();

  bitset.add(0);
  t.is(bitset.bits[0], 0b1);


  for (let i = 0; i < 10; i++) {
    bitset.add(i);
  }

  t.is(bitset.bits[0], 0b1111111111);

  for (let i = 0; i < 32; i++) {
    bitset.add(i);
  }

  t.is(bitset.bits[0], 0b11111111111111111111111111111111);

  for (let i = 0; i < 33; i++) {
    bitset.add(i);
  }

  t.is(bitset.bits[1], 0b1);
});

test("FlatBitSet#remove()", t => {
  const bitset = new FlatBitSet();

  bitset.add(5);
  bitset.remove(5);

  t.is(bitset.bits[0], 0);

  bitset.add(555);
  bitset.remove(555);

  for (let i = 0; i < bitset.bits.length; i++) {
    t.is(bitset.bits[i], 0);
  }

  for (let i = 0; i < 32; i++) {
    bitset.add(i);
  }

  bitset.remove(5);

  t.is(bitset.bits[0], 0b11111111111111111111111111011111);
});

test("FlatBitSet#contains()", t => {
  const bitset = new FlatBitSet();

  bitset.add(123);
  t.is(bitset.contains(123), true);
  t.is(bitset.contains(122), false);
  t.is(bitset.contains(124), false);

  bitset.remove(123);
  t.is(bitset.contains(123), false);
});