export type RouteRenderer = (container: HTMLElement) => void;

interface RouteEntry {
  path: string;
  render: RouteRenderer;
}

let routes: RouteEntry[] = [];
let outlet: HTMLElement | null = null;
let notFoundRenderer: RouteRenderer | null = null;

/**
 * 라우트 테이블을 등록한다.
 */
export function registerRoutes(
  entries: RouteEntry[],
  outletEl: HTMLElement,
  notFound?: RouteRenderer,
): void {
  routes = entries;
  outlet = outletEl;
  notFoundRenderer = notFound ?? null;
}

/**
 * 현재 hash를 읽어 해당 라우트를 렌더한다.
 */
export function navigate(): void {
  if (!outlet) return;

  const hash = location.hash || "#/";
  const normalised = hash === "#" ? "#/" : hash;

  // hash가 비어 있으면 기본값 설정
  if (!location.hash || location.hash === "#") {
    history.replaceState(null, "", "#/");
  }

  outlet.innerHTML = "";

  const matched = routes.find((r) => r.path === normalised);

  if (matched) {
    matched.render(outlet);
  } else if (notFoundRenderer) {
    notFoundRenderer(outlet);
  } else {
    outlet.textContent = "Page not found";
  }
}

/**
 * 라우터를 시작한다 (hashchange 리스닝 + 초기 네비게이션).
 */
export function startRouter(): void {
  window.addEventListener("hashchange", () => navigate());
  navigate();
}
