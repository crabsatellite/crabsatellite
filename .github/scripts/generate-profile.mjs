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
@keyframes invite{0%,60%,100%{transform:translate(0,0)}75%{transform:translate(2px,-2px)}}
.spin{animation:orbit 55s linear infinite}.reverse{animation:orbit 88s linear infinite reverse}
.breathe{animation:breathe 8s ease-in-out infinite}.signal{animation:signal 18s linear infinite}
.entry-arrow{animation:invite 3.4s ease-in-out infinite}
${css}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style>${body}</svg>\n`;
}

function coverNavigation(dark = false) {
  return `<text x="50" y="58" font-size="22" fill="${dark ? '#dce8f5' : '#244b63'}" letter-spacing=".4">${xml(profile.name)}</text>
 <g>
  <rect x="50" y="301" width="248" height="48" rx="9" fill="${dark ? '#142739' : '#ffffff'}" fill-opacity=".96" stroke="${dark ? '#6897b8' : '#8eb0c3'}" stroke-width="1.2"/>
  <text x="70" y="331" font-size="18" fill="${dark ? '#edf5ff' : '#23475c'}">Explore my work</text>
  <g class="entry-arrow"><path d="M262 332l13-13m-12 0h12v12" fill="none" stroke="${dark ? '#a6d5f3' : '#326a8b'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>
 </g>
 <text class="mono" x="850" y="341" font-size="10" fill="${dark ? '#8ca6c1' : '#796c58'}" text-anchor="end" letter-spacing="1.1">CRABSATELLITE.COM</text>`;
}

function daylightBeach() {
  const cloud = `<path d="M-148 22C-158 1-138-18-111-15C-115-46-81-66-50-45C-36-78 14-88 38-46C61-56 97-47 100-19C143-25 170-1 158 22C184 39 165 60 119 61H-109C-164 62-182 39-148 22Z"/>`;
  const grains = Array.from({ length: 115 }, (_, i) => {
    const x = 20 + (i * 113 % 866), y = 283 + (i * 47 % 91);
    return `<circle cx="${x}" cy="${y}" r="${i % 3 ? '.6' : '1'}" fill="#ac9473" opacity="${i % 3 ? '.14' : '.19'}"/>`;
  }).join('');
  const tracks = Array.from({ length: 16 }, (_, i) => `<path d="m${427+i*21} ${326+i%3}-3 2m6 4-3 2"/>`).join('');
  const legs = [-1, 1].map(side => Array.from({ length: 4 }, (_, i) => {
    const x = side * (16 + i % 2 * 3), y = -3 + i * 5;
    return `<g class="leg-${(i + (side > 0 ? 1 : 0)) % 2 ? 'a' : 'b'}"><path d="M${x} ${y}L${side*(31+i*2)} ${y+5}L${side*(43-i*2)} ${y+16}"/></g>`;
  }).join('')).join('');
  const claw = `<path d="M-4 8C-15 4-13-9-5-13L-1-3L4-13C13-7 12 5 4 9Z" fill="url(#shell)" stroke="#b84435" stroke-width="1.2"/>`;
  return svg('Alex Chengyu Li — explore my work', 900, 380, `
<defs>
 <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#c4e2f3"/><stop offset=".7" stop-color="#edf5f8"/><stop offset="1" stop-color="#f6f8f8"/></linearGradient>
 <radialGradient id="sunlight"><stop stop-color="#fff9df" stop-opacity=".95"/><stop offset=".42" stop-color="#fffaf0" stop-opacity=".55"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></radialGradient>
 <linearGradient id="cloud" x2=".15" y2="1"><stop stop-color="#ffffff"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#d6e6f0"/></linearGradient>
 <linearGradient id="water" x2="0" y2="1"><stop stop-color="#8fbecb"/><stop offset="1" stop-color="#c8e4d9"/></linearGradient>
 <linearGradient id="sand" x2=".25" y2="1"><stop stop-color="#e5ceb0"/><stop offset=".4" stop-color="#f0dfc4"/><stop offset="1" stop-color="#faf1e1"/></linearGradient>
 <linearGradient id="shell" x2=".25" y2="1"><stop stop-color="#ee805f"/><stop offset=".55" stop-color="#e36149"/><stop offset="1" stop-color="#c94639"/></linearGradient>
 <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.8"/></filter>
 <filter id="far" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>
 <clipPath id="frame"><rect width="900" height="380" rx="12"/></clipPath>
