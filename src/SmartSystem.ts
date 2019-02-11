import { EventChannel, Query, System, World } from "./index";

export type SystemContext = { [name: string]: EventChannel | Query };

export abstract class SmartSystem<T extends SystemContext> implements System {
  world: World
  ctx: T

  init(world: World) {
    this.world = world;
    this.ctx = this.setup(world);
  }

  abstract setup(world: World): T

  abstract update(): void
  
  destroy() {
    for (const key in this.ctx) {
      this.ctx[key].destroy();
    }
  }
}