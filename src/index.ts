/**
 * Bitset for each entity can be stored in a single typed array / array buffer
 * for the best data locality when iterating through entities. Data for each entity
 * is stored in one or more 32 bit chunks for fast iteration per entity.
 * 
 * Uint32Array: |     0      |       1          |       2          | ... |    32     | ...
 *              |  Entity 0  |  Component.id 0  |  Component.id 1  | ... | Entity 1  | ...
 * Entity Flag: 0 = Inactive, 1 = Active
 * Component Flag: 0 = Inactive, 1 = Active
 * 
 * Entity matches query when: 
 * let match = true;
 * for (let i = 0; i < queryMask.length; i++) {
 *  match = match && (entityMask[entityId + i] & queryMask[i] === queryMask[i]); 
 * }
 * return match;
 * 
 **/

import { MapComponentStorage } from "./MapComponentStorage";

let wrapImmutableComponent: <T extends Component>(component: T) => T;
if (process.env.NODE_ENV === "development") {
  wrapImmutableComponent = function<T>(component: T): T {
    return new Proxy(component as unknown as object, {
      set(component: Component, prop: string) {
        throw new Error(`Tried to write to "${component.constructor.name}#${String(prop)}" on immutable component. Use Write() or .getMutableComponent() to write to a component.`);
      }
    }) as T;
  }
}

export class World {
  protected entityPool: TEntityId[];
  protected entityCount: TEntityId;
  protected entityFlags: Uint32Array;
  protected entityMaskLength: number;
  protected componentConstructors: ComponentConstructor<Component>[];
  protected componentStorages: ComponentStorage<Component>[];
  protected componentEventQueues: {
    [componentId: number]: {
      [ComponentEvent.Added]: number[][]
      [ComponentEvent.Removed]: number[][]
      [ComponentEvent.Changed]: number[][]
    }
  }
  protected systems: ISystem[];

  constructor() {
    this.entityPool = [];
    this.entityCount = 0;
    this.entityFlags = new Uint32Array(1024);
    this.entityMaskLength = 1;
    this.componentConstructors = [];
    this.componentStorages = [];
    this.componentEventQueues = {};
    this.systems = [];
  }

  /**
   * Create an entity in the world.
   */
  createEntity() {
    let entityId: TEntityId;

    if (this.entityPool.length > 0) {
      entityId = this.entityPool.pop();
    } else {
      entityId = ++this.entityCount;
    }

    const maskIndex = entityId * this.entityMaskLength;

    if (maskIndex >= this.entityFlags.length) {
      const newEntityFlags = new Uint32Array(this.entityFlags.length + 1024);
      newEntityFlags.set(this.entityFlags);
      this.entityFlags = newEntityFlags;
    }

    this.entityFlags[maskIndex] = 1;
    
    return entityId;
  }

  /**
   * Destroy an entity.
   */
  destroyEntity(entityId: TEntityId) {
    const entityFlags = this.entityFlags;
    const entityMaskLength = this.entityMaskLength;

    for (let i = 0; i < entityMaskLength; i++) {
      const maskIndex = (entityId * entityMaskLength) + i;
      entityFlags[maskIndex] = 0;
    }

    for (const Component of this.componentConstructors) {
      this.removeComponent(entityId, Component);
    }

    this.entityPool.push(entityId);
  }

  /**
   * Returns true if an entity has been created and has not been destroyed.
   */
  isAlive(entityId: TEntityId) {
    return (this.entityFlags[entityId * this.entityMaskLength] & 1) === 1;
  }

