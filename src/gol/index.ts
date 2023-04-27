import computeWGSL from './compute.wgsl';
import vertWGSL from './vert.wgsl';
import fragWGSL from './frag.wgsl';
import {Sample, SampleConstructorOptions} from '../Sample';

export class GameOfLife extends Sample {
  simulationProperties: {
    width: number;
    height: number;
    workgroupSize: number;
    color: Float32Array;
  } = {
    width: 256,
    height: 256,
    workgroupSize: 8,
    color: new Float32Array([1.0, 0.0, 0.0, 1]),
  };

  loopCount = 0;

  // Vertices / Indices
  squareVertices!: Float32Array;

  // Shaders
  vertexShader!: GPUShaderModule;
  computeShader!: GPUShaderModule;
  fragmentShader!: GPUShaderModule;

  // Bind Group Layouts
  bindGroupLayoutRender!: GPUBindGroupLayout;
  bindGroupLayoutCompute!: GPUBindGroupLayout;

  // Bind Groups
  uniformBindGroup!: GPUBindGroup;
  bufferBindGroups!: GPUBindGroup[];

  // Buffers
  buffer_in!: GPUBuffer;
  buffer_out!: GPUBuffer;
  sizeBuffer!: GPUBuffer;
  squareBuffer!: GPUBuffer;

  // Pipelines
  renderPipeline!: GPURenderPipeline;
  computePipeline!: GPUComputePipeline;

  constructor (options?: SampleConstructorOptions) {
    super(options);
  }

  async init (options?: SampleConstructorOptions | undefined) {
    await super.init(options);

    this.createShaders();
    this.createBindGroupLayouts();
    this.createBuffers();
    this.createBindGroups();
    this.createPipelines();

    return this;
  }

  private createShaders () {
    const computeShader = this.createShaderModule({
      label: 'compute',
      code: computeWGSL,
    });

    const vertexShader = this.createShaderModule({
      code: vertWGSL,
      label: 'vertex',
    });

    const fragmentShader = this.createShaderModule({
      code: fragWGSL,
      label: 'fragment',
    });

    this.vertexShader = vertexShader;
    this.computeShader = computeShader;
    this.fragmentShader = fragmentShader;
  }

