import { Component, ComponentStorage, TEntityId } from "./index";

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