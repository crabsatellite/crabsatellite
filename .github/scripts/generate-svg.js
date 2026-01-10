const fs = require("fs");
const path = require("path");

const CURSEFORGE_BASE = "https://www.curseforge.com/minecraft/mc-mods";

// SVG card dimensions
const CARD_WIDTH = 280;
const CARD_HEIGHT = 100;
const CARD_GAP = 12;
const CARDS_PER_ROW = 3;
const PADDING = 20;

// Colors matching CSS
const COLORS = {
  background: "#0d1117",
  cardBg: "#0f0f0f",
  cardBorder: "#2a2a2a",
  text: "#e6edf3",
  textMuted: "#aaaaaa",
  link: "#f16436",
  linkMerged: "#8b5cf6",
  tagBg: "#222222",
  tagText: "#aaaaaa",
};

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate a single card SVG element
 */
function generateCard(mod, x, y, prInfo = null, section = "active") {
  const curseforgeUrl = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;

  // Build tags
  const tags = [];
  tags.push(mod.role);

  if (section === "active" && mod.tags) {
    tags.push(...mod.tags);
  } else if (section === "released") {
    tags.push("Released");
    if (mod.migration) tags.push(mod.migration);
  } else if (section === "in_development") {
    tags.push("In Progress");
    if (mod.migration) tags.push(mod.migration);
  }

  // Calculate tag positions
  let tagX = x + 12;
  const tagY = y + 75;
  const tagElements = tags
    .map((tag, i) => {
      const tagWidth = tag.length * 6.5 + 12;
      const el = `
      <rect x="${tagX}" y="${tagY}" width="${tagWidth}" height="18" rx="4" fill="${
        COLORS.tagBg
      }"/>
      <text x="${tagX + tagWidth / 2}" y="${
        tagY + 13
      }" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="${
        COLORS.tagText
      }" text-anchor="middle">${escapeXml(tag)}</text>
    `;
      tagX += tagWidth + 6;
      return el;
    })
    .join("");

  // PR link for in_development
  let prLinkElement = "";
  if (section === "in_development" && prInfo) {
    const prColor =
      prInfo.status === "merged" ? COLORS.linkMerged : COLORS.link;
    prLinkElement = `
      <a href="${escapeXml(prInfo.url)}" target="_blank">
        <text x="${x + CARD_WIDTH - 12}" y="${
      y + 28
    }" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${prColor}" text-anchor="end">→ PR #${
      prInfo.number
    }</text>
      </a>
    `;
  }

  return `
    <g>
      <!-- Card background -->
      <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="8" fill="${
    COLORS.cardBg
  }" stroke="${COLORS.cardBorder}" stroke-width="1"/>
      
      <!-- Title with link -->
      <a href="${escapeXml(curseforgeUrl)}" target="_blank">
        <text x="${x + 12}" y="${
    y + 28
  }" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="${
    COLORS.link
  }">${escapeXml(mod.name)}</text>
      </a>
      ${prLinkElement}
      
      <!-- Description -->
      <text x="${x + 12}" y="${
    y + 50
  }" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${
    COLORS.textMuted
  }">
        ${escapeXml(
          mod.description.length > 50
            ? mod.description.slice(0, 47) + "..."
            : mod.description
        )}
      </text>
      
      <!-- Tags -->
      ${tagElements}
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
  prStatus = {},
  section = "active"
) {
  const rowCount = Math.ceil(mods.length / CARDS_PER_ROW);
  const sectionHeight = 40 + rowCount * (CARD_HEIGHT + CARD_GAP);

  let cardsContent = "";
  mods.forEach((mod, i) => {
    const row = Math.floor(i / CARDS_PER_ROW);
    const col = i % CARDS_PER_ROW;
    const x = PADDING + col * (CARD_WIDTH + CARD_GAP);
    const y = startY + 40 + row * (CARD_HEIGHT + CARD_GAP);

    const prInfo = prStatus[mod.repo] || null;
    cardsContent += generateCard(mod, x, y, prInfo, section);
  });

  return {
    content: `
      <!-- Section: ${title} -->
      <text x="${PADDING}" y="${
      startY + 24
    }" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${
      COLORS.text
    }">${escapeXml(title)}</text>
      <line x1="${PADDING}" y1="${startY + 32}" x2="${
      PADDING + CARDS_PER_ROW * (CARD_WIDTH + CARD_GAP) - CARD_GAP
    }" y2="${startY + 32}" stroke="${COLORS.cardBorder}" stroke-width="1"/>
      ${cardsContent}
    `,
    height: sectionHeight,
  };
}

/**
 * Generate the complete SVG
 */
function generateSVG(modsData) {
  const prStatus = modsData.pr_status || {};
  let currentY = PADDING;
  let allContent = "";

  // Active Mods section
  if (modsData.mods.active && modsData.mods.active.length > 0) {
    const activeSection = generateSection(
      "Active Mods — Author",
      modsData.mods.active,
      currentY,
      {},
      "active"
    );
    allContent += activeSection.content;
    currentY += activeSection.height + 20;
  }

  // Released section
  if (modsData.mods.released && modsData.mods.released.length > 0) {
    const releasedSection = generateSection(
      "Released — Version Migration Complete",
      modsData.mods.released,
      currentY,
      {},
      "released"
    );
    allContent += releasedSection.content;
    currentY += releasedSection.height + 20;
  }

  // In Development section
  if (modsData.mods.in_development && modsData.mods.in_development.length > 0) {
    const devSection = generateSection(
      "In Development — Active Migration",
      modsData.mods.in_development,
      currentY,
      prStatus,
      "in_development"
    );
    allContent += devSection.content;
    currentY += devSection.height;
  }

  const totalWidth =
    PADDING * 2 + CARDS_PER_ROW * (CARD_WIDTH + CARD_GAP) - CARD_GAP;
  const totalHeight = currentY + PADDING;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <style>
    a { cursor: pointer; }
    a:hover text { text-decoration: underline; }
  </style>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="${COLORS.background}"/>
  
  ${allContent}
  
  <!-- Last updated -->
  <text x="${totalWidth - PADDING}" y="${
    totalHeight - 8
  }" font-family="system-ui, -apple-system, sans-serif" font-size="9" fill="${
    COLORS.textMuted
  }" text-anchor="end">Last updated: ${
    modsData.last_updated
      ? new Date(modsData.last_updated).toLocaleDateString()
      : new Date().toLocaleDateString()
  }</text>
</svg>`;
}

/**
 * Main function
 */
async function main() {
  const dataPath = path.join(__dirname, "../../data/mods.json");
  const svgPath = path.join(__dirname, "../../assets/mods-card.svg");

  const modsData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  console.log("Generating SVG...");
  const svg = generateSVG(modsData);

  fs.writeFileSync(svgPath, svg);
  console.log(`✓ SVG generated: ${svgPath}`);
  console.log(`  Size: ${svg.length} bytes`);
}

main().catch(console.error);