</defs>
<g clip-path="url(#frame)">
 <rect width="900" height="380" fill="url(#sky)"/>
 <ellipse cx="710" cy="75" rx="158" ry="132" fill="url(#sunlight)"/>
 <circle cx="710" cy="75" r="23" fill="#edc584" opacity=".86"/>
 <g transform="translate(710 75) rotate(-18)" fill="none" stroke="#b99d78" stroke-width=".8">
  <ellipse rx="61" ry="38" opacity=".22"/><path d="M-79 0H-72M72 0H79M0-53V-47M0 47V53" opacity=".38"/>
 </g>
 <g transform="translate(570 82) scale(1.1 .23)" fill="#ffffff" opacity=".64" filter="url(#far)"><g class="cloud-far">${cloud}</g></g>
 <g transform="translate(218 132) scale(1.32 .35)" fill="url(#cloud)" opacity=".78" filter="url(#soft)"><g class="cloud-slow">${cloud}</g></g>
 <g transform="translate(774 158) scale(1.13 .38)" fill="url(#cloud)" opacity=".9" filter="url(#soft)"><g class="cloud-near">${cloud}</g></g>
 <path d="M0 191Q250 185 476 191T900 190V307H0Z" fill="url(#water)"/>
 <path d="M0 193Q240 188 475 194T900 193" fill="none" stroke="#eaf5f4" stroke-width="2"/>
 <g fill="none" stroke="#f6fcfa" stroke-linecap="round" class="water-glint">
  <path d="M65 215h76m38 9h102m134-13h112m76 13h101m43-12h75" opacity=".56"/>
  <path d="M20 239h49m245-6h78m-2 15h89m70-7h131m104-6h90" opacity=".48"/>
 </g>
 <g class="tide">
  <path d="M-20 273C126 265 220 291 344 267S571 205 702 220S854 249 924 241V394H-20Z" fill="#f6faf0"/>
  <path d="M-20 281C126 273 220 299 344 275S571 213 702 228S854 257 924 249V394H-20Z" fill="url(#sand)"/>
 </g>
 <path d="M316 309C456 299 520 246 658 251" fill="none" stroke="#fff8e9" stroke-width="1.8" opacity=".58"/>
 ${grains}
 <g stroke="#987650" stroke-width="1.8" stroke-linecap="round" opacity=".2" class="tracks">${tracks}</g>
 <g transform="translate(824 312) rotate(13)" fill="none" stroke="#bca084" stroke-linecap="round" opacity=".58">
  <path d="M-9 5Q-16-9-3-11Q10-17 13-3L5 8Z" fill="#f8eddb"/>
  <path d="M0 5-5-8m8 13 3-13m-9 14-6-9m13 9 5-8" stroke-width=".8"/>
 </g>
 <g class="crab-travel" transform="translate(623 294)">
  <ellipse cx="0" cy="24" rx="41" ry="6" fill="#987752" opacity=".16"/>
  <g class="crab-body">
   <g fill="none" stroke="#bd4d3e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${legs}</g>
   <path d="M-15-3Q-28-9-33-24M15-3Q28-9 33-24" fill="none" stroke="#c95743" stroke-width="5" stroke-linecap="round"/>
   <g transform="translate(-34 -26) rotate(-15)"><g class="claw-left">${claw}</g></g>
   <g transform="translate(34 -26) rotate(15)"><g class="claw-right">${claw}</g></g>
   <ellipse rx="25" ry="16" fill="url(#shell)" stroke="#b94838" stroke-width="1.3"/>
   <path d="M-15-7Q0-16 15-7" stroke="#ffa78a" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
   <path d="M-9-12-11-24M9-12 11-24" stroke="#ad4236" stroke-width="3.5" stroke-linecap="round"/>
   <g class="crab-eyes">
    <circle cx="-11" cy="-25" r="4.5" fill="#fffdf3"/><circle cx="11" cy="-25" r="4.5" fill="#fffdf3"/>
    <g class="pupils" fill="#344650"><circle cx="-10.5" cy="-25" r="2.3"/><circle cx="11.5" cy="-25" r="2.3"/></g>
   </g>
   <path d="M-4 5Q0 8 4 5" fill="none" stroke="#963b32" stroke-width="1.3" stroke-linecap="round"/>
  </g>
 </g>
 <path d="M30 58V30H58M842 30H870V58M870 322V350H842M58 350H30V322" fill="none" stroke="#92acb6" stroke-opacity=".3"/>
 ${coverNavigation()}
