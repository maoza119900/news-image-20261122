// THE WORLD TODAY — a 1024x1024 newspaper front page for Sunday 22 November 2026.
// Draws the whole page in code (Node 22, standard library only) and writes it to
// $MAKEFUN_OUTPUT_DIR/entry.png (default /output). No network, no external images,
// no Date.now, no Math.random: two runs write byte-identical output.
// Entry for make.fun bounty news-image-20261122 ("Sum up 22 November's world news
// in one image"). Every story on the page was verified against at least two
// independent news sources on 22 November 2026; see SPEC.md for the sourcing.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(width: number, height: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (1 + width * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- 5x7 font
// Hand-written glyphs: 7 rows of 5 bits each. Uppercase, digits and punctuation
// only; the whole page is set in capitals. '#' = pixel on, '.' = off.
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '/': ['....#', '...#.', '...#.', '..#..', '..#..', '.#...', '#....'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
};

const CHAR_W = 6; // 5 px glyph + 1 px gap, times scale
const CHAR_H = 7;

function textWidth(s: string, scale: number): number {
  return s.length * CHAR_W * scale - scale;
}

function wrapText(s: string, scale: number, maxWidth: number): string[] {
  const maxChars = Math.max(1, Math.floor((maxWidth + scale) / (CHAR_W * scale)));
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- canvas
type RGB = [number, number, number];

const PAPER: RGB = [247, 243, 232];
const INK: RGB = [17, 17, 17];
const RED: RGB = [176, 30, 30];
const GREY: RGB = [110, 108, 100];
const PANEL: RGB = [232, 226, 210];
const NAVY: RGB = [22, 35, 60];
const NAVY2: RGB = [34, 52, 84];
const SKY: RGB = [96, 128, 176];
const ORANGE: RGB = [232, 114, 42];
const YELLOW: RGB = [245, 196, 66];
const GREEN: RGB = [46, 125, 70];
const BLUE: RGB = [36, 84, 160];
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

class Canvas {
  w: number;
  h: number;
  buf: Uint8Array;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }
  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w);
    const y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.px(xx, yy, c);
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c);
    this.fillRect(x + w - t, y, t, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, thick = 1): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    const r = Math.max(1, Math.floor(thick / 2));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + (dx * i) / steps);
      const y = Math.round(y0 + (dy * i) / steps);
      this.disc(x, y, r, c);
    }
  }
  dashedLine(x0: number, y0: number, x1: number, y1: number, c: RGB, dash = 8, gap = 6): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.round(len));
    let on = true;
    let run = 0;
    let sx = x0;
    let sy = y0;
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(x0 + (dx * i) / steps);
      const y = Math.round(y0 + (dy * i) / steps);
      run++;
      if ((on && run >= dash) || (!on && run >= gap)) {
        if (on) this.line(sx, sy, x, y, c, 2);
        sx = x;
        sy = y;
        on = !on;
        run = 0;
      }
    }
    if (on) this.line(sx, sy, x1, y1, c, 2);
  }
  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      for (let xx = -dx; xx <= dx; xx++) this.px(cx + xx, cy + dy, c);
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  polygon(points: [number, number][], c: RGB): void {
    // Scanline fill of a simple polygon.
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) this.px(x, y, c);
      }
    }
  }
  star(cx: number, cy: number, rOuter: number, rInner: number, points: number, c: RGB): void {
    const pts: [number, number][] = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (i * Math.PI) / points - Math.PI / 2;
      pts.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]);
    }
    this.polygon(pts, c);
  }
  text(s: string, x: number, y: number, scale: number, c: RGB, align: 'left' | 'center' | 'right' = 'left'): void {
    let x0 = x;
    if (align === 'center') x0 = x - Math.floor(textWidth(s, scale) / 2);
    if (align === 'right') x0 = x - textWidth(s, scale);
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]] ?? FONT[' '];
      const gx = x0 + i * CHAR_W * scale;
      for (let r = 0; r < CHAR_H; r++) {
        for (let col = 0; col < 5; col++) {
          if (g[r][col] === '#') this.fillRect(gx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
  textBlock(s: string, x: number, y: number, scale: number, maxWidth: number, c: RGB, lineGap = 2): number {
    const lines = wrapText(s, scale, maxWidth);
    for (let i = 0; i < lines.length; i++) {
      this.text(lines[i], x, y + i * (CHAR_H * scale + lineGap), scale, c);
    }
    return lines.length;
  }
}

// ---------------------------------------------------------------- icons
// Flat drawn pictograms, one per story. Each takes the top-left corner and a size.

function iconMarkets(cv: Canvas, x: number, y: number, s: number): void {
  cv.fillRect(x, y, s, s, PANEL);
  cv.rect(x, y, s, s, INK, 2);
  const u = s / 96;
  // bars
  cv.fillRect(x + Math.round(16 * u), y + Math.round(58 * u), Math.round(10 * u), Math.round(22 * u), GREEN);
  cv.fillRect(x + Math.round(32 * u), y + Math.round(46 * u), Math.round(10 * u), Math.round(34 * u), GREEN);
  cv.fillRect(x + Math.round(48 * u), y + Math.round(62 * u), Math.round(10 * u), Math.round(18 * u), RED);
  cv.fillRect(x + Math.round(64 * u), y + Math.round(70 * u), Math.round(10 * u), Math.round(10 * u), RED);
  // falling line with arrowhead
  cv.line(x + Math.round(12 * u), y + Math.round(18 * u), x + Math.round(34 * u), y + Math.round(30 * u), RED, 3);
  cv.line(x + Math.round(34 * u), y + Math.round(30 * u), x + Math.round(54 * u), y + Math.round(26 * u), RED, 3);
  cv.line(x + Math.round(54 * u), y + Math.round(26 * u), x + Math.round(84 * u), y + Math.round(62 * u), RED, 3);
  cv.polygon(
    [
      [x + Math.round(84 * u), y + Math.round(62 * u)],
      [x + Math.round(70 * u), y + Math.round(56 * u)],
      [x + Math.round(76 * u), y + Math.round(72 * u)],
    ],
    RED,
  );
}

function iconScales(cv: Canvas, x: number, y: number, s: number): void {
  cv.fillRect(x, y, s, s, PANEL);
  cv.rect(x, y, s, s, INK, 2);
  const u = s / 96;
  const cx = x + Math.round(48 * u);
  cv.fillRect(cx - Math.round(2 * u), y + Math.round(18 * u), Math.round(4 * u), Math.round(58 * u), INK);
  cv.fillRect(x + Math.round(14 * u), y + Math.round(22 * u), Math.round(68 * u), Math.round(4 * u), INK);
  cv.disc(cx, y + Math.round(14 * u), Math.round(4 * u), INK);
  cv.fillRect(x + Math.round(30 * u), y + Math.round(76 * u), Math.round(36 * u), Math.round(5 * u), INK);
  // pans
  for (const px of [x + Math.round(20 * u), x + Math.round(76 * u)]) {
    cv.line(px, y + Math.round(26 * u), px - Math.round(10 * u), y + Math.round(46 * u), INK, 2);
    cv.line(px, y + Math.round(26 * u), px + Math.round(10 * u), y + Math.round(46 * u), INK, 2);
    cv.polygon(
      [
        [px - Math.round(12 * u), y + Math.round(46 * u)],
        [px + Math.round(12 * u), y + Math.round(46 * u)],
        [px, y + Math.round(58 * u)],
      ],
      INK,
    );
  }
}

function iconGlobe(cv: Canvas, x: number, y: number, s: number): void {
  cv.fillRect(x, y, s, s, PANEL);
  cv.rect(x, y, s, s, INK, 2);
  const u = s / 96;
  const cx = x + Math.round(44 * u);
  const cy = y + Math.round(50 * u);
  const r = Math.round(30 * u);
  cv.disc(cx, cy, r, BLUE);
  cv.circle(cx, cy, r, INK);
  cv.circle(cx, cy, Math.round(15 * u), WHITE);
  cv.line(cx - r, cy, cx + r, cy, WHITE, 1);
  cv.line(cx, cy - r, cx, cy + r, WHITE, 1);
  // sun, top right
  const sx = x + Math.round(74 * u);
  const sy = y + Math.round(20 * u);
  cv.disc(sx, sy, Math.round(7 * u), ORANGE);
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    cv.line(
      Math.round(sx + 10 * u * Math.cos(rad)),
      Math.round(sy + 10 * u * Math.sin(rad)),
      Math.round(sx + 14 * u * Math.cos(rad)),
      Math.round(sy + 14 * u * Math.sin(rad)),
      ORANGE,
      2,
    );
  }
}

function iconFlags(cv: Canvas, x: number, y: number, s: number): void {
  cv.fillRect(x, y, s, s, PANEL);
  cv.rect(x, y, s, s, INK, 2);
  const u = s / 96;
  const poles = [x + Math.round(24 * u), x + Math.round(48 * u), x + Math.round(72 * u)];
  const flagCols: RGB[] = [RED, BLUE, RED];
  for (let i = 0; i < 3; i++) {
    const px = poles[i];
    cv.fillRect(px - 1, y + Math.round(16 * u), 3, Math.round(64 * u), INK);
    cv.fillRect(px + 1, y + Math.round(18 * u), Math.round(20 * u), Math.round(13 * u), flagCols[i]);
    // stripes / stars as dots
    if (i === 0) {
      cv.fillRect(px + 1, y + Math.round(22 * u), Math.round(20 * u), 2, WHITE);
      cv.fillRect(px + 1, y + Math.round(27 * u), Math.round(20 * u), 2, WHITE);
    } else if (i === 1) {
      cv.disc(px + Math.round(8 * u), y + Math.round(24 * u), 2, WHITE);
      cv.disc(px + Math.round(15 * u), y + Math.round(24 * u), 2, WHITE);
    } else {
      cv.disc(px + Math.round(10 * u), y + Math.round(24 * u), 2, YELLOW);
    }
  }
}

function iconSpeech(cv: Canvas, x: number, y: number, s: number): void {
  // Two overlapping speech bubbles: coalition talks.
  cv.fillRect(x, y, s, s, PANEL);
  cv.rect(x, y, s, s, INK, 2);
  const u = s / 96;
  // back bubble, right, red
  cv.fillRect(x + Math.round(44 * u), y + Math.round(34 * u), Math.round(40 * u), Math.round(26 * u), RED);
  cv.polygon(
    [
      [x + Math.round(52 * u), y + Math.round(60 * u)],
      [x + Math.round(62 * u), y + Math.round(60 * u)],
      [x + Math.round(52 * u), y + Math.round(74 * u)],
    ],
    RED,
  );
  cv.fillRect(x + Math.round(50 * u), y + Math.round(44 * u), Math.round(28 * u), 3, WHITE);
  cv.fillRect(x + Math.round(50 * u), y + Math.round(51 * u), Math.round(20 * u), 3, WHITE);
  // front bubble, left, navy
  cv.fillRect(x + Math.round(12 * u), y + Math.round(16 * u), Math.round(40 * u), Math.round(26 * u), NAVY);
  cv.polygon(
    [
      [x + Math.round(20 * u), y + Math.round(42 * u)],
      [x + Math.round(30 * u), y + Math.round(42 * u)],
      [x + Math.round(20 * u), y + Math.round(56 * u)],
    ],
    NAVY,
  );
  cv.fillRect(x + Math.round(18 * u), y + Math.round(26 * u), Math.round(28 * u), 3, WHITE);
  cv.fillRect(x + Math.round(18 * u), y + Math.round(33 * u), Math.round(20 * u), 3, WHITE);
}

function iconHandcuffs(cv: Canvas, x: number, y: number, s: number): void {
  // Handcuffs: two rings joined by a short chain. The cartel arrest.
  cv.fillRect(x, y, s, s, PANEL);
  cv.rect(x, y, s, s, INK, 2);
  const u = s / 64;
  const left: [number, number] = [x + Math.round(20 * u), y + Math.round(36 * u)];
  const right: [number, number] = [x + Math.round(44 * u), y + Math.round(36 * u)];
  for (const [cx, cy] of [left, right]) {
    cv.circle(cx, cy, Math.round(11 * u), INK);
    cv.circle(cx, cy, Math.round(8 * u), INK);
    cv.disc(cx, cy - Math.round(12 * u), Math.round(3 * u), INK);
  }
  // chain links between the rings
  cv.line(left[0] + Math.round(8 * u), left[1] - Math.round(10 * u), right[0] - Math.round(8 * u), right[1] - Math.round(10 * u), INK, 3);
  cv.line(left[0] + Math.round(8 * u), left[1] - Math.round(4 * u), right[0] - Math.round(8 * u), right[1] - Math.round(4 * u), INK, 3);
}

// ---------------------------------------------------------------- lead art
// A dark "situation map": range rings, dashed missile paths from the east,
// an orange impact starburst, jet silhouettes, place labels.
function drawLeadArt(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, NAVY);
  cv.rect(x, y, w, h, INK, 3);
  // faint grid
  for (let gx = x + 48; gx < x + w; gx += 48) cv.line(gx, y + 3, gx, y + h - 3, NAVY2, 1);
  for (let gy = y + 48; gy < y + h; gy += 48) cv.line(x + 3, gy, x + w - 3, gy, NAVY2, 1);
  const ix = x + 430; // impact point
  const iy = y + 96;
  // range rings around the impact
  cv.circle(ix, iy, 42, SKY);
  cv.circle(ix, iy, 84, SKY);
  cv.circle(ix, iy, 126, SKY);
  // dashed missile paths from the east
  cv.dashedLine(x + w - 4, y + 40, ix + 18, iy - 8, YELLOW, 9, 6);
  cv.dashedLine(x + w - 4, y + 150, ix + 20, iy + 10, YELLOW, 9, 6);
  cv.dashedLine(x + w - 4, y + 196, ix + 10, iy + 22, ORANGE, 9, 6);
  // land labels last, on solid backing plates so rings and flight paths
  // never show through the letters
  cv.text('POLAND', x + 36, y + 30, 3, WHITE);
  cv.fillRect(x + 436, y + 164, 136, 29, NAVY);
  cv.text('UKRAINE', x + 440, y + 168, 3, WHITE);
  cv.fillRect(x + 146, y + 172, 130, 22, NAVY);
  cv.text('BALTIC SEA', x + 150, y + 176, 2, SKY);
  // jet silhouettes, top left, flying east, with contrails
  const jet = (jx: number, jy: number, s: number): void => {
    cv.line(jx - 46 * s, jy + 6 * s, jx - 4 * s, jy + 6 * s, SKY, 1);
    cv.polygon(
      [
        [jx, jy],
        [jx + 34 * s, jy + 5 * s],
        [jx + 12 * s, jy + 8 * s],
        [jx + 18 * s, jy + 14 * s],
        [jx + 10 * s, jy + 12 * s],
        [jx - 2 * s, jy + 8 * s],
      ],
      WHITE,
    );
  };
  jet(x + 90, y + 84, 1);
  jet(x + 170, y + 58, 1);
  // impact starburst
  cv.star(ix, iy, 30, 13, 12, ORANGE);
  cv.star(ix, iy, 16, 7, 12, YELLOW);
  cv.disc(ix, iy, 5, RED);
  // caption strip
  cv.fillRect(x + 3, y + h - 25, w - 6, 22, BLACK);
  cv.text('RUTTE IN WARSAW AFTER THE MISSILE LANDINGS', x + w / 2, y + h - 19, 2, WHITE, 'center');
}

