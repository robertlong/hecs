import { FlatBitSet, ArrayBitSet } from "../src/BitSet";
import { BitSet } from "bitset";

const flatBitset = new FlatBitSet(1000000);
const arrBitset = new ArrayBitSet(1000000);
const bitset = new BitSet(new Uint8Array(1000000));

console.time("FlatBitSet#add()");

for (let i = 0; i < 1000000; i++) {
  flatBitset.add(i);
}

console.timeEnd("FlatBitSet#add()");

console.time("ArrayBitSet#add()");

for (let i = 0; i < 1000000; i++) {
  arrBitset.add(i);
}

console.timeEnd("ArrayBitSet#add()");

console.time("BitSet#set()");

for (let i = 0; i < 1000000; i++) {
  bitset.set(i, 1);
}

console.timeEnd("BitSet#set()");

console.time("FlatBitSet#remove()");

for (let i = 0; i < 1000000; i++) {
  flatBitset.remove(i);
}

console.timeEnd("FlatBitSet#remove()");

console.time("ArrayBitSet#remove()");

for (let i = 0; i < 1000000; i++) {
  arrBitset.remove(i);
}

console.timeEnd("ArrayBitSet#remove()");

console.time("BitSet#set(0)");

for (let i = 0; i < 1000000; i++) {
  bitset.set(i, 0);
}

console.timeEnd("BitSet#set(0)");

for (let i = 0; i < 1000000; i++) {
  if (i % 2) {
    flatBitset.add(i);
  }
}

for (let i = 0; i < 1000000; i++) {
  if (i % 2) {
    arrBitset.add(i);
  }
}

for (let i = 0; i < 1000000; i++) {
  if (i % 2) {
    bitset.set(i, 1);
  }
}

console.time("FlatBitSet#contains()");

for (let i = 0; i < 1000000; i++) {
  flatBitset.contains(i);
}

console.timeEnd("FlatBitSet#contains()");

console.time("ArrayBitSet#contains()");

for (let i = 0; i < 1000000; i++) {
  arrBitset.contains(i);
}

console.timeEnd("ArrayBitSet#contains()");

console.time("BitSet#get()");

for (let i = 0; i < 1000000; i++) {
  bitset.get(i);
}

console.timeEnd("BitSet#get()");

console.time("FlatBitSet#count()");

for (let i = 0; i < 100000; i++) {
  flatBitset.count();
}

console.timeEnd("FlatBitSet#count()");