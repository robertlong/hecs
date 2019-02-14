import { World, Query, Component, EventChannel, ComponentEvent, System } from "../src/index";
import { SparseArrayComponentStorage } from "../src/SparseArrayComponentStorage";
import { SmartSystem, SystemContext } from "../src/SmartSystem";

class TestComponent implements Component {

}

interface BenchSystemContext extends SystemContext {
  entities: Query<[TestComponent]>
}

class BenchSystem extends SmartSystem<BenchSystemContext> {
  setup() {
    return {
      entities: this.world.createQuery(TestComponent)
    };
  }

  update() {
    for (const [component] of this.ctx.entities) {

    }
  }
}

interface BenchCustomIteratorSystemContext extends SystemContext {
  entities: Query<[TestComponent]>
}

class BenchCustomIteratorSystem extends SmartSystem<BenchSystemContext> {
  setup() {
    return {
      entities: this.world.createQuery(TestComponent)
    };
  }

  update() {
    for (const [component] of this.ctx.entities.results) {

    }
  }
}

interface BenchEntitiesSystemContext extends SystemContext {
  entities: Query<[TestComponent]>
}

class BenchEntitiesSystem extends SmartSystem<BenchEntitiesSystemContext> {
  setup() {
    return {
      entities: this.world.createQuery(TestComponent)
    };
  }

  update() {
    for (const entityId of this.ctx.entities.entities) {
      this.world.getImmutableComponent(entityId, TestComponent);
    }
  }
}

interface BenchEntitiesArraySystemContext extends SystemContext {
  entities: Query<[TestComponent]>
}

class BenchEntitiesArraySystem extends SmartSystem<BenchEntitiesArraySystemContext> {
  setup() {
    return {
      entities: this.world.createQuery(TestComponent)
    };
  }

  update() {
    for (const entityId of this.ctx.entities.entities.toArray()) {
      this.world.getImmutableComponent(entityId, TestComponent);
    }
  }
}

interface EventChannelSystemContext extends SystemContext {
  events: EventChannel<TestComponent>
}

class EventChannelSystem extends SmartSystem<EventChannelSystemContext> {
  setup() {
    return {
      events: this.world.createEventChannel(ComponentEvent.Added, TestComponent)
    };
  }

  update() {
    for (const [entityId, component] of this.ctx.events) {

    }
  }
}

function waitFor(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function benchmarkSystem(system: System, numEntities = 1000, numUpdates = 1, numSystems = 1) {
  const world = new World();
  world.registerComponent(TestComponent, new SparseArrayComponentStorage());

  for (let i = 0; i < numSystems; i++) {
    world.registerSystem(system);
  }
  
  for (let i = 0; i < numEntities; i++) {
    const id = world.createEntity();
    world.addComponent(id, new TestComponent());
  }

  const message = `Run ${numSystems} ${system.constructor.name} ${numUpdates} times with ${numEntities} entities.`;

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
  await benchmarkSystem(new BenchCustomIteratorSystem());
  await benchmarkSystem(new BenchCustomIteratorSystem(), 1000, 1, 30);
  await benchmarkSystem(new BenchEntitiesSystem());
  await benchmarkSystem(new BenchEntitiesSystem(), 1000, 1, 30);
  await benchmarkSystem(new BenchEntitiesArraySystem());
  await benchmarkSystem(new BenchEntitiesArraySystem(), 1000, 1, 30);
  await benchmarkSystem(new EventChannelSystem());
}

main()
  .then(() => {
    if (typeof document !== "undefined") {
      document.body.innerText = "Finished.";
    }
  })
  .catch(console.error);