// ---------------------------------------------------------------- page
const W = 1024;
const H = 1024;
const M = 28; // margin
const RIGHT = W - M;

interface Story {
  icon: (cv: Canvas, x: number, y: number, s: number) => void;
  headline: string;
  deck: string;
}

const GRID_STORIES: Story[] = [
  {
    icon: iconFlags,
    headline: 'US ENVOYS HEAD TO MOSCOW',
    deck: 'KUSHNER AND WITKOFF FLY TO BRIEF PUTIN AFTER ABU DHABI TALKS. REPORT: US OFFERS UKRAINE A NATO PATH IF IT YIELDS LAND.',
  },
  {
    icon: iconGlobe,
    headline: 'COP31 STILL DEADLOCKED',
    deck: 'TALKS RUN INTO A SECOND DAY OF OVERTIME IN ANTALYA. THE DRAFT DROPS FOSSIL FUELS AND A $120BN FINANCE TARGET.',
  },
  {
    icon: iconMarkets,
    headline: 'SEC PROBES NVIDIA ACCOUNTS',
    deck: 'SHARES FELL 13% ON FRIDAY AFTER REUTERS REPORTED THE PROBE. THE BOARD WILL NOT REINSTATE JENSEN HUANG.',
  },
  {
    icon: iconScales,
    headline: 'FOUR NATIONS URGE AID INTO GAZA',
    deck: 'AUSTRALIA, CANADA, ITALY AND THE UK CALL ON ISRAEL TO OPEN ACCESS AS FLOODS SWAMP SHELTERS FOR 1M DISPLACED PEOPLE.',
  },
];

