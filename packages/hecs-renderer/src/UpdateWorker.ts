const transferable: [ArrayBuffer?] = [undefined];

self.addEventListener("message", event => {
  const commandBuffer: ArrayBuffer = event.data;
  const commandBufferView = new Float32Array(commandBuffer);
  commandBufferView[0] = Math.random();
  commandBufferView[1] = Math.random();
  commandBufferView[2] = Math.random();
  commandBufferView[3] = 1;
  transferable[0] = commandBuffer;

  for (let i = 0; i < 1000; i++) {
    for (let j = 0; j < 1000; j++) {
      for (let k = 0; k < 1000; k++) {
        // tslint:disable-next-line
        let result = (i * j) / k;
      }
    }
  }

  postMessage(commandBuffer, transferable);
});
