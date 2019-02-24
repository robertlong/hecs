import {
  EntityId,
  IQuery,
  ISystemContext,
  Read,
  System,
  TEntityId,
  World,
  Write
} from "hecs";

const world = new World();

class Position {
  public x: number;

  constructor(x: number) {
    this.x = x;
  }
}

class Velocity {
  public v: number;

  constructor(v: number) {
    this.v = v;
  }
}

world.registerComponent(Position);
world.registerComponent(Velocity);

interface IVelocitySystemContext extends ISystemContext {
  entities: IQuery<[Position, Velocity]>;
}

class VelocitySystem extends System<IVelocitySystemContext> {
  public setup() {
    return {
      entities: this.world.createQuery(Write(Position), Read(Velocity))
    };
  }

  public update() {
    for (const [position, velocity] of this.ctx.entities) {
      position.x += velocity.v;
    }
  }
}

interface ILoggingSystemContext extends ISystemContext {
  entities: IQuery<[TEntityId, Position]>;
}

class LoggingSystem extends System<ILoggingSystemContext> {
  public setup() {
    return {
      entities: this.world.createQuery(EntityId, Read(Position))
    };
  }

  public update() {
    for (const [entityId, position] of this.ctx.entities) {
      // tslint:disable-next-line: no-console
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