  /**
   * Register a component class and storage with the world so that it can be queried.
   */
  registerComponent<T extends Component>(Component: ComponentConstructor<T>, storage?: ComponentStorage<T>) {
    storage = storage || new MapComponentStorage();
    
    const numComponents = this.componentStorages.length;
    const maskSize = numComponents + 1;
    const id = Component.id = numComponents;
    Component.maskIndex = Math.floor(maskSize / 32);
    Component.mask = 1 << (maskSize % 32);
    this.componentStorages[id] = storage;
    this.componentConstructors.push(Component);
    this.componentEventQueues[id] = {
      [ComponentEvent.Added]: [],
      [ComponentEvent.Removed]: [],
      [ComponentEvent.Changed]: []
    };

    const prevEntityMaskLength = this.entityMaskLength;
    const nextEntityMaskLength = Math.ceil(maskSize / 32);

    if (nextEntityMaskLength !== prevEntityMaskLength) {
      const numEntities = this.entityFlags.length / prevEntityMaskLength;
      const prevEntityFlags = this.entityFlags;
      const nextEntityFlags = new Uint32Array(numEntities * nextEntityMaskLength);

      for (let i = 0; i < numEntities; i++) {
        for (let j = 0; j < prevEntityMaskLength; j++) {
          const oldIndex = i * prevEntityMaskLength + j;
          const newIndex = i * nextEntityMaskLength + j;
          nextEntityFlags[newIndex] = prevEntityFlags[oldIndex];
        }
      }

      this.entityFlags = nextEntityFlags;
      this.entityMaskLength = nextEntityMaskLength;
    }
  }

  /**
   * Returns true if an entity has the provided component.
   */
  hasComponent(entityId: TEntityId, Component: ComponentConstructor<Component>) {
    const maskIndex = (entityId * this.entityMaskLength) + Component.maskIndex;
    const componentMask =  Component.mask;
    return (this.entityFlags[maskIndex] & componentMask) === componentMask;
  }

  /**
   * Get an immutable reference to the component on the provided entity.
   * 
   * @remarks In development mode, in order to throw an error when an immutable component is mutated,
   * this method returns a proxy of the component, not the original component.
   */
  getImmutableComponent<T extends Component>(entityId: TEntityId, Component: ComponentConstructor<T>): T {
    let component = this.componentStorages[Component.id].get(entityId) as T;

    if (process.env.NODE_ENV === "development") {
      component = wrapImmutableComponent<T>(component);
    }

    return component;
  }

  /**
   * Get a mutable reference to the component on the provided entity.
   * 
   * @remarks A ComponentEvent.Changed event is pushed to any EventChannels for this component.
   */
  getMutableComponent<T extends Component>(entityId: TEntityId, Component: ComponentConstructor<T>): T {
    const componentId = Component.id;
    this.pushComponentEvent(componentId, entityId, ComponentEvent.Changed);
    return this.componentStorages[componentId].get(entityId) as T;
  }

  /**
   * Add the component to the provided entity. Returns null if the entity already has the component.
   * 
   * @remarks A ComponentEvent.Added event is pushed to any EventChannels for this component.
   */
  addComponent<T extends Component>(entityId: TEntityId, component: T): T {
    const Component = component.constructor as ComponentConstructor<T>;
    const componentId = Component.id;

    if (!this.hasComponent(entityId, Component)) {
      const maskIndex = (entityId * this.entityMaskLength) + Component.maskIndex;
      const componentMask =  Component.mask; 
      this.entityFlags[maskIndex] |= componentMask;
      this.pushComponentEvent(componentId, entityId, ComponentEvent.Added);
      return this.componentStorages[Component.id].set(entityId, component) as T;
    }

    return null;
  }

  /**
   * Remove the component from the provided entity. Returns null if the entity doesn't have the component.
   * 
   * @remarks A ComponentEvent.Removed event is pushed to any EventChannels for this component.
   */
  removeComponent(entityId: TEntityId, Component: ComponentConstructor<Component>) {
    const componentId = Component.id;
    
    if (this.componentStorages[componentId].remove(entityId)) {
      const maskIndex = (entityId * this.entityMaskLength) + Component.maskIndex;
      const componentMask =  Component.mask;
      this.entityFlags[maskIndex] &= ~componentMask;
      this.pushComponentEvent(componentId, entityId, ComponentEvent.Removed);
      return true;
    }

    return false;
  }

