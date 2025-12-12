(function () {
  function getDefaultBaseUrl() {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:82";
    }
    return origin;
  }

  function resolveBaseUrl() {
    return (
      (window.__ENV && window.__ENV.API_BASE_URL) ||
      window.API_BASE_URL ||
      getDefaultBaseUrl()
    );
  }

  const normalizedBase = resolveBaseUrl().replace(/\/+$/, "");
  window.API_BASE_URL = normalizedBase;
  window.BASE_URL = `${normalizedBase}/api/v1`;
})();
