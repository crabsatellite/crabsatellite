const fs = require("fs");
const path = require("path");

const CURSEFORGE_BASE = "https://www.curseforge.com/minecraft/mc-mods";

// Theme color schemes
const THEMES = {
  dark: {
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
  },
  light: {
    background: "#ffffff",
    cardBg: "#f6f8fa",
    cardBorder: "#d0d7de",
    text: "#1f2328",
    textMuted: "#656d76",
    link: "#d73a00",
    linkMerged: "#8250df",
    linkOpen: "#1a7f37",
    tagBg: "#eaeef2",
    tagText: "#656d76",
    sectionBorder: "#d0d7de",
  },
};

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateCard(
  mod,
  x,
  y,
  cardWidth,
  colors,
  prInfo = null,
  section = "active"
) {
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

  let tagX = x + 10;
  const tagY = y + 70;
  const maxTagX = x + cardWidth - 10;

  const tagElements = [];
  for (const tag of tags) {
    const tagWidth = Math.min(tag.length * 6 + 12, maxTagX - tagX - 5);
    if (tagX + tagWidth > maxTagX) break;

    tagElements.push(`
      <rect x="${tagX}" y="${tagY}" width="${tagWidth}" height="16" rx="3" fill="${
      colors.tagBg
    }"/>
      <text x="${tagX + tagWidth / 2}" y="${
      tagY + 11.5
    }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" fill="${
      colors.tagText
    }" text-anchor="middle">${escapeXml(tag)}</text>
    `);
    tagX += tagWidth + 5;
  }

  let prIndicator = "";
  if (section === "in_development" && prInfo) {
    const prColor =
      prInfo.status === "merged" ? colors.linkMerged : colors.linkOpen;
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

  const maxDescLen = Math.floor(cardWidth / 6.5);
  const desc =
    mod.description.length > maxDescLen
      ? mod.description.slice(0, maxDescLen - 3) + "..."
      : mod.description;

  return `
    <g>
      <rect x="${x}" y="${y}" width="${cardWidth}" height="92" rx="6" fill="${
    colors.cardBg
  }" stroke="${colors.cardBorder}" stroke-width="1"/>
      <text x="${x + 10}" y="${
    y + 24
  }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="13" font-weight="600" fill="${
    colors.link
  }">${escapeXml(mod.name)}</text>
      ${prIndicator}
      <text x="${x + 10}" y="${
    y + 46
  }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="10" fill="${
    colors.textMuted
  }">${escapeXml(desc)}</text>
      ${tagElements.join("")}
    </g>
  `;
}

function generateSection(
  title,
  mods,
  startY,
  totalWidth,
  colors,
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
    cardsContent += generateCard(mod, x, y, cardWidth, colors, prInfo, section);
  });

  const lineWidth = totalWidth - padding * 2;

  return {
    content: `
      <text x="${padding}" y="${
      startY + 20
    }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="14" font-weight="600" fill="${
      colors.text
    }">${escapeXml(title)}</text>
      <line x1="${padding}" y1="${startY + 28}" x2="${
      padding + lineWidth
    }" y2="${startY + 28}" stroke="${colors.sectionBorder}" stroke-width="1"/>
      ${cardsContent}
    `,
    height: sectionHeight,
  };
}

function generateSVG(modsData, theme = "dark") {
  const colors = THEMES[theme];
  const totalWidth = 840;
  const padding = 16;
  const prStatus = modsData.pr_status || {};

  let currentY = padding;
  let allContent = "";

  if (modsData.mods.active && modsData.mods.active.length > 0) {
    const s = generateSection(
      "🎮 Active Mods — Author",
      modsData.mods.active,
      currentY,
      totalWidth,
      colors,
      {},
      "active"
    );
    allContent += s.content;
    currentY += s.height + 16;
  }

  if (modsData.mods.released && modsData.mods.released.length > 0) {
    const s = generateSection(
      "✅ Released — Version Migration Complete",
      modsData.mods.released,
      currentY,
      totalWidth,
      colors,
      {},
      "released"
    );
    allContent += s.content;
    currentY += s.height + 16;
  }

  if (modsData.mods.in_development && modsData.mods.in_development.length > 0) {
    const s = generateSection(
      "🚧 In Development — Active Migration",
      modsData.mods.in_development,
      currentY,
      totalWidth,
      colors,
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
  <rect width="100%" height="100%" fill="${colors.background}" rx="6"/>
  ${allContent}
  <text x="${totalWidth - padding}" y="${
    totalHeight - 8
  }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" fill="${
    colors.textMuted
  }" text-anchor="end">Updated: ${updateDate}</text>
</svg>`;
}

async function main() {
  const dataPath = path.join(__dirname, "../../data/mods.json");
  const darkSvgPath = path.join(__dirname, "../../assets/mods-card-dark.svg");
  const lightSvgPath = path.join(__dirname, "../../assets/mods-card-light.svg");

  const modsData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  console.log("Generating SVGs...");

  // Generate dark theme
  const darkSvg = generateSVG(modsData, "dark");
  fs.writeFileSync(darkSvgPath, darkSvg);
  console.log(`✓ Dark theme: ${darkSvgPath}`);

  // Generate light theme
  const lightSvg = generateSVG(modsData, "light");
  fs.writeFileSync(lightSvgPath, lightSvg);
  console.log(`✓ Light theme: ${lightSvgPath}`);

  console.log(`  Size: ${darkSvg.length} / ${lightSvg.length} bytes`);
}

main().catch(console.error);
