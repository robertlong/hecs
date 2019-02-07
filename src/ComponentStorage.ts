import { EntityId } from "./Entity";
import { Component } from "./Component";

export interface ComponentStorage<T extends Component> {
  has(entityId: EntityId): boolean
  get(entityId: EntityId): T
  set(entityId: EntityId, component: T): T
  remove(entityId: EntityId): boolean
}

export class MapComponentStorage<T extends Component> implements ComponentStorage<T> {
  private components: Map<EntityId, T> = new Map();

  has(entityId: EntityId) {
    return this.components.has(entityId);
  }

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

export class ArrayStorage<T extends Component> implements ComponentStorage<T> {
  private components: T[] = [];
  private componentIndices: number[] = [];
  private entityIds: EntityId[] = [];

  has(entityId: EntityId): boolean {
    return !!this.componentIndices[entityId];
  }

  get(entityId: EntityId): T {
    const index = this.componentIndices[entityId];
    return this.components[index];
  }

  set(entityId: EntityId, component: T): T {
    const componentIndices = this.componentIndices;
    const components = this.components;
    const index = componentIndices[entityId];

    if(index) {
      components[index] = component;
    } else {    
      const indicesLength = componentIndices.length;
      
      for (let i = indicesLength; i <= entityId; i++) {
        componentIndices.push(0);
      }

      componentIndices[entityId] = components.length;
      components.push(component);
      this.entityIds.push(entityId);
    }

    return component;
  }

  remove(entityId: EntityId): boolean {
    const componentIndices = this.componentIndices;
    const index = componentIndices[entityId];
    
    if (index) {
      const entityIds = this.entityIds;
      const lastEntityId = entityIds[entityIds.length - 1];
      this.components[index] = null;
      componentIndices[entityId] = 0;
      componentIndices[lastEntityId] = index;
      return true;
    }

    return false;
  } 
}