import { MapComponentStorage } from "../src/MapComponentStorage";
import { SparseArrayComponentStorage } from "../src/SparseArrayComponentStorage";

const mapStorage = new MapComponentStorage();
const arrayStorage = new SparseArrayComponentStorage();
const randMapStorage = new MapComponentStorage();
const randArrayStorage = new SparseArrayComponentStorage();

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

console.time("SparseArrayComponentStorage#set()");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.set(i, transformComponents[i]);
}

console.timeEnd("SparseArrayComponentStorage#set()");

console.time("MapComponentStorage#get() linear");

for (let i = 0; i < 1000000; i++) {
  mapStorage.get(i);
}

console.timeEnd("MapComponentStorage#get() linear");

console.time("SparseArrayComponentStorage#get() linear");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.get(i);
}

console.timeEnd("SparseArrayComponentStorage#get() linear");

console.time("MapComponentStorage#get() random");

for (let i = 0; i < 1000000; i++) {
  mapStorage.get(Math.random() * 1000000);
}

console.timeEnd("MapComponentStorage#get() random");

console.time("SparseArrayComponentStorage#get() random");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.get(Math.random() * 1000000);
}

console.timeEnd("SparseArrayComponentStorage#get() random");

console.time("MapComponentStorage#remove() linear");

for (let i = 0; i < 1000000; i++) {
  mapStorage.remove(i);
}

console.timeEnd("MapComponentStorage#remove() linear");

console.time("SparseArrayComponentStorage#remove() linear");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.remove(i);
}

console.timeEnd("SparseArrayComponentStorage#remove() linear");

for (let i = 0; i < 1000000; i++) {
  randMapStorage.set(i, transformComponents[i]);
  randArrayStorage.set(i, transformComponents[i]);
}

console.time("MapComponentStorage#remove() random");

for (let i = 0; i < 1000000; i++) {
  mapStorage.remove(Math.random() * 1000000);
}

console.timeEnd("MapComponentStorage#remove() random");

console.time("SparseArrayComponentStorage#remove() random");

for (let i = 0; i < 1000000; i++) {
  arrayStorage.remove(Math.random() * 1000000);
}

console.timeEnd("SparseArrayComponentStorage#remove() random");
