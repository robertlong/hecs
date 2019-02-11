import { Component, ComponentStorage, EntityId } from "./index";

export class MapComponentStorage<T extends Component> implements ComponentStorage<T> {
  private components: Map<EntityId, T> = new Map();

  get(entityId: EntityId) {
    return this.components.get(entityId);
  }

  set(entityId: EntityId, component: T) {
    this.components.set(entityId, component);
    return component;
  }

  remove(entityId: EntityId) {
    return this.components.delete(entityId);
  }
}