import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../', import.meta.url));
const profile = JSON.parse(readFileSync(resolve(root, 'data/profile.json'), 'utf8'));
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
function svg(title, width, height, body, css = '', description = 'An original animated constellation.') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${xml(title)}</title><desc id="desc">${xml(description)} Decorative motion pauses when reduced motion is preferred. Navigation is provided by the surrounding link.</desc>
<style>
text{font-family:Arial,Helvetica,sans-serif} .mono{font-family:Consolas,Menlo,monospace}
@keyframes orbit{to{transform:rotate(360deg)}}
@keyframes breathe{0%,100%{opacity:.36}50%{opacity:.8}}
@keyframes signal{to{stroke-dashoffset:-560}}
.spin{animation:orbit 55s linear infinite}.reverse{animation:orbit 88s linear infinite reverse}
.breathe{animation:breathe 8s ease-in-out infinite}.signal{animation:signal 18s linear infinite}
${css}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style>${body}</svg>\n`;
}

function daylightSky() {
  const skyline = Array.from({ length: 54 }, (_, i) => {
    const x = i * 18 - 20;
    const height = 10 + ((i * 31 + 17) % 49);
    const roof = 292 - height;
    return `<path d="M${x} 299V${roof}h${11 + i % 4}V299"/>`;
  }).join('');
  const cloud = `<path d="M-148 22C-158 1-138-18-111-15C-115-46-81-66-50-45C-36-78 14-88 38-46C61-56 97-47 100-19C143-25 170-1 158 22C184 39 165 60 119 61H-109C-164 62-182 39-148 22Z"/>`;
  return svg('Crab Satellite — daylight sky', 900, 380, `
<defs>
 <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#c7e1f1"/><stop offset=".55" stop-color="#e5eff7"/><stop offset="1" stop-color="#f6f8fb"/></linearGradient>
 <radialGradient id="sunlight"><stop stop-color="#fffaf0" stop-opacity=".94"/><stop offset=".36" stop-color="#fffaf0" stop-opacity=".54"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></radialGradient>
 <linearGradient id="cloud" x2=".15" y2="1"><stop stop-color="#ffffff"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#cfdfee"/></linearGradient>
 <linearGradient id="cloud-front" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#e8f0f8"/></linearGradient>
 <linearGradient id="mist" x2="0" y2="1"><stop stop-color="#f4f8fc" stop-opacity="0"/><stop offset="1" stop-color="#f7f9fc"/></linearGradient>
 <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>
 <filter id="far" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="8"/></filter>
 <clipPath id="frame"><rect width="900" height="380" rx="12"/></clipPath>
</defs>
<g clip-path="url(#frame)">
 <rect width="900" height="380" fill="url(#sky)"/>
 <ellipse cx="714" cy="72" rx="205" ry="155" fill="url(#sunlight)"/>
 <path d="M320 94Q522 112 773 33" fill="none" stroke="#ffffff" stroke-width="2" opacity=".45" class="trail"/>
 <g transform="translate(620 127) scale(1.25 .32)" fill="#ffffff" opacity=".54" filter="url(#far)"><g class="cloud-far">${cloud}</g></g>
 <g transform="translate(235 153) scale(1.5 .58)" fill="url(#cloud)" opacity=".8" filter="url(#soft)"><g class="cloud-slow">${cloud}</g></g>
 <g fill="#8eacc8" opacity=".18">${skyline}</g>
 <g fill="#88a6c2" opacity=".25">
  <path d="M544 299V258h14v-20h6v20h15v41M597 299v-52h18v-15h12v67M721 299v-45h20v-15h5v15h12v45M417 299v-40h29v40"/>
  <path d="M645 299v-63h7v-19h2v-11h2v11h2v19h7v63"/>
 </g>
 <g transform="translate(621 231) scale(1.35 .81)" fill="url(#cloud)" filter="url(#soft)"><g class="cloud-near">${cloud}</g></g>
 <g transform="translate(802 271) scale(1.3 .7)" fill="url(#cloud-front)" opacity=".92" filter="url(#soft)"><g class="cloud-slow">${cloud}</g></g>
 <g transform="translate(333 267) scale(1.02 .57)" fill="url(#cloud-front)" opacity=".9" filter="url(#soft)"><g class="cloud-near">${cloud}</g></g>
 <g transform="translate(95 292) scale(1.2 .72)" fill="url(#cloud-front)" opacity=".94" filter="url(#soft)"><g class="cloud-far">${cloud}</g></g>
 <rect y="270" width="900" height="110" fill="url(#mist)"/>
 <path d="M30 58V30H58M842 30H870V58M870 322V350H842M58 350H30V322" fill="none" stroke="#8ea5b9" stroke-opacity=".35"/>
 <text x="50" y="58" font-size="13" fill="#36566f" letter-spacing="2.1">CRAB SATELLITE</text>
 <text class="mono" x="50" y="333" font-size="12" fill="#314f6c" letter-spacing="1.6">EXPLORE</text>
 <path d="M124 334l9-9m-8 0h8v8" fill="none" stroke="#356c99"/>
 <text class="mono" x="850" y="333" font-size="10" fill="#536b81" text-anchor="end" letter-spacing="1.1">CRABSATELLITE.COM</text>
