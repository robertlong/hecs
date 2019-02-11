import test, { ExecutionContext } from "ava";
import { MapComponentStorage } from "../src/MapComponentStorage";
import { SparseArrayComponentStorage } from "../src/SparseArrayComponentStorage";

class TestComponent {
  value: number;

  constructor(value: number) {
    this.value = value;
  }
}

function createComponentStorageTest(ComponentStorage) {
  return (t: ExecutionContext) => {
    const storage = new ComponentStorage();
  
    const component1 = new TestComponent(123);
    const component2 = new TestComponent(123);
    
    t.is(storage.set(1, component1), component1, `${ComponentStorage.name}#set(1, component1) failed to return component1.`);
    
    t.is(storage.get(1), component1, `${ComponentStorage.name}#get(1) failed to return component1.`);

    t.is(storage.remove(1), true, `${ComponentStorage.name}#remove(1) failed to return true.`);

    t.is(storage.remove(1), false, `${ComponentStorage.name}#remove(1) failed to return false for already removed component.`);

    t.is(storage.get(1), undefined, `${ComponentStorage.name}#get(1) failed to return undefined for already removed component.`);

    t.is(storage.set(1, component1), component1, `${ComponentStorage.name}#set(1) failed to return component1 on second call.`);

    t.is(storage.set(1, component2), component2, `${ComponentStorage.name}#set(1) failed to return component2 on third call.`);
    
    t.is(storage.get(1), component2, `${ComponentStorage.name}#get(1) failed to return component2 after set().`);

    t.is(storage.remove(1), true, `${ComponentStorage.name}#remove(1) failed to return true to clear the storage.`);

    for (let i = 1; i <= 10; i++) {
      const component = new TestComponent(i);

      t.is(storage.set(i, component), component, `${ComponentStorage.name}#set(${i}, component) failed to return component on iteration ${i}.`);

      t.is(storage.get(i), component, `${ComponentStorage.name}#get(${i}) failed to return component on iteration ${i}.`);
    }

    for (let i = 1; i <= 10; i++) {
      t.is(storage.remove(i), true, `${ComponentStorage.name}#remove(${i}) failed to return true on iteration ${i}.`);

      t.is(storage.get(i), undefined, `${ComponentStorage.name}#get(${i}) failed to return undefined for already removed component on iteration ${i}.`);
      
      t.is(storage.remove(i), false, `${ComponentStorage.name}#set(${i}, component) failed to return false for already removed component on iteration ${i}.`);
    }
  };
}

test("MapComponentStorage", createComponentStorageTest(MapComponentStorage));
test("SparseArrayComponentStorage", createComponentStorageTest(SparseArrayComponentStorage));