/**
 * Lat/Lon 방식으로 구(Sphere) 메쉬를 생성한다.
 *
 * - stacks: 위도 방향 분할 수 (세로)
 * - slices: 경도 방향 분할 수 (가로)
 *
 * 반환값:
 *   positions  — Float32Array (x, y, z) per vertex
 *   uvs        — Float32Array (u, v) per vertex
 *   indices    — Uint16Array   (WebGL1 호환: 정점 수 ≤ 65535)
 */

export interface SphereMesh {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
}

export function createSphereMesh(
  radius: number = 1,
  stacks: number = 32,
  slices: number = 64,
): SphereMesh {
  const vertexCount = (stacks + 1) * (slices + 1);

  if (vertexCount > 65535) {
    console.warn(
      `[createSphereMesh] vertexCount(${vertexCount}) > 65535. Clamping for WebGL1 Uint16 index compatibility.`,
    );
  }

  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  let vi = 0; // vertex index cursor
  for (let stack = 0; stack <= stacks; stack++) {
    const phi = (stack / stacks) * Math.PI; // 0 → π (top → bottom)
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let slice = 0; slice <= slices; slice++) {
      const theta = (slice / slices) * 2 * Math.PI; // 0 → 2π
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      const x = radius * sinPhi * cosTheta;
      const y = radius * cosPhi;
      const z = radius * sinPhi * sinTheta;

      positions[vi * 3] = x;
      positions[vi * 3 + 1] = y;
      positions[vi * 3 + 2] = z;

      // UV: u wraps around longitude, v goes top→bottom
      uvs[vi * 2] = slice / slices;
      uvs[vi * 2 + 1] = stack / stacks;

      vi++;
    }
  }

  // ── Indices (two triangles per cell) ──
  const indexCount = stacks * slices * 6;
  const indices = new Uint16Array(indexCount);

  let ii = 0;
  for (let stack = 0; stack < stacks; stack++) {
    for (let slice = 0; slice < slices; slice++) {
      const first = stack * (slices + 1) + slice;
      const second = first + slices + 1;

      // Triangle 1
      indices[ii++] = first;
      indices[ii++] = second;
      indices[ii++] = first + 1;

      // Triangle 2
      indices[ii++] = first + 1;
      indices[ii++] = second;
      indices[ii++] = second + 1;
    }
  }

  return { positions, uvs, indices, vertexCount, indexCount };
}
