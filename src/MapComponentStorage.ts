import { Component, ComponentStorage, TEntityId } from "./index";

/**
 * A ComponentStorage that is good for storing components that do not exist on all entities.
 */
export class MapComponentStorage<T extends Component> implements ComponentStorage<T> {
  private components: Map<TEntityId, T> = new Map();

  get(entityId: TEntityId) {
    return this.components.get(entityId);
  }

  set(entityId: TEntityId, component: T) {
    this.components.set(entityId, component);
    return component;
  }

  remove(entityId: TEntityId) {
    return this.components.delete(entityId);
  }
}