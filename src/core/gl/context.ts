export interface GLContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext | WebGLRenderingContext;
  isWebGL2: boolean;
}

/**
 * 캔버스를 생성하고 WebGL 컨텍스트를 얻는다.
 * WebGL2 시도 → 실패 시 WebGL1 fallback.
 */
export function createGLCanvas(container: HTMLElement): GLContext {
  const canvas = document.createElement("canvas");
  canvas.className = "gl-canvas";
  container.appendChild(canvas);

  let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  let isWebGL2 = false;

  gl = canvas.getContext("webgl2");
  if (gl) {
    isWebGL2 = true;
  } else {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as WebGLRenderingContext | null;
  }

  if (!gl) {
    throw new Error("WebGL을 사용할 수 없습니다. 브라우저가 WebGL을 지원하는지 확인하세요.");
  }

  // context lost / restored
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    console.warn("[WebGL] context lost");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    console.info("[WebGL] context restored");
  });

  return { canvas, gl, isWebGL2 };
}

/**
 * CSS 크기와 devicePixelRatio에 맞춰 drawingBuffer를 갱신하고 viewport를 설정한다.
 */
export function resizeCanvas(gl: WebGL2RenderingContext | WebGLRenderingContext, canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const displayW = Math.round(canvas.clientWidth * dpr);
  const displayH = Math.round(canvas.clientHeight * dpr);

  if (canvas.width !== displayW || canvas.height !== displayH) {
    canvas.width = displayW;
    canvas.height = displayH;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
}
