import { Component, ComponentStorage, EntityId } from "./index";

export class FlagComponentStorage<T extends Component> implements ComponentStorage<T> {
  get(entityId: EntityId) {
    return undefined;
  }

  set(entityId: EntityId, component: T) {
    return undefined;
  }

  remove(entityId: EntityId) {
    return true;
  }
}