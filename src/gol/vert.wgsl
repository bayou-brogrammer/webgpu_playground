struct Out {
  @builtin(position) pos: vec4<f32>,
  @location(0) cell: f32,
}

@binding(0) @group(0) var<uniform> size: vec2<f32>;

@vertex
fn main(@builtin(instance_index) instance: u32, @location(0) cell: u32, @location(1) pos: vec2<f32>) -> Out {
  let w = size.x;
  let h = size.y;
  let i = f32(instance);

  let x = ((i % w + pos.x) / w - 0.5) * 2. * w / max(w, h);
  let y = (((i - (i % w)) / w + pos.y) / h - 0.5) * 2. * h / max(w, h);

  return Out(vec4<f32>(x, y, 0., 1.), f32(cell));
}