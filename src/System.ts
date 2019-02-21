import { EventChannel, Query, ISystem, World, Component } from "./index";

export type SystemContext = { [name: string]: EventChannel<Component> | Query<Component[]> };

/**
 * The default System class that automatically destroys its query objects.
 */
export abstract class System<T extends SystemContext> implements ISystem {
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