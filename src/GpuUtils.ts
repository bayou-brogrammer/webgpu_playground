export class GpuUtils {
  static displayedNotSupportedError = false;

  static checkWebGPUSupport () {
    if (!navigator.gpu) {
      let noDisplay = document.getElementById('not-supported');
      if (noDisplay) noDisplay.style.display = 'block';

      if (!GpuUtils.displayedNotSupportedError) {
        alert(
          'WebGPU not supported! Please visit webgpu.io to see the current implementation status.',
        );
      }

      GpuUtils.displayedNotSupportedError = true;
    }

    return !!navigator.gpu;
  }

  static range (start: number, end: number) {
    return Array.from({length: end - start}, (_v, k) => k + start);
  }

  static align (size: number, alignTo: number): number {
    return Math.ceil(size / alignTo) * alignTo;
  }

  // GENERAL

  static createCommandEncoder (device: GPUDevice, label?: string) {
    return device.createCommandEncoder({label});
  }

  static createInstanceArray (
    arr: Uint8Array | Uint16Array | Float32Array | Uint32Array,
    buffer: GPUBuffer,
  ) {
    if (arr instanceof Uint8Array) {
      return new Uint8Array(buffer.getMappedRange());
    }

    if (arr instanceof Uint16Array) {
      return new Uint16Array(buffer.getMappedRange());
    }

    if (arr instanceof Uint32Array) {
      return new Uint32Array(buffer.getMappedRange());
    }

    // Default to Float32Array
    return new Float32Array(buffer.getMappedRange());
  }

  // BUFFERS

  static createBuffer (
    device: GPUDevice,
    arr: Float32Array | Uint16Array | Uint8Array,
    usage: number,
  ) {
    let desc = {size: arr.byteLength, usage, mappedAtCreation: true};
    let buffer = device.createBuffer(desc);
    let writeArray =
      arr instanceof Uint16Array
        ? new Uint16Array(buffer.getMappedRange())
        : arr instanceof Uint8Array
        ? new Uint8Array(buffer.getMappedRange())
        : new Float32Array(buffer.getMappedRange());
    writeArray.set(arr);
    buffer.unmap();
    return buffer;
  }

  // BindGroups
  static createBindGroupLayout (
    device: GPUDevice,
    {label, entries}: GPUBindGroupLayoutDescriptor,
  ): GPUBindGroupLayout {
    return device.createBindGroupLayout({label, entries});
  }

  static createBindGroup (
    device: GPUDevice,
    {layout, entries, label}: GPUBindGroupDescriptor,
  ): GPUBindGroup {
    return device.createBindGroup({layout, entries, label});
  }

  // VERTEX / FRAG

  static createVertexBufferLayout ({
    arrayStride,
    attributes,
    stepMode,
  }: GPUVertexBufferLayout): GPUVertexBufferLayout {
    return {arrayStride, attributes, stepMode};
  }

  // SHADERS

  static createShaderModule (
    device: GPUDevice,
    descriptor: GPUShaderModuleDescriptor,
  ): GPUShaderModule {
    /**
     * code: string;
     * sourceMap?: object;
     * hints?: Record<string, GPUShaderModuleCompilationHint>;
     */
    return device.createShaderModule(descriptor);
  }

  // PIPELINES
  static createRenderPipeline (
    device: GPUDevice,
    descriptor: GPURenderPipelineDescriptor,
  ): GPURenderPipeline {
    return device.createRenderPipeline(descriptor);
  }

  static createComputePipeline (
    device: GPUDevice,
    descriptor: GPUComputePipelineDescriptor,
  ): GPUComputePipeline {
    return device.createComputePipeline(descriptor);
  }
}
