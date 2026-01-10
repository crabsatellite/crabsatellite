const fs = require("fs");
const path = require("path");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_AUTHOR = "crabsatellite";

// CurseForge URL base
const CURSEFORGE_BASE = "https://www.curseforge.com/minecraft/mc-mods";

/**
 * Fetch PR status from GitHub
 */
async function fetchPRs(repo) {
  const openUrl = `https://api.github.com/search/issues?q=repo:${repo}+author:${GITHUB_AUTHOR}+type:pr+state:open&sort=updated&order=desc&per_page=1`;
  const mergedUrl = `https://api.github.com/search/issues?q=repo:${repo}+author:${GITHUB_AUTHOR}+type:pr+is:merged&sort=updated&order=desc&per_page=1`;

  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "crabsatellite-pr-updater",
  };

  if (GITHUB_TOKEN) {
    headers["Authorization"] = `token ${GITHUB_TOKEN}`;
  }

  try {
    // Check for open PRs first
    const openResponse = await fetch(openUrl, { headers });

    // Check if response is JSON
    const contentType = openResponse.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.error(
        `  GitHub API rate limited (no token). Status: ${openResponse.status}`
      );
      return { rateLimited: true };
    }

    const openData = await openResponse.json();

    // Check for API errors
    if (openData.message) {
      console.error(`  GitHub API error: ${openData.message}`);
      return { rateLimited: true };
    }

    if (openData.items && openData.items.length > 0) {
      const pr = openData.items[0];
      return {
        status: "open",
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        updated_at: pr.updated_at,
      };
    }

    // If no open PR, check for merged PRs
    const mergedResponse = await fetch(mergedUrl, { headers });

    const mergedContentType = mergedResponse.headers.get("content-type") || "";
    if (!mergedContentType.includes("application/json")) {
      console.error(`  GitHub API rate limited for merged check`);
      return { rateLimited: true };
    }

    const mergedData = await mergedResponse.json();

    if (mergedData.items && mergedData.items.length > 0) {
      const pr = mergedData.items[0];
      return {
        status: "merged",
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        updated_at: pr.updated_at,
      };
    }

    return null;
  } catch (error) {
    console.error(`  Error fetching PRs: ${error.message}`);
    return null;
  }
}

/**
 * Check if a mod has been released for the target Minecraft version on CurseForge
 * Uses the CurseForge internal API endpoint
 */
