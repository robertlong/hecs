import { IComponent, IEventChannel, IQuery, ISystem, World } from "./index";

export interface ISystemContext {
  [name: string]: IEventChannel<IComponent> | IQuery<IComponent[]>
}

/**
 * The default System class that automatically destroys its query objects.
 */
export abstract class System<T extends ISystemContext> implements ISystem {
  public world: World
  public ctx: T

  public init(world: World) {
    this.world = world;
    this.ctx = this.setup();
  }

  public abstract setup(): T

  public abstract update(): void
  
  public destroy() {
    for (const key in this.ctx) {
      if (this.ctx.hasOwnProperty(key)) {
        this.ctx[key].destroy();
      }
    }
  }
}