  protected pushComponentEvent(componentId: number, entityId: number, event: ComponentEvent) {
    const componentEventQueues = this.componentEventQueues[componentId];
    if (componentEventQueues) {
      const changedEventQueues = componentEventQueues[event];

      if (changedEventQueues) {
        for (let i = 0; i < changedEventQueues.length; i++) {
          changedEventQueues[i].push(entityId);
        }
      }
    }
  }

  /**
   * Create a query for the provided QueryParameters.
   * 
   * @remarks See EntityId, Read, and Write for details on the different QueryParameters.
   */
  createQuery<A>(a: QueryParameter<A>): Query<[A]>
  createQuery<A, B>(a: QueryParameter<A>, b: QueryParameter<B>): Query<[A, B]>
  createQuery<A, B, C>(a: QueryParameter<A>, b: QueryParameter<B>, c: QueryParameter<C>): Query<[A, B, C]>
  createQuery<A, B, C, D>(a: QueryParameter<A>, b: QueryParameter<B>, c: QueryParameter<C>, d: QueryParameter<C>): Query<[A, B, C, D]>
  createQuery<A, B, C, D, E>(a: QueryParameter<A>, b: QueryParameter<B>, c: QueryParameter<C>, d: QueryParameter<C>, e: QueryParameter<E>): Query<[A, B, C, D, E]>
  createQuery<A, B, C, D, E, F>(a: QueryParameter<A>, b: QueryParameter<B>, c: QueryParameter<C>, d: QueryParameter<C>, e: QueryParameter<E>, f: QueryParameter<F>): Query<[A, B, C, D, E, F]>
  createQuery(...parameters: QueryParameter<TEntityId | Component>[]): Query<(TEntityId | Component)[]> {
    const self = this;
    const queryMask = new Uint32Array(this.entityMaskLength);
    const results: (TEntityId | Component)[] = [];
    const queryParameters: (TEntityId | Component)[] = [];
    const componentStorages: ComponentStorage<Component>[] = [];

    // Only query for active entities.
    queryMask[0] = 1;

    for (let parameter of parameters) {
      if (typeof parameter === "function") {
        parameter = Read(parameter);
      }

      const Component = parameter.component;

      if (Component) {
        queryMask[Component.maskIndex] |= Component.mask;
        componentStorages.push(this.componentStorages[Component.id]);
      } else {
        componentStorages.push(undefined);
      }

      queryParameters.push(parameter);
      results.push(undefined);
      
    }

    function iterator() {
      const maskLength = self.entityMaskLength;
      const entityCount = self.entityCount;
      const entityFlags = self.entityFlags;

      let i = 1;
      const result = { value: results, done: false };

      
      return {
        next() {
          while (i <= entityCount) {
            let match = true;
        
            for (let j = 0; j < maskLength; j++) {
              const mask = queryMask[j];
              match = match && ((entityFlags[i * maskLength + j] & mask) === mask); 
            }

            if (match) {
              for (let p = 0; p < queryParameters.length; p++) {
                const parameter = queryParameters[p] as QueryOption<Component | TEntityId>;
                
                if (parameter.entity) {
                  results[p] = i;
                } else if (parameter.write) {
                  self.pushComponentEvent(parameter.component.id, i, ComponentEvent.Changed);
                  results[p] = componentStorages[p].get(i);
                } else {
                  let component = componentStorages[p].get(i);

                  if (process.env.NODE_ENV === "development") {
                    component = wrapImmutableComponent(component)
                  }

                  results[p] = component;
                }
              }
              i++;
              return result;
            }
            i++;
          }

          result.done = true;
          return result;
        }
      };
    }

    return {
      [Symbol.iterator]: iterator,
      first() {
        return iterator().next().value;
      },
      isEmpty() {
        return iterator().next().done;
      },
      destroy() {

      }
    }
  }

