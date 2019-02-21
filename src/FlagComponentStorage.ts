import { Component, ComponentStorage, TEntityId } from "./index";

/**
 * A ComponentStorage that stores no component data. It is only used for checking whether or not an entity has this component.
 */
export class FlagComponentStorage<T extends Component> implements ComponentStorage<T> {
  get(entityId: TEntityId): T {
    return undefined;
  }

  set(entityId: TEntityId, component: T): T {
    return undefined;
  }

  remove(entityId: TEntityId) {
    return true;
  }
}