const BOTTOM_STORIES: Story[] = [
  {
    icon: iconHandcuffs,
    headline: 'MEXICO NABS EL CHAPO ISIDRO',
    deck: "FBI MOST-WANTED DRUG LORD CAUGHT IN SINALOA RAID. 11 DEAD.",
  },
  {
    icon: iconSpeech,
    headline: 'EISENKOT INVITES LIKUD TO TALKS',
    deck: 'EISENKOT OUTLINES 3 PATHS TO A GOVERNMENT. NETANYAHU INVITED TO TALKS.',
  },
];

function drawPage(cv: Canvas): void {
  // top rule + masthead
  cv.fillRect(M, 8, RIGHT - M, 3, INK);
  cv.text('THE WORLD TODAY', W / 2, 18, 6, INK, 'center');
  cv.fillRect(M, 68, RIGHT - M, 2, INK);
  cv.text('SUNDAY 22 NOVEMBER 2026', M, 76, 2, INK);
  cv.text('ONE DAY - ONE PAGE', RIGHT, 76, 2, INK, 'right');
  cv.fillRect(M, 96, RIGHT - M, 4, INK);
  cv.fillRect(M, 102, RIGHT - M, 1, INK);

  // lead
  cv.text('NATO AND POLAND', M, 112, 2, RED);
  cv.text('NATO VOWS TO DEFEND', M, 130, 5, INK);
  cv.text('EVERY INCH OF POLAND', M, 170, 5, INK);
  drawLeadArt(cv, M, 214, 572, 216);
  cv.textBlock(
    'WARSAW - NATO CHIEF MARK RUTTE PLEDGED TO DEFEND EVERY INCH OF POLISH TERRITORY AFTER PROSECUTORS CONFIRMED A RUSSIAN KH-101 CRUISE MISSILE CAME DOWN IN THE SOUTH-EAST. THE NATO COUNCIL MEETS ON MONDAY.',
    620,
    214,
    2,
    376,
    INK,
  );
  // stat box under the lead deck
  cv.fillRect(620, 330, 376, 100, PANEL);
  cv.rect(620, 330, 376, 100, RED, 2);
  cv.text('KH-101 CONFIRMED BY POLAND', 636, 344, 2, INK);
  cv.text('NO CASUALTIES REPORTED', 636, 366, 2, INK);
  cv.text('NATO COUNCIL MEETS MONDAY', 636, 388, 2, RED);

  // rule + 2x2 grid
  cv.fillRect(M, 458, RIGHT - M, 2, INK);
  const cellW = 474;
  const cellH = 182;
  const origins: [number, number][] = [
    [M, 470],
    [522, 470],
    [M, 660],
    [522, 660],
  ];
  for (let i = 0; i < 4; i++) {
    const [cx, cy] = origins[i];
    const st = GRID_STORIES[i];
    st.icon(cv, cx, cy, 96);
    const hl = wrapText(st.headline, 3, cellW - 108);
    for (let l = 0; l < hl.length; l++) {
      cv.text(hl[l], cx + 108, cy + l * (CHAR_H * 3 + 2), 3, INK);
    }
    cv.textBlock(st.deck, cx, cy + 104, 2, cellW, INK);
  }

  // rule + bottom row
  cv.fillRect(M, 854, RIGHT - M, 2, INK);
  for (let i = 0; i < 2; i++) {
    const cx = i === 0 ? M : 522;
    const cy = 866;
    const st = BOTTOM_STORIES[i];
    st.icon(cv, cx, cy, 64);
    const hl = wrapText(st.headline, 3, cellW - 76);
    for (let l = 0; l < hl.length; l++) {
      cv.text(hl[l], cx + 76, cy + l * (CHAR_H * 3 + 2), 3, INK);
    }
    cv.textBlock(st.deck, cx + 76, cy + hl.length * (CHAR_H * 3 + 2) + 4, 2, cellW - 76, INK);
  }

  // ticker + footer
  cv.fillRect(M, 972, RIGHT - M, 38, BLACK);
  cv.text(
    'ALSO TODAY: FBI PROBES HACK - NORWAY VOIDS OIL LICENCES - FRANCE PROTESTS',
    W / 2,
    984,
    2,
    WHITE,
    'center',
  );
  cv.text(
    'SOURCES: DPA - AFP - REUTERS - AP - WSJ - AL JAZEERA - BBC - CNN',
    W / 2,
    1015,
    1,
    GREY,
    'center',
  );
}

function main(): void {
  const cv = new Canvas(W, H, PAPER);
  drawPage(cv);
  const png = encodePNG(W, H, cv.buf);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), png);
}

main();
