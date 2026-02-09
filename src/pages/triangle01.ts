import { createGLCanvas, resizeCanvas } from "../core/gl/context";
import { createProgram } from "../core/gl/shader";

// ── Shader sources ──

const VS_GLSL300 = `#version 300 es
layout(location = 0) in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FS_GLSL300 = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
  fragColor = vec4(0.42, 0.55, 1.0, 1.0);
}`;

const VS_GLSL100 = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FS_GLSL100 = `
precision mediump float;
void main() {
  gl_FragColor = vec4(0.42, 0.55, 1.0, 1.0);
}`;

// ── Triangle data ──
const VERTICES = new Float32Array([
   0.0,  0.6,
  -0.6, -0.4,
   0.6, -0.4,
]);

function showError(container: HTMLElement, message: string): void {
  const el = document.createElement("div");
  el.className = "gl-error";
  el.textContent = message;
  container.appendChild(el);
}

function draw(container: HTMLElement): void {
  // Canvas & GL context
  let ctx;
  try {
    ctx = createGLCanvas(container);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Triangle01]", msg);
    showError(container, msg);
    return;
  }

  const { canvas, gl, isWebGL2 } = ctx;
  resizeCanvas(gl, canvas);

  // Shader program
  let program: WebGLProgram;
  try {
    program = createProgram(
      gl,
      isWebGL2 ? VS_GLSL300 : VS_GLSL100,
      isWebGL2 ? FS_GLSL300 : FS_GLSL100,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Triangle01]", msg);
    showError(container, msg);
    return;
  }

  // VBO
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);

  // Attribute binding
  const POSITION_LOC = isWebGL2 ? 0 : gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(POSITION_LOC);
  gl.vertexAttribPointer(POSITION_LOC, 2, gl.FLOAT, false, 0, 0);

  // VAO (WebGL2)
  if (isWebGL2) {
    const gl2 = gl as WebGL2RenderingContext;
    const vao = gl2.createVertexArray();
    gl2.bindVertexArray(vao);
    gl2.bindBuffer(gl2.ARRAY_BUFFER, vbo);
    gl2.enableVertexAttribArray(POSITION_LOC);
    gl2.vertexAttribPointer(POSITION_LOC, 2, gl2.FLOAT, false, 0, 0);
    gl2.bindVertexArray(vao);
  }

  // Draw
  gl.clearColor(0.08, 0.09, 0.12, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function renderTriangle01(container: HTMLElement): void {
  const title = document.createElement("h1");
  title.className = "page-title";
  title.textContent = "Triangle01";

  const desc = document.createElement("p");
  desc.className = "page-desc";
  desc.textContent = "WebGL로 기본 삼각형을 렌더링합니다. VBO에 정점 데이터를 업로드하고, 버텍스/프래그먼트 셰이더를 거쳐 화면에 출력합니다.";

  container.append(title, desc);

  // 캔버스 컨테이너
  const canvasWrap = document.createElement("div");
  container.appendChild(canvasWrap);

  draw(canvasWrap);

  // Reset 버튼
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "Reset";
  btn.addEventListener("click", () => {
    canvasWrap.innerHTML = "";
    draw(canvasWrap);
  });
  container.appendChild(btn);
}
