import { IComponent, IComponentStorage, TEntityId } from "./index";

/**
 * A ComponentStorage that stores no component data. It is only used for checking whether or not an entity has this component.
 */
export class FlagComponentStorage<T extends IComponent> implements IComponentStorage<T> {
  public get(entityId: TEntityId): T {
    return undefined;
  }

  public set(entityId: TEntityId, component: T): T {
    return undefined;
  }

  public remove(entityId: TEntityId) {
    return true;
  }
}