@binding(0) @group(0) var<storage, read> size: vec2<f32>;
@binding(1) @group(0) var<storage, read> current: array<u32>;
@binding(2) @group(0) var<storage, read_write> next: array<u32>;

override blockSize = 8;

const UP_LEFT = 0;
const UP = 1;
const UP_RIGHT = 2;
const RIGHT = 3;
const DOWN_RIGHT = 4;
const DOWN = 5;
const DOWN_LEFT = 6;
const LEFT = 7;

const OFFSETS: array<vec2<i32>, 8> = array<vec2<i32>, 8>(
  vec2<i32>(-1, 1),
  vec2<i32>(0, 1),
  vec2<i32>(1,1),
  vec2<i32>(1,0),
  vec2<i32>(1,-1),
  vec2<i32>(0,-1),
  vec2<i32>(-1,-1),
  vec2<i32>(-1, 0)
);

fn get_index(pos: vec2<i32>) -> i32 {
    return pos.y * i32(size.y) + pos.x;
}

fn get_neighbor(pos: vec2<i32>, dir: u32) -> u32 {
  let neighbor_pos = pos + OFFSETS[dir];
  return current[get_index(neighbor_pos)];
}

fn getIndex(x: u32, y: u32) -> u32 {
  let h = u32(size.y);
  let w = u32(size.x);

  return (y % h) * w + (x % w);
}

fn getCell(x: u32, y: u32) -> u32 {
  return current[getIndex(x, y)];
}

fn countNeighbors(x: u32, y: u32) -> u32 {
  return getCell(x - 1, y - 1) + getCell(x, y - 1) + getCell(x + 1, y - 1) + 
         getCell(x - 1, y) +                         getCell(x + 1, y) + 
         getCell(x - 1, y + 1) + getCell(x, y + 1) + getCell(x + 1, y + 1);
}

fn write_matter(pos: vec2<i32>, matter: u32) {
    next[get_index(pos)] = matter;
}

fn is_empty(matter: u32) -> bool {
    return matter == 0;
}

fn falls_on_empty(to: u32) -> bool  {
    return is_empty(to);
}

fn is_at_border_top(pos: vec2<i32>) -> bool {
    return pos.y == i32(size.y) - 1;
}

fn is_at_border_bottom(pos: vec2<i32>)-> bool {
    return pos.y == 0;
}

@compute @workgroup_size(blockSize, blockSize)
fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
  let x = grid.x;
  let y = grid.y;
  let pos = vec2<i32>(i32(x), i32(y));

  let current = getCell(x, y);
  let up = get_neighbor(pos, UP);
  let down = get_neighbor(pos, DOWN);

  var m = current;
  if (!is_at_border_top(pos) && falls_on_empty(current)) {
    m = up;
  }else if (!is_at_border_bottom(pos) && falls_on_empty(down)) {
    m = down;
  }

  // write_matter(pos, m);
  next[get_index(pos)] = m;


  // let n = countNeighbors(x, y);
  // next[getIndex(x, y)] = select(u32(n == 3u), u32(n == 2u || n == 3u), getCell(x, y) == 1u); 
} 