import { IComponent, IComponentStorage, TEntityId } from "./index";

/**
 * A ComponentStorage that is good for storing components that do not exist on all entities.
 */
export class MapComponentStorage<T extends IComponent>
  implements IComponentStorage<T> {
  private components: Map<TEntityId, T> = new Map();

  public get(entityId: TEntityId) {
    return this.components.get(entityId);
  }

  public set(entityId: TEntityId, component: T) {
    this.components.set(entityId, component);
    return component;
  }

  public remove(entityId: TEntityId) {
    return this.components.delete(entityId);
  }
}
