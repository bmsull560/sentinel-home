import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("Umami Analytics Integration", () => {
  const indexHtmlPath = path.resolve(
    import.meta.dirname,
    "../client/index.html"
  );
  const html = readFileSync(indexHtmlPath, "utf-8");

  it("places the conditional tracking code inside <head>", () => {
    const headEnd = html.indexOf("</head>");
    const bodyStart = html.indexOf("<body>");
    const scriptIndex = html.indexOf('s.src = endpoint + "/script.js"');

    expect(scriptIndex).toBeGreaterThan(0);
    expect(scriptIndex).toBeLessThan(headEnd);
    expect(scriptIndex).toBeLessThan(bodyStart);
  });

  it("includes a conditional script that only loads when both env vars are present", () => {
    expect(html).toContain("VITE_ANALYTICS_ENDPOINT");
    expect(html).toContain("VITE_ANALYTICS_WEBSITE_ID");
    expect(html).toContain('s.src = endpoint + "/script.js"');
    expect(html).toContain('s.setAttribute("data-website-id", websiteId)');
    expect(html).toContain('!endpoint.startsWith("%VITE_")');
    expect(html).toContain('!websiteId.startsWith("%VITE_")');
    expect(html).toContain("document.head.appendChild(s)");
  });

  it("does not include Google Analytics or gtag references", () => {
    expect(html.toLowerCase()).not.toContain("googletagmanager");
    expect(html.toLowerCase()).not.toContain("gtag(");
    expect(html.toLowerCase()).not.toContain("ga4");
    expect(html.toLowerCase()).not.toContain("google-analytics");
  });

  it("uses defer for the analytics script", () => {
    expect(html).toContain("s.defer = true");
  });
});
