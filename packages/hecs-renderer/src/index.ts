// tslint:disable-next-line:no-submodule-imports
import UpdateWorker from "worker-loader!./UpdateWorker";

const updateWorker = new UpdateWorker();
const commandBuffer = new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 4);
const transferables: [ArrayBuffer?] = [commandBuffer];

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;

function update(responseBuffer: ArrayBuffer) {
  const result = new Float32Array(responseBuffer);
  for (let i = 0; i < 1000; i++) {
    for (let j = 0; j < 1000; j++) {
      for (let k = 0; k < 1000; k++) {
        // tslint:disable-next-line
        let result = (i * j) / k;
      }
    }
  }
  gl.clearColor(result[0], result[1], result[2], result[3]);
  gl.clear(gl.COLOR_BUFFER_BIT);
  transferables[0] = responseBuffer;
  updateWorker.postMessage(responseBuffer, transferables);
}

updateWorker.addEventListener("message", event => {
  requestAnimationFrame(() => {
    update(event.data);
  });
});

updateWorker.postMessage(commandBuffer, transferables);
