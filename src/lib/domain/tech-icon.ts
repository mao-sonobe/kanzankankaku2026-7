// 技術名 → deviconのアイコンURL変換。
// 見つからない技術はUI側で頭文字アバターにフォールバックする(onError)。

const DEVICON_BASE = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

/** deviconのフォルダ名と一致しない代表的な技術名の対応表(キーは小文字)。 */
const SLUG_OVERRIDES: Record<string, string> = {
  "next.js": "nextjs",
  "node.js": "nodejs",
  "nuxt.js": "nuxtjs",
  "vue.js": "vuejs",
  "express.js": "express",
  "aws": "amazonwebservices",
  "aws s3": "amazonwebservices",
  "amazon s3": "amazonwebservices",
  "aws lambda": "amazonwebservices",
  "google cloud": "googlecloud",
  "gcp": "googlecloud",
  "tailwind css": "tailwindcss",
  "ruby on rails": "rails",
  "socket.io": "socketio",
  "d3.js": "d3js",
  "three.js": "threejs",
};

/** deviconで-originalではなく-plainしか無い代表例。 */
const PLAIN_ONLY = new Set(["amazonwebservices", "supabase"]);

export function techIconUrl(name: string): string | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const slug = SLUG_OVERRIDES[key] ?? key.replace(/\.js$/, "js").replace(/[^a-z0-9]/g, "");
  if (!slug) return null;
  const variant = PLAIN_ONLY.has(slug) ? "plain" : "original";
  return `${DEVICON_BASE}/${slug}/${slug}-${variant}.svg`;
}
