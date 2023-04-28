import {GpuUtils} from './GpuUtils';
import {Timer} from './Timer';

// export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

export interface SampleConstructorOptions {
  fps?: number;
  canvas?: HTMLCanvasElement;
  maxComputeInvocationsPerWorkgroup?: number;
}

export class Sample {
  step = 0;

  /** Simulation properties */
  simulationProperties = {};

  device!: GPUDevice;
  adapter!: GPUAdapter;
  context!: GPUCanvasContext;
  canvas!: HTMLCanvasElement;

  devicePixelRatio!: number;
  presentationFormat!: GPUTextureFormat;

  private timer!: Timer;

  constructor (options?: SampleConstructorOptions) {
    // Uh oh, WebGPU not supported
    if (!GpuUtils.checkWebGPUSupport()) throw new Error('WebGPU not supported');

    if (options?.canvas) this.canvas = options.canvas;

    this.timer = new Timer({
      fps: options?.fps,
      onTick: this.render.bind(this),
    });
  }

  async init (options?: SampleConstructorOptions) {
    if (options?.canvas) this.canvas = options.canvas;
    // We need something to draw to!
    if (!this.canvas) throw new Error('No canvas found');

    // Uh oh, No Adpater!
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No adapter found');

    const device = await adapter.requestDevice({
      requiredLimits: {
        maxComputeInvocationsPerWorkgroup:
          options?.maxComputeInvocationsPerWorkgroup ?? 1024, // allow up to 32x 32y 32z workgroups
      },
    });
    const context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    const devicePixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    this.device = device;
    this.adapter = adapter;
    this.context = context;
    this.devicePixelRatio = devicePixelRatio;
    this.presentationFormat = presentationFormat;

    if (options?.fps) {
      this.timer.fps = options.fps;
    }

    return this;
  }

  start () {
    this.timer.start();
  }

  public get startTime () {
    return this.timer.startTime;
  }

  public get lastTime () {
    return this.timer.lastTime;
  }

  public get frameInterval () {
    return this.timer.frameInterval;
  }

  public get fps () {
    return this.timer.fps;
  }

  public set fps (fps: number) {
    this.timer.fps = fps;
  }

  /**
   * Override this function to render your scene
   */
  render () {
    console.log('render is not implemented! I wanna render something!');
  }

  async loadShader (shaderPath: string) {
    return fetch(new Request(shaderPath), {method: 'GET', mode: 'cors'}).then(
      res => res.arrayBuffer().then(arr => new Uint32Array(arr)),
    );
  }

  // GENERAL

  createCommandEncoder (label?: string): GPUCommandEncoder {
    return this.device.createCommandEncoder({label});
  }

  getContextView (): GPUTextureView {
    return this.context.getCurrentTexture().createView();
  }

  // BUFFERS

  createBuffer ({
    usage,
    label,
    setArray,
    size: byteSize,
    mappedAtCreation,
  }: WithOptional<GPUBufferDescriptor, 'size'> & {
    setArray?: Uint8Array | Uint16Array | Float32Array | Uint32Array;
  }) {
    let size = setArray ? setArray.byteLength : byteSize;

    if (size == undefined || size == 0)
      throw new Error('Buffer size must be passed in or array provided');

    let buffer = this.device.createBuffer({
      label,
      usage,
      size,
      mappedAtCreation: mappedAtCreation ?? true,
    });

    if (setArray) {
      let writeArray = GpuUtils.createInstanceArray(setArray, buffer);
      writeArray.set(setArray);
      buffer.unmap();
    }

    return buffer;
  }

  // BindGroups
  createBindGroupLayout ({
    label,
    entries,
  }: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout {
    return this.device.createBindGroupLayout({label, entries});
  }

  createBindGroup ({
    layout,
    entries,
    label,
  }: GPUBindGroupDescriptor): GPUBindGroup {
    return this.device.createBindGroup({layout, entries, label});
  }

  // VERTEX / FRAG

  createVertexBufferLayout ({
    arrayStride,
    attributes,
    stepMode,
  }: GPUVertexBufferLayout): GPUVertexBufferLayout {
    return GpuUtils.createVertexBufferLayout({
      arrayStride,
      attributes,
      stepMode,
    });
  }

  // SHADERS

  createShaderModule (descriptor: GPUShaderModuleDescriptor) {
    /**
     * code: string;
     * sourceMap?: object;
     * hints?: Record<string, GPUShaderModuleCompilationHint>;
     */
    return this.device.createShaderModule(descriptor);
  }

  // PIPELINES
  createPipelineLayout ({bindGroupLayouts, label}: GPUPipelineLayoutDescriptor) {
    return this.device.createPipelineLayout({bindGroupLayouts, label});
  }

  createPipeline (
    type: 'compute' | 'render',
    descriptor: GPURenderPipelineDescriptor | GPUComputePipelineDescriptor,
  ): GPURenderPipeline | GPUComputePipeline {
    return type == 'compute'
      ? (this.makeComputePipeline(
          descriptor as GPUComputePipelineDescriptor,
        ) as GPUComputePipeline)
      : (this.makeRenderPipeline(
          descriptor as GPURenderPipelineDescriptor,
        ) as GPURenderPipeline);
  }

  private makeRenderPipeline (
    descriptor: GPURenderPipelineDescriptor,
  ): GPURenderPipeline {
    return this.device.createRenderPipeline(descriptor);
  }

  private makeComputePipeline (
    descriptor: GPUComputePipelineDescriptor,
  ): GPUComputePipeline {
    return this.device.createComputePipeline(descriptor);
  }
}
