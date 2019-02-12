import { EventChannel, Query, System, World, ComponentConstructor, Component } from "./index";

export type SystemContext = { [name: string]: EventChannel<Component> | Query<Component[]> };

export abstract class SmartSystem<T extends SystemContext> implements System {
  world: World
  ctx: T

  init(world: World) {
    this.world = world;
    this.ctx = this.setup();
  }

  abstract setup(): T

  abstract update(): void
  
  destroy() {
    for (const key in this.ctx) {
      this.ctx[key].destroy();
    }
  }
}