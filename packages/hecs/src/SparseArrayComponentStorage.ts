import { IComponent, IComponentStorage, TEntityId } from "./index";

/**
 * A ComponentStorage that is good for storing components that are on almost all entities.
 */
export class SparseArrayComponentStorage<T extends IComponent>
  implements IComponentStorage<T> {
  private components: T[] = [];

  public get(entityId: TEntityId): T {
    return this.components[entityId];
  }

  public set(entityId: TEntityId, component: T): T {
    const components = this.components;

    for (let i = components.length; i <= entityId; i++) {
      components.push(undefined);
    }

    return (components[entityId] = component);
  }

  public remove(entityId: TEntityId): boolean {
    const components = this.components;
    const component = components[entityId];
    components[entityId] = undefined;
    return component !== undefined;
  }
}
