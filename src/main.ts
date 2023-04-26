import {GameOfLife} from './gol';

const canvas = document.querySelector('#gpuCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('No canvas found');

await new GameOfLife({canvas, fps: 30}).init().then(g => g.start());
