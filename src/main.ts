import './style.css';

interface TargetShip {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  brightness: number;
}

class MarineRadar {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  private rangeNM: number = 12;
  private isNorthUp: boolean = true;
  private heading: number = 45; // 自船は北東（45度）に進んでいる想定
  private seaClutter: number = 30;
  
  private sweepAngle: number = 0;
  private sweepSpeed: number = 0.04;
  private targets: TargetShip[] = [];
  
  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.initTargets();
    this.startLoop();
  }

  private initTargets() {
    // 最初にレーダーに映る他船の位置（適度な距離に配置）
    this.targets = [
      { id: 1, x: 3,  y: 4,  vx: -0.005, vy: -0.008, brightness: 0 },
      { id: 2, x: -5, y: 3,  vx: 0.01,   vy: -0.002, brightness: 0 },
      { id: 3, x: 2,  y: -6, vx: -0.002, vy: 0.012,  brightness: 0 }
    ];
  }

  private startLoop() {
    const tick = () => {
      this.updatePhysics();
      this.drawRadar();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private updatePhysics() {
    this.sweepAngle += this.sweepSpeed;
    if (this.sweepAngle >= Math.PI * 2) {
      this.sweepAngle -= Math.PI * 2;
    }

    this.targets.forEach(target => {
      target.x += target.vx;
      target.y += target.vy;
    });
  }

  private drawRadar() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    // 残像を作るためのフェードクリア
    this.ctx.fillStyle = 'rgba(0, 8, 0, 0.06)';
    this.ctx.fillRect(0, 0, width, height);

    this.drawGrid(cx, cy, radius);

    // モード切り替えによる画面の回転オフセット
    const displayOffsetAngle = this.isNorthUp ? 0 : -this.heading * (Math.PI / 180);

    // ターゲットの計算と描画
    this.targets.forEach(target => {
      const r = Math.sqrt(target.x * target.x + target.y * target.y);
      const theta = Math.atan2(target.x, target.y);
      const displayAngle = theta + displayOffsetAngle;

      const scale = radius / this.rangeNM;
      const screenX = cx + r * scale * Math.sin(displayAngle);
      const screenY = cy - r * scale * Math.cos(displayAngle);

      // スイープ線との同期判定
      let angleDiff = Math.abs(this.sweepAngle - (displayAngle + Math.PI));
      angleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

      if (angleDiff < 0.06 && r <= this.rangeNM) {
        target.brightness = 1.0;
      } else {
        target.brightness *= 0.98;
      }

      if (target.brightness > 0.05 && r <= this.rangeNM) {
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(0, 255, 0, ${target.brightness})`;
        this.ctx.fill();
      }
    });

    // 海面反射（ノイズ）
    if (this.seaClutter > 0) {
      // 抑制ツマミが高いほどノイズを減らす（100でノイズゼロ、0で最大）
      const noiseDensity = (100 - this.seaClutter) / 10;
      for (let i = 0; i < noiseDensity; i++) {
        const noiseDist = Math.random() * (radius * 0.4);
        const noiseAngle = this.sweepAngle + (Math.random() - 0.5) * 0.2 - Math.PI / 2;
        const nx = cx + noiseDist * Math.cos(noiseAngle);
        const ny = cy + noiseDist * Math.sin(noiseAngle);

        this.ctx.fillStyle = `rgba(0, 200, 0, ${Math.random() * 0.3})`;
        this.ctx.fillRect(nx, ny, 1.5, 1.5);
      }
    }

    // スイープ線（レーダーの回転ビーム）
    const sweepX = cx + radius * Math.cos(this.sweepAngle - Math.PI / 2);
    const sweepY = cy + radius * Math.sin(this.sweepAngle - Math.PI / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(sweepX, sweepY);
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // 自船位置（中心点）
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fill();
  }

  private drawGrid(cx: number, cy: number, radius: number) {
    this.ctx.strokeStyle = 'rgba(0, 100, 0, 0.25)';
    this.ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, (radius / 3) * i, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(0, 200, 0, 0.5)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
  }

  public setRange(nm: number) { this.rangeNM = nm; }
  public setMode(northUp: boolean) { this.isNorthUp = northUp; }
  public setSeaClutter(value: number) { this.seaClutter = value; }
}

// --- UIのイベントバインド処理 ---
window.addEventListener('DOMContentLoaded', () => {
  const radar = new MarineRadar('radarCanvas');

  // レンジ切り替え
  document.getElementById('rangeSelect')?.addEventListener('change', (e) => {
    const value = parseInt((e.target as HTMLSelectElement).value);
    radar.setRange(value);
  });

  // モード切り替え（North-Up / Head-Up）
  document.getElementById('modeSelect')?.addEventListener('change', (e) => {
    const value = (e.target as HTMLSelectElement).value;
    radar.setMode(value === 'north-up');
  });

  // 海面反射抑制スライダー
  document.getElementById('clutterRange')?.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value);
    radar.setSeaClutter(value);
  });
});