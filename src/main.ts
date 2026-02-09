import "./styles.css";
import { createLayout } from "./app/layout";
import { registerRoutes, startRouter } from "./router";
import { renderHome } from "./pages/home";
import { renderTriangle01 } from "./pages/triangle01";
import { renderTransform01 } from "./pages/transform01";
import { renderProjection01 } from "./pages/projection01";

function renderNotFound(container: HTMLElement): void {
  container.innerHTML = `
    <div class="not-found">
      <h1>404</h1>
      <p>페이지를 찾을 수 없습니다.</p>
      <a href="#/">홈으로 돌아가기</a>
    </div>`;
}

function bootstrap(): void {
  const app = document.getElementById("app");
  if (!app) return;

  const { root, outlet } = createLayout();
  app.appendChild(root);

  registerRoutes(
    [
      { path: "#/", render: renderHome },
      { path: "#/triangle01", render: renderTriangle01 },
      { path: "#/transform01", render: renderTransform01 },
      { path: "#/projection01", render: renderProjection01 },
    ],
    outlet,
    renderNotFound,
  );

  startRouter();
}

bootstrap();
