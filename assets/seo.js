(() => {
  const link = document.querySelector('link[rel="canonical"]');
  if (!link || location.protocol === "file:") return;
  const cleanPath = location.pathname.replace(/index\.html$/, "");
  link.href = `${location.origin}${cleanPath}`;
})();
