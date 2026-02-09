export function renderProjection01(container: HTMLElement): void {
  const title = document.createElement("h1");
  title.className = "page-title";
  title.textContent = "Projection01";

  const desc = document.createElement("p");
  desc.className = "page-desc";
  desc.textContent = "직교·투영 행렬을 사용한 카메라 투영 기초.";

  const placeholder = document.createElement("div");
  placeholder.className = "placeholder";
  placeholder.textContent = "🚧 준비 중입니다";

  container.append(title, desc, placeholder);
}
