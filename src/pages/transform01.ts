import { createGLCanvas, resizeCanvas } from "../core/gl/context";
import { createProgram } from "../core/gl/shader";
import {
  identity,
  multiply,
  translation,
  rotationZ,
  scaling,
} from "../core/math/mat4";

// ── Shader sources ──────────────────────────────────────────

const VS_GLSL300 = `#version 300 es
layout(location = 0) in vec2 a_position;
uniform mat4 u_mvp;
void main() {
  gl_Position = u_mvp * vec4(a_position, 0.0, 1.0);
}`;

const FS_GLSL300 = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
  fragColor = vec4(0.2, 0.8, 0.4, 1.0);
}`;

const VS_GLSL100 = `
attribute vec2 a_position;
uniform mat4 u_mvp;
void main() {
  gl_Position = u_mvp * vec4(a_position, 0.0, 1.0);
}`;

const FS_GLSL100 = `
precision mediump float;
void main() {
  gl_FragColor = vec4(0.2, 0.8, 0.4, 1.0);
}`;

// ── Geometry: unit square as 2 triangles (‑0.5 … 0.5) ──────

const VERTICES = new Float32Array([
  -0.5, -0.5,
   0.5, -0.5,
   0.5,  0.5,
  -0.5, -0.5,
   0.5,  0.5,
  -0.5,  0.5,
]);

// ── Transform state ─────────────────────────────────────────

interface TransformState {
  tx: number;
  ty: number;
  rotDeg: number;
  scale: number;
}

const DEFAULT_STATE: Readonly<TransformState> = {
  tx: 0,
  ty: 0,
  rotDeg: 0,
  scale: 0.5,
};

// ── Helpers ─────────────────────────────────────────────────

function showError(container: HTMLElement, message: string): void {
  const el = document.createElement("div");
  el.className = "gl-error";
  el.textContent = message;
  container.appendChild(el);
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ── Slider builder ──────────────────────────────────────────

interface SliderOpts {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

function createSlider(opts: SliderOpts): {
  row: HTMLElement;
  valueSpan: HTMLSpanElement;
  input: HTMLInputElement;
} {
  const row = document.createElement("div");
  row.style.cssText =
    "display:flex;align-items:center;gap:10px;margin-bottom:8px;";

  const lbl = document.createElement("label");
  lbl.style.cssText = "min-width:110px;font-size:0.85rem;color:#8b8fa4;";
  lbl.textContent = opts.label;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(opts.min);
  input.max = String(opts.max);
  input.step = String(opts.step);
  input.value = String(opts.value);
  input.style.cssText = "flex:1;accent-color:#6c8cff;";

  const valueSpan = document.createElement("span");
  valueSpan.style.cssText =
    "min-width:52px;text-align:right;font-size:0.82rem;font-variant-numeric:tabular-nums;color:#e2e4ea;";
  valueSpan.textContent = opts.value.toFixed(2);

  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    valueSpan.textContent = v.toFixed(2);
    opts.onChange(v);
  });

  row.append(lbl, input, valueSpan);
  return { row, valueSpan, input };
}

// ── Main export ─────────────────────────────────────────────

export function renderTransform01(container: HTMLElement): void {
  // ── Header ──
  const title = document.createElement("h1");
  title.className = "page-title";
  title.textContent = "Transform01";

  const desc = document.createElement("p");
  desc.className = "page-desc";
  desc.innerHTML = [
    "2D 변환(Translate · Rotate · Scale)의 기초를 실습합니다.",
    "변환 행렬 <b>M = T × Rz × S</b> 순서로 합성하여",
    "Scale → Rotate → Translate 가 직관적으로 적용됩니다.",
    "슬라이더를 조작하면 uniform <code>u_mvp</code>에 행렬이 전달되어",
    "버텍스 셰이더에서 <code>gl_Position = u_mvp * position</code>으로 변환됩니다.",
  ].join("<br>");

  container.append(title, desc);

  // ── Canvas ──
  const canvasWrap = document.createElement("div");
  container.appendChild(canvasWrap);

  let ctx;
  try {
    ctx = createGLCanvas(canvasWrap);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Transform01]", msg);
    showError(canvasWrap, msg);
    return;
  }

  const { canvas, gl, isWebGL2 } = ctx;

  // ── Shader program ──
  let program: WebGLProgram;
  try {
    program = createProgram(
      gl,
      isWebGL2 ? VS_GLSL300 : VS_GLSL100,
      isWebGL2 ? FS_GLSL300 : FS_GLSL100,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Transform01]", msg);
    showError(canvasWrap, msg);
    return;
  }

  // ── VBO + attribute ──
  const POSITION_LOC = isWebGL2
    ? 0
    : gl.getAttribLocation(program, "a_position");

  if (isWebGL2) {
    const gl2 = gl as WebGL2RenderingContext;
    const vao = gl2.createVertexArray();
    gl2.bindVertexArray(vao);

    const vbo = gl2.createBuffer();
    gl2.bindBuffer(gl2.ARRAY_BUFFER, vbo);
    gl2.bufferData(gl2.ARRAY_BUFFER, VERTICES, gl2.STATIC_DRAW);
    gl2.enableVertexAttribArray(POSITION_LOC);
    gl2.vertexAttribPointer(POSITION_LOC, 2, gl2.FLOAT, false, 0, 0);
    // VAO stays bound
  } else {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(POSITION_LOC);
    gl.vertexAttribPointer(POSITION_LOC, 2, gl.FLOAT, false, 0, 0);
  }

  // ── Uniform location ──
  gl.useProgram(program);
  const uMvpLoc = gl.getUniformLocation(program, "u_mvp");

  // ── State ──
  const state: TransformState = { ...DEFAULT_STATE };

  // ── Controls ──
  const panel = document.createElement("div");
  panel.style.cssText = "margin-top:16px;";

  const sliders: { input: HTMLInputElement; valueSpan: HTMLSpanElement }[] = [];

  const txSlider = createSlider({
    label: "Translate X",
    min: -1,
    max: 1,
    step: 0.01,
    value: state.tx,
    onChange: (v) => {
      state.tx = v;
    },
  });
  const tySlider = createSlider({
    label: "Translate Y",
    min: -1,
    max: 1,
    step: 0.01,
    value: state.ty,
    onChange: (v) => {
      state.ty = v;
    },
  });
  const rotSlider = createSlider({
    label: "Rotation Z (°)",
    min: -180,
    max: 180,
    step: 1,
    value: state.rotDeg,
    onChange: (v) => {
      state.rotDeg = v;
    },
  });
  const scaleSlider = createSlider({
    label: "Scale",
    min: 0.1,
    max: 2,
    step: 0.01,
    value: state.scale,
    onChange: (v) => {
      state.scale = v;
    },
  });

  sliders.push(
    { input: txSlider.input, valueSpan: txSlider.valueSpan },
    { input: tySlider.input, valueSpan: tySlider.valueSpan },
    { input: rotSlider.input, valueSpan: rotSlider.valueSpan },
    { input: scaleSlider.input, valueSpan: scaleSlider.valueSpan },
  );

  panel.append(txSlider.row, tySlider.row, rotSlider.row, scaleSlider.row);

  // Reset button
  const resetBtn = document.createElement("button");
  resetBtn.className = "btn";
  resetBtn.textContent = "Reset";
  resetBtn.addEventListener("click", () => {
    Object.assign(state, DEFAULT_STATE);
    txSlider.input.value = String(state.tx);
    txSlider.valueSpan.textContent = state.tx.toFixed(2);
    tySlider.input.value = String(state.ty);
    tySlider.valueSpan.textContent = state.ty.toFixed(2);
    rotSlider.input.value = String(state.rotDeg);
    rotSlider.valueSpan.textContent = state.rotDeg.toFixed(2);
    scaleSlider.input.value = String(state.scale);
    scaleSlider.valueSpan.textContent = state.scale.toFixed(2);
  });
  panel.appendChild(resetBtn);

  container.appendChild(panel);

  // ── Render loop ───────────────────────────────────────────
  let rafId = 0;

  function frame(): void {
    resizeCanvas(gl, canvas);

    // M = T * Rz * S
    const S = scaling(state.scale, state.scale);
    const R = rotationZ(degToRad(state.rotDeg));
    const T = translation(state.tx, state.ty);
    const mvp = multiply(T, multiply(R, S));

    gl.clearColor(0.08, 0.09, 0.12, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniformMatrix4fv(uMvpLoc, false, mvp);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  // Cleanup when page navigates away: listen for outlet being cleared
  const observer = new MutationObserver(() => {
    if (!container.contains(canvas)) {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    }
  });
  observer.observe(container.parentElement ?? container, {
    childList: true,
    subtree: true,
  });

  // Also keep the identity import used as fallback reference
  void identity;
}
