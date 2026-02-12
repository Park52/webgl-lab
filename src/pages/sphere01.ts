import { createGLCanvas, resizeCanvas } from "../core/gl/context";
import { createProgram } from "../core/gl/shader";
import { loadImage, createTexture } from "../core/gl/texture";
import { createSphereMesh } from "../core/mesh/sphere";
import type { SphereMesh } from "../core/mesh/sphere";
import {
  multiply,
  translation,
  rotationY,
  perspective,
} from "../core/math/mat4";
import type { Mat4 } from "../core/math/mat4";

// ── Shader sources ──────────────────────────────────────────

const VS_GLSL300 = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;
uniform mat4 u_mvp;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = u_mvp * vec4(a_position, 1.0);
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
attribute vec3 a_position;
attribute vec2 a_uv;
uniform mat4 u_mvp;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = u_mvp * vec4(a_position, 1.0);
}`;

const FS_GLSL100 = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv);
}`;

// ── Helpers ─────────────────────────────────────────────────

function showError(container: HTMLElement, message: string): void {
  const el = document.createElement("div");
  el.className = "gl-error";
  el.textContent = message;
  container.appendChild(el);
}

// ── Slider builder ──────────────────────────────────────────

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
  valueSpan.textContent = String(value);

  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    valueSpan.textContent = String(v);
    onChange(v);
  });

  row.append(lbl, input, valueSpan);
  return { row, input, valueSpan };
}

// ── Main export ─────────────────────────────────────────────

export function renderSphere01(container: HTMLElement): void {
  // ── Header ──
  const title = document.createElement("h1");
  title.className = "page-title";
  title.textContent = "Sphere01";

  const desc = document.createElement("p");
  desc.className = "page-desc";
  desc.innerHTML = [
    "Lat/Lon 방식으로 구(Sphere) 메쉬를 생성하고 텍스처를 입혀 렌더링합니다.",
    "<b>UV 매핑</b>: 경도→u, 위도→v 로 구면 좌표를 텍스처 좌표에 대응시킵니다.",
    "<b>인덱스 드로우</b>: 공유 정점을 인덱스 버퍼(EBO)로 참조하여 drawElements로 그립니다.",
    "<b>MVP 행렬</b>: perspective × view(translation) × model(rotationY) 으로 최종 변환합니다.",
    "Stacks/Slices 슬라이더로 메쉬 해상도를 조절하고 Rebuild 버튼을 눌러 재생성하세요.",
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

  // ── Controls panel (hidden until loaded) ──
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
    console.error("[Sphere01]", msg);
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
    console.error("[Sphere01]", msg);
    statusEl.textContent = "";
    showError(container, msg);
    return;
  }

  gl.useProgram(program);

  const posLoc = isWebGL2 ? 0 : gl.getAttribLocation(program, "a_position");
  const uvLoc = isWebGL2 ? 1 : gl.getAttribLocation(program, "a_uv");
  const uMvpLoc = gl.getUniformLocation(program, "u_mvp");
  const uTexLoc = gl.getUniformLocation(program, "u_tex");

  // ── Mesh state ──
  let currentStacks = 32;
  let currentSlices = 64;
  let mesh: SphereMesh = createSphereMesh(1, currentStacks, currentSlices);

  // ── Buffer objects ──
  let posBuffer = gl.createBuffer()!;
  let uvBuffer = gl.createBuffer()!;
  let idxBuffer = gl.createBuffer()!;
  let vao: WebGLVertexArrayObject | null = null;

  function uploadMesh(): void {
    if (isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      if (vao) gl2.deleteVertexArray(vao);
      vao = gl2.createVertexArray();
      gl2.bindVertexArray(vao);

      // positions
      posBuffer = gl2.createBuffer()!;
      gl2.bindBuffer(gl2.ARRAY_BUFFER, posBuffer);
      gl2.bufferData(gl2.ARRAY_BUFFER, mesh.positions, gl2.STATIC_DRAW);
      gl2.enableVertexAttribArray(posLoc);
      gl2.vertexAttribPointer(posLoc, 3, gl2.FLOAT, false, 0, 0);

      // uvs
      uvBuffer = gl2.createBuffer()!;
      gl2.bindBuffer(gl2.ARRAY_BUFFER, uvBuffer);
      gl2.bufferData(gl2.ARRAY_BUFFER, mesh.uvs, gl2.STATIC_DRAW);
      gl2.enableVertexAttribArray(uvLoc);
      gl2.vertexAttribPointer(uvLoc, 2, gl2.FLOAT, false, 0, 0);

      // indices
      idxBuffer = gl2.createBuffer()!;
      gl2.bindBuffer(gl2.ELEMENT_ARRAY_BUFFER, idxBuffer);
      gl2.bufferData(gl2.ELEMENT_ARRAY_BUFFER, mesh.indices, gl2.STATIC_DRAW);

      gl2.bindVertexArray(null);
    } else {
      // positions
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

      // uvs
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);

      // indices
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    }
  }

  uploadMesh();

  // ── Render loop state ──
  let angle = 0;
  let lastTime = 0;
  let rafId = 0;
  let texture: WebGLTexture | null = null;

  function frame(now: number): void {
    const dt = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    angle += dt * 0.5; // ~0.5 rad/s rotation

    resizeCanvas(gl, canvas);

    gl.clearColor(0.08, 0.09, 0.12, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!texture) {
      rafId = requestAnimationFrame(frame);
      return;
    }

    gl.useProgram(program);

    // ── MVP ──
    const aspect = canvas.clientWidth / canvas.clientHeight || 1;
    const proj = perspective(Math.PI / 4, aspect, 0.1, 100); // fov 45°
    const view = translation(0, 0, -3);
    const model: Mat4 = rotationY(angle);
    const mvp = multiply(proj, multiply(view, model));

    gl.uniformMatrix4fv(uMvpLoc, false, mvp);

    // ── Texture ──
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTexLoc, 0);

    // ── Draw ──
    if (isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      gl2.bindVertexArray(vao);
      gl2.drawElements(gl2.TRIANGLES, mesh.indexCount, gl2.UNSIGNED_SHORT, 0);
      gl2.bindVertexArray(null);
    } else {
      // Bind attributes manually for WebGL1
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
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

  // ── Controls ──
  const stacksSlider = createSlider("Stacks", 4, 64, 1, currentStacks, (v) => {
    currentStacks = v;
  });
  const slicesSlider = createSlider("Slices", 4, 128, 1, currentSlices, (v) => {
    currentSlices = v;
  });

  const rebuildBtn = document.createElement("button");
  rebuildBtn.className = "btn";
  rebuildBtn.textContent = "Rebuild";
  rebuildBtn.addEventListener("click", () => {
    mesh = createSphereMesh(1, currentStacks, currentSlices);
    uploadMesh();
  });

  panel.append(stacksSlider.row, slicesSlider.row, rebuildBtn);

  // ── Enable depth test ──
  gl.enable(gl.DEPTH_TEST);

  // ── Load texture & start ──
  loadImage("/checker.png")
    .then((img) => {
      try {
        texture = createTexture(gl, img, {
          flipY: true,
          minFilter: gl.LINEAR,
          magFilter: gl.LINEAR,
          wrapS: gl.REPEAT,
          wrapT: gl.REPEAT,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Sphere01]", msg);
        statusEl.textContent = "";
        showError(container, msg);
        return;
      }

      // Show UI
      statusEl.style.display = "none";
      canvasWrap.style.display = "";
      panel.style.display = "";

      // Start render loop
      rafId = requestAnimationFrame(frame);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Sphere01]", msg);
      statusEl.textContent = "";
      showError(container, msg);
    });
}