async function checkCurseForgeRelease(mod) {
  const { curseforge_slug, target_version, curseforge_id } = mod;

  if (!curseforge_slug || !target_version) {
    return {
      released: false,
      error: "Missing curseforge_slug or target_version",
    };
  }

  // Use CurseForge's internal API endpoint for fetching files with version filter
  // This endpoint is used by the CurseForge website itself
  const apiUrl = `https://www.curseforge.com/api/v1/mods/${curseforge_id}/files?pageIndex=0&pageSize=20&sort=dateCreated&sortDescending=true&removeAlphas=true`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: `https://www.curseforge.com/minecraft/mc-mods/${curseforge_slug}`,
      },
    });

    if (!response.ok) {
      console.error(
        `  API returned HTTP ${response.status} for ${curseforge_slug}`
      );
      return { released: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    // Check if any file supports the target version
    if (data.data && Array.isArray(data.data)) {
      for (const file of data.data) {
        // Try multiple possible version field names
        const gameVersions =
          file.gameVersions || file.sortableGameVersions || [];

        // Handle both string arrays and object arrays
        const versionStrings = gameVersions.map((v) =>
          typeof v === "string"
            ? v
            : v.gameVersionName || v.name || v.gameVersion || ""
        );

        // Check if target version is in the list
        const hasTargetVersion = versionStrings.some(
          (v) => v === target_version || v.includes(target_version)
        );

        if (hasTargetVersion) {
          return {
            released: true,
            file_name: file.fileName,
            file_id: file.id,
            method: "curseforge-api",
          };
        }
      }
    }

    return { released: false, method: "curseforge-api" };
  } catch (error) {
    console.error(`  Error checking ${curseforge_slug}:`, error.message);
    return { released: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  const dataPath = path.join(__dirname, "../../data/mods.json");
  const modsData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  console.log("=== Mod Status Updater ===\n");

  // Initialize arrays if not exist
  if (!modsData.mods.released) modsData.mods.released = [];
  if (!modsData.mods.in_development) modsData.mods.in_development = [];

  const prStatus = {};
  const releaseStatus = {};
  const modsToRelease = []; // in_development → released

  // Step 1: Check CurseForge releases for in_development mods ONLY
  // Released mods are not checked - if you want to add a new target version,
  // manually move the mod to in_development with the new target_version
  console.log("📦 Checking CurseForge for in_development mods...\n");

  for (const mod of modsData.mods.in_development) {
    console.log(`Checking ${mod.name} for ${mod.target_version} release...`);
    const release = await checkCurseForgeRelease(mod);
    releaseStatus[mod.curseforge_slug] = release;

    if (release.released) {
      console.log(`  ✅ RELEASED on CurseForge!`);
      modsToRelease.push(mod);
    } else {
      console.log(`  ⏳ Not released yet`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500)); // Rate limiting
  }

  // Step 2: Move released mods from in_development to released
  if (modsToRelease.length > 0) {
    console.log(
      `\n🚀 Moving ${modsToRelease.length} mod(s) to Released section...`
    );

    for (const mod of modsToRelease) {
      modsData.mods.in_development = modsData.mods.in_development.filter(
        (m) => m.repo !== mod.repo
      );

      const alreadyReleased = modsData.mods.released.some(
        (m) => m.repo === mod.repo
      );
      if (!alreadyReleased) {
        modsData.mods.released.push(mod);
        console.log(`  → Moved ${mod.name} to Released`);
      }
    }
  }

  // Step 3: Check PR status for all in_development mods
  console.log("\n🔗 Checking GitHub PR status...\n");

  // Load existing PR status to preserve on rate limit
  const existingPrStatus = modsData.pr_status || {};

  for (const mod of modsData.mods.in_development) {
    console.log(`Checking ${mod.name} (${mod.repo})...`);
    const pr = await fetchPRs(mod.repo);

    if (pr && pr.rateLimited) {
      // Rate limited - preserve existing data
      if (existingPrStatus[mod.repo]) {
        prStatus[mod.repo] = existingPrStatus[mod.repo];
        console.log(
          `  → Rate limited, keeping existing: PR #${
            existingPrStatus[mod.repo].number
          }`
        );
      } else {
        console.log(`  → Rate limited, no existing data`);
      }
    } else if (pr) {
      prStatus[mod.repo] = pr;
      console.log(`  → ${pr.status.toUpperCase()}: PR #${pr.number}`);
    } else {
      console.log(`  → No PRs found`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Update the mods.json
  modsData.pr_status = prStatus;
  modsData.release_status = releaseStatus;
  modsData.last_updated = new Date().toISOString();

  fs.writeFileSync(dataPath, JSON.stringify(modsData, null, 2) + "\n");
  console.log("\n✓ mods.json updated!");
  console.log(`Last updated: ${modsData.last_updated}`);

  // Generate SVG (both themes)
  await generateSVGs(modsData);
}

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
  if (section === "active" && mod.tags) tags.push(...mod.tags);
  else if (section === "released") {
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
    tagElements.push(
      `<rect x="${tagX}" y="${tagY}" width="${tagWidth}" height="16" rx="3" fill="${
        colors.tagBg
      }"/><text x="${tagX + tagWidth / 2}" y="${
        tagY + 11.5
      }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" fill="${
        colors.tagText
      }" text-anchor="middle">${escapeXml(tag)}</text>`
    );
    tagX += tagWidth + 5;
  }

  let prIndicator = "";
  if (section === "in_development" && prInfo) {
    const prColor =
      prInfo.status === "merged" ? colors.linkMerged : colors.linkOpen;
    const prText = prInfo.status === "merged" ? "✓" : "PR";
    prIndicator = `<rect x="${x + cardWidth - 32}" y="${
      y + 8
    }" width="24" height="16" rx="3" fill="${prColor}"/><text x="${
      x + cardWidth - 20
    }" y="${
      y + 19
    }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" fill="#ffffff" text-anchor="middle" font-weight="600">${prText}</text>`;
  }

  const maxDescLen = Math.floor(cardWidth / 6.5);
  const desc =
    mod.description.length > maxDescLen
      ? mod.description.slice(0, maxDescLen - 3) + "..."
      : mod.description;

  return `<g><rect x="${x}" y="${y}" width="${cardWidth}" height="92" rx="6" fill="${
    colors.cardBg
  }" stroke="${colors.cardBorder}" stroke-width="1"/><text x="${x + 10}" y="${
    y + 24
  }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="13" font-weight="600" fill="${
    colors.link
  }">${escapeXml(mod.name)}</text>${prIndicator}<text x="${x + 10}" y="${
    y + 46
  }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="10" fill="${
    colors.textMuted
  }">${escapeXml(desc)}</text>${tagElements.join("")}</g>`;
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
  const padding = 16,
    gap = 10,
    cardsPerRow = 3;
  const cardWidth = Math.floor(
    (totalWidth - padding * 2 - gap * (cardsPerRow - 1)) / cardsPerRow
  );
  const rowCount = Math.ceil(mods.length / cardsPerRow);
  const sectionHeight = 36 + rowCount * (92 + gap);

  let cardsContent = "";
  mods.forEach((mod, i) => {
    const row = Math.floor(i / cardsPerRow),
      col = i % cardsPerRow;
    const x = padding + col * (cardWidth + gap),
      y = startY + 36 + row * (92 + gap);
    cardsContent += generateCard(
      mod,
      x,
      y,
      cardWidth,
      colors,
      prStatus[mod.repo] || null,
      section
    );
  });

  return {
    content: `<text x="${padding}" y="${
      startY + 20
    }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="14" font-weight="600" fill="${
      colors.text
    }">${escapeXml(title)}</text><line x1="${padding}" y1="${
      startY + 28
    }" x2="${totalWidth - padding}" y2="${startY + 28}" stroke="${
      colors.cardBorder
    }" stroke-width="1"/>${cardsContent}`,
    height: sectionHeight,
  };
}

function buildSVG(modsData, theme) {
  const colors = THEMES[theme];
  const totalWidth = 840,
    padding = 16;
  const prStatus = modsData.pr_status || {};
  let currentY = padding,
    allContent = "";

  if (modsData.mods.active?.length > 0) {
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
  if (modsData.mods.released?.length > 0) {
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
  if (modsData.mods.in_development?.length > 0) {
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}"><rect width="100%" height="100%" fill="${
    colors.background
  }" rx="6"/>${allContent}<text x="${totalWidth - padding}" y="${
    totalHeight - 8
  }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" fill="${
    colors.textMuted
  }" text-anchor="end">Updated: ${updateDate}</text></svg>`;
}

async function generateSVGs(modsData) {
  const darkPath = path.join(__dirname, "../../assets/mods-card-dark.svg");
  const lightPath = path.join(__dirname, "../../assets/mods-card-light.svg");

  fs.writeFileSync(darkPath, buildSVG(modsData, "dark"));
  fs.writeFileSync(lightPath, buildSVG(modsData, "light"));
  console.log("\n✓ SVGs generated: mods-card-dark.svg, mods-card-light.svg");

  // Update README badges
  await updateReadmeBadges(modsData);
}

/**
 * Update README with clickable badges
 */
async function updateReadmeBadges(modsData) {
  const readmePath = path.join(__dirname, "../../README.md");
  let readme = fs.readFileSync(readmePath, "utf8");

  const prStatus = modsData.pr_status || {};

  // Generate badges markdown
  let badges = `<!-- Quick Links (Clickable) -->
<div align="center">

`;

  // Active mods
  for (const mod of modsData.mods.active || []) {
    const url = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
    badges += `[![${
      mod.name
    }](https://img.shields.io/badge/${encodeURIComponent(mod.name).replace(
      /-/g,
      "--"
    )}-Author-F16436?style=flat-square&logo=curseforge&logoColor=white)](${url})\n`;
  }
  badges += "\n";

  // Released mods
  for (const mod of modsData.mods.released || []) {
    const url = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
    badges += `[![${
      mod.name
    }](https://img.shields.io/badge/${encodeURIComponent(mod.name).replace(
      /-/g,
      "--"
    )}-Released-2ea44f?style=flat-square&logo=curseforge&logoColor=white)](${url})\n`;
  }
  badges += "\n";

  // In development mods
  for (const mod of modsData.mods.in_development || []) {
    const url = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
    const pr = prStatus[mod.repo];

    badges += `[![${
      mod.name
    }](https://img.shields.io/badge/${encodeURIComponent(mod.name).replace(
      /-/g,
      "--"
    )}-Dev-6e7681?style=flat-square&logo=curseforge&logoColor=white)](${url})`;

    if (pr) {
      const prColor = pr.status === "merged" ? "a371f7" : "3fb950";
      const prLabel = pr.status === "merged" ? "Merged" : "Open";
      badges += `[![#${pr.number}](https://img.shields.io/badge/%23${pr.number}-${prLabel}-${prColor}?style=flat-square&logo=github&logoColor=white)](${pr.url})`;
    }
    badges += "\n";
  }

  badges += `
</div>`;

  // Replace badges section in README
  const badgesRegex = /<!-- Quick Links \(Clickable\) -->[\s\S]*?<\/div>/;

  if (badgesRegex.test(readme)) {
    readme = readme.replace(badgesRegex, badges);
    fs.writeFileSync(readmePath, readme);
    console.log("✓ README badges updated!");
  } else {
    console.log("⚠ Badges section not found in README");
  }
}

main().catch(console.error);
