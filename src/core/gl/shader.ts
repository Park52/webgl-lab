/**
 * 개별 셰이더를 컴파일한다. 실패 시 에러를 throw한다.
 */
export function compileShader(
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error(`셰이더 객체 생성 실패 (type=${type})`);
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown error";
    gl.deleteShader(shader);
    const label = type === gl.VERTEX_SHADER ? "Vertex" : "Fragment";
    throw new Error(`${label} 셰이더 컴파일 실패:\n${log}`);
  }

  return shader;
}

/**
 * 버텍스+프래그먼트 셰이더를 링크하여 프로그램을 만든다.
 */
export function createProgram(
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  if (!program) {
    throw new Error("WebGL 프로그램 객체 생성 실패");
  }

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown error";
    gl.deleteProgram(program);
    throw new Error(`프로그램 링크 실패:\n${log}`);
  }

  // 링크 후 셰이더 객체는 분리 가능
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  return program;
}
