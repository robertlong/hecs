// tslint:disable: no-console

import {
  ComponentEvent,
  IComponent,
  IEventChannel,
  IQuery,
  ISystem,
  ISystemContext,
  SparseArrayComponentStorage,
  System,
  World
} from "hecs";

class TestComponent implements IComponent {}

interface IBenchSystemContext extends ISystemContext {
  entities: IQuery<[TestComponent]>;
}

class BenchSystem extends System<IBenchSystemContext> {
  public setup() {
    return {
      entities: this.world.createQuery(TestComponent)
    };
  }

  public update() {
    // tslint:disable-next-line:no-empty
    for (const [component] of this.ctx.entities) {
    }
  }
}

interface IEventChannelSystemContext extends ISystemContext {
  events: IEventChannel<TestComponent>;
}

class EventChannelSystem extends System<IEventChannelSystemContext> {
  public setup() {
    return {
      events: this.world.createEventChannel(ComponentEvent.Added, TestComponent)
    };
  }

  public update() {
    // tslint:disable-next-line:no-empty
    for (const [entityId, component] of this.ctx.events) {
    }
  }
}

function waitFor(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function benchmarkSystem(
  system: ISystem,
  numEntities = 1000,
  numUpdates = 1,
  numSystems = 1
) {
  const world = new World();
  world.registerComponent(TestComponent, new SparseArrayComponentStorage());

  for (let i = 0; i < numSystems; i++) {
    world.registerSystem(system);
  }

  for (let i = 0; i < numEntities; i++) {
    const id = world.createEntity();
    world.addComponent(id, new TestComponent());
  }

  const message = `Run ${numSystems} ${
    system.constructor.name
  } ${numUpdates} times with ${numEntities} entities.`;

  console.time(message);

  for (let i = 0; i < numUpdates; i++) {
    world.update();
  }

  console.timeEnd(message);

  await waitFor(1000);
}

async function main() {
  await waitFor(1000);
  await benchmarkSystem(new BenchSystem());
  await benchmarkSystem(new BenchSystem(), 1000, 1, 30);
  await benchmarkSystem(new BenchSystem(), 10000, 1, 30);
  await benchmarkSystem(new BenchSystem(), 10000, 10, 30);
  await benchmarkSystem(new EventChannelSystem());
  await benchmarkSystem(new EventChannelSystem(), 1000, 1, 30);
  await benchmarkSystem(new EventChannelSystem(), 10000, 1, 30);
  await benchmarkSystem(new EventChannelSystem(), 10000, 10, 30);
}

main()
  .then(() => {
    if (typeof document !== "undefined") {
      document.body.innerText = "Finished.";
    }
  })
  .catch(console.error);
