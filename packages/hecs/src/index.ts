// tslint:disable: no-bitwise
import { MapComponentStorage } from "./MapComponentStorage";

let wrapImmutableComponent: <T extends IComponent>(component: T) => T;
if (process.env.NODE_ENV === "development") {
  const proxyHandler = {
    set(target: IComponent, prop: string) {
      throw new Error(
        `Tried to write to "${target.constructor.name}#${String(
          prop
        )}" on immutable component. Use Write() or .getMutableComponent() to write to a component.`
      );
    }
  };

  const proxyMap: WeakMap<IComponent, IComponent> = new WeakMap();

  wrapImmutableComponent = <T>(component: T): T => {
    if (component === undefined) {
      return undefined;
    }

    let wrappedComponent = proxyMap.get(component);

    if (!wrappedComponent) {
      wrappedComponent = new Proxy(
        (component as unknown) as object,
        proxyHandler
      ) as T;
      proxyMap.set(component, wrappedComponent);
    }

    return wrappedComponent as T;
  };
}

export class World {
  protected entityPool: TEntityId[];
  protected entityCount: TEntityId;
  /**
   * Bitset for each entity can be stored in a single typed array / array buffer
   * for the best data locality when iterating through entities. Data for each entity
   * is stored in one or more 32 bit chunks for fast iteration per entity.
   *
   * Uint32Array: |     0      |       1          |       2          | ... |    32     | ...
   *              |  Entity 0  |  Component.id 0  |  Component.id 1  | ... | Entity 1  | ...
   * Entity Flag: 0 = Inactive, 1 = Active
   * Component Flag: 0 = Inactive, 1 = Active
   */
  protected entityFlags: Uint32Array;
  protected entityMaskLength: number;
  protected componentConstructors: Array<IComponentConstructor<IComponent>>;
  protected componentStorages: Array<IComponentStorage<IComponent>>;
  protected componentEventQueues: {
    [componentId: number]: {
      [ComponentEvent.Added]: number[][];
      [ComponentEvent.Removed]: number[][];
      [ComponentEvent.Changed]: number[][];
    };
  };
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
  public createEntity() {
    const entityId =
      this.entityPool.length > 0 ? this.entityPool.pop() : ++this.entityCount;
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
  public destroyEntity(entityId: TEntityId) {
    const entityFlags = this.entityFlags;
    const entityMaskLength = this.entityMaskLength;

    for (let i = 0; i < entityMaskLength; i++) {
      const maskIndex = entityId * entityMaskLength + i;
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
  public isAlive(entityId: TEntityId) {
    return (this.entityFlags[entityId * this.entityMaskLength] & 1) === 1;
  }

  /**
   * Register a component class and storage with the world so that it can be queried.
   */
  public registerComponent<T extends IComponent>(
    Component: IComponentConstructor<T>,
    storage?: IComponentStorage<T>
  ) {
    storage = storage || new MapComponentStorage();

    const numComponents = this.componentStorages.length;
    const maskSize = numComponents + 1;
    const id = (Component.id = numComponents);
    Component.maskIndex = Math.floor(maskSize / 32);
    Component.mask = 1 << maskSize % 32;
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
      const nextEntityFlags = new Uint32Array(
        numEntities * nextEntityMaskLength
      );

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
  public hasComponent(
    entityId: TEntityId,
    Component: IComponentConstructor<IComponent>
  ) {
    const maskIndex = entityId * this.entityMaskLength + Component.maskIndex;
    const componentMask = Component.mask;
    return (this.entityFlags[maskIndex] & componentMask) === componentMask;
  }

  /**
   * Get an immutable reference to the component on the provided entity.
   *
   * @remarks In development mode, in order to throw an error when an immutable component is mutated,
   * this method returns a proxy of the component, not the original component.
   */
  public getImmutableComponent<T extends IComponent>(
    entityId: TEntityId,
    Component: IComponentConstructor<T>
  ): T {
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
  public getMutableComponent<T extends IComponent>(
    entityId: TEntityId,
    Component: IComponentConstructor<T>
  ): T {
    const componentId = Component.id;
    this.pushComponentEvent(componentId, entityId, ComponentEvent.Changed);
    return this.componentStorages[componentId].get(entityId) as T;
  }

  /**
   * Add the component to the provided entity. Returns null if the entity already has the component.
   *
   * @remarks A ComponentEvent.Added event is pushed to any EventChannels for this component.
   */
  public addComponent<T extends IComponent>(
    entityId: TEntityId,
    component: T
  ): T {
    const Component = component.constructor as IComponentConstructor<T>;
    const componentId = Component.id;

    if (!this.hasComponent(entityId, Component)) {
      const maskIndex = entityId * this.entityMaskLength + Component.maskIndex;
      const componentMask = Component.mask;
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
  public removeComponent(
    entityId: TEntityId,
    Component: IComponentConstructor<IComponent>
  ) {
    const componentId = Component.id;

    if (this.componentStorages[componentId].remove(entityId)) {
      const maskIndex = entityId * this.entityMaskLength + Component.maskIndex;
      const componentMask = Component.mask;
      this.entityFlags[maskIndex] &= ~componentMask;
      this.pushComponentEvent(componentId, entityId, ComponentEvent.Removed);
      return true;
    }

    return false;
  }

  /**
   * Create a query for the provided QueryParameters.
   *
   * @remarks See EntityId, Read, and Write for details on the different QueryParameters.
   */
  public createQuery<A>(a: TQueryParameter<A>): IQuery<[A]>;
  public createQuery<A, B>(
    a: TQueryParameter<A>,
    b: TQueryParameter<B>
  ): IQuery<[A, B]>;
  public createQuery<A, B, C>(
    a: TQueryParameter<A>,
    b: TQueryParameter<B>,
    c: TQueryParameter<C>
  ): IQuery<[A, B, C]>;
  public createQuery<A, B, C, D>(
    a: TQueryParameter<A>,
    b: TQueryParameter<B>,
    c: TQueryParameter<C>,
    d: TQueryParameter<C>
  ): IQuery<[A, B, C, D]>;
  public createQuery<A, B, C, D, E>(
    a: TQueryParameter<A>,
    b: TQueryParameter<B>,
    c: TQueryParameter<C>,
    d: TQueryParameter<C>,
    e: TQueryParameter<E>
  ): IQuery<[A, B, C, D, E]>;
  public createQuery<A, B, C, D, E, F>(
    a: TQueryParameter<A>,
    b: TQueryParameter<B>,
    c: TQueryParameter<C>,
    d: TQueryParameter<C>,
    e: TQueryParameter<E>,
    f: TQueryParameter<F>
  ): IQuery<[A, B, C, D, E, F]>;
  public createQuery(
    ...parameters: Array<TQueryParameter<TEntityId | IComponent>>
  ): IQuery<Array<TEntityId | IComponent>> {
    // tslint:disable-next-line no-this-assignment
    const self = this;
    const queryMask = new Uint32Array(this.entityMaskLength);
    const results: Array<TEntityId | IComponent> = [];
    const queryParameters: Array<TEntityId | IComponent> = [];
    const componentStorages: Array<IComponentStorage<IComponent>> = [];

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
              match =
                match && (entityFlags[i * maskLength + j] & mask) === mask;
            }

            if (match) {
              for (let p = 0; p < queryParameters.length; p++) {
                const parameter = queryParameters[p] as IQueryOption<
                  IComponent | TEntityId
                >;

                if (parameter.entity) {
                  results[p] = i;
                } else if (parameter.write) {
                  self.pushComponentEvent(
                    parameter.component.id,
                    i,
                    ComponentEvent.Changed
                  );
                  results[p] = componentStorages[p].get(i);
                } else {
                  let component = componentStorages[p].get(i);

                  if (process.env.NODE_ENV === "development") {
                    component = wrapImmutableComponent(component);
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
      // tslint:disable-next-line: no-empty
      destroy() {}
    };
  }

  /**
   * Create an event channel for the provided ComponentEvent and Component.
   */
  public createEventChannel<T extends IComponent>(
    event: ComponentEvent,
    Component?: IComponentConstructor<T>
  ): IEventChannel<T> {
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
          // tslint:disable-next-line: no-conditional-assignment
          if ((id = eventQueue.pop()) !== undefined) {
            results[0] = id;

            let component = componentStorage.get(id) as T;

            if (process.env.NODE_ENV === "development") {
              component = wrapImmutableComponent(component);
            }

            results[1] = component;
          } else {
            result.done = true;
          }

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
        return eventQueue.length === 0;
      },
      destroy() {
        const index = eventQueues.indexOf(eventQueue);
        eventQueues.splice(index, 1);
      }
    };
  }

  /**
   * Register a system with the world. The system's init method will be called.
   *
   * @remarks Systems are updated in the order they are registered.
   */
  public registerSystem(system: ISystem) {
    this.systems.push(system);
    system.init(this);
  }

  /**
   * Update all systems registered with the world.
   */
  public update() {
    for (let i = 0; i < this.systems.length; i++) {
      this.systems[i].update();
    }
  }

  /**
   * Unregister the system. The system's destroy method will be called.
   */
  public unregisterSystem(system: ISystem) {
    const index = this.systems.indexOf(system);
    this.systems[index].destroy();
    this.systems.splice(index, 1);
  }

  /**
   * Destroy the world and all registered systems.
   */
  public destroy() {
    for (const system of this.systems) {
      system.destroy();
    }
  }

  protected pushComponentEvent(
    componentId: number,
    entityId: number,
    event: ComponentEvent
  ) {
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
}

export interface IQuery<T extends Array<TEntityId | IComponent>> {
  [Symbol.iterator](): Iterator<T>;
  first(): T;
  isEmpty(): boolean;
  destroy(): void;
}

export interface IEventChannel<T extends IComponent> {
  [Symbol.iterator](): Iterator<[TEntityId, T]>;
  first(): [TEntityId, T];
  isEmpty(): boolean;
  destroy(): void;
}

export enum ComponentEvent {
  Added,
  Removed,
  Changed
}

export type TEntityId = number;

export interface IComponentConstructor<T extends IComponent> {
  id?: number;
  maskIndex?: number;
  mask?: number;
  new (...args: any[]): T;
}

// tslint:disable-next-line: no-empty-interface
export interface IComponent {}

export interface IComponentStorage<T extends IComponent> {
  get(entityId: TEntityId): T | undefined;
  set(entityId: TEntityId, component: T): T;
  remove(entityId: TEntityId): boolean;
}

export interface ISystem {
  init(world: World): void;
  update(): void;
  destroy(): void;
}

export type TQueryParameter<T> = IComponentConstructor<T> | IQueryOption<T>;

export interface IQueryOption<T> {
  entity: boolean;
  write: boolean;
  component: IComponentConstructor<T> | null;
}

/**
 * Query an entity id.
 */
export const EntityId: IQueryOption<TEntityId> = {
  component: null,
  entity: true,
  write: false
};

/**
 * Query a component as read only.
 */
export function Read<T>(Component: IComponentConstructor<T>): IQueryOption<T> {
  return { entity: false, write: false, component: Component };
}

/**
 * Query a component as read/write.
 */
export function Write<T>(Component: IComponentConstructor<T>): IQueryOption<T> {
  return { entity: false, write: true, component: Component };
}

export { FlagComponentStorage } from "./FlagComponentStorage";
export { MapComponentStorage } from "./MapComponentStorage";
export { SparseArrayComponentStorage } from "./SparseArrayComponentStorage";
export { System, ISystemContext } from "./System";
