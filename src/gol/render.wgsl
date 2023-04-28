struct VertexInput {
  @location(0) cell: u32,
  @location(1) pos: vec2<f32>,
  @builtin(instance_index) instance: u32,
};

struct VertexOutput {
  @builtin(position) pos: vec4<f32>,
  @location(0) cell: f32,
}

@binding(0) @group(0) var<uniform> size: vec2<f32>;

@vertex
fn vertMain(input: VertexInput) -> VertexOutput {
  let w = size.x;
  let h = size.y;
  
  let pos = input.pos;
  let cell = f32(input.cell);
  let i = f32(input.instance);

  let x = ((i % w + pos.x) / w - 0.5) * 2. * w / max(w, h);
  let y = (((i - (i % w)) / w + pos.y) / h - 0.5) * 2. * h / max(w, h);

  var output : VertexOutput;
  output.pos = vec4<f32>(x, y, 0., 1.);
  output.cell = cell;
  return output;
}

@fragment
fn fragMain(@location(0) cell : f32) -> @location(0) vec4<f32> {
  return vec4<f32>(cell, 0.0, cell, 1.);
}
