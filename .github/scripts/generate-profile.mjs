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
function svg(title, width, height, body, css = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${xml(title)}</title><desc id="desc">An original animated constellation. Decorative motion pauses when reduced motion is preferred. Navigation is provided by the surrounding link.</desc>
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

const stars = Array.from({ length: 150 }, (_, i) => {
  const x = n(random() * 900), y = n(random() * 380), r = n(.35 + random() * .85);
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 5 ? '#a6bfe5' : '#ddb1e7'}" opacity="${n(.15 + random() * .4)}"/>`;
}).join('');
const colors = ['#5484ff', '#7391ff', '#96a5ff', '#4879d2', '#ae5ecc', '#6accfa'];
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
outputs.set('assets/constellation.svg', svg('Crab Satellite — enter the constellation', 900, 380, `
<defs>
 <radialGradient id="space"><stop stop-color="#12203d"/><stop offset="1" stop-color="#060a12"/></radialGradient>
 <radialGradient id="haze"><stop stop-color="#7b53c5" stop-opacity=".22"/><stop offset=".52" stop-color="#3e76d3" stop-opacity=".15"/><stop offset="1" stop-color="#172451" stop-opacity="0"/></radialGradient>
 <radialGradient id="core"><stop offset=".68" stop-color="#030711"/><stop offset=".85" stop-color="#0d1630"/><stop offset=".96" stop-color="#587da2"/><stop offset="1" stop-color="#aecfeb" stop-opacity="0"/></radialGradient>
 <linearGradient id="fade"><stop offset=".03" stop-color="#060a12"/><stop offset=".42" stop-color="#060a12" stop-opacity=".95"/><stop offset=".65" stop-color="#060a12" stop-opacity="0"/></linearGradient>
 <linearGradient id="line"><stop stop-color="#86cfff" stop-opacity="0"/><stop offset=".52" stop-color="#86cfff" stop-opacity=".65"/><stop offset="1" stop-color="#ae6eca" stop-opacity="0"/></linearGradient>
 <clipPath id="frame"><rect width="900" height="380" rx="12"/></clipPath>
</defs>
<g clip-path="url(#frame)">
 <rect width="900" height="380" fill="url(#space)"/>
 <g>${stars}</g>
 <ellipse cx="662" cy="202" rx="340" ry="205" fill="url(#haze)" class="breathe"/>
 <g transform="translate(667 198) rotate(-24)"><g transform="scale(1 .58)">
  <g class="spin">${wisps.join('')}${points.join('')}</g>
  <g class="reverse" fill="none" stroke="#9cbedc" stroke-width=".7" opacity=".34">${ticks}</g>
  <ellipse rx="226" ry="226" fill="none" stroke="#7c9bb9" opacity=".17"/>
  <circle r="226" fill="none" stroke="#b2e2f5" stroke-width="2" stroke-dasharray="10 550" class="signal"/>
 </g></g>
 <circle cx="667" cy="198" r="37" fill="url(#core)"/>
 <circle cx="667" cy="198" r="29" fill="#030711"/>
 <path d="M367 235Q670 93 902 191" fill="none" stroke="url(#line)" stroke-width=".8"/>
 <g transform="translate(816 108) rotate(-24)" fill="none" stroke="#f0c18b" stroke-width="1.2">
  <path d="M-14-3h10v6h-10zm18 0h10v6H4zM-4 0H4M0-7V7M-3-5h6v10H-3z"/>
  <circle r="21" stroke-opacity=".16"/>
 </g>
 <rect width="900" height="380" fill="url(#fade)"/>
 <path d="M30 58V30H58M842 30H870V58M870 322V350H842M58 350H30V322" fill="none" stroke="#738ba4" stroke-opacity=".4"/>
 <text x="50" y="59" font-size="12" fill="#a8b9cc" letter-spacing="1.1">${xml(profile.name)}</text>
 <text x="48" y="148" font-size="57" font-weight="300" fill="#f0f5fd" letter-spacing="3">CRAB</text>
 <text x="48" y="211" font-size="57" font-weight="300" fill="#f0f5fd" letter-spacing="3">SATELLITE</text>
 <path d="M50 243H107" stroke="#89bde9" stroke-width="1"/>
 <text class="mono" x="50" y="281" font-size="12" fill="#c9d7e8" letter-spacing="1.4">ENTER THE CONSTELLATION</text>
 <path d="M285 277h11m-5-5 5 5-5 5" fill="none" stroke="#a9d7f5"/>
 <text class="mono" x="50" y="333" font-size="10" fill="#7f97b2" letter-spacing="1.1">CRABSATELLITE.COM</text>
 <text class="mono" x="850" y="333" font-size="9" fill="#6e88a8" text-anchor="end" letter-spacing="1.4">RESEARCH / CODE / SYSTEMS</text>
</g><rect x=".5" y=".5" width="899" height="379" rx="12" fill="none" stroke="#26344a"/>`));

profile.portals.forEach((p, i) => {
  const graphic = i === 0
    ? `<g transform="translate(595 53)"><g class="spin" fill="none" stroke="${p.color}" stroke-width=".75"><ellipse rx="44" ry="15"/><ellipse rx="44" ry="15" transform="rotate(60)"/><ellipse rx="44" ry="15" transform="rotate(120)"/></g><circle r="3" fill="${p.color}"/></g>`
    : i === 1
      ? `<g fill="none" stroke="${p.color}" opacity=".7"><path d="m563 37-16 15 16 15m57-30 16 15-16 15m-35 10 11-50"/><path d="M530 83h126" opacity=".16"/><path d="M530 83h126" stroke-dasharray="12 114" class="signal"/></g>`
      : `<g transform="translate(595 52)"><g class="reverse" fill="none" stroke="${p.color}" stroke-width=".8"><path d="M0-33 29-16 29 16 0 33-29 16-29-16Z"/><path d="M0-21 18-10 18 10 0 21-18 10-18-10Z" opacity=".35"/></g><circle r="3" fill="${p.color}"/></g>`;
  outputs.set(`assets/portal-${p.id}.svg`, svg(`${p.title} — ${p.site}`, 900, 104, `
<defs><linearGradient id="bg"><stop stop-color="#0b1321"/><stop offset="1" stop-color="#090f18"/></linearGradient></defs>
<rect x=".5" y=".5" width="899" height="103" rx="9" fill="url(#bg)" stroke="#28344a"/>
<path d="M24 32V72" stroke="${p.color}" opacity=".7"/>
<text class="mono" x="42" y="58" font-size="13" fill="${p.color}">0${i+1}</text>
<text x="88" y="64" font-size="30" fill="#e4ebf5" letter-spacing=".3">${xml(p.title)}</text>
${graphic}
<text class="mono" x="830" y="58" font-size="14" text-anchor="end" fill="#9daec3">${xml(p.site)}</text>
<path d="M852 59l12-12m-11 0h11v11" stroke="${p.color}" stroke-width="1.3" fill="none"/>`));
});

outputs.set('README.md', `<!-- Generated by .github/scripts/generate-profile.mjs from data/profile.json. -->
<a href="${profile.site}">
  <img src="./assets/constellation.svg" width="100%" alt="Alex Chengyu Li — Crab Satellite. Enter the animated constellation." />
</a>

${profile.portals.map(p => `<a href="${p.url}"><img src="./assets/portal-${p.id}.svg" width="100%" alt="${p.title} — ${p.site}" /></a>`).join('\n\n')}

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