  /**
   * Create an event channel for the provided ComponentEvent and Component.
   */
  createEventChannel<T extends Component>(event: ComponentEvent, Component?: ComponentConstructor<T>): EventChannel<T> {
    const eventQueues = this.componentEventQueues[Component.id][event];
    const eventQueue: TEntityId[] = [];
    eventQueues.push(eventQueue);
    const results = [undefined, undefined] as [TEntityId, T];
    const componentStorage = this.componentStorages[Component.id];

    function iterator() {
      let id: TEntityId;
      const result = { value: results, done: false };

      return {
        next() {
          if ((id = eventQueue.pop()) !== undefined) {
            results[0] = id;
            results[1] = componentStorage.get(id) as T;
          } else {
            result.done = true;
          }

          return result;
        }
      }
    }

    return {
      [Symbol.iterator]: iterator,
      first() {
        return iterator().next().value;
      },
      isEmpty() {
        return eventQueue.length === 0;
      },
      destroy() {
        const index = eventQueues.indexOf(eventQueue);
        eventQueues.splice(index, 1);
      }
    }
  }

  /**
   * Register a system with the world. The system's init method will be called.
   * 
   * @remarks Systems are updated in the order they are registered.
   */
  registerSystem(system: ISystem) {
    this.systems.push(system);
    system.init(this);
  }

  /**
   * Update all systems registered with the world.
   */
  update() {
    for (let i = 0; i < this.systems.length; i++) {
      this.systems[i].update();
    }
  }

  /**
   * Unregister the system. The system's destroy method will be called.
   */
  unregisterSystem(system: ISystem) {
    const index = this.systems.indexOf(system);
    this.systems[index].destroy();
    this.systems.splice(index, 1);
  }

  /**
   * Destroy the world and all registered systems.
   */
  destroy() {
    for (const system of this.systems) {
      system.destroy();
    }
  }
}

export interface Query<T extends (TEntityId | Component)[]> {
  [Symbol.iterator](): Iterator<T>
  first(): T
  isEmpty(): boolean
  destroy(): void
}

export interface EventChannel<T extends Component> {
  [Symbol.iterator](): Iterator<[TEntityId, T]>
  first(): [TEntityId, T]
  isEmpty(): boolean
  destroy(): void
}

export enum ComponentEvent {
  Added,
  Removed,
  Changed
}

export type TEntityId = number;

export interface ComponentConstructor<T extends Component> {
  id?: number
  maskIndex?: number
  mask?: number
  new(...args: any[]): T
}

export interface Component {}

export interface ComponentStorage<T extends Component> {
  get(entityId: TEntityId): T | undefined
  set(entityId: TEntityId, component: T): T
  remove(entityId: TEntityId): boolean
}

export interface ISystem {
  init(world: World): void;
  update(): void;
  destroy(): void;
}

export type QueryParameter<T> = ComponentConstructor<T> | QueryOption<T>;

export interface QueryOption<T> {
  entity: boolean
  write: boolean
  component: ComponentConstructor<T> | null
}

/**
 * Query an entity id.
 */
export const EntityId: QueryOption<TEntityId> = { entity: true, write: false, component: null };

/**
 * Query a component as read only.
 */
export function Read<T>(Component: ComponentConstructor<T>): QueryOption<T> {
  return { entity: false, write: false, component: Component };
}

/**
 * Query a component as read/write.
 */
export function Write<T>(Component: ComponentConstructor<T>): QueryOption<T> {
  return { entity: false, write: true, component: Component };
}

export { FlagComponentStorage } from "./FlagComponentStorage";
export { MapComponentStorage } from "./MapComponentStorage";
export { SparseArrayComponentStorage } from "./SparseArrayComponentStorage";
export { System, SystemContext } from "./System";