  private createBindGroupLayouts () {
    // COMPUTE
    const bindGroupLayoutCompute = this.createBindGroupLayout({
      label: 'bind_group_layout_compute',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: 'read-only-storage',
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: 'read-only-storage',
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: 'storage',
          },
        },
      ],
    });

    const bindGroupLayoutRender = this.createBindGroupLayout({
      label: 'bind_group_layout_render',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform',
          },
        },
      ],
    });

    this.bindGroupLayoutRender = bindGroupLayoutRender;
    this.bindGroupLayoutCompute = bindGroupLayoutCompute;
  }

  private createBuffers () {
    // ========== VERTICES ==========
    this.squareVertices = new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]);
    const squareBuffer = this.createBuffer({
      usage: GPUBufferUsage.VERTEX,
      setArray: this.squareVertices,
    });
    this.squareBuffer = squareBuffer;

    // ========== SIZE ==========
    const sizeBuffer = this.createBuffer({
      label: 'size_buffer',
      setArray: new Float32Array([
        this.simulationProperties.width,
        this.simulationProperties.height,
      ]),
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.UNIFORM |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.VERTEX,
    });
    this.sizeBuffer = sizeBuffer;

    // ========== CELLS ==========
    // Initialize the cells randomly
    const cells = new Uint32Array(
      this.simulationProperties.width * this.simulationProperties.height,
    );
    for (let i = 0; i < cells.length; i++) {
      cells[i] = Math.random() < 0.25 ? 1 : 0;
    }

    const buffer_in = this.createBuffer({
      label: 'buffer_in',
      setArray: cells,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
    });

    const buffer_out = this.device.createBuffer({
      size: cells.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
    });

    this.buffer_in = buffer_in;
    this.buffer_out = buffer_out;
  }

  private createBindGroups () {
    const bindGroup0 = this.createBindGroup({
      label: 'buffer_in_bind_group',
      layout: this.bindGroupLayoutCompute,
      entries: [
        {binding: 0, resource: {buffer: this.sizeBuffer}},
        {binding: 1, resource: {buffer: this.buffer_in}},
        {binding: 2, resource: {buffer: this.buffer_out}},
      ],
    });

    const bindGroup1 = this.createBindGroup({
      label: 'buffer_out_bind_group',
      layout: this.bindGroupLayoutCompute,
      entries: [
        {binding: 0, resource: {buffer: this.sizeBuffer}},
        {binding: 1, resource: {buffer: this.buffer_out}},
        {binding: 2, resource: {buffer: this.buffer_in}},
      ],
    });

    this.bufferBindGroups = [bindGroup0, bindGroup1];
  }

  private createPipelines () {
    this.createComputePipeline();
    this.createRenderPipeline();
  }

  private createComputePipeline () {
    const computeLayout = this.createPipelineLayout({
      label: 'computeLayout',
      bindGroupLayouts: [this.bindGroupLayoutCompute],
    });

    const computePipeline = this.createPipeline('compute', {
      layout: computeLayout,
      compute: {
        entryPoint: 'main',
        module: this.computeShader,
        constants: {
          blockSize: this.simulationProperties.workgroupSize,
        },
      },
    }) as GPUComputePipeline;

    this.computePipeline = computePipeline;
  }

  private createRenderPipeline () {
    // cell location(0)
    const cellsStride: GPUVertexBufferLayout = {
      arrayStride: Uint32Array.BYTES_PER_ELEMENT,
      stepMode: 'instance',
      attributes: [
        {
          offset: 0,
          format: 'uint32',
          shaderLocation: 0,
        },
      ],
    };
    // position location(1)
    const squareStride: GPUVertexBufferLayout = {
      stepMode: 'vertex',
      arrayStride: 2 * this.squareVertices.BYTES_PER_ELEMENT,
      attributes: [{shaderLocation: 1, offset: 0, format: 'float32x2'}],
    };

    const renderLayout = this.createPipelineLayout({
      label: 'renderLayout',
      bindGroupLayouts: [this.bindGroupLayoutRender],
    });

    const renderPipeline = this.createPipeline('render', {
      layout: renderLayout,
      primitive: {topology: 'triangle-strip'},
      vertex: {
        entryPoint: 'main',
        module: this.vertexShader,
        buffers: [cellsStride, squareStride],
      },
      fragment: {
        entryPoint: 'main',
        module: this.fragmentShader,
        targets: [{format: this.presentationFormat}],
      },
    }) as GPURenderPipeline;

    const uniformBindGroup = this.createBindGroup({
      label: 'uniform_bind_group',
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            offset: 0,
            buffer: this.sizeBuffer,
            size: 2 * Uint32Array.BYTES_PER_ELEMENT,
          },
        },
      ],
    });

    this.renderPipeline = renderPipeline;
    this.uniformBindGroup = uniformBindGroup;
  }

  render (): void {
    const view = this.getContextView();
    let commandEncoder = this.createCommandEncoder('base command encoder');

    const workGroupX =
      this.simulationProperties.width / this.simulationProperties.workgroupSize;
    const workGroupY =
      this.simulationProperties.height /
      this.simulationProperties.workgroupSize;

    const bindGroup = this.bufferBindGroups[this.loopCount % 2];

    // compute
    const passEncoderCompute = commandEncoder.beginComputePass();
    passEncoderCompute.setPipeline(this.computePipeline);
    passEncoderCompute.setBindGroup(0, bindGroup);
    passEncoderCompute.dispatchWorkgroups(workGroupX, workGroupY);
    passEncoderCompute.end();

    // Render
    const passEncoderRender = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: {r: 0, g: 0, b: 0, a: 1},
        },
      ],
    });

    let buffer: GPUBuffer;
    if (this.loopCount % 2 === 0) {
      buffer = this.buffer_out;
    } else {
      buffer = this.buffer_in;
    }

    passEncoderRender.setPipeline(this.renderPipeline);
    passEncoderRender.setVertexBuffer(0, buffer);
    passEncoderRender.setVertexBuffer(1, this.squareBuffer);
    passEncoderRender.setBindGroup(0, this.uniformBindGroup);
    passEncoderRender.draw(
      4,
      this.simulationProperties.width * this.simulationProperties.height,
    );
    passEncoderRender.end();

    this.device.queue.submit([commandEncoder.finish()]);

    this.loopCount++;
  }
}
