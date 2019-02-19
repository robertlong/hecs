import test from "ava";
import { World, ComponentEvent, Component, ComponentConstructor, Entity } from "../src";
import { MapComponentStorage } from "../src/MapComponentStorage";

class TestComponent {
  value: number
  
  constructor(value: number) {
    this.value = value;
  }
}

class TestWorld extends World {
  getEntityFlags() {
    return this.entityFlags;
  }

  getEntityMaskLength() {
    return this.entityMaskLength;
  }

  getComponentStorages() {
    return this.componentStorages;
  }
}

test("World#createEntity()", t => {
  const world = new World();
  t.is(world.createEntity(), 1);

  // Test expanding the entityFlags typed array
  for (let i = 0; i < 1024; i++) {
    world.createEntity();
  }
  t.true(world.isAlive(1));
  t.true(world.isAlive(1024));
  t.true(world.isAlive(1025));
});

test("World#registerComponent()", t => {
  const world = new TestWorld();

  world.registerComponent(TestComponent, new MapComponentStorage());

  const entity = world.createEntity();
  world.addComponent(entity, new TestComponent(123));

  t.is(world.getEntityFlags().length, 1024);
  t.is(world.getEntityMaskLength(), 1);

  let Component;

  for (let i = 0; i < 32; i++) {
    Component = class implements Component {};
    world.registerComponent(Component, new MapComponentStorage());
  }

  t.is(world.getComponentStorages().length, 33);
  t.is(Component.id, 32);

  world.addComponent(entity, new Component());

  const entityFlags = world.getEntityFlags();
  t.is(entityFlags.length, 2048);
  t.is(entityFlags[2], 0b11);
  t.is(entityFlags[3], 0b10);
  t.is(world.getEntityMaskLength(), 2);
  t.is(world.getImmutableComponent(entity, TestComponent).value, 123);
});

test("World#addComponent()", t => {
  const world = new World();

  world.registerComponent(TestComponent, new MapComponentStorage());

  const addedEvents = world.createEventChannel( ComponentEvent.Added, TestComponent);

  const entityId = world.createEntity();

  const component = new TestComponent(123);

  t.is(world.addComponent(entityId, component), component);

  t.deepEqual(addedEvents.first(), [entityId, component]);
});

test("World#getImmutableComponent()", t => {
  const world = new World();

  world.registerComponent(TestComponent, new MapComponentStorage());

  const changedEvents = world.createEventChannel(ComponentEvent.Changed, TestComponent);

  const entityId = world.createEntity();

  const component = new TestComponent(123);

  world.addComponent(entityId, component);

  t.is(world.getImmutableComponent(entityId, TestComponent).value, component.value);

  t.true(changedEvents.isEmpty());

  t.throws(() => {
    const immutableComponent = world.getImmutableComponent(entityId, TestComponent)
    immutableComponent.value = 999;
  }, /immutable/g)
});

test("World#getMutableComponent()", t => {
  const world = new World();

  world.registerComponent(TestComponent, new MapComponentStorage());

  const changedEvents = world.createEventChannel(ComponentEvent.Changed, TestComponent);

  const entityId = world.createEntity();

  const component = new TestComponent(123);

  world.addComponent(entityId, component);

  t.is(world.getMutableComponent(entityId, TestComponent), component);

  t.deepEqual(changedEvents.first(), [entityId, component]);

  t.notThrows(() => {
    const mutableComponent = world.getMutableComponent(entityId, TestComponent);
    mutableComponent.value = 999;
  });
  
});

test("World#removeComponent()", t => {
  const world = new World();

  world.registerComponent(TestComponent, new MapComponentStorage());

  const removedEvents = world.createEventChannel(ComponentEvent.Removed, TestComponent);

  const entityId = world.createEntity();

  const component = new TestComponent(123);

  world.addComponent(entityId, component);

  t.is(world.getImmutableComponent(entityId, TestComponent).value, component.value);

  t.is(world.removeComponent(entityId, TestComponent), true);

  t.deepEqual(removedEvents.first(), [entityId, undefined]);
});

test("World#hasComponent()", t => {
  const world = new World();

  world.registerComponent(TestComponent, new MapComponentStorage());

  const entityId = world.createEntity();

  const component = new TestComponent(123);

  debugger;

  world.addComponent(entityId, component);

  t.is(world.hasComponent(entityId, TestComponent), true);

  world.removeComponent(entityId, TestComponent);

  t.is(world.hasComponent(entityId, TestComponent), false);
});

test("World#destroyEntity", t => {
  const world = new World();

  world.registerComponent(TestComponent, new MapComponentStorage());

  const removedEvents = world.createEventChannel(ComponentEvent.Removed, TestComponent);

  const entityId = world.createEntity();

  const component = new TestComponent(123);

  world.addComponent(entityId, component);

  t.is(world.getImmutableComponent(entityId, TestComponent).value, component.value);

  world.destroyEntity(entityId);

  t.deepEqual(removedEvents.first(), [entityId, undefined]);
});