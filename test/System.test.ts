import test from "ava";
import { ComponentEvent, IEventChannel, IQuery, ISystemContext, MapComponentStorage, System, World, Write } from "../src";

interface ITestContext extends ISystemContext {
  entities: IQuery<[TestComponent, ObserverComponent]>
  added: IEventChannel<TestComponent>
  changed: IEventChannel<TestComponent>
  removed: IEventChannel<TestComponent>
}

class TestComponent {
  public value: number;

  constructor(value: number) {
    this.value = value;
  }
}

class ObserverComponent {
  public frame: number;
  public addedThisFrame: number;
  public changedThisFrame: number;
  public removedThisFrame: number;

  constructor() {
    this.frame = 0;
    this.addedThisFrame = -1;
    this.changedThisFrame = -1;
    this.removedThisFrame = -1;
  }
}

class TestSmartSystem extends System<ITestContext> {
  public setup() {
    return {
      added: this.world.createEventChannel(ComponentEvent.Added, TestComponent),
      changed: this.world.createEventChannel(ComponentEvent.Changed, TestComponent),
      entities: this.world.createQuery(Write(TestComponent), Write(ObserverComponent)),
      removed: this.world.createEventChannel(ComponentEvent.Removed, TestComponent)
    };
  }

  public update() {
    for (const [testComponent, observerComponent] of this.ctx.entities) {
      testComponent.value++;
      observerComponent.frame++;
    }

    for (const [entityId, testComponent] of this.ctx.added) {
      const observerComponent = this.world.getMutableComponent(entityId, ObserverComponent);
      observerComponent.addedThisFrame = observerComponent.frame;
    }

    for (const [entityId, testComponent] of this.ctx.changed) {
      const observerComponent = this.world.getMutableComponent(entityId, ObserverComponent);
      observerComponent.changedThisFrame = observerComponent.frame;
    }

    for (const [entityId, testComponent] of this.ctx.removed) {
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