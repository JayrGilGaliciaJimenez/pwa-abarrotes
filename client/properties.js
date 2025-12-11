(function () {
  const DEFAULT_API_BASE = "http://localhost:82";
  const envBase =
    (window.__ENV && window.__ENV.API_BASE_URL) ||
    window.API_BASE_URL ||
    DEFAULT_API_BASE;

  const normalizedBase = envBase.replace(/\/+$/, "");
  window.API_BASE_URL = normalizedBase;
  window.BASE_URL = `${normalizedBase}/api/v1`;
})();
