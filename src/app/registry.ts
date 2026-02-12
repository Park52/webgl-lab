export interface LabMeta {
  title: string;
  description: string;
  path: string;
}

export const labs: LabMeta[] = [
  {
    title: "Triangle01",
    description: "WebGL 기본 삼각형 렌더링. VBO 업로드와 셰이더 파이프라인 기초.",
    path: "#/triangle01",
  },
  {
    title: "Transform01",
    description: "모델·뷰 행렬을 사용한 2D/3D 변환 기초.",
    path: "#/transform01",
  },
  {
    title: "Texture01",
    description: "이미지 텍스처 로딩과 UV 매핑. Filter·Wrap·Flip 파라미터 실습.",
    path: "#/texture01",
  },
  {
    title: "Projection01",
    description: "직교·투영 행렬을 사용한 카메라 투영 기초.",
    path: "#/projection01",
  },
  {
    title: "Sphere01",
    description: "Lat/Lon 구 메쉬 생성, UV 텍스처 매핑, 인덱스 드로우, MVP 행렬 회전.",
    path: "#/sphere01",
  },
];
