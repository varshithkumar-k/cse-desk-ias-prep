import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/configure-seo.mjs https://your-domain.example");
  process.exit(1);
}
let site;
try { site = new URL(input); }
catch { console.error("Provide a valid HTTPS site URL."); process.exit(1); }
if (site.protocol !== "https:" || site.pathname !== "/" || site.search || site.hash) {
  console.error("Provide the site's HTTPS origin only, for example https://your-domain.example");
  process.exit(1);
}
const origin = site.origin;
const pages = [
  ["index.html", "/"],
  ["mock-tests/index.html", "/mock-tests/"],
  ["practice/index.html", "/practice/"],
  ["progress/index.html", "/progress/"],
  ["ai-study/index.html", "/ai-study/"],
  ["exam-pulse/index.html", "/exam-pulse/"]
];
for (const [file, route] of pages) {
  const absolutePath = path.join(siteRoot, file);
  let html = await readFile(absolutePath, "utf8");
  html = html.replace(/(<link rel="canonical" href=")[^"]*(">)/, `$1${origin}${route}$2`);
  html = html.replace(/content="(?:https?:\/\/[^\"]+)?(?:\.\.\/|\.\/|\/)?assets\/social-card\.png"/g, `content="${origin}/assets/social-card.png"`);
  if (html.includes('property="og:url"')) {
    html = html.replace(/(<meta property="og:url" content=")[^\"]*(">)/, `$1${origin}${route}$2`);
  } else {
    html = html.replace('<meta property="og:type" content="website">', `<meta property="og:type" content="website"><meta property="og:url" content="${origin}${route}">`);
  }
  await writeFile(absolutePath, html, "utf8");
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([, route]) => `  <url><loc>${origin}${route}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(siteRoot, "sitemap.xml"), xml, "utf8");
await writeFile(path.join(siteRoot, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, "utf8");
console.log(`SEO URLs configured for ${origin}`);
