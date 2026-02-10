import { createGLCanvas, resizeCanvas } from "../core/gl/context";
import { createProgram } from "../core/gl/shader";
import {
  loadImage,
  createTexture,
  applyTextureParams,
  reuploadWithFlip,
} from "../core/gl/texture";

// ── Shader sources ──────────────────────────────────────────

const VS_GLSL300 = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
uniform float u_uvScale;
out vec2 v_uv;
void main() {
  v_uv = a_uv * u_uvScale;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FS_GLSL300 = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 fragColor;
void main() {
  fragColor = texture(u_tex, v_uv);
}`;

const VS_GLSL100 = `
attribute vec2 a_position;
attribute vec2 a_uv;
uniform float u_uvScale;
varying vec2 v_uv;
void main() {
  v_uv = a_uv * u_uvScale;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FS_GLSL100 = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv);
}`;

// ── Geometry: full-screen-ish quad (‑0.8 … 0.8) with UVs ───
//  position(x,y) + uv(s,t)  — interleaved
const VERTICES = new Float32Array([
  // tri 1
  -0.8, -0.8,   0.0, 0.0,
   0.8, -0.8,   1.0, 0.0,
   0.8,  0.8,   1.0, 1.0,
  // tri 2
  -0.8, -0.8,   0.0, 0.0,
   0.8,  0.8,   1.0, 1.0,
  -0.8,  0.8,   0.0, 1.0,
]);

const STRIDE = 4 * Float32Array.BYTES_PER_ELEMENT; // 16 bytes per vertex

// ── State ───────────────────────────────────────────────────

interface TexState {
  filter: "NEAREST" | "LINEAR";
  wrap: "CLAMP_TO_EDGE" | "REPEAT";
  flipY: boolean;
  uvScale: number;
}

const DEFAULT_STATE: Readonly<TexState> = {
  filter: "LINEAR",
  wrap: "CLAMP_TO_EDGE",
  flipY: true,
  uvScale: 1.0,
};

// ── Helpers ─────────────────────────────────────────────────

function showError(container: HTMLElement, message: string): void {
  const el = document.createElement("div");
  el.className = "gl-error";
  el.textContent = message;
  container.appendChild(el);
}

function glFilterConst(
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  name: TexState["filter"],
): number {
  return name === "NEAREST" ? gl.NEAREST : gl.LINEAR;
}

function glWrapConst(
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  name: TexState["wrap"],
): number {
  return name === "REPEAT" ? gl.REPEAT : gl.CLAMP_TO_EDGE;
}

// ── Select builder ──────────────────────────────────────────

function createSelect<T extends string>(
  label: string,
  options: T[],
  value: T,
  onChange: (v: T) => void,
): { row: HTMLElement; select: HTMLSelectElement } {
  const row = document.createElement("div");
  row.className = "ctrl-row";

  const lbl = document.createElement("label");
  lbl.className = "ctrl-label";
  lbl.textContent = label;

  const select = document.createElement("select");
  select.className = "ctrl-select";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener("change", () => onChange(select.value as T));

  row.append(lbl, select);
  return { row, select };
}

// ── Checkbox builder ────────────────────────────────────────

function createCheckbox(
  label: string,
  checked: boolean,
  onChange: (v: boolean) => void,
): { row: HTMLElement; input: HTMLInputElement } {
  const row = document.createElement("div");
  row.className = "ctrl-row";

  const lbl = document.createElement("label");
  lbl.className = "ctrl-label";
  lbl.textContent = label;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.style.cssText = "accent-color:#6c8cff;width:18px;height:18px;cursor:pointer;";
  input.addEventListener("change", () => onChange(input.checked));

  row.append(lbl, input);
  return { row, input };
}

// ── Range slider builder ────────────────────────────────────

function createSlider(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  onChange: (v: number) => void,
): { row: HTMLElement; input: HTMLInputElement; valueSpan: HTMLSpanElement } {
  const row = document.createElement("div");
  row.className = "ctrl-row";

  const lbl = document.createElement("label");
  lbl.className = "ctrl-label";
  lbl.textContent = label;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.style.cssText = "flex:1;accent-color:#6c8cff;";

  const valueSpan = document.createElement("span");
  valueSpan.className = "ctrl-value";
  valueSpan.textContent = value.toFixed(2);

  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    valueSpan.textContent = v.toFixed(2);
    onChange(v);
  });

  row.append(lbl, input, valueSpan);
  return { row, input, valueSpan };
}

// ── Main export ─────────────────────────────────────────────

export function renderTexture01(container: HTMLElement): void {
  // ── Header ──
  const title = document.createElement("h1");
  title.className = "page-title";
  title.textContent = "Texture01";

  const desc = document.createElement("p");
  desc.className = "page-desc";
  desc.innerHTML = [
    "WebGL 텍스처 매핑의 기초를 실습합니다.",
    "이미지를 GPU에 업로드하고 사각형(2 triangles)에 입힙니다.",
    "<b>Filter</b>: NEAREST(픽셀 그대로) vs LINEAR(보간) 차이를 확인하세요.",
    "<b>Wrap</b>: CLAMP_TO_EDGE vs REPEAT(타일링). UV Scale을 올려 타일링을 관찰하세요.",
    "<b>Flip Y</b>: 이미지 좌표(top-left 원점)와 텍스처 좌표(bottom-left 원점)의 차이를 확인합니다.",
  ].join("<br>");

  container.append(title, desc);

  // ── Loading indicator ──
  const statusEl = document.createElement("div");
  statusEl.className = "placeholder";
  statusEl.textContent = "Loading texture...";
  container.appendChild(statusEl);

  // ── Canvas container (hidden until loaded) ──
  const canvasWrap = document.createElement("div");
  canvasWrap.style.display = "none";
  container.appendChild(canvasWrap);

  // ── Controls container (hidden until loaded) ──
  const panel = document.createElement("div");
  panel.className = "ctrl-panel";
  panel.style.display = "none";
  container.appendChild(panel);

  // ── Init GL ──
  let ctx;
  try {
    ctx = createGLCanvas(canvasWrap);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Texture01]", msg);
    statusEl.textContent = "";
    showError(container, msg);
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
    console.error("[Texture01]", msg);
    statusEl.textContent = "";
    showError(container, msg);
    return;
  }

  // ── VBO + attributes ──
  const posLoc = isWebGL2 ? 0 : gl.getAttribLocation(program, "a_position");
  const uvLoc = isWebGL2 ? 1 : gl.getAttribLocation(program, "a_uv");

  if (isWebGL2) {
    const gl2 = gl as WebGL2RenderingContext;
    const vao = gl2.createVertexArray();
    gl2.bindVertexArray(vao);

    const vbo = gl2.createBuffer();
    gl2.bindBuffer(gl2.ARRAY_BUFFER, vbo);
    gl2.bufferData(gl2.ARRAY_BUFFER, VERTICES, gl2.STATIC_DRAW);

    gl2.enableVertexAttribArray(posLoc);
    gl2.vertexAttribPointer(posLoc, 2, gl2.FLOAT, false, STRIDE, 0);
    gl2.enableVertexAttribArray(uvLoc);
    gl2.vertexAttribPointer(uvLoc, 2, gl2.FLOAT, false, STRIDE, 8);
  } else {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, STRIDE, 8);
  }

  // ── Uniforms ──
  gl.useProgram(program);
  const uTexLoc = gl.getUniformLocation(program, "u_tex");
  const uUvScaleLoc = gl.getUniformLocation(program, "u_uvScale");

  // ── State ──
  const state: TexState = { ...DEFAULT_STATE };
  let texture: WebGLTexture | null = null;
  let loadedImage: HTMLImageElement | null = null;
  let needsReupload = false;
  let rafId = 0;

  // ── Render loop ──
  function frame(): void {
    resizeCanvas(gl, canvas);

    gl.clearColor(0.08, 0.09, 0.12, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (texture && loadedImage) {
      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Re-upload if flipY changed
      if (needsReupload) {
        reuploadWithFlip(gl, loadedImage, state.flipY);
        needsReupload = false;
      }

      // Apply current params
      applyTextureParams(gl, {
        wrapS: glWrapConst(gl, state.wrap),
        wrapT: glWrapConst(gl, state.wrap),
        minFilter: glFilterConst(gl, state.filter),
        magFilter: glFilterConst(gl, state.filter),
      });

      gl.uniform1i(uTexLoc, 0);
      gl.uniform1f(uUvScaleLoc, state.uvScale);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    rafId = requestAnimationFrame(frame);
  }

  // ── Cleanup observer ──
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

  // ── Build controls (wired up, but hidden until load) ──
  const filterSel = createSelect<TexState["filter"]>(
    "Filter",
    ["NEAREST", "LINEAR"],
    state.filter,
    (v) => { state.filter = v; },
  );

  const wrapSel = createSelect<TexState["wrap"]>(
    "Wrap",
    ["CLAMP_TO_EDGE", "REPEAT"],
    state.wrap,
    (v) => { state.wrap = v; },
  );

  const flipChk = createCheckbox("Flip Y", state.flipY, (v) => {
    state.flipY = v;
    needsReupload = true;
  });

  const uvSlider = createSlider(
    "UV Scale",
    1, 8, 0.1,
    state.uvScale,
    (v) => { state.uvScale = v; },
  );

  const resetBtn = document.createElement("button");
  resetBtn.className = "btn";
  resetBtn.textContent = "Reset";
  resetBtn.addEventListener("click", () => {
    Object.assign(state, DEFAULT_STATE);
    filterSel.select.value = state.filter;
    wrapSel.select.value = state.wrap;
    flipChk.input.checked = state.flipY;
    uvSlider.input.value = String(state.uvScale);
    uvSlider.valueSpan.textContent = state.uvScale.toFixed(2);
    needsReupload = true;
  });

  panel.append(
    filterSel.row,
    wrapSel.row,
    flipChk.row,
    uvSlider.row,
    resetBtn,
  );

  // ── Load texture ──
  loadImage("/checker.png")
    .then((img) => {
      loadedImage = img;
      try {
        texture = createTexture(gl, img, {
          flipY: state.flipY,
          wrapS: glWrapConst(gl, state.wrap),
          wrapT: glWrapConst(gl, state.wrap),
          minFilter: glFilterConst(gl, state.filter),
          magFilter: glFilterConst(gl, state.filter),
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Texture01]", msg);
        statusEl.textContent = "";
        showError(container, msg);
        return;
      }

      // Show canvas + controls, hide loading
      statusEl.style.display = "none";
      canvasWrap.style.display = "";
      panel.style.display = "";

      // Start render loop
      rafId = requestAnimationFrame(frame);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Texture01]", msg);
      statusEl.textContent = "";
      showError(container, msg);
    });
}
