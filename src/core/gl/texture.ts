type GL = WebGL2RenderingContext | WebGLRenderingContext;

/**
 * Load an image from a URL. Returns a promise that resolves to the loaded HTMLImageElement.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로딩 실패: ${url}`));
    img.src = url;
  });
}

/**
 * Options for texture creation.
 */
export interface TextureOptions {
  flipY?: boolean;
  wrapS?: number;
  wrapT?: number;
  minFilter?: number;
  magFilter?: number;
}

/**
 * Create a WebGL texture from an HTMLImageElement.
 */
export function createTexture(
  gl: GL,
  image: HTMLImageElement,
  options: TextureOptions = {},
): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) {
    throw new Error("WebGL 텍스처 객체 생성 실패");
  }

  gl.bindTexture(gl.TEXTURE_2D, tex);

  // flipY
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, options.flipY ? 1 : 0);

  // Upload
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // Params
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_S,
    options.wrapS ?? gl.CLAMP_TO_EDGE,
  );
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_T,
    options.wrapT ?? gl.CLAMP_TO_EDGE,
  );
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    options.minFilter ?? gl.LINEAR,
  );
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    options.magFilter ?? gl.LINEAR,
  );

  return tex;
}

/**
 * Re-apply filter/wrap parameters to the currently bound TEXTURE_2D.
 */
export function applyTextureParams(
  gl: GL,
  options: TextureOptions,
): void {
  if (options.wrapS !== undefined) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrapS);
  }
  if (options.wrapT !== undefined) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrapT);
  }
  if (options.minFilter !== undefined) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.minFilter);
  }
  if (options.magFilter !== undefined) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.magFilter);
  }
}

/**
 * Re-upload an image with a new flipY setting on the currently bound TEXTURE_2D.
 */
export function reuploadWithFlip(
  gl: GL,
  image: HTMLImageElement,
  flipY: boolean,
): void {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY ? 1 : 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
}
