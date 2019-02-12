// https://github.com/makrjs/makr/issues/3 // Fast queries with iterators
// https://github.com/slide-rs/hibitset/blob/master/src/lib.rs // bitmasks for lots of components
// https://github.com/slide-rs/specs/blob/master/src/storage/flagged.rs // component events
// https://github.com/rustgd/shrev-rs // ring buffer event channel

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

export class World {
  protected entityPool: EntityId[];
  protected entityCount: EntityId;
  protected entityFlags: Int32Array;
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
  protected systems: System[];

  constructor() {
    this.entityPool = [];
    this.entityCount = 0;
    // TODO: make entity flags not a fixed size
    this.entityFlags = new Int32Array(1024);
    this.entityMaskLength = 0;
    this.componentConstructors = [];
    this.componentStorages = [];
    this.componentEventQueues = {};
    this.systems = [];
  }

  createEntity() {
    let entityId: EntityId;

    if (this.entityPool.length > 0) {
      entityId = this.entityPool.pop();
    } else {
      entityId = ++this.entityCount;
    }

    const maskIndex = entityId * this.entityMaskLength;
    this.entityFlags[maskIndex] = 1;

    // TODO: Expand entity flags if needed and update associated data.
    
    return entityId;
  }

  destroyEntity(entityId: EntityId) {
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

  registerComponent<T extends Component>(Component: ComponentConstructor<T>, storage: ComponentStorage<T>) {
    const maskSize = this.componentStorages.length + 1;
    const id = Component.id = maskSize;
    Component.maskIndex = Math.floor(maskSize / 32);
    Component.mask = 1 << (maskSize % 32);
    this.entityMaskLength = Math.ceil(maskSize / 32);
    this.componentStorages[id] = storage;
    this.componentConstructors.push(Component);
    this.componentEventQueues[id] = {
      [ComponentEvent.Added]: [],
      [ComponentEvent.Removed]: [],
      [ComponentEvent.Changed]: []
    };
    // TODO: Expand entity flags if needed and update associated data.
  }

  hasComponent(entityId: EntityId, Component: ComponentConstructor<Component>) {
    const maskIndex = (entityId * this.entityMaskLength) + Component.maskIndex;
    const componentMask =  Component.mask;
    return (this.entityFlags[maskIndex] & componentMask) === componentMask;
  }

  getImmutableComponent<T extends Component>(entityId: EntityId, Component: ComponentConstructor<T>): T {
    const component = this.componentStorages[Component.id].get(entityId) as T;
    
    // TODO: Re-enable for just the returned value somehow?
    // if (process.env.NODE_ENV = "development") {
    //   Object.freeze(component);
    // }

    return component;
  }

  getMutableComponent<T extends Component>(entityId: EntityId, Component: ComponentConstructor<T>): T {
    const componentId = Component.id;
    this.pushComponentEvent(componentId, entityId, ComponentEvent.Changed);
    return this.componentStorages[componentId].get(entityId) as T;
  }

  addComponent<T extends Component>(entityId: EntityId, component: T): T {
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

  removeComponent(entityId: EntityId, Component: ComponentConstructor<Component>) {
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

  createQuery<A extends Component>(a: ComponentConstructor<A>): Query<[EntityId, A]>
  createQuery<A extends Component, B extends Component>(a: ComponentConstructor<A>, b: ComponentConstructor<B>): Query<[EntityId, A, B]>
  createQuery<A extends Component, B extends Component, C extends Component>(a: ComponentConstructor<A>, b: ComponentConstructor<B>, c: ComponentConstructor<C>): Query<[EntityId, A, B, C]>
  createQuery<A extends Component, B extends Component, C extends Component, D extends Component>(a: ComponentConstructor<A>, b: ComponentConstructor<B>, c: ComponentConstructor<C>, d: ComponentConstructor<C>): Query<[EntityId, A, B, C, D]>
  createQuery<A extends Component, B extends Component, C extends Component, D extends Component, E extends Component>(a: ComponentConstructor<A>, b: ComponentConstructor<B>, c: ComponentConstructor<C>, d: ComponentConstructor<C>, e: ComponentConstructor<E>): Query<[EntityId, A, B, C, D, E]>
  createQuery(...components: ComponentConstructor<Component>[]): Query<Component[]> {
    const self = this;
    const queryMask = new Uint32Array(this.entityMaskLength);

    // Only query for active entities.
    queryMask[0] = 1;

    for (const Component of components) {
      queryMask[Component.maskIndex] |= Component.mask;
    }

    const results = [undefined];

    for (let i = 1; i <= components.length; i++) {
      results.push(undefined);
    }

    function *iterator() {
      const maskLength = self.entityMaskLength;
      const entityCount = self.entityCount;
      const entityFlags = self.entityFlags;

      for (let i = 1; i <= entityCount; i++) {
        let match = true;
        
        for (let j = 0; j < maskLength; j++) {
          match = match && ((entityFlags[(i * maskLength) + j] & queryMask[j]) === queryMask[j]); 
        }

        if (match) {
          results[0] = i;

          for (let c = 0; c < components.length; c++) {
            results[c + 1] = self.getMutableComponent(i, components[c]);
          }

          yield results;
        }
      }
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

  createEventChannel<T extends Component>(event: ComponentEvent, Component?: ComponentConstructor<T>): EventChannel<T> {
    const eventQueues = this.componentEventQueues[Component.id][event];
    const eventQueue: EntityId[] = [];
    eventQueues.push(eventQueue);
    const results = [undefined, undefined];
    const self = this;

    function* iterator() {
      let id: EntityId;
      while((id = eventQueue.pop()) != null){ 
        results[0] = id;
        results[1] = self.getImmutableComponent(id, Component);
        yield results as [EntityId, T];  
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

  registerSystem(system: System) {
    this.systems.push(system);
    system.init(this);
  }

  update() {
    for (let i = 0; i < this.systems.length; i++) {
      this.systems[i].update();
    }
  }

  unregisterSystem(system: System) {
    const index = this.systems.indexOf(system);
    this.systems[index].destroy();
    this.systems.splice(index, 1);
  }

  destroy() {
    for (const system of this.systems) {
      system.destroy();
    }
  }
}

export interface Query<T extends (EntityId | Component)[]> {
  [Symbol.iterator](): Iterator<T>
  first(): T
  isEmpty(): boolean
  destroy(): void
}

export interface EventChannel<T extends Component> {
  [Symbol.iterator](): Iterator<[EntityId, T]>
  first(): [EntityId, T]
  isEmpty(): boolean
  destroy(): void
}

export enum ComponentEvent {
  Added,
  Removed,
  Changed
}

export type EntityId = number;

export interface ComponentConstructor<T extends Component> {
  id?: number
  maskIndex?: number
  mask?: number
  new(...args: any[]): T
}

export interface Component {}

export interface ComponentStorage<T extends Component> {
  get(entityId: EntityId): T | undefined
  set(entityId: EntityId, component: T): T
  remove(entityId: EntityId): boolean
}

export interface System {
  init(world: World);
  update(): void;
  destroy(): void;
}
