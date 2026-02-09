/**
 * Minimal column-major 4×4 matrix utilities.
 * All matrices are Float32Array(16), stored column-major (OpenGL convention).
 *
 *  Index layout (column-major):
 *   [ m0  m4  m8   m12 ]
 *   [ m1  m5  m9   m13 ]
 *   [ m2  m6  m10  m14 ]
 *   [ m3  m7  m11  m15 ]
 */

export type Mat4 = Float32Array;

/** Create a new identity matrix. */
export function identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

/** Multiply two 4×4 matrices: out = a * b */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[row]      * b[col * 4]     +
        a[4 + row]  * b[col * 4 + 1] +
        a[8 + row]  * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

/** Create a translation matrix. */
export function translation(tx: number, ty: number, tz: number = 0): Mat4 {
  const m = identity();
  m[12] = tx;
  m[13] = ty;
  m[14] = tz;
  return m;
}

/** Create a rotation matrix around the Z axis (angle in radians). */
export function rotationZ(rad: number): Mat4 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const m = identity();
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}

/** Create a uniform or non-uniform scale matrix. */
export function scaling(sx: number, sy: number, sz: number = 1): Mat4 {
  const m = identity();
  m[0] = sx;
  m[5] = sy;
  m[10] = sz;
  return m;
}

/**
 * Create an orthographic projection matrix.
 * Maps (left..right, bottom..top, near..far) → NDC (-1..1).
 */
export function ortho(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number = -1,
  far: number = 1,
): Mat4 {
  const m = new Float32Array(16);
  const rl = right - left;
  const tb = top - bottom;
  const fn = far - near;

  m[0] = 2 / rl;
  m[5] = 2 / tb;
  m[10] = -2 / fn;
  m[12] = -(right + left) / rl;
  m[13] = -(top + bottom) / tb;
  m[14] = -(far + near) / fn;
  m[15] = 1;
  return m;
}
