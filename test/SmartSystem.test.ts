import test from "ava";
import { SmartSystem, SystemContext } from "../src/SmartSystem";
import { MapComponentStorage } from "../src/MapComponentStorage"
import { World, Query, EventChannel, ComponentEvent } from "../src";

interface TestContext extends SystemContext {
  entities: Query
  added: EventChannel
  changed: EventChannel
  removed: EventChannel
}

class TestComponent {
  value: number;

  constructor(value: number) {
    this.value = value;
  }
}

class ObserverComponent {
  frame: number;
  addedThisFrame: number;
  changedThisFrame: number;
  removedThisFrame: number;

  constructor() {
    this.frame = 0;
    this.addedThisFrame = -1;
    this.changedThisFrame = -1;
    this.removedThisFrame = -1;
  }
}

class TestSmartSystem extends SmartSystem<TestContext> {
  setup() {
    return {
      entities: this.world.createQuery(TestComponent, ObserverComponent),
      added: this.world.createEventChannel(ComponentEvent.Added, TestComponent),
      changed: this.world.createEventChannel(ComponentEvent.Changed, TestComponent),
      removed: this.world.createEventChannel(ComponentEvent.Removed, TestComponent)
    };
  }

  update() {
    for (const entityId of this.ctx.entities) {
      const testComponent = this.world.getMutableComponent(entityId, TestComponent);
      const observerComponent = this.world.getMutableComponent(entityId, ObserverComponent);
      testComponent.value++;
      observerComponent.frame++;
    }
  
    for (const entityId of this.ctx.added) {
      const observerComponent = this.world.getMutableComponent(entityId, ObserverComponent);
      observerComponent.addedThisFrame = observerComponent.frame;
    }   
  
    for (const entityId of this.ctx.changed) {
      const observerComponent = this.world.getMutableComponent(entityId, ObserverComponent);
      observerComponent.changedThisFrame = observerComponent.frame;
    }

    for (const entityId of this.ctx.removed) {
      const observerComponent = this.world.getMutableComponent(entityId, ObserverComponent);
      observerComponent.removedThisFrame = observerComponent.frame + 1;
    }
  }
}

test("SmartSystem", t => {
  const world = new World();
  world.registerComponent(TestComponent, new MapComponentStorage());
  world.registerComponent(ObserverComponent, new MapComponentStorage());

  const system = new TestSmartSystem();
  world.registerSystem(system);


  const entityId = world.createEntity();
  const testComponent = new TestComponent(11);
  const observerComponent = new ObserverComponent();

  world.addComponent(entityId, testComponent);
  world.addComponent(entityId, observerComponent);

  world.update();

  t.is(testComponent.value, 12);
  t.is(observerComponent.frame, 1);
  t.is(observerComponent.addedThisFrame, 1);
  t.is(observerComponent.changedThisFrame, 1);
  t.is(observerComponent.removedThisFrame, -1);

  world.update();

  t.is(testComponent.value, 13);
  t.is(observerComponent.frame, 2);
  t.is(observerComponent.addedThisFrame, 1);
  t.is(observerComponent.changedThisFrame, 2);
  t.is(observerComponent.removedThisFrame, -1);

  world.removeComponent(entityId, TestComponent);

  world.update();

  t.is(testComponent.value, 13);
  t.is(observerComponent.frame, 2);
  t.is(observerComponent.addedThisFrame, 1);
  t.is(observerComponent.changedThisFrame, 2);
  t.is(observerComponent.removedThisFrame, 3);

  world.unregisterSystem(system);
});