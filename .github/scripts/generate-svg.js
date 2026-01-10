const fs = require("fs");
const path = require("path");

const CURSEFORGE_BASE = "https://www.curseforge.com/minecraft/mc-mods";

// Colors matching GitHub dark theme
const COLORS = {
  background: "#0d1117",
  cardBg: "#161b22",
  cardBorder: "#30363d",
  text: "#e6edf3",
  textMuted: "#8b949e",
  link: "#f16436",
  linkMerged: "#a371f7",
  linkOpen: "#3fb950",
  tagBg: "#21262d",
  tagText: "#8b949e",
  sectionBorder: "#21262d",
};

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate a single mod card
 */
function generateCard(mod, x, y, cardWidth, prInfo = null, section = "active") {
  // Build tags
  const tags = [mod.role];

  if (section === "active" && mod.tags) {
    tags.push(...mod.tags);
  } else if (section === "released") {
    tags.push("Released");
    if (mod.migration) tags.push(mod.migration);
  } else if (section === "in_development") {
    tags.push("In Progress");
    if (mod.migration) tags.push(mod.migration);
  }

  // Calculate tag positions - ensure they fit within card
  let tagX = x + 10;
  const tagY = y + 70;
  const maxTagX = x + cardWidth - 10;

  const tagElements = [];
  for (const tag of tags) {
    const tagWidth = Math.min(tag.length * 6 + 12, maxTagX - tagX - 5);
    if (tagX + tagWidth > maxTagX) break; // Stop if no room

    tagElements.push(`
      <rect x="${tagX}" y="${tagY}" width="${tagWidth}" height="16" rx="3" fill="${
      COLORS.tagBg
    }"/>
      <text x="${tagX + tagWidth / 2}" y="${
      tagY + 11.5
    }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" fill="${
      COLORS.tagText
    }" text-anchor="middle">${escapeXml(tag)}</text>
    `);
    tagX += tagWidth + 5;
  }

  // PR indicator for in_development
  let prIndicator = "";
  if (section === "in_development" && prInfo) {
    const prColor =
      prInfo.status === "merged" ? COLORS.linkMerged : COLORS.linkOpen;
    const prText = prInfo.status === "merged" ? "✓" : "PR";
    prIndicator = `
      <rect x="${x + cardWidth - 32}" y="${
      y + 8
    }" width="24" height="16" rx="3" fill="${prColor}"/>
      <text x="${x + cardWidth - 20}" y="${
      y + 19
    }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" fill="#ffffff" text-anchor="middle" font-weight="600">${prText}</text>
    `;
  }

  // Truncate description to fit
  const maxDescLen = Math.floor(cardWidth / 6.5);
  const desc =
    mod.description.length > maxDescLen
      ? mod.description.slice(0, maxDescLen - 3) + "..."
      : mod.description;

  return `
    <g>
      <rect x="${x}" y="${y}" width="${cardWidth}" height="92" rx="6" fill="${
    COLORS.cardBg
  }" stroke="${COLORS.cardBorder}" stroke-width="1"/>
      <text x="${x + 10}" y="${
    y + 24
  }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="13" font-weight="600" fill="${
    COLORS.link
  }">${escapeXml(mod.name)}</text>
      ${prIndicator}
      <text x="${x + 10}" y="${
    y + 46
  }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="10" fill="${
    COLORS.textMuted
  }">${escapeXml(desc)}</text>
      ${tagElements.join("")}
    </g>
  `;
}

/**
 * Generate a section with title and cards
 */
function generateSection(
  title,
  mods,
  startY,
  totalWidth,
  prStatus = {},
  section = "active"
) {
  const padding = 16;
  const gap = 10;
  const cardsPerRow = 3;
  const cardWidth = Math.floor(
    (totalWidth - padding * 2 - gap * (cardsPerRow - 1)) / cardsPerRow
  );

  const rowCount = Math.ceil(mods.length / cardsPerRow);
  const cardHeight = 92;
  const sectionHeight = 36 + rowCount * (cardHeight + gap);

  let cardsContent = "";
  mods.forEach((mod, i) => {
    const row = Math.floor(i / cardsPerRow);
    const col = i % cardsPerRow;
    const x = padding + col * (cardWidth + gap);
    const y = startY + 36 + row * (cardHeight + gap);

    const prInfo = prStatus[mod.repo] || null;
    cardsContent += generateCard(mod, x, y, cardWidth, prInfo, section);
  });

  const lineWidth = totalWidth - padding * 2;

  return {
    content: `
      <text x="${padding}" y="${
      startY + 20
    }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="14" font-weight="600" fill="${
      COLORS.text
    }">${escapeXml(title)}</text>
      <line x1="${padding}" y1="${startY + 28}" x2="${
      padding + lineWidth
    }" y2="${startY + 28}" stroke="${COLORS.sectionBorder}" stroke-width="1"/>
      ${cardsContent}
    `,
    height: sectionHeight,
  };
}

/**
 * Generate the complete SVG
 */
function generateSVG(modsData) {
  const totalWidth = 840; // Fixed width that works well on GitHub
  const padding = 16;
  const prStatus = modsData.pr_status || {};

  let currentY = padding;
  let allContent = "";

  // Active Mods section
  if (modsData.mods.active && modsData.mods.active.length > 0) {
    const s = generateSection(
      "🎮 Active Mods — Author",
      modsData.mods.active,
      currentY,
      totalWidth,
      {},
      "active"
    );
    allContent += s.content;
    currentY += s.height + 16;
  }

  // Released section
  if (modsData.mods.released && modsData.mods.released.length > 0) {
    const s = generateSection(
      "✅ Released — Version Migration Complete",
      modsData.mods.released,
      currentY,
      totalWidth,
      {},
      "released"
    );
    allContent += s.content;
    currentY += s.height + 16;
  }

  // In Development section
  if (modsData.mods.in_development && modsData.mods.in_development.length > 0) {
    const s = generateSection(
      "🚧 In Development — Active Migration",
      modsData.mods.in_development,
      currentY,
      totalWidth,
      prStatus,
      "in_development"
    );
    allContent += s.content;
    currentY += s.height;
  }

  const totalHeight = currentY + padding;
  const updateDate = modsData.last_updated
    ? new Date(modsData.last_updated).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date().toLocaleDateString();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <rect width="100%" height="100%" fill="${COLORS.background}" rx="6"/>
  ${allContent}
  <text x="${totalWidth - padding}" y="${
    totalHeight - 8
  }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" fill="${
    COLORS.textMuted
  }" text-anchor="end">Updated: ${updateDate}</text>
</svg>`;
}

/**
 * Generate clickable markdown links section
 */
function generateMarkdownLinks(modsData) {
  const prStatus = modsData.pr_status || {};
  let md = "";

  // Quick links as badges
  md += '<div align="center">\n\n';

  // Active mods
  for (const mod of modsData.mods.active || []) {
    const url = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
    const badge = `https://img.shields.io/badge/${encodeURIComponent(
      mod.name
    ).replace(
      /-/g,
      "--"
    )}-Author-F16436?style=flat-square&logo=curseforge&logoColor=white`;
    md += `[![${mod.name}](${badge})](${url}) `;
  }

  md += "\n\n";

  // Released mods
  for (const mod of modsData.mods.released || []) {
    const url = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
    const badge = `https://img.shields.io/badge/${encodeURIComponent(
      mod.name
    ).replace(
      /-/g,
      "--"
    )}-Released-2ea44f?style=flat-square&logo=curseforge&logoColor=white`;
    md += `[![${mod.name}](${badge})](${url}) `;
  }

  md += "\n\n";

  // In development mods with PR links
  for (const mod of modsData.mods.in_development || []) {
    const url = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
    const pr = prStatus[mod.repo];

    const modBadge = `https://img.shields.io/badge/${encodeURIComponent(
      mod.name
    ).replace(
      /-/g,
      "--"
    )}-Dev-6e7681?style=flat-square&logo=curseforge&logoColor=white`;
    md += `[![${mod.name}](${modBadge})](${url})`;

    if (pr) {
      const prColor = pr.status === "merged" ? "a371f7" : "3fb950";
      const prLabel = pr.status === "merged" ? "Merged" : "Open";
      const prBadge = `https://img.shields.io/badge/%23${pr.number}-${prLabel}-${prColor}?style=flat-square&logo=github&logoColor=white`;
      md += `[![PR](${prBadge})](${pr.url})`;
    }
    md += " ";
  }

  md += "\n\n</div>\n";

  return md;
}

async function main() {
  const dataPath = path.join(__dirname, "../../data/mods.json");
  const svgPath = path.join(__dirname, "../../assets/mods-card.svg");
  const linksPath = path.join(__dirname, "../../assets/mods-links.md");

  const modsData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  console.log("Generating SVG...");
  const svg = generateSVG(modsData);
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ SVG generated: ${svgPath}`);
  console.log(`  Size: ${svg.length} bytes`);

  console.log("\nGenerating markdown links...");
  const links = generateMarkdownLinks(modsData);
  fs.writeFileSync(linksPath, links);
  console.log(`✓ Links generated: ${linksPath}`);
}

main().catch(console.error);
