const matrixWidth = 78;
const matrixHeight = 78;
const canvasScale = 8;

let birds = [];
let butterflies = [];
let time = 0;
let socket;
let small;
let sctx;

function setup() {
  pixelDensity(1);
  createCanvas(matrixWidth * canvasScale, matrixHeight * canvasScale);
  noStroke();
  frameRate(30);

  small = document.createElement('canvas');
  small.width = matrixWidth;
  small.height = matrixHeight;
  sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.imageSmoothingEnabled = false;

  socket = io.connect('http://localhost:3000');

  for (let i = 0; i < 5; i++) {
    birds.push({
      x: random(-10, 20),
      y: random(15, 40),
      vx: random(0.3, 0.7),
      color: i % 3 === 0 ? '#ff0044' : i % 3 === 1 ? '#ffaa00' : '#00ffaa',
      seed: i * 100
    });
  }

  for (let i = 0; i < 8; i++) {
    butterflies.push({
      x: random(0, 78),
      y: random(30, 70),
      vx: random(0.1, 0.3),
      color: i % 3 === 0 ? '#ff44ff' : i % 3 === 1 ? '#ffff44' : '#4444ff',
      seed: i * 50
    });
  }
}

function draw() {
  scale(canvasScale);

  // jungle sky
  background('#0066aa');
  fill('#004466');
  rect(0, 0, matrixWidth, 20);

  // canopy - dark green across top
  fill('#004400');
  rect(0, 8, matrixWidth, 12);
  fill('#008800');
  circle(10, 10, 5);
  circle(25, 11, 4);
  circle(40, 9, 5);
  circle(55, 10, 4);
  circle(68, 11, 5);

  // tree trunks - left and right
  fill('#3d2610');
  rect(0, 15, 8, matrixHeight - 15);
  rect(70, 15, 8, matrixHeight - 15);

  // vines hanging
  fill('#004400');
  rect(3, 18, 1, 20);
  rect(5, 22, 1, 15);
  rect(70, 20, 1, 18);
  rect(68, 25, 1, 15);

  // waterfall - right side
  fill('#aaddff', 100);
  rect(60, 20, 3, 40);
  fill('#ffffff', 120);
  rect(61, 22, 1, 35);

  // mid-ground foliage
  fill('#00aa00');
  rect(15, 25, 40, 10);
  rect(20, 33, 35, 8);

  // flowers at bottom
  fill('#ff00ff');
  circle(5, 73, 2);
  circle(12, 74, 2);
  fill('#ffff44');
  circle(25, 73, 2);
  circle(32, 74, 2);
  fill('#ff4400');
  circle(45, 73, 2);
  circle(52, 74, 2);
  fill('#44ffff');
  circle(60, 73, 2);
  circle(68, 74, 2);

  // moss / ground cover
  fill('#006600');
  rect(0, 70, matrixWidth, 8);

  // butterflies - fluttering around
  fill(255, 255, 255, 180);
  for (let b of butterflies) {
    b.x += b.vx + sin(time * 0.05 + b.seed) * 0.2;
    b.y += cos(time * 0.04 + b.seed) * 0.3;

    if (b.x > 80) b.x = -5;
    if (b.x < -5) b.x = 80;
    if (b.y > 75) b.y = 25;
    if (b.y < 20) b.y = 75;

    push();
    translate(b.x, b.y);
    rotate(sin(time * 0.1 + b.seed) * 0.5);
    fill(b.color);
    rect(-1, -1, 2, 2);
    rect(1, -1, 2, 2);
    pop();
  }

  // birds - flying across
  for (let bird of birds) {
    bird.x += bird.vx;
    bird.y += sin(time * 0.03 + bird.seed) * 0.4;

    if (bird.x > 85) {
      bird.x = -15;
      bird.y = random(15, 40);
    }

    let bx = floor(bird.x);
    let by = floor(bird.y);

    push();
    translate(bx, by);
    rotate(bird.vx * 0.5);
    scale(0.9);

    // wings
    fill(bird.color);
    rect(-4, -2, 3, 2);
    rect(1, -2, 3, 2);
    // body
    fill('#ffffff');
    rect(0, -1, 2, 2);
    // eye
    fill(0);
    rect(1.5, -0.5, 1, 1);

    pop();
  }

  // mist at bottom
  fill(255, 255, 255, 40);
  rect(0, 74, matrixWidth, 4);

  sendFrame();
}

function sendFrame() {
  if (!socket || !socket.connected) {
    return;
  }
  sctx.drawImage(drawingContext.canvas, 0, 0, matrixWidth, matrixHeight);
  const rgba = sctx.getImageData(0, 0, matrixWidth, matrixHeight).data;
  const rgb = new Uint8Array(matrixWidth * matrixHeight * 3);
  let j = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    rgb[j++] = rgba[i];
    rgb[j++] = rgba[i + 1];
    rgb[j++] = rgba[i + 2];
  }
  socket.emit('e131Data', rgb);
}
