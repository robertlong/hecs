import { World, Query, Component } from "../src/index";
import { SparseArrayComponentStorage } from "../src/SparseArrayComponentStorage";
import { SmartSystem, SystemContext } from "../src/SmartSystem";

const world = new World();

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

world.registerComponent(TestComponent, new SparseArrayComponentStorage());
world.registerSystem(new BenchSystem());

for (let i = 0; i < 100000; i++) {
  const id = world.createEntity();
  world.addComponent(id, new TestComponent());
}

console.time("Run System 1000 times");

for (let i = 0; i < 1; i++) {
  world.update();
}

console.timeEnd("Run System 1000 times");