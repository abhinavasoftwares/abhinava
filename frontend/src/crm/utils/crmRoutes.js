export function getCrmSlugFromPath() {
  const segments = window.location.pathname
    .split("/")
    .filter(Boolean);

  // Expected:
  // /crm/{slug}
  // /crm/{slug}/dashboard

  if (segments[0] !== "crm") {
    return null;
  }

  return segments[1] || null;
}

export function getCrmBasePath() {
  const slug = getCrmSlugFromPath();

  if (!slug) {
    return "/crm";
  }

  return `/crm/${slug}`;
}

export function crmPath(path = "") {
  const base = getCrmBasePath();

  if (!path) {
    return base;
  }

  return `${base}/${path.replace(/^\/+/, "")}`;
}