</g><rect x=".5" y=".5" width="899" height="379" rx="12" fill="none" stroke="#d7e0ec"/>`, `
@keyframes cloud-drift{from{transform:translateX(-16px)}to{transform:translateX(22px)}}
@keyframes cloud-drift-back{from{transform:translateX(16px)}to{transform:translateX(-12px)}}
@keyframes trail-light{0%,100%{opacity:.3}50%{opacity:.62}}
.cloud-slow{animation:cloud-drift 26s ease-in-out infinite alternate}
.cloud-far{animation:cloud-drift-back 38s ease-in-out infinite alternate}
.cloud-near{animation:cloud-drift 32s ease-in-out infinite alternate-reverse}
.trail{animation:trail-light 18s ease-in-out infinite}
`, 'A softly animated daylight sky with drifting clouds and a distant city skyline.');
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
  const x = n(random() * 900), y = n(random() * 380), r = n(.35 + random() * .85);
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
outputs.set(`assets/constellation${t.suffix}.svg`, svg('Crab Satellite — enter the constellation', 900, 380, `
<defs>
 <radialGradient id="space"><stop stop-color="${t.space}"/><stop offset="1" stop-color="${t.edge}"/></radialGradient>
 <radialGradient id="haze"><stop stop-color="${t.haze[0]}" stop-opacity=".22"/><stop offset=".52" stop-color="${t.haze[1]}" stop-opacity=".15"/><stop offset="1" stop-color="${t.haze[2]}" stop-opacity="0"/></radialGradient>
 <radialGradient id="core"><stop offset=".68" stop-color="${t.core[0]}"/><stop offset=".85" stop-color="${t.core[1]}"/><stop offset=".96" stop-color="${t.core[2]}"/><stop offset="1" stop-color="${t.core[3]}" stop-opacity="0"/></radialGradient>
 <linearGradient id="line"><stop stop-color="${t.ray[0]}" stop-opacity="0"/><stop offset=".52" stop-color="${t.ray[0]}" stop-opacity=".65"/><stop offset="1" stop-color="${t.ray[1]}" stop-opacity="0"/></linearGradient>
 <clipPath id="frame"><rect width="900" height="380" rx="12"/></clipPath>
</defs>
<g clip-path="url(#frame)">
 <rect width="900" height="380" fill="url(#space)"/>
 <g>${stars}</g>
 <ellipse cx="510" cy="190" rx="360" ry="215" fill="url(#haze)" class="breathe"/>
 <g transform="translate(515 190) rotate(-24)"><g transform="scale(1 .58)">
  <g class="spin">${wisps.join('')}${points.join('')}</g>
  <g class="reverse" fill="none" stroke="${t.orbit}" stroke-width=".7" opacity=".34">${ticks}</g>
  <ellipse rx="226" ry="226" fill="none" stroke="${t.ring}" opacity=".17"/>
  <circle r="226" fill="none" stroke="${t.signal}" stroke-width="2" stroke-dasharray="10 550" class="signal"/>
 </g></g>
 <circle cx="515" cy="190" r="37" fill="url(#core)"/>
 <circle cx="515" cy="190" r="29" fill="${t.core[0]}"/>
 <path d="M170 240Q530 85 827 182" fill="none" stroke="url(#line)" stroke-width=".8"/>
 <g transform="translate(714 91) rotate(-24)" fill="none" stroke="${t.satellite}" stroke-width="1.2">
  <path d="M-14-3h10v6h-10zm18 0h10v6H4zM-4 0H4M0-7V7M-3-5h6v10H-3z"/>
  <circle r="21" stroke-opacity=".16"/>
 </g>
 <path d="M30 58V30H58M842 30H870V58M870 322V350H842M58 350H30V322" fill="none" stroke="${t.corner}" stroke-opacity=".4"/>
 <text x="50" y="58" font-size="13" fill="${t.name}" letter-spacing="2.1">CRAB SATELLITE</text>
 <text class="mono" x="50" y="333" font-size="12" fill="${t.cta}" letter-spacing="1.6">EXPLORE</text>
 <path d="M124 334l9-9m-8 0h8v8" fill="none" stroke="${t.arrow}"/>
 <text class="mono" x="850" y="333" font-size="10" fill="${t.caption}" text-anchor="end" letter-spacing="1.1">CRABSATELLITE.COM</text>
