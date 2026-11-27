import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const profile = JSON.parse(readFileSync(resolve(root, 'data/profile.json'), 'utf8'));
const typography = JSON.parse(readFileSync(resolve(root, 'data/typography.json'), 'utf8'));
for (const font of Object.values(typography)) {
  assert.equal(createHash('sha256').update(readFileSync(resolve(root, 'assets', font.file))).digest('hex'), font.sha256,
    'Font source changed; run python .github/scripts/prepare-typography.py');
}
const check = process.argv.includes('--check');
const xml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const n = value => Number(value.toFixed(2));
for (const url of [profile.site, ...profile.projects.map(p => p.url), ...profile.links.map(l => l.url)]) {
  assert.equal(new URL(url).protocol, 'https:');
}
assert.equal(profile.projects.length, 3, 'The README row holds exactly three project cards');
const outputs = new Map();

// Width of a line set in the outlined fonts, matching outlineText below.
function measure(text, face, size, spacing = 0) {
  const font = typography[face];
  const chars = [...text];
  let advance = 0;
  chars.forEach((char, i) => {
    assert(font.glyphs[char], `Add font outline for ${char}`);
    advance += font.glyphs[char].advance + (font.kern[char + (chars[i + 1] || '')] || 0);
  });
  return advance * size / font.units + spacing * (chars.length - 1);
}
function fits(text, face, size, width, spacing = 0) {
  const used = measure(text, face, size, spacing);
  assert(used <= width, `Copy is too wide for its box (${n(used)} > ${width}): ${text}`);
}

