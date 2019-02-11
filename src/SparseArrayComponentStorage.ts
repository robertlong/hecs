import { Component, ComponentStorage, EntityId } from "./index";

export class SparseArrayComponentStorage<T extends Component> implements ComponentStorage<T> {
  private components: T[] = [];

  get(entityId: EntityId): T {
    return this.components[entityId];
  }

  set(entityId: EntityId, component: T): T {
    const components = this.components;
    
    for (let i = components.length; i <= entityId; i++) {
      components.push(undefined);
    }

    return components[entityId] = component;
  }

  remove(entityId: EntityId): boolean {
    const components = this.components;
    const component = components[entityId];
    components[entityId] = undefined;
    return component !== undefined;
  } 
}