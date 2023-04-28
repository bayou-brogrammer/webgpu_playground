import computeWGSL from './compute.wgsl';
import renderWGSL from './render.wgsl';
import {Sample, SampleConstructorOptions} from '../Sample';

export interface simulationProperties {
  size: number;
  width: number;
  height: number;
}

export class GameOfLife extends Sample {
  simulationProperties: {
    size: number;
    width: number;
    height: number;
    workgroupSize: number;
    color: Float32Array;
  } = {
    width: 512,
    height: 512,
    size: 512 * 512,
    workgroupSize: 32,
    color: new Float32Array([1.0, 0.0, 0.0, 1]),
  };

  // Vertices / Indices
  vertices!: Float32Array;

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
  vertexBuffer!: GPUBuffer;
  buffers_in_out!: GPUBuffer[];
  sizeUniformBuffer!: GPUBuffer;

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
      code: renderWGSL,
      label: 'vertex',
    });

    const fragmentShader = this.createShaderModule({
      code: renderWGSL,
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
          buffer: {type: 'read-only-storage'},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {type: 'read-only-storage'},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {type: 'storage'},
        },
      ],
    });

    const bindGroupLayoutRender = this.createBindGroupLayout({
      label: 'bind_group_layout_render',
      entries: [
        {
          binding: 0,
          buffer: {type: 'uniform'},
          visibility: GPUShaderStage.VERTEX,
        },
      ],
    });

    this.bindGroupLayoutRender = bindGroupLayoutRender;
    this.bindGroupLayoutCompute = bindGroupLayoutCompute;
  }

  private createBuffers () {
    // ========== VERTICES ==========
    // prettier-ignore
    this.vertices = new Float32Array([
      //  x,  y,
          0,  0, // Vertex 1
          0,  1, // Vertex 2
          1,  0, // Vertex 3
          1,  1  // Vertex 4
    ]);

    this.vertexBuffer = this.createBuffer({
      setArray: this.vertices,
      usage: GPUBufferUsage.VERTEX,
    });

    // ========== SIZE ==========
    this.sizeUniformBuffer = this.createBuffer({
      label: 'size_buffer',
      setArray: new Float32Array([
        this.simulationProperties.width,
        this.simulationProperties.height,
      ]),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM,
    });

    // ========== CELLS ==========
    // Initialize the cells randomly
    const cells = new Uint32Array(this.simulationProperties.size);
    for (let i = 0; i < cells.length; i++) {
      cells[i] = Math.random() < 0.25 ? 1 : 0;
    }

    this.buffers_in_out = [
      this.createBuffer({
        label: 'buffer_in',
        setArray: cells,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
      }),
      this.device.createBuffer({
        label: 'buffer_out',
        size: cells.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
      }),
    ];
  }

  private createBindGroups () {
    this.bufferBindGroups = [
      this.createBindGroup({
        label: 'buffer_in_bind_group',
        layout: this.bindGroupLayoutCompute,
        entries: [
          {binding: 0, resource: {buffer: this.sizeUniformBuffer}},
          {binding: 1, resource: {buffer: this.buffers_in_out[0]}},
          {binding: 2, resource: {buffer: this.buffers_in_out[1]}},
        ],
      }),
      this.createBindGroup({
        label: 'buffer_out_bind_group',
        layout: this.bindGroupLayoutCompute,
        entries: [
          {binding: 0, resource: {buffer: this.sizeUniformBuffer}},
          {binding: 1, resource: {buffer: this.buffers_in_out[1]}},
          {binding: 2, resource: {buffer: this.buffers_in_out[0]}},
        ],
      }),
    ];
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
      label: 'computePipeline',
      layout: computeLayout,
      compute: {
        entryPoint: 'main',
        module: this.computeShader,
        constants: {blockSize: this.simulationProperties.workgroupSize},
      },
    }) as GPUComputePipeline;

    this.computePipeline = computePipeline;
  }

  private createRenderPipeline () {
    // cell location(0)
    const vertexLayout: GPUVertexBufferLayout = {
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
    const positionLayout: GPUVertexBufferLayout = {
      stepMode: 'vertex',
      arrayStride: 2 * this.vertices.BYTES_PER_ELEMENT,
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
        entryPoint: 'vertMain',
        module: this.vertexShader,
        buffers: [vertexLayout, positionLayout],
      },
      fragment: {
        entryPoint: 'fragMain',
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
            buffer: this.sizeUniformBuffer,
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

    // compute
    const passEncoderCompute = commandEncoder.beginComputePass();
    passEncoderCompute.setPipeline(this.computePipeline);
    passEncoderCompute.setBindGroup(0, this.bufferBindGroups[this.step % 2]);
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

    passEncoderRender.setPipeline(this.renderPipeline);
    passEncoderRender.setVertexBuffer(0, this.buffers_in_out[this.step % 2]);
    passEncoderRender.setVertexBuffer(1, this.vertexBuffer);
    passEncoderRender.setBindGroup(0, this.uniformBindGroup);
    passEncoderRender.draw(4, this.simulationProperties.size);
    passEncoderRender.end();

    this.device.queue.submit([commandEncoder.finish()]);

    this.step++;
  }
}