function outlineText(source) {
  return source.replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (_, attrs, encoded) => {
    const a = Object.fromEntries([...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const text = encoded.replace(/&(?:amp|lt|gt|quot|apos);/g, e => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[e]);
    const font = typography[a['data-font'] || 'sans'];
    const scale = Number(a['font-size'] || 16) / font.units;
    const spacing = Number(a['letter-spacing'] || 0) / scale;
    const chars = [...text];
    let advance = 0;
    const paths = chars.map((char, i) => {
      const glyph = font.glyphs[char];
      assert(glyph, `Add font outline for ${char}`);
      const path = glyph.path ? `<path transform="translate(${n(advance)} 0)" d="${glyph.path}"/>` : '';
      advance += glyph.advance + (font.kern[char + (chars[i + 1] || '')] || 0) + (i === chars.length - 1 ? 0 : spacing);
      return path;
    }).join('');
    const x = Number(a.x || 0) - (a['text-anchor'] === 'end' ? advance * scale : a['text-anchor'] === 'middle' ? advance * scale / 2 : 0);
    return `<g aria-label="${xml(text)}" fill="${a.fill || '#000000'}" transform="translate(${n(x)} ${Number(a.y || 0)}) scale(${scale} ${-scale})">${paths}</g>`;
  });
}

function svg(title, width, height, body, css, description) {
  return outlineText(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${xml(title)}</title><desc id="desc">${xml(description)} Decorative motion stops when reduced motion is preferred. Navigation is provided by the surrounding link.</desc>
<style>
${css}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style>${body}</svg>\n`);
}

// One design system for the cover and the project cards: the same card, radius,
// border and type scale, a single vermilion accent and one stroke weight.
const themes = {
  light: {
    suffix: '-light', card: '#f6f4ef', edge: '#e2ded4', ink: '#1d2a2e', muted: '#626b69',
    faint: '#a7a59d', accent: '#b5472f', accentSoft: '#b5472f1f',
  },
  dark: {
    suffix: '', card: '#10161b', edge: '#28323b', ink: '#e8edf1', muted: '#95a2ad',
    faint: '#55636f', accent: '#ec8d6f', accentSoft: '#ec8d6f24',
  },
};
const W = 900, RADIUS = 14, GUTTER = 12;

// The Crab Research mark, drawn statically at its source scale (64 x 48).
function crabMark(color) {
  const legPairs = [
    { hip: [22, 20], knee: [12, 16], foot: [5, 21] },
    { hip: [21, 24], knee: [10, 24], foot: [4, 31] },
    { hip: [22, 28], knee: [12, 32], foot: [8, 41] },
    { hip: [25, 30], knee: [19, 38], foot: [16, 46] },
  ];
  const legs = [false, true].map(mirror => legPairs.map(({ hip, knee, foot }) => {
    const [hx, hy, kx, ky, fx, fy] = [...hip, ...knee, ...foot].map((v, i) => i % 2 || !mirror ? v : 64 - v);
    return `<path d="M${hx} ${hy}L${kx} ${ky}L${fx} ${fy}"/>`;
  }).join('')).join('');
  const claw = '<path d="M0 0Q-7-2-7-8L-6-12L-2-7L2-10Q6-4 0 0"/>';
  return `<g fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${legs}
  <path d="M23 18Q18 14 13 12M41 18Q46 14 51 12M25 16 23 8M39 16 41 8"/>
  <g transform="translate(13 12)">${claw}</g><g transform="translate(51 12) scale(-1 1)">${claw}</g></g>
  <path d="M19 24c0-7 6-11 13-11s13 4 13 11v6c-4 6-22 6-26 0v-6Z" fill="${color}"/>`;
}

// Erdős Problem 1212 setting: integer points (a, b) with a, b > 1, gcd(a, b) = 1
// and at least one composite coordinate. The cover draws a real unit-step path
// through these admissible points across the visible window.
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const composite = k => { for (let d = 2; d * d <= k; d++) if (k % d === 0) return true; return false; };
const admissible = (a, b) => a > 1 && b > 1 && gcd(a, b) === 1 && (composite(a) || composite(b));
function latticePath(cols, rows, origin) {
  const at = (c, r) => [origin[0] + c, origin[1] + r];
  const key = (c, r) => `${c},${r}`;
  const middle = Math.floor(rows / 2);
  const starts = Array.from({ length: rows }, (_, r) => r)
    .filter(r => admissible(...at(0, r)))
    .sort((x, y) => Math.abs(x - middle) - Math.abs(y - middle));
  assert(starts.length, 'No admissible start in the lattice window');
  const previous = new Map([[key(0, starts[0]), null]]);
  const queue = [[0, starts[0]]];
  while (queue.length) {
    const [c, r] = queue.shift();
    if (c === cols - 1) {
      const path = [];
      for (let k = key(c, r); k; k = previous.get(k)) path.unshift(k.split(',').map(Number));
      return path;
    }
    for (const [dc, dr] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
      const [nc, nr] = [c + dc, r + dr];
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || previous.has(key(nc, nr))) continue;
      if (!admissible(...at(nc, nr))) continue;
      previous.set(key(nc, nr), key(c, r));
      queue.push([nc, nr]);
    }
  }
  throw new Error('No admissible crossing in the lattice window');
}

function cover(t) {
  const H = 264, step = 16, left = 436, right = 868, top = 36, bottom = 228;
  const cols = Math.floor((right - left) / step) + 1, rows = Math.floor((bottom - top) / step) + 1;
  // One of the few windows of this size that an admissible path crosses.
  const origin = [196, 165];
  const xy = (c, r) => [left + c * step, bottom - r * step];
  const dots = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const [x, y] = xy(c, r);
    dots.push(admissible(origin[0] + c, origin[1] + r)
      ? `<circle cx="${x}" cy="${y}" r="1.35" fill="${t.ink}" opacity=".5"/>`
      : `<circle cx="${x}" cy="${y}" r=".8" fill="${t.faint}" opacity=".55"/>`);
  }
  const path = latticePath(cols, rows, origin);
  const d = path.map(([c, r], i) => `${i ? 'L' : 'M'}${xy(c, r).join(' ')}`).join('');
  const length = (path.length - 1) * step;
  const [hx, hy] = xy(...path[path.length - 1]);
  fits(profile.name, 'serif', 48, 370);
  profile.role.forEach(line => fits(line, 'sans', 13.5, 370));
  const caption = `FIG. 1 · COMPOSITE-RESTRICTED VISIBLE LATTICE, a ${origin[0]}-${origin[0] + cols - 1}, b ${origin[1]}-${origin[1] + rows - 1}`;
  const roleLines = profile.role.map((line, i) =>
    `<text x="40" y="${150 + i * 20}" font-size="13.5" fill="${t.muted}">${xml(line)}</text>`).join('\n');
  return svg(`${profile.name} — Crab Satellite`, W, H, `
<defs>
 <linearGradient id="fade" x1="${left - 8}" x2="${left + 120}" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
 <mask id="field"><rect x="${left - 10}" y="0" width="${W}" height="${H}" fill="url(#fade)"/></mask>
</defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${RADIUS}" fill="${t.card}" stroke="${t.edge}"/>
<g mask="url(#field)">
 ${dots.join('')}
 <path d="${d}" fill="none" stroke="${t.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>
 <path d="${d}" fill="none" stroke="${t.accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="28 ${length + 60}" class="travel"/>
</g>
<circle cx="${hx}" cy="${hy}" r="3.2" fill="${t.accent}"/>
<circle cx="${hx}" cy="${hy}" r="7" fill="none" stroke="${t.accent}" opacity=".45" class="beacon"/>
<g transform="translate(40 34) scale(.34)">${crabMark(t.accent)}</g>
<text x="68" y="48" font-size="9" fill="${t.muted}" letter-spacing="2.2">CRAB SATELLITE</text>
<text x="38" y="116" font-size="48" data-font="serif" fill="${t.ink}">${xml(profile.name)}</text>
${roleLines}
<rect x="40.5" y="192.5" width="183" height="36" rx="18" fill="none" stroke="${t.ink}" stroke-opacity=".22"/>
<text x="59" y="215" font-size="13.5" fill="${t.ink}">Explore my work</text>
<circle cx="205" cy="210.5" r="11.5" fill="${t.accent}"/>
<path d="M201 214.5l8-8m-7 0h7v7" fill="none" stroke="${t.card}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${right}" y="250" font-size="8.5" fill="${t.muted}" letter-spacing=".6" text-anchor="end">${xml(caption)}</text>`, `
@keyframes travel{from{stroke-dashoffset:28}to{stroke-dashoffset:${-length - 32}}}
@keyframes beacon{0%{transform:scale(.6);opacity:.6}70%,100%{transform:scale(1.5);opacity:0}}
.travel{animation:travel 9s cubic-bezier(.45,0,.55,1) infinite}
.beacon{transform-box:fill-box;transform-origin:center;animation:beacon 3s ease-out infinite}
`, `${profile.name}. ${profile.role.join(' ')} Figure: integer lattice points with a highlighted unit-step path through the coprime points that have a composite coordinate, the setting of Erdős Problem 1212.`);
}

// Line drawings share one stroke weight and sit in the same 100 x 60 box.
const drawings = {
  lattice: t => `
<g fill="${t.faint}">${Array.from({ length: 24 }, (_, i) => `<circle cx="${8 + (i % 6) * 16}" cy="${8 + Math.floor(i / 6) * 16}" r="1.3"/>`).join('')}</g>
<path d="M8 56H24V40H56V24H72V8H88" fill="none" stroke="${t.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
<path d="M8 56H24V40H56V24H72V8H88" fill="none" stroke="${t.accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="14 160" class="draw"/>
<circle cx="88" cy="8" r="3" fill="${t.accent}"/>`,
  port: t => {
    const cube = (cx, cy, s, stroke, face) => `<g stroke="${stroke}" stroke-width="1.1" stroke-linejoin="round">
     <path d="M${cx} ${cy - s}L${n(cx + s * .87)} ${cy - s / 2}L${cx} ${cy}L${n(cx - s * .87)} ${cy - s / 2}Z" fill="none"/>
     <path d="M${n(cx - s * .87)} ${cy - s / 2}L${cx} ${cy}V${cy + s}L${n(cx - s * .87)} ${cy + s / 2}Z" fill="none"/>
     <path d="M${cx} ${cy}L${n(cx + s * .87)} ${cy - s / 2}V${cy + s / 2}L${cx} ${cy + s}Z" fill="${face}"/></g>`;
    return `${cube(20, 30, 17, t.muted, 'none')}${cube(80, 30, 17, t.accent, t.accentSoft)}
<g class="port"><path d="M41 30H58m-5-5 5 5-5 5" fill="none" stroke="${t.accent}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  },
  chain: t => {
    const block = (x, signed) => `<rect x="${x}" y="18" width="22" height="22" rx="4" fill="${signed ? t.accentSoft : 'none'}" stroke="${signed ? t.accent : t.muted}" stroke-width="1.1"/>
     ${signed ? `<path d="M${x + 6} 29l3.5 3.5 6.5-7" fill="none" stroke="${t.accent}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`
       : `<path d="M${x + 6} 26h10M${x + 6} 32h7" stroke="${t.muted}" stroke-width="1.1" stroke-linecap="round"/>`}`;
    return `${block(2, false)}${block(38, false)}${block(74, true)}
<path d="M24 29H38M60 29H74" stroke="${t.muted}" stroke-width="1.1" stroke-dasharray="2 2.5"/>
<circle cx="24" cy="29" r="2.4" fill="${t.accent}" class="pulse"/>`;
  },
};

// Each card image is a third of the row; the card is inset inside it so the
// outer edges align with the cover and both gutters are equal.
function card(p, i, t) {
  const TW = W / 3, TH = 254, inset = i * GUTTER / 2, cardW = TW - GUTTER, text = cardW - 52;
  fits(p.title, 'serif', 30, text - 40);
  fits(p.summary, 'sans', 12, text);
  fits(p.source, 'sans', 8.5, text, 1.2);
  fits(p.evidence, 'sans', 11.5, text - 14);
  assert(drawings[p.drawing], `Unknown drawing for ${p.id}`);
  return svg(`${p.title}`, TW, TH, `
<g transform="translate(${n(inset)} 10)">
<rect x=".5" y=".5" width="${n(cardW - 1)}" height="243" rx="${RADIUS}" fill="${t.card}" stroke="${t.edge}"/>
<g transform="translate(26 26)">${drawings[p.drawing](t)}</g>
<circle cx="${n(cardW - 40)}" cy="40" r="14.5" fill="none" stroke="${t.ink}" stroke-opacity=".2"/>
<path d="M${n(cardW - 44.5)} 44.5l9-9m-8 0h8v8" fill="none" stroke="${t.ink}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
<text x="26" y="132" font-size="30" data-font="serif" fill="${t.ink}">${xml(p.title)}</text>
<text x="27" y="156" font-size="12" fill="${t.muted}">${xml(p.summary)}</text>
<path d="M26 180.5H${n(cardW - 26)}" stroke="${t.edge}"/>
<text x="27" y="203" font-size="8.5" fill="${t.muted}" letter-spacing="1.2">${xml(p.source)}</text>
<path d="M27 217.5l3 3 5.5-6" fill="none" stroke="${t.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<text x="41" y="222" font-size="11.5" fill="${t.ink}">${xml(p.evidence)}</text>
</g>`, `
@keyframes draw{from{stroke-dashoffset:14}to{stroke-dashoffset:-118}}
@keyframes port{0%,100%{transform:translateX(-3px);opacity:.55}50%{transform:translateX(3px);opacity:1}}
@keyframes pulse{0%{transform:translateX(0)}45%,50%{transform:translateX(50px)}95%,100%{transform:translateX(0);opacity:0}}
.draw{animation:draw 6s cubic-bezier(.45,0,.55,1) infinite}
.port{animation:port 3.2s ease-in-out infinite}
.pulse{animation:pulse 5s ease-in-out infinite}
`, `${p.title}: ${p.summary}. ${p.source}: ${p.evidence}.`);
}

for (const t of Object.values(themes)) {
  outputs.set(`assets/cover${t.suffix}.svg`, cover(t));
  profile.projects.forEach((p, i) => outputs.set(`assets/project-${p.id}${t.suffix}.svg`, card(p, i, t)));
}

function picture(asset, alt, width = '100%', inline = false) {
  const url = name => {
    const path = `assets/${name}.svg`;
    const content = outputs.get(path);
    assert(content, `Missing picture source: ${path}`);
    return `./${path}?v=${createHash('sha256').update(content).digest('hex').slice(0, 12)}`;
  };
  const markup = `<picture>
    <source media="(prefers-color-scheme: dark)" srcset="${url(asset)}" />
    <source media="(prefers-color-scheme: light)" srcset="${url(`${asset}-light`)}" />
    <img src="${url(`${asset}-light`)}" width="${width}" alt="${xml(alt)}" />
  </picture>`;
  // Inline cards must not carry whitespace, which would render as link text.
  return inline ? markup.replace(/\s*\n\s*/g, '') : markup;
}

outputs.set('README.md', `<!-- Generated by .github/scripts/generate-profile.mjs from data/profile.json. -->
<a href="${profile.site}">
  ${picture('cover', `${profile.name} — Crab Satellite. ${profile.role.join(' ')} Open the personal website.`)}
</a>

<p align="center">
${profile.projects.map(p => `<a href="${p.url}">${picture(`project-${p.id}`, `${p.title}: ${p.summary}. ${p.evidence}.`, '33.3%', true)}</a>`).join('')}
</p>

<p align="center">
${profile.links.map(l => `  <a href="${l.url}">${xml(l.label)}</a>`).join(' &nbsp;·&nbsp;\n')}
</p>
`);

for (const [path, content] of outputs) {
  if (path.endsWith('.svg')) {
    assert(!/<script|<foreignObject|https?:\/\/(?!www\.w3\.org)/.test(content), `${path}: SVG must be self-contained`);
    assert(content.includes('prefers-reduced-motion:reduce'));
    assert(Buffer.byteLength(content) < 350000, `${path}: unexpected asset size`);
    assert(!/<text\b/.test(content), `${path}: type must use the licensed vector outlines`);
  }
  const full = resolve(root, path);
  if (check) assert(existsSync(full) && readFileSync(full, 'utf8') === content, `${path} is stale; run node .github/scripts/generate-profile.mjs`);
  else writeFileSync(full, content);
}
console.log(`${check ? 'Verified' : 'Generated'} README and ${outputs.size - 1} animated SVGs. No network, credentials, or activity counters.`);
