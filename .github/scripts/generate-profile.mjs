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
let seed = 848;
const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
for (const url of [profile.site, profile.linkedin, profile.modporter, ...profile.portals.map(p => p.url)]) {
  assert.equal(new URL(url).protocol, 'https:');
}
assert.deepEqual(profile.portals.map(p => p.id), ['research', 'opensource', 'governance']);
const outputs = new Map();
function outlineText(source) {
  return source.replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (_, attrs, encoded) => {
    const a = Object.fromEntries([...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const text = encoded.replace(/&(?:amp|lt|gt|quot|apos);/g, e => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[e]);
    const font = typography[a['data-font'] || 'sans'];
    const scale = Number(a['font-size'] || 16) / font.units;
    const spacing = Number(a['letter-spacing'] || 0) / scale;
    let advance = 0;
    const paths = [...text].map((char, i) => {
      const glyph = font.glyphs[char];
      assert(glyph, `Add font outline for ${char}`);
      const path = glyph.path ? `<path transform="translate(${n(advance)} 0)" d="${glyph.path}"/>` : '';
      advance += glyph.advance + (font.kern[char + text[i + 1]] || 0) + (i === text.length - 1 ? 0 : spacing);
      return path;
    }).join('');
    const x = Number(a.x || 0) - (a['text-anchor'] === 'end' ? advance * scale : a['text-anchor'] === 'middle' ? advance * scale / 2 : 0);
    return `<g aria-label="${xml(text)}" fill="${a.fill || '#000000'}" transform="translate(${n(x)} ${Number(a.y || 0)}) scale(${scale} ${-scale})">${paths}</g>`;
  });
}
function svg(title, width, height, body, css = '', description = 'An original animated constellation.') {
  return outlineText(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${xml(title)}</title><desc id="desc">${xml(description)} Decorative motion pauses when reduced motion is preferred. Navigation is provided by the surrounding link.</desc>
<style>
@keyframes orbit{to{transform:rotate(360deg)}}
@keyframes breathe{0%,100%{opacity:.36}50%{opacity:.8}}
@keyframes signal{to{stroke-dashoffset:-560}}
@keyframes invite{0%,60%,100%{transform:translate(0,0)}75%{transform:translate(2px,-2px)}}
.spin{animation:orbit 55s linear infinite}.reverse{animation:orbit 88s linear infinite reverse}
.breathe{animation:breathe 8s ease-in-out infinite}.signal{animation:signal 18s linear infinite}
.entry-arrow{animation:invite 3.4s ease-in-out infinite}
${css}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style>${body}</svg>\n`);
}

function coverNavigation(dark = false) {
  return `<text x="44" y="58" font-size="32" data-font="serif" fill="${dark ? '#e6edf5' : '#29484b'}">${xml(profile.name)}</text>
 <text x="46" y="80" font-size="8.5" fill="${dark ? '#9baabe' : '#77817b'}" letter-spacing="2">CRAB SATELLITE</text>
 <g>
  <rect x="44" y="224" width="218" height="44" rx="22" fill="${dark ? '#15222f' : '#fbfaf6'}" stroke="${dark ? '#5f7185' : '#c9cdc1'}" stroke-width=".7"/>
  <text x="63" y="251" font-size="15" fill="${dark ? '#e8f0f9' : '#29484b'}">Explore my work</text>
  <circle cx="240" cy="246" r="15.5" fill="${dark ? '#cadce9' : '#b34b35'}"/>
  <g class="entry-arrow"><path d="M235 251l10-10m-9 0h9v9" fill="none" stroke="${dark ? '#1a303f' : '#fbf8f0'}" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/></g>
 </g>
 <text x="852" y="264" font-size="8.5" fill="${dark ? '#98a8ba' : '#7b8275'}" text-anchor="end" letter-spacing="1.3">CRABSATELLITE.COM</text>`;
}

function shoreline() {
  // Each leg has one fixed body attachment and a lower segment hinged at its knee.
  const legPairs = [
    { hip: [22, 20], knee: [12, 16], foot: [5, 21] },
    { hip: [21, 24], knee: [10, 24], foot: [4, 31] },
    { hip: [22, 28], knee: [12, 32], foot: [8, 41] },
    { hip: [25, 30], knee: [19, 38], foot: [16, 46] },
  ];
  const legs = [false, true].map(mirror => legPairs.map(({ hip, knee, foot }, i) => {
    const point = ([x, y]) => [mirror ? 64 - x : x, y];
    const [hx, hy] = point(hip), [kx, ky] = point(knee), [fx, fy] = point(foot);
    const phase = (i + Number(mirror)) % 2 ? 'a' : 'b';
    return `<g class="crab-leg" transform="translate(${hx} ${hy})"><g class="crab-step-${phase}">
     <path d="M0 0L${kx-hx} ${ky-hy}"/>
     <g transform="translate(${kx-hx} ${ky-hy})"><g class="crab-shin-${phase}"><path d="M0 0L${fx-kx} ${fy-ky}"/></g></g>
    </g></g>`;
  }).join('')).join('');
  const claw = '<path d="M0 0Q-7-2-7-8L-6-12L-2-7L2-10Q6-4 0 0"/>';
  const mark = `<g fill="none" stroke="#B34B35" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  ${legs}
  <path d="M23 18Q18 14 13 12M41 18Q46 14 51 12M25 16 23 8M39 16 41 8"/>
  <g transform="translate(13 12)"><g class="crab-claw">${claw}</g></g>
  <g transform="translate(51 12) scale(-1 1)">${claw}</g>
 </g><path d="M19 24c0-7 6-11 13-11s13 4 13 11v6c-4 6-22 6-26 0v-6Z" fill="#B34B35"/>`;
  return svg('Alex Chengyu Li — a quiet shore', 900, 300, `
<defs>
 <clipPath id="frame"><rect width="900" height="300" rx="8"/></clipPath>
 <clipPath id="sea-area"><path d="M-30 144C176 146 306 125 487 137S737 163 930 147V300H-30Z"/></clipPath>
 <pattern id="paper" width="37" height="29" patternUnits="userSpaceOnUse"><path d="M3 5h.3m16 8h.4m12 12h.3m-24 2h.4" stroke="#6c7c73" stroke-width=".5" opacity=".07"/></pattern>
</defs>
<g clip-path="url(#frame)">
 <rect width="900" height="300" fill="#f7f5ed"/>
 <g class="cloud-drift" fill="#fcfbf7" stroke="#a2b8b6" stroke-width=".65" stroke-linecap="round">
  <path d="M553 84h127c9 0 10-9 3-12-3-1-8-1-12 1-1-10-18-14-26-6-4-15-25-16-33-1-9-6-21-2-23 7h-36"/>
  <path d="M730 98h74c8 0 8-9 0-10-4-9-18-10-24-2-8-5-17-1-19 5h-31"/>
 </g>
 <path d="M-30 144C176 146 306 125 487 137S737 163 930 147V300H-30Z" fill="#cbdddd"/>
 <g clip-path="url(#sea-area)">
  <path d="M-30 169C161 171 294 147 473 154S734 185 930 167V300H-30Z" fill="#b6ced0" opacity=".55" class="sea-breath"/>
  <g fill="none" stroke="#789da3" stroke-width=".85" stroke-linecap="round" class="wave-far">
   <path d="M-40 157C96 159 183 144 314 143M376 145C551 146 619 175 772 166M811 162l119-9"/>
   <path d="M18 180c71-1 120-10 185-13m89-3c87-3 134-3 225 13m80 12c107 10 195-4 317-17" opacity=".54"/>
  </g>
  <g fill="none" stroke="#f7faf3" stroke-width="1.35" stroke-linecap="round" class="wave-near">
   <path d="M-40 179c158 8 271-24 420-17s284 48 550 8"/>
   <path d="M89 201c49 0 73-6 115-8m244-9c77 3 130 21 197 24" opacity=".8"/>
  </g>
 </g>
 <path d="M-30 206C128 234 217 221 345 195S566 179 670 198S835 213 930 191V320H-30Z" fill="#faf8f0" stroke="#fdfcf7" stroke-width="4" class="shore-wash"/>
 <path d="M340 215c101-26 185-31 280-9" fill="none" stroke="#c6c9b9" stroke-width=".65"/>
 <g fill="none" stroke="#bdbaa8" stroke-linecap="round" stroke-width=".85" opacity=".8">
  <path d="m502 241 2-1m6 5 2-1m13-5 2-1m7 5 2-1m15-5 2-1m6 5 2-1m14-5 2-1m6 5 2-1"/>
  <path d="m788 230 2 0m-36 23 2 0m-400-5 2 0"/>
 </g>
 <g class="crab-stroll" transform="translate(645 213)">
  <ellipse cx="0" cy="25" rx="18" ry="2.5" fill="#858c79" opacity=".1"/>
  <g transform="translate(-27 -12) scale(.84)">${mark}</g>
 </g>
 <rect width="900" height="300" fill="url(#paper)"/>
 ${coverNavigation()}
</g><rect x=".5" y=".5" width="899" height="299" rx="8" fill="none" stroke="#d8ded1" stroke-width=".7"/>`, `
@keyframes cloud-float{from{transform:translateX(-7px)}to{transform:translateX(11px)}}
@keyframes swell-far{from{transform:translate(-12px,-1px)}to{transform:translate(12px,1px)}}
@keyframes swell-near{from{transform:translate(9px,1px)}to{transform:translate(-11px,-1px)}}
@keyframes shore-wash{from{transform:translateY(-1.2px)}to{transform:translateY(1.4px)}}
@keyframes stroll{0%,100%{transform:translate(704px,219px)}50%{transform:translate(576px,212px)}}
@keyframes quiet-step{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
@keyframes quiet-shin{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
@keyframes quiet-claw{0%,34%,65%,100%{transform:rotate(0)}45%,52%{transform:rotate(-11deg)}}
.cloud-drift{animation:cloud-float 19s ease-in-out infinite alternate}
.wave-far,.sea-breath{animation:swell-far 11s ease-in-out infinite alternate}
.wave-near{animation:swell-near 8s ease-in-out infinite alternate}
.shore-wash{animation:shore-wash 8s ease-in-out infinite alternate}
.crab-stroll{animation:stroll 19s ease-in-out infinite}
.crab-step-a{animation:quiet-step .65s ease-in-out infinite alternate;transform-origin:0 0}
.crab-step-b{animation:quiet-step .65s ease-in-out infinite alternate-reverse;transform-origin:0 0}
.crab-shin-a{animation:quiet-shin .65s ease-in-out infinite alternate-reverse;transform-origin:0 0}
.crab-shin-b{animation:quiet-shin .65s ease-in-out infinite alternate;transform-origin:0 0}
.crab-claw{animation:quiet-claw 19s ease-in-out infinite;transform-origin:0 0}
`, 'A minimal coastal illustration in paper white, muted blue-grey and vermilion. Fine waves flow past a small walking crab derived from the Crab Research mark. Click the cover to open the website.');
}

const themes = {
  dark: {
    suffix: '', space: '#12203d', edge: '#060a12', haze: ['#7b53c5', '#3e76d3', '#172451'],
    core: ['#030711', '#0d1630', '#587da2', '#aecfeb'], stars: ['#a6bfe5', '#ddb1e7'],
    particles: ['#5484ff', '#7391ff', '#96a5ff', '#4879d2', '#ae5ecc', '#6accfa'],
    orbit: '#9cbedc', ring: '#7c9bb9', signal: '#b2e2f5', ray: ['#86cfff', '#ae6eca'],
    satellite: '#f0c18b', corner: '#738ba4', name: '#a8b9cc', title: '#f0f5fd',
    rule: '#89bde9', cta: '#c9d7e8', arrow: '#a9d7f5', meta: '#7f97b2', caption: '#6e88a8',
    border: '#26344a', card: ['#0b1321', '#090f18'], cardBorder: '#28344a',
    cardTitle: '#e4ebf5', cardMeta: '#9daec3',
  },
  light: {
    suffix: '-light', card: ['#f5f8fc', '#ffffff'], cardBorder: '#d8e1ec',
    cardTitle: '#23364d', cardMeta: '#4d6378',
  },
};

for (const [theme, t] of Object.entries(themes)) {
if (theme === 'dark') {
seed = 848;
const stars = Array.from({ length: 150 }, (_, i) => {
  const x = n(random() * 900), y = n(random() * 300), r = n(.35 + random() * .85);
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${t.stars[i % 5 ? 0 : 1]}" opacity="${n(.15 + random() * .4)}"/>`;
}).join('');
const colors = t.particles;
const points = [], wisps = [];
for (let arm = 0; arm < 4; arm++) {
  for (let i = 0; i < 420; i++) {
    const r = 52 + Math.pow(random(), .7) * 284;
    const a = arm * Math.PI / 2 + r * .016 + (random() - .5) * (.18 + r * .0019);
    const x = n(Math.cos(a) * r), y = n(Math.sin(a) * r);
    points.push(`<circle cx="${x}" cy="${y}" r="${n(.5 + random() * 1.6)}" fill="${colors[(i + arm) % colors.length]}" opacity="${n(.22 + random() * .68)}"/>`);
  }
  for (let strand = 0; strand < 3; strand++) {
    let d = '';
    for (let i = 0; i < 90; i++) {
      const r = 55 + i * 3.2;
      const a = arm * Math.PI / 2 + r * .016 + strand * .09;
      d += `${i ? 'L' : 'M'}${n(Math.cos(a) * r)} ${n(Math.sin(a) * r)} `;
    }
    wisps.push(`<path d="${d}" fill="none" stroke="${colors[(arm + strand) % colors.length]}" stroke-width="${strand ? .55 : 2.8}" opacity="${strand ? .22 : .12}"/>`);
  }
}
const ticks = Array.from({ length: 80 }, (_, i) => {
  const a = i * Math.PI / 40, r = i % 5 ? 174 : 170;
  return `<path d="M${n(Math.cos(a)*r)} ${n(Math.sin(a)*r)}L${n(Math.cos(a)*178)} ${n(Math.sin(a)*178)}"/>`;
}).join('');
outputs.set(`assets/constellation${t.suffix}.svg`, svg('Crab Satellite — enter the constellation', 900, 300, `
<defs>
 <radialGradient id="space"><stop stop-color="${t.space}"/><stop offset="1" stop-color="${t.edge}"/></radialGradient>
 <radialGradient id="haze"><stop stop-color="${t.haze[0]}" stop-opacity=".22"/><stop offset=".52" stop-color="${t.haze[1]}" stop-opacity=".15"/><stop offset="1" stop-color="${t.haze[2]}" stop-opacity="0"/></radialGradient>
 <radialGradient id="core"><stop offset=".68" stop-color="${t.core[0]}"/><stop offset=".85" stop-color="${t.core[1]}"/><stop offset=".96" stop-color="${t.core[2]}"/><stop offset="1" stop-color="${t.core[3]}" stop-opacity="0"/></radialGradient>
 <linearGradient id="line"><stop stop-color="${t.ray[0]}" stop-opacity="0"/><stop offset=".52" stop-color="${t.ray[0]}" stop-opacity=".65"/><stop offset="1" stop-color="${t.ray[1]}" stop-opacity="0"/></linearGradient>
 <clipPath id="frame"><rect width="900" height="300" rx="12"/></clipPath>
</defs>
<g clip-path="url(#frame)">
 <rect width="900" height="300" fill="url(#space)"/>
 <g>${stars}</g>
 <ellipse cx="510" cy="150" rx="360" ry="215" fill="url(#haze)" class="breathe"/>
 <g transform="translate(515 150) rotate(-24)"><g transform="scale(1 .58)">
  <g class="spin">${wisps.join('')}${points.join('')}</g>
  <g class="reverse" fill="none" stroke="${t.orbit}" stroke-width=".7" opacity=".34">${ticks}</g>
  <ellipse rx="226" ry="226" fill="none" stroke="${t.ring}" opacity=".17"/>
  <circle r="226" fill="none" stroke="${t.signal}" stroke-width="2" stroke-dasharray="10 550" class="signal"/>
 </g></g>
 <circle cx="515" cy="150" r="37" fill="url(#core)"/>
 <circle cx="515" cy="150" r="29" fill="${t.core[0]}"/>
 <path d="M170 200Q530 45 827 142" fill="none" stroke="url(#line)" stroke-width=".8"/>
 <g transform="translate(714 61) rotate(-24)" fill="none" stroke="${t.satellite}" stroke-width="1.2">
  <path d="M-14-3h10v6h-10zm18 0h10v6H4zM-4 0H4M0-7V7M-3-5h6v10H-3z"/>
  <circle r="21" stroke-opacity=".16"/>
 </g>
 <path d="M30 58V30H58M842 30H870V58M870 242V270H842M58 270H30V242" fill="none" stroke="${t.corner}" stroke-opacity=".4"/>
 ${coverNavigation(true)}
</g><rect x=".5" y=".5" width="899" height="299" rx="12" fill="none" stroke="${t.border}"/>`));
} else {
  outputs.set('assets/shoreline.svg', shoreline());
}

profile.portals.forEach((p, i) => {
  const accent = theme === 'dark' ? p.color : p.lightColor;
  assert(/^#[\da-f]{6}$/i.test(accent), `Missing ${theme} accent for ${p.id}`);
  outputs.set(`assets/portal-${p.id}${t.suffix}.svg`, svg(`${p.title} — ${p.site}`, 900, 84, `
<defs><linearGradient id="bg"><stop stop-color="${t.card[0]}"/><stop offset="1" stop-color="${t.card[1]}"/></linearGradient></defs>
<rect x=".5" y=".5" width="899" height="83" rx="6" fill="url(#bg)" stroke="${t.cardBorder}" stroke-width=".7"/>
<text x="30" y="47" font-size="10" fill="${accent}" letter-spacing="1.3">0${i+1}</text>
<text x="76" y="51" font-size="25" fill="${t.cardTitle}">${xml(p.title)}</text>
<path d="M76 65H115" stroke="${accent}" stroke-width=".7" opacity=".6"/>
<text x="797" y="47" font-size="12" text-anchor="end" fill="${t.cardMeta}" letter-spacing=".2">${xml(p.site)}</text>
<circle cx="853" cy="42" r="18" fill="none" stroke="${t.cardBorder}" stroke-width=".8"/>
<path d="M848 47l10-10m-9 0h9v9" stroke="${t.cardMeta}" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`));
});
}

function picture(asset, alt, lightAsset = `${asset}-light`) {
  const url = name => {
    const path = `assets/${name}.svg`;
    const content = outputs.get(path);
    assert(content, `Missing picture source: ${path}`);
    return `./${path}?v=${createHash('sha256').update(content).digest('hex').slice(0, 12)}`;
  };
  return `<picture>
    <source media="(prefers-color-scheme: dark)" srcset="${url(asset)}" />
    <source media="(prefers-color-scheme: light)" srcset="${url(lightAsset)}" />
    <img src="${url(lightAsset)}" width="100%" alt="${xml(alt)}" />
  </picture>`;
}

outputs.set('README.md', `<!-- Generated by .github/scripts/generate-profile.mjs from data/profile.json. -->
<a href="${profile.site}">
  ${picture('constellation', `${profile.name} — Crab Satellite. Open the personal website to explore research, open source and AI governance.`, 'shoreline')}
</a>

${profile.portals.map(p => `<a href="${p.url}">\n  ${picture(`portal-${p.id}`, `${p.title} — ${p.site}`)}\n</a>`).join('\n\n')}

<p align="center">
  <a href="${profile.site}">Crab Satellite</a> &nbsp; · &nbsp;
  <a href="${profile.linkedin}">LinkedIn</a> &nbsp; · &nbsp;
  <a href="${profile.modporter}">ModPorter</a>
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
