export function renderTransform01(container: HTMLElement): void {
  const title = document.createElement("h1");
  title.className = "page-title";
  title.textContent = "Transform01";

  const desc = document.createElement("p");
  desc.className = "page-desc";
  desc.textContent = "모델·뷰 행렬을 사용한 2D/3D 변환 기초.";

  const placeholder = document.createElement("div");
  placeholder.className = "placeholder";
  placeholder.textContent = "🚧 준비 중입니다";

  container.append(title, desc, placeholder);
}
