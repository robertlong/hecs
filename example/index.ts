import { Query, World, ComponentEvent, EventChannel } from "../src/index";
import { SmartSystem, SystemContext } from "../src/SmartSystem";
import { MapComponentStorage } from "../src/MapComponentStorage";
import { Scene, WebGLRenderer, PerspectiveCamera, AmbientLight, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

class ModelComponent {
  src: string

  constructor(src: string) {
    this.src = src;
  } 
}

class RotatorComponent {

}

class Object3DComponent {
  object3D: Object3D

  constructor(object3D: Object3D) {
    this.object3D = object3D;
  }
}

interface RendererSystemContext extends SystemContext {
  renderers: Query
  scenes: Query
  cameras: Query
}

class RendererSystem extends SmartSystem<RendererSystemContext> {
  setup() {
    return {
      renderers: this.world.createQuery(WebGLRenderer),
      scenes: this.world.createQuery(Scene),
      cameras: this.world.createQuery(PerspectiveCamera)
    };
  }

  update() {
    const rendererId = this.ctx.renderers.first();
    const sceneId = this.ctx.scenes.first();
    const cameraId = this.ctx.cameras.first();

    const renderer = this.world.getMutableComponent(rendererId, WebGLRenderer);
    const scene = this.world.getMutableComponent(sceneId, Scene);
    const camera = this.world.getMutableComponent(cameraId, PerspectiveCamera);

    renderer.render(scene, camera);
  }
}

interface GLTFLoaderSystemContext extends SystemContext {
  scenes: Query
  added: EventChannel
}

class GLTFLoaderSystem extends SmartSystem<GLTFLoaderSystemContext> {
  setup() {
    return {
      scenes: this.world.createQuery(Scene),
      added: this.world.createEventChannel(ComponentEvent.Added, ModelComponent)
    };
  }

  update() {
    for (const added of this.ctx.added) {
      const sceneEntity = this.ctx.scenes.first();
      const scene = this.world.getMutableComponent(sceneEntity, Scene);
      const model = this.world.getMutableComponent(added, ModelComponent);
      new GLTFLoader().load(model.src, gltf => {
        scene.add(gltf.scene);
        world.addComponent(added, new Object3DComponent(gltf.scene));
        world.addComponent(added, new RotatorComponent())
      });
    }
  }
}

interface RotatorSystemContext extends SystemContext {
  entities: Query
}

class RotatorSystem extends SmartSystem<RotatorSystemContext> {
  setup() {
    return {
      entities: this.world.createQuery(RotatorComponent, Object3DComponent)
    };
  }

  update() {
    for (const entityId of this.ctx.entities) {
      const component = this.world.getMutableComponent(entityId, Object3DComponent);
      component.object3D.rotateY(-0.05);
    }
  }
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const world = this.world = new World();

world.registerComponent(WebGLRenderer, new MapComponentStorage());
world.registerComponent(Scene, new MapComponentStorage());
world.registerComponent(PerspectiveCamera, new MapComponentStorage());
world.registerComponent(ModelComponent, new MapComponentStorage());
world.registerComponent(AmbientLight, new MapComponentStorage());
world.registerComponent(RotatorComponent, new MapComponentStorage());
world.registerComponent(Object3DComponent, new MapComponentStorage());

const rendererEntity = world.createEntity();
const renderer = new WebGLRenderer({
  canvas,
  antialias: true
});
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.autoUpdate = true;
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
world.addComponent(rendererEntity, renderer);

const sceneEntity = world.createEntity();
const scene = new Scene();
const ambientLight = new AmbientLight();
scene.add(ambientLight as Object3D);
world.addComponent(sceneEntity, scene);
world.addComponent(sceneEntity, ambientLight);

const cameraEntity = world.createEntity();
const camera =  new PerspectiveCamera();
camera.position.set(0, 1, 5);
world.addComponent(cameraEntity, camera);

world.registerSystem(new GLTFLoaderSystem());
world.registerSystem(new RotatorSystem());
world.registerSystem(new RendererSystem());

const modelEntity = world.createEntity();
world.addComponent(modelEntity, new ModelComponent("./Duck.glb"));

renderer.setAnimationLoop(() => {
  this.world.update();
});