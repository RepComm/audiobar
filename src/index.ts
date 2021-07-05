import { Drawing, Exponent, EXPONENT_CSS_STYLES, Panel } from "@repcomm/exponent-ts";
import { lerp } from "@repcomm/scenario2d";

EXPONENT_CSS_STYLES.mount(document.head);

const STYLES = new Exponent()
.make("style")
.setTextContent(`
body {
  margin: 0;
  padding: 0;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background-color: black;
  display: flex;
}
canvas {
  max-width: 100%;
  max-height: 100%;
}
`)
.mount(document.head);

interface AudioCfg {
  ready: boolean;
  context?: AudioContext;

  analyser?: AnalyserNode;
  analyserFrequencyData?: Uint8Array;

  source?: MediaStreamAudioSourceNode;
  smoothing: number;

  amp?: GainNode;
}

let audiocfg: AudioCfg = {
  ready: false,
  smoothing: 0.6
};

function setSmoothing (sm: number) {
  audiocfg.smoothing = sm;
  audiocfg.analyser.smoothingTimeConstant = sm;
}
window["setSmoothing"] = setSmoothing;

const container = new Panel()
.setId("container")
.on("click", ()=>{
  if (audiocfg.ready) return;
  audiocfg.context = new AudioContext();
  audiocfg.analyser = new AnalyserNode(audiocfg.context, {
    channelCount: 2,
    fftSize: 256,
    smoothingTimeConstant: audiocfg.smoothing,
    maxDecibels: 1
  });
  audiocfg.analyserFrequencyData = new Uint8Array(128);

  audiocfg.amp = new GainNode(audiocfg.context);
  audiocfg.amp.connect(audiocfg.analyser);
  audiocfg.amp.gain.value = 2;

  navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
    audiocfg.source = audiocfg.context.createMediaStreamSource(stream);
    audiocfg.ready = true;

    audiocfg.source.connect(audiocfg.amp);
  });

})
.mount(document.body);

const drawing = new Drawing({})
.setId("drawing")
.addRenderPass((ctx)=>{
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(0, 0, drawing.width, drawing.height);
  // ctx.clearRect(0, 0, drawing.width, drawing.height);
  ctx.restore();
  
  if (!audiocfg.ready) {
    ctx.strokeStyle = "white";
    ctx.strokeText("Waiting on audio context, click to start if you haven't already.", 10, 10);
    return;
  }

  audiocfg.analyser.getByteFrequencyData(audiocfg.analyserFrequencyData);

  let value = 0;

  let height = 0;
  let size = audiocfg.analyserFrequencyData.length;
  
  let left = 0;
  let width = ((1/size) * drawing.width)*1.05;
  
  let r = 0;
  let g = 0;
  let b = 0;

  let minChannel = 10;

  ctx.save();
  ctx.setLineDash([1, 12]);
  ctx.lineCap = "round";
  ctx.lineWidth = 1;

  for (let i=0; i<size; i++) {
    left = (i/size) * drawing.width;
    value = audiocfg.analyserFrequencyData[i];

    if (value > 0.001) value += (i*i / (size*1.5));

    height = (value / 255) * drawing.height;

    ctx.lineWidth = (value/255)*10;

    g = minChannel + (i/size);
    b = minChannel + value;
    r = minChannel + ( lerp(g, b, value/255 ));

    if (value > 128 || 1/value+0.1 > i) r = 255;

    if (i % 4 == 0) {
      r *= 4;
      g *= 4;
      b *= 4;
    }

    // ctx.fillStyle = `rgb(${r},${g},${b})`;
    // ctx.beginPath();
    // ctx.moveTo(left, drawing.height);
    // ctx.lineTo(left + width, drawing.height);
    // ctx.lineTo(left + width, drawing.height - height);
    // ctx.lineTo(left, drawing.height - height);
    // ctx.closePath();
    // ctx.fill();

    ctx.strokeStyle = `rgb(${r%255},${g%255},${b%255})`;

    ctx.beginPath();
    // ctx.moveTo(left, drawing.height);
    // ctx.lineTo(left, drawing.height - height);
    ctx.moveTo(left, 0);
    ctx.lineTo(left, height);
    ctx.stroke();
  }

  ctx.restore();
})
.setHandlesResize(true)
.mount(container);

drawing.autoClear = false;

let fps = 24;

setInterval(()=>{
  drawing.setNeedsRedraw(true);
}, 1000/fps);