</g><rect x=".5" y=".5" width="899" height="379" rx="12" fill="none" stroke="#d7e0e5"/>`, `
@keyframes cloud-drift{from{transform:translateX(-16px)}to{transform:translateX(22px)}}
@keyframes cloud-drift-back{from{transform:translateX(16px)}to{transform:translateX(-12px)}}
@keyframes crab-walk{0%,8%{transform:translate(710px,299px)}42%,54%{transform:translate(422px,305px)}88%,100%{transform:translate(710px,299px)}}
@keyframes crab-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@keyframes leg-step{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
@keyframes claw-wave{0%,36%,64%,100%{transform:rotate(0)}43%,52%{transform:rotate(-22deg)}47%,58%{transform:rotate(8deg)}}
@keyframes blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.12)}}
@keyframes glance{0%,8%,89%,100%{transform:translateX(1px)}15%,55%{transform:translateX(-1px)}65%,85%{transform:translateX(1px)}}
@keyframes wash{from{transform:translateY(-2px)}to{transform:translateY(3px)}}
@keyframes shimmer{from{opacity:.4;transform:translateX(-5px)}to{opacity:.85;transform:translateX(7px)}}
.cloud-slow{animation:cloud-drift 26s ease-in-out infinite alternate}
.cloud-far{animation:cloud-drift-back 38s ease-in-out infinite alternate}
.cloud-near{animation:cloud-drift 32s ease-in-out infinite alternate-reverse}
.crab-travel{animation:crab-walk 20s ease-in-out infinite}
.crab-body{animation:crab-bob .5s ease-in-out infinite}
.leg-a{animation:leg-step .28s ease-in-out infinite alternate}
.leg-b{animation:leg-step .28s ease-in-out infinite alternate-reverse}
.claw-left{animation:claw-wave 20s ease-in-out infinite;transform-origin:0 8px}
.claw-right{animation:claw-wave 20s ease-in-out infinite reverse;transform-origin:0 8px}
.crab-eyes{animation:blink 6s linear infinite;transform-origin:0 -25px}
.pupils{animation:glance 20s linear infinite}
.tide{animation:wash 7s ease-in-out infinite alternate}
.water-glint{animation:shimmer 5s ease-in-out infinite alternate}
`, 'A red crab strolls along a sunny beach beneath drifting clouds. Click the image or the Explore my work button to open the personal website.');
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
 ${coverNavigation(true)}
</g><rect x=".5" y=".5" width="899" height="379" rx="12" fill="none" stroke="${t.border}"/>`));
} else {
  outputs.set('assets/beach.svg', daylightBeach());
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
  ${picture('constellation', `${profile.name} — Crab Satellite. Open the personal website to explore research, open source and AI governance.`, 'beach')}
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
