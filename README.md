# HECS

> HECS Entity Component System

A fast ECS written in Javascript.

## Goals

- Performance
  - As little memory allocation and garbage collection as possible
  - Fast iterators
- Predictability
  - Systems run in the order they are registered
  - Events are processed in the game loop with the rest of the system's logic

## Roadmap

- Custom Schedulers
  - Specify dependencies between systems
  - Enable systems to run in parallel
- Parallelism
  - Using transferable objects in WebWorkers
  - Using SharedArrayBuffer
- WASM Integration
  - Rust API that can be used to write high performance systems in WASM

## Getting Started

```
npm install -S hecs
```

```js
import { World, System, EntityId, Read, Write } from "hecs";

const world = new World();

class Position {
  constructor(x) {
    this.x = x;
  }
}

class Velocity {
  constructor(v) {
    this.v = v;
  }
}

world.registerComponent(Position);
world.registerComponent(Velocity);

class VelocitySystem extends System {
  setup() {
    return {
      entities: this.world.createQuery(Write(Position), Read(Velocity))
    };
  }

  update() {
    for (const [position, velocity] of this.ctx.entities) {
      position.x += velocity.v;
    }
  }
}

class LoggingSystem extends System {
  setup() {
    return {
      entities: this.world.createQuery(EntityId, Read(Position))
    };
  }

  update() {
    for (const [entityId, position] of this.ctx.entities) {
      console.log(`Entity ${entityId} has position: ${position.x}`);
    }
  }
}

world.registerSystem(new VelocitySystem());
world.registerSystem(new LoggingSystem());

const entity1 = world.createEntity();
world.addComponent(entity1, new Position(0));
world.addComponent(entity1, new Velocity(1));

const entity2 = world.createEntity();
world.addComponent(entity2, new Position(10));
world.addComponent(entity2, new Velocity(0.5));

function update() {
  world.update();
  requestAnimationFrame(update);
}

requestAnimationFrame(update);
```

## Credits

- API heavily inspired by [Specs](https://github.com/slide-rs/specs)