</g><rect x=".5" y=".5" width="899" height="379" rx="12" fill="none" stroke="${t.border}"/>`));
} else {
  outputs.set('assets/sky.svg', daylightSky());
}

profile.portals.forEach((p, i) => {
  const accent = theme === 'dark' ? p.color : p.lightColor;
  assert(/^#[\da-f]{6}$/i.test(accent), `Missing ${theme} accent for ${p.id}`);
  const graphic = i === 0
    ? `<g transform="translate(595 53)"><g class="spin" fill="none" stroke="${accent}" stroke-width=".75"><ellipse rx="44" ry="15"/><ellipse rx="44" ry="15" transform="rotate(60)"/><ellipse rx="44" ry="15" transform="rotate(120)"/></g><circle r="3" fill="${accent}"/></g>`
    : i === 1
      ? `<g fill="none" stroke="${accent}" opacity=".7"><path d="m563 37-16 15 16 15m57-30 16 15-16 15m-35 10 11-50"/><path d="M530 83h126" opacity=".16"/><path d="M530 83h126" stroke-dasharray="12 114" class="signal"/></g>`
      : `<g transform="translate(595 52)"><g class="reverse" fill="none" stroke="${accent}" stroke-width=".8"><path d="M0-33 29-16 29 16 0 33-29 16-29-16Z"/><path d="M0-21 18-10 18 10 0 21-18 10-18-10Z" opacity=".35"/></g><circle r="3" fill="${accent}"/></g>`;
  outputs.set(`assets/portal-${p.id}${t.suffix}.svg`, svg(`${p.title} — ${p.site}`, 900, 104, `
<defs><linearGradient id="bg"><stop stop-color="${t.card[0]}"/><stop offset="1" stop-color="${t.card[1]}"/></linearGradient></defs>
<rect x=".5" y=".5" width="899" height="103" rx="9" fill="url(#bg)" stroke="${t.cardBorder}"/>
<path d="M24 32V72" stroke="${accent}" opacity=".7"/>
<text class="mono" x="42" y="58" font-size="13" fill="${accent}">0${i+1}</text>
<text x="88" y="64" font-size="30" fill="${t.cardTitle}" letter-spacing=".3">${xml(p.title)}</text>
${graphic}
<text class="mono" x="830" y="58" font-size="14" text-anchor="end" fill="${t.cardMeta}">${xml(p.site)}</text>
<path d="M852 59l12-12m-11 0h11v11" stroke="${accent}" stroke-width="1.3" fill="none"/>`));
});
}

function picture(asset, alt, lightAsset = `${asset}-light`) {
  return `<picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/${asset}.svg" />
    <source media="(prefers-color-scheme: light)" srcset="./assets/${lightAsset}.svg" />
    <img src="./assets/${lightAsset}.svg" width="100%" alt="${xml(alt)}" />
  </picture>`;
}

outputs.set('README.md', `<!-- Generated by .github/scripts/generate-profile.mjs from data/profile.json. -->
<a href="${profile.site}">
  ${picture('constellation', `${profile.name} — Crab Satellite. Explore research, open source and AI governance.`, 'sky')}
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
    assert(Buffer.byteLength(content) < 200000, `${path}: unexpected asset size`);
  }
  const full = resolve(root, path);
  if (check) assert(existsSync(full) && readFileSync(full, 'utf8') === content, `${path} is stale; run node .github/scripts/generate-profile.mjs`);
  else writeFileSync(full, content);
}
console.log(`${check ? 'Verified' : 'Generated'} README and ${outputs.size - 1} animated SVGs. No network, credentials, or activity counters.`);
