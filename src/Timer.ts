import Stats from 'stats.js';

export class Timer {
  static DEFAULT_FPS = 60;

  private _fps: number;
  private onTick: (dt: number) => void;

  private _frameInterval: number;
  private _lastTime: number = 0;
  private _startTime: number = 0;

  private _stats: Stats;

  constructor ({fps, onTick}: {fps?: number; onTick?: (dt: number) => void}) {
    this._fps = fps || Timer.DEFAULT_FPS;
    this.onTick = onTick || function () {};
    this._frameInterval = 1000 / this._fps;

    this._stats = new Stats();
    this._stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(this._stats.dom);
  }

  start () {
    this._startTime = this._lastTime = window.performance.now();
    this.mainloop();
  }

  public get startTime () {
    return this._startTime;
  }

  public get lastTime () {
    return this._lastTime;
  }

  public get frameInterval () {
    return this._frameInterval;
  }

  public get fps () {
    return this._fps;
  }

  public set fps (fps: number) {
    console.assert(fps > 0, 'FPS must be greater than 0');

    this._fps = fps;
    this._frameInterval = 1000 / this._fps;
  }

  private mainloop (now: number = 0) {
    requestAnimationFrame(this.mainloop.bind(this));

    var dt = now - this._lastTime;
    if (dt > this._frameInterval) {
      this._stats.begin();
      this._lastTime = now;
      this.onTick(dt / 1000);

      this._stats.end();
    }
  }
}
