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

  // Generate SVG
  await generateSVG(modsData);
}

/**
 * Generate SVG cards for README
 */
async function generateSVG(modsData) {
  const svgPath = path.join(__dirname, "../../assets/mods-card.svg");

  const CARD_WIDTH = 280;
  const CARD_HEIGHT = 100;
  const CARD_GAP = 12;
  const CARDS_PER_ROW = 3;
  const PADDING = 20;

  const COLORS = {
    background: "#0d1117",
    cardBg: "#161b22",
    cardBorder: "#30363d",
    text: "#e6edf3",
    textMuted: "#8b949e",
    link: "#f16436",
    linkMerged: "#a371f7",
    tagBg: "#21262d",
    tagText: "#8b949e",
  };

  function escapeXml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function generateCard(mod, x, y, prInfo = null, section = "active") {
    const curseforgeUrl = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;

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

    let tagX = x + 12;
    const tagY = y + 75;
    const tagElements = tags
      .map((tag) => {
        const tagWidth = tag.length * 6 + 14;
        const el = `
        <rect x="${tagX}" y="${tagY}" width="${tagWidth}" height="18" rx="4" fill="${
          COLORS.tagBg
        }"/>
        <text x="${tagX + tagWidth / 2}" y="${
          tagY + 13
        }" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="10" fill="${
          COLORS.tagText
        }" text-anchor="middle">${escapeXml(tag)}</text>
      `;
        tagX += tagWidth + 6;
        return el;
      })
      .join("");

    let prLinkElement = "";
    if (section === "in_development" && prInfo) {
      const prColor =
        prInfo.status === "merged" ? COLORS.linkMerged : COLORS.link;
      const prText =
        prInfo.status === "merged"
          ? `✓ #${prInfo.number}`
          : `→ PR #${prInfo.number}`;
      prLinkElement = `
        <a href="${escapeXml(prInfo.url)}" target="_blank">
          <text x="${x + CARD_WIDTH - 12}" y="${
        y + 28
      }" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" fill="${prColor}" text-anchor="end">${prText}</text>
        </a>
      `;
    }

    const desc =
      mod.description.length > 48
        ? mod.description.slice(0, 45) + "..."
        : mod.description;

    return `
    <g>
      <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="6" fill="${
      COLORS.cardBg
    }" stroke="${COLORS.cardBorder}" stroke-width="1"/>
      <a href="${escapeXml(curseforgeUrl)}" target="_blank">
        <text x="${x + 12}" y="${
      y + 28
    }" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="14" font-weight="600" fill="${
      COLORS.link
    }">${escapeXml(mod.name)}</text>
      </a>
      ${prLinkElement}
      <text x="${x + 12}" y="${
      y + 50
    }" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" fill="${
      COLORS.textMuted
    }">${escapeXml(desc)}</text>
      ${tagElements}
    </g>`;
  }

  function generateSection(
    title,
    mods,
    startY,
    prStatus = {},
    section = "active"
  ) {
    const rowCount = Math.ceil(mods.length / CARDS_PER_ROW);
    const sectionHeight = 45 + rowCount * (CARD_HEIGHT + CARD_GAP);

    let cardsContent = "";
    mods.forEach((mod, i) => {
      const row = Math.floor(i / CARDS_PER_ROW);
      const col = i % CARDS_PER_ROW;
      const x = PADDING + col * (CARD_WIDTH + CARD_GAP);
      const y = startY + 45 + row * (CARD_HEIGHT + CARD_GAP);

      const prInfo = prStatus[mod.repo] || null;
      cardsContent += generateCard(mod, x, y, prInfo, section);
    });

    const lineWidth = CARDS_PER_ROW * (CARD_WIDTH + CARD_GAP) - CARD_GAP;

    return {
      content: `
      <text x="${PADDING}" y="${
        startY + 24
      }" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="16" font-weight="600" fill="${
        COLORS.text
      }">${escapeXml(title)}</text>
      <line x1="${PADDING}" y1="${startY + 34}" x2="${
        PADDING + lineWidth
      }" y2="${startY + 34}" stroke="${COLORS.cardBorder}" stroke-width="1"/>
      ${cardsContent}`,
      height: sectionHeight,
    };
  }

  const prStatus = modsData.pr_status || {};
  let currentY = PADDING;
  let allContent = "";

  if (modsData.mods.active && modsData.mods.active.length > 0) {
    const s = generateSection(
      "Active Mods — Author",
      modsData.mods.active,
      currentY,
      {},
      "active"
    );
    allContent += s.content;
    currentY += s.height + 20;
  }

  if (modsData.mods.released && modsData.mods.released.length > 0) {
    const s = generateSection(
      "Released — Version Migration Complete",
      modsData.mods.released,
      currentY,
      {},
      "released"
    );
    allContent += s.content;
    currentY += s.height + 20;
  }

  if (modsData.mods.in_development && modsData.mods.in_development.length > 0) {
    const s = generateSection(
      "In Development — Active Migration",
      modsData.mods.in_development,
      currentY,
      prStatus,
      "in_development"
    );
    allContent += s.content;
    currentY += s.height;
  }

  const totalWidth =
    PADDING * 2 + CARDS_PER_ROW * (CARD_WIDTH + CARD_GAP) - CARD_GAP;
  const totalHeight = currentY + PADDING + 10;
  const updateDate = modsData.last_updated
    ? new Date(modsData.last_updated).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date().toLocaleDateString();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  <rect width="100%" height="100%" fill="${COLORS.background}"/>
  ${allContent}
  <text x="${totalWidth - PADDING}" y="${
    totalHeight - 10
  }" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="9" fill="${
    COLORS.textMuted
  }" text-anchor="end">Last updated: ${updateDate}</text>
</svg>`;

  fs.writeFileSync(svgPath, svg);
  console.log("\n✓ SVG generated: assets/mods-card.svg");

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
