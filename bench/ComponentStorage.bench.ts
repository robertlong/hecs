import { MapComponentStorage, ArrayStorage } from "../src/ComponentStorage";

const mapStorage = new MapComponentStorage();
const arrayStorage = new ArrayStorage();
const randMapStorage = new MapComponentStorage();
const randArrayStorage = new ArrayStorage();

class TransformComponent {

}

const transformComponents = [];

for (let i = 0; i < 1000000; i++) {
  transformComponents.push(new TransformComponent());
}

console.time("MapComponentStorage#set()");

for (let i = 0; i < 1000000; i++) {
  mapStorage.set(i, transformComponents[i]);
}

console.timeEnd("MapComponentStorage#set()");

console.time("ArrayStorage#set()");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.set(i, transformComponents[i]);
}

console.timeEnd("ArrayStorage#set()");

console.time("MapComponentStorage#get() linear");

for (let i = 0; i < 1000000; i++) {
  mapStorage.get(i);
}

console.timeEnd("MapComponentStorage#get() linear");

console.time("ArrayStorage#get() linear");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.get(i);
}

console.timeEnd("ArrayStorage#get() linear");

console.time("MapComponentStorage#get() random");

for (let i = 0; i < 1000000; i++) {
  mapStorage.get(Math.random() * 1000000);
}

console.timeEnd("MapComponentStorage#get() random");

console.time("ArrayStorage#get() random");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.get(Math.random() * 1000000);
}

console.timeEnd("ArrayStorage#get() random");

console.time("MapComponentStorage#has() linear");

for (let i = 0; i < 1000000; i++) {
  mapStorage.has(i);
}

console.timeEnd("MapComponentStorage#has() linear");

console.time("ArrayStorage#has() linear");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.has(i);
}

console.timeEnd("ArrayStorage#has() linear");

console.time("MapComponentStorage#has() random");

for (let i = 0; i < 1000000; i++) {
  mapStorage.has(Math.random() * 1000000);
}

console.timeEnd("MapComponentStorage#has() random");

console.time("ArrayStorage#has() random");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.has(Math.random() * 1000000);
}

console.timeEnd("ArrayStorage#has() random");

console.time("MapComponentStorage#remove() linear");

for (let i = 0; i < 1000000; i++) {
  mapStorage.remove(i);
}

console.timeEnd("MapComponentStorage#remove() linear");

console.time("ArrayStorage#remove() linear");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.remove(i);
}

console.timeEnd("ArrayStorage#remove() linear");

for (let i = 0; i < 1000000; i++) {
  randMapStorage.set(i, transformComponents[i]);
  randArrayStorage.set(i, transformComponents[i]);
}

console.time("MapComponentStorage#remove() random");

for (let i = 0; i < 1000000; i++) {
  mapStorage.remove(Math.random() * 1000000);
}

console.timeEnd("MapComponentStorage#remove() random");

console.time("ArrayStorage#remove() random");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.remove(Math.random() * 1000000);
}

console.timeEnd("ArrayStorage#remove() random");