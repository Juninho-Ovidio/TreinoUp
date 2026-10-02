// Gera os PNGs do app TreinoUp (ícone, ícone adaptativo do Android, splash e favicon) a partir de assets/brand/treinoup-mark.svg.
// Uso: npm run icons
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const mark = readFileSync(new URL("../assets/brand/treinoup-mark.svg", import.meta.url), "utf8");
const inner = mark.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
// Símbolo sem o fundo grafite (para o ícone adaptativo e a splash, que já têm fundo próprio).
const glyph = inner.replace(/<rect[^>]*\/>/, "");

function svg(body, { size = 120, bg } = {}) {
  const fill = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${fill}${body}</svg>`;
}

function png(source, width, out) {
  const data = new Resvg(source, { fitTo: { mode: "width", value: width } }).render().asPng();
  writeFileSync(new URL(`../assets/${out}`, import.meta.url), data);
  console.log(`assets/${out} (${width}px)`);
}

// Ícone iOS: sem transparência e sem cantos (o sistema arredonda).
png(svg(inner.replace(/rx="27"/, 'rx="0"')), 1024, "icon.png");
// Android adaptativo: o símbolo ocupa a zona segura central (66%).
png(svg(`<g transform="translate(20 20) scale(0.6667)">${glyph}</g>`), 1024, "android-icon-foreground.png");
png(svg("", { bg: "#14141A" }), 1024, "android-icon-background.png");
png(
  svg(`<g transform="translate(20 20) scale(0.6667)">${glyph.replace(/url\(#gd\)|#FFF1CC/g, "#FFFFFF")}</g>`),
  1024,
  "android-icon-monochrome.png",
);
// Splash: o símbolo centralizado; a cor de fundo vem do app.config.
png(svg(glyph), 512, "splash-icon.png");
png(mark, 48, "favicon.png");
