const fs = require("fs");
const path = require("path");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_AUTHOR = "crabsatellite";

// CurseForge URL base
const CURSEFORGE_BASE = "https://www.curseforge.com/minecraft/mc-mods";

/**
 * Fetch mod details from CurseForge Widget API (api.cfwidget.com)
 * This is a free, reliable API that doesn't require authentication
 */
async function fetchCurseForgeModDetails(curseforgeId, curseforgeSlug) {
  if (!curseforgeId) {
    console.log(`  ⚠ No curseforge_id for ${curseforgeSlug}`);
    return null;
  }

  // Use CurseForge Widget API - more reliable than official API
  const apiUrl = `https://api.cfwidget.com/${curseforgeId}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "crabsatellite-portfolio-updater",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.log(
        `  ⚠ CFWidget API returned ${response.status} for ${curseforgeSlug}`
      );
      return null;
    }

    const data = await response.json();

    if (data && data.id) {
      return {
        image: data.thumbnail || null,
        downloads: data.downloads?.total || 0,
        author:
          data.members?.[0]?.username || data.authors?.[0]?.name || "Unknown",
        created: data.created_at,
        updated: data.last_fetch || data.created_at,
        categories: (data.categories || []).map((c) =>
          typeof c === "string" ? c : c.name
        ),
      };
    }

    return null;
  } catch (error) {
    console.log(
      `  ⚠ Error fetching mod details for ${curseforgeSlug}:`,
      error.message
    );
    return null;
  }
}

/**
 * Format download count to human readable string
 */
function formatDownloads(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + "M";
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + "K";
  }
  return count.toString();
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Fetch all PRs from GitHub for a repo (returns a list of all PRs)
 */
async function fetchPRs(repo) {
  // Fetch all PRs (both open and closed/merged) with higher per_page limit
  const allPRsUrl = `https://api.github.com/search/issues?q=repo:${repo}+author:${GITHUB_AUTHOR}+type:pr&sort=updated&order=desc&per_page=100`;

  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "crabsatellite-pr-updater",
  };

  if (GITHUB_TOKEN) {
    headers["Authorization"] = `token ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(allPRsUrl, { headers });

    // Check if response is JSON
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.error(
        `  GitHub API rate limited (no token). Status: ${response.status}`
      );
      return { rateLimited: true };
    }

    const data = await response.json();

    // Check for API errors
    if (data.message) {
      console.error(`  GitHub API error: ${data.message}`);
      return { rateLimited: true };
    }

    if (data.items && data.items.length > 0) {
      // Return all PRs as a list
      const prList = data.items.map((pr) => {
        // Determine status: open, merged, or closed
        let status = "open";
        if (pr.state === "closed") {
          // Check if it was merged by looking at pull_request object
          status = pr.pull_request?.merged_at ? "merged" : "closed";
        }
        return {
          status: status,
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          closed_at: pr.closed_at,
        };
      });
      return { prs: prList, total: data.total_count };
    }

    return { prs: [], total: 0 };
  } catch (error) {
    console.error(`  Error fetching PRs: ${error.message}`);
    return { prs: [], total: 0 };
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

  // Step 3: Check PR status for all mods (both in_development and released)
  console.log("\n🔗 Checking GitHub PR status...\n");

  // Load existing PR status to preserve on rate limit
  const existingPrStatus = modsData.pr_status || {};

  // Combine in_development and released mods for PR checking
  const allModsWithRepos = [
    ...modsData.mods.in_development,
    ...modsData.mods.released,
  ].filter((mod) => mod.repo); // Only mods with repo field

  for (const mod of allModsWithRepos) {
    console.log(`Checking ${mod.name} (${mod.repo})...`);
    const prResult = await fetchPRs(mod.repo);

    if (prResult && prResult.rateLimited) {
      // Rate limited - preserve existing data
      if (existingPrStatus[mod.repo]) {
        prStatus[mod.repo] = existingPrStatus[mod.repo];
        const existingCount = existingPrStatus[mod.repo].prs?.length || 1;
        console.log(
          `  → Rate limited, keeping existing: ${existingCount} PR(s)`
        );
      } else {
        console.log(`  → Rate limited, no existing data`);
      }
    } else if (prResult && prResult.prs && prResult.prs.length > 0) {
      prStatus[mod.repo] = prResult;
      console.log(`  → Found ${prResult.prs.length} PR(s) (total: ${prResult.total})`);
      // Log first few PRs for visibility
      prResult.prs.slice(0, 3).forEach((pr) => {
        console.log(`    - #${pr.number} [${pr.status.toUpperCase()}]: ${pr.title.slice(0, 50)}...`);
      });
    } else {
      prStatus[mod.repo] = { prs: [], total: 0 };
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

  // Step 4: Fetch CurseForge mod details (images, downloads, etc.) and generate portfolio data
  console.log("\n🖼️ Fetching CurseForge mod details for portfolio...\n");

  const portfolioData = await generatePortfolioData(modsData, prStatus);

  const portfolioPath = path.join(__dirname, "../../data/portfolio_mods.json");
  fs.writeFileSync(
    portfolioPath,
    JSON.stringify(portfolioData, null, 2) + "\n"
  );
  console.log("✓ portfolio_mods.json generated!");

  // Generate SVG (both themes)
  await generateSVGs(modsData);
}

/**
 * Generate portfolio-ready data with full mod details
 */
async function generatePortfolioData(modsData, prStatus) {
  const portfolioData = {
    owner: [],
    others: [],
    lastUpdated: modsData.last_updated,
  };

  // Process active mods (owner's mods)
  console.log("Processing owner mods...");
  for (const mod of modsData.mods.active || []) {
    // Always fetch fresh data from API
    console.log(`  Fetching details for ${mod.name}...`);
    const details = await fetchCurseForgeModDetails(
      mod.curseforge_id,
      mod.curseforge_slug
    );
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limit

    portfolioData.owner.push({
      title: mod.name,
      author: details?.author || "CrabMods",
      downloads: details ? formatDownloads(details.downloads) : "0",
      updated: details ? formatDate(details.updated) : "",
      created: details ? formatDate(details.created) : "",
      description: mod.description,
      image: details?.image || "",
      url: `${CURSEFORGE_BASE}/${mod.curseforge_slug}`,
      categories: details?.categories || ["Mods"],
      isOwner: true,
      role: mod.role,
    });
  }

  // Process released mods
  console.log("Processing released mods...");
  for (const mod of modsData.mods.released || []) {
    console.log(`  Fetching details for ${mod.name}...`);
    const details = await fetchCurseForgeModDetails(
      mod.curseforge_id,
      mod.curseforge_slug
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const prData = prStatus[mod.repo];
    const latestPR = prData?.prs?.[0];

    portfolioData.others.push({
      title: mod.name,
      author: details?.author || mod.repo?.split("/")[0] || "Unknown",
      downloads: details ? formatDownloads(details.downloads) : "0",
      updated: details ? formatDate(details.updated) : "",
      created: details ? formatDate(details.created) : "",
      description: mod.description,
      image: details?.image || "",
      url: `${CURSEFORGE_BASE}/${mod.curseforge_slug}`,
      categories: details?.categories || ["Mods"],
      isOwner: false,
      role: mod.role,
      repo: mod.repo,
      migration: mod.migration,
      status: "released",
      prStatus: latestPR
        ? {
            status: latestPR.status,
            number: latestPR.number,
            url: latestPR.url,
          }
        : undefined,
      allPRs: prData?.prs || [],
    });
  }

  // Process in_development mods
  console.log("Processing in-development mods...");
  for (const mod of modsData.mods.in_development || []) {
    console.log(`  Fetching details for ${mod.name}...`);
    const details = await fetchCurseForgeModDetails(
      mod.curseforge_id,
      mod.curseforge_slug
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const prData = prStatus[mod.repo];
    // Get the latest PR for display, but keep full list available
    const latestPR = prData?.prs?.[0];

    portfolioData.others.push({
      title: mod.name,
      author: details?.author || mod.repo?.split("/")[0] || "Unknown",
      downloads: details ? formatDownloads(details.downloads) : "0",
      updated: details ? formatDate(details.updated) : "",
      created: details ? formatDate(details.created) : "",
      description: mod.description,
      image: details?.image || "",
      url: `${CURSEFORGE_BASE}/${mod.curseforge_slug}`,
      categories: details?.categories || ["Mods"],
      isOwner: false,
      role: mod.role,
      repo: mod.repo,
      migration: mod.migration,
      status: "in_development",
      prStatus: latestPR
        ? {
            status: latestPR.status,
            number: latestPR.number,
            url: latestPR.url,
          }
        : undefined,
      allPRs: prData?.prs || [],
    });
  }

  return portfolioData;
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

  // Get latest PR from prInfo (now expects list format)
  const latestPR = prInfo?.prs?.[0] || prInfo;
  let prIndicator = "";
  
  // For in_development: show all PR indicators (open or merged)
  // For released: only show if there's an OPEN PR (new contribution)
  const shouldShowPR = latestPR && latestPR.status && (
    section === "in_development" ||
    (section === "released" && latestPR.status === "open")
  );
  
  if (shouldShowPR) {
    // Use gold/amber color for released mods with open PR to match badge design
    let prColor;
    if (section === "released") {
      prColor = "#f59e0b"; // Gold/amber for "New PR" on released mods
    } else {
      prColor = latestPR.status === "merged" ? colors.linkMerged : colors.linkOpen;
    }
    const prText = latestPR.status === "merged" ? "✓" : "PR";
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

/**
 * Parse download string to number for sorting
 */
function parseDownloads(downloadStr) {
  if (!downloadStr) return 0;
  const str = downloadStr.toString().toUpperCase();
  if (str.includes('M')) {
    return parseFloat(str) * 1000000;
  } else if (str.includes('K')) {
    return parseFloat(str) * 1000;
  }
  return parseFloat(str) || 0;
}

function generateSection(
  title,
  mods,
  startY,
  totalWidth,
  colors,
  prStatus = {},
  section = "active",
  compact = false,
  maxItems = 6
) {
  const padding = 16,
    gap = 10,
    cardsPerRow = 3;
  const cardWidth = Math.floor(
    (totalWidth - padding * 2 - gap * (cardsPerRow - 1)) / cardsPerRow
  );
  
  // Sort by downloads (descending) and limit if compact mode
  let displayMods = [...mods];
  const totalMods = mods.length;
  const hiddenCount = Math.max(0, totalMods - maxItems);
  
  if (compact && totalMods > maxItems) {
    // Sort by downloads descending
    displayMods.sort((a, b) => {
      const aDownloads = parseDownloads(a.downloads);
      const bDownloads = parseDownloads(b.downloads);
      return bDownloads - aDownloads;
    });
    displayMods = displayMods.slice(0, maxItems);
  }
  
  const rowCount = Math.ceil(displayMods.length / cardsPerRow);
  const hasMoreText = compact && hiddenCount > 0;
  const moreTextHeight = hasMoreText ? 24 : 0;
  const sectionHeight = 36 + rowCount * (92 + gap) + moreTextHeight;

  let cardsContent = "";
  displayMods.forEach((mod, i) => {
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
  
  // Add "and xx more..." text if in compact mode and there are hidden items
  let moreText = "";
  if (hasMoreText) {
    const moreY = startY + 36 + rowCount * (92 + gap) + 12;
    moreText = `<text x="${totalWidth / 2}" y="${moreY}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="${colors.textMuted}" text-anchor="middle" font-style="italic">and ${hiddenCount} more...</text>`;
  }

  return {
    content: `<text x="${padding}" y="${
      startY + 20
    }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="14" font-weight="600" fill="${
      colors.text
    }">${escapeXml(title)}</text><line x1="${padding}" y1="${
      startY + 28
    }" x2="${totalWidth - padding}" y2="${startY + 28}" stroke="${
      colors.cardBorder
    }" stroke-width="1"/>${cardsContent}${moreText}`,
    height: sectionHeight,
    hiddenCount: hiddenCount,
  };
}

function buildSVG(modsData, theme, compact = false) {
  const colors = THEMES[theme];
  const totalWidth = 840,
    padding = 16;
  const prStatus = modsData.pr_status || {};
  let currentY = padding,
    allContent = "";
  let totalHiddenCount = 0;

  if (modsData.mods.active?.length > 0) {
    const s = generateSection(
      "🎮 Active Mods — Author",
      modsData.mods.active,
      currentY,
      totalWidth,
      colors,
      {},
      "active",
      compact
    );
    allContent += s.content;
    currentY += s.height + 16;
    totalHiddenCount += s.hiddenCount || 0;
  }
  if (modsData.mods.released?.length > 0) {
    const s = generateSection(
      "✅ Released — Version Migration Complete",
      modsData.mods.released,
      currentY,
      totalWidth,
      colors,
      prStatus,
      "released",
      compact
    );
    allContent += s.content;
    currentY += s.height + 16;
    totalHiddenCount += s.hiddenCount || 0;
  }
  if (modsData.mods.in_development?.length > 0) {
    const s = generateSection(
      "🚧 In Development — Active Migration",
      modsData.mods.in_development,
      currentY,
      totalWidth,
      colors,
      prStatus,
      "in_development",
      compact
    );
    allContent += s.content;
    currentY += s.height;
    totalHiddenCount += s.hiddenCount || 0;
  }

  const totalHeight = currentY + padding;
  const updateDate = modsData.last_updated
    ? new Date(modsData.last_updated).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date().toLocaleDateString();

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}"><rect width="100%" height="100%" fill="${
      colors.background
    }" rx="6"/>${allContent}<text x="${totalWidth - padding}" y="${
      totalHeight - 8
    }" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="9" fill="${
      colors.textMuted
    }" text-anchor="end">Updated: ${updateDate}</text></svg>`,
    totalHiddenCount: totalHiddenCount,
  };
}

async function generateSVGs(modsData) {
  // Generate compact versions (for README display)
  const darkCompactPath = path.join(__dirname, "../../assets/mods-card-dark.svg");
  const lightCompactPath = path.join(__dirname, "../../assets/mods-card-light.svg");
  
  // Generate full versions
  const darkFullPath = path.join(__dirname, "../../assets/mods-card-dark-full.svg");
  const lightFullPath = path.join(__dirname, "../../assets/mods-card-light-full.svg");

  // Build compact versions
  const darkCompact = buildSVG(modsData, "dark", true);
  const lightCompact = buildSVG(modsData, "light", true);
  
  // Build full versions
  const darkFull = buildSVG(modsData, "dark", false);
  const lightFull = buildSVG(modsData, "light", false);

  fs.writeFileSync(darkCompactPath, darkCompact.svg);
  fs.writeFileSync(lightCompactPath, lightCompact.svg);
  fs.writeFileSync(darkFullPath, darkFull.svg);
  fs.writeFileSync(lightFullPath, lightFull.svg);
  
  console.log("\n✓ SVGs generated:");
  console.log("  - mods-card-dark.svg, mods-card-light.svg (compact)");
  console.log("  - mods-card-dark-full.svg, mods-card-light-full.svg (full)");

  // Calculate if any section has more than 6 items
  const hasHiddenItems = darkCompact.totalHiddenCount > 0;

  // Update README badges
  await updateReadmeBadges(modsData, hasHiddenItems);
}

/**
 * Update README with clickable badges
 */
async function updateReadmeBadges(modsData, hasHiddenItems = false) {
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

  // Released mods - only show if there's an open PR (new contribution)
  const releasedWithOpenPR = (modsData.mods.released || []).filter((mod) => {
    const prData = prStatus[mod.repo];
    const latestPR = prData?.prs?.[0];
    return latestPR && latestPR.status === "open";
  });

  if (releasedWithOpenPR.length > 0) {
    for (const mod of releasedWithOpenPR) {
      const url = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
      const prData = prStatus[mod.repo];
      const latestPR = prData?.prs?.[0];

      // Use a distinct style for released mods with new PRs: gold/amber color
      badges += `[![${
        mod.name
      }](https://img.shields.io/badge/${encodeURIComponent(mod.name).replace(
        /-/g,
        "--"
      )}-New_PR-f59e0b?style=flat-square&logo=curseforge&logoColor=white)](${url})`;
      badges += `[![#${latestPR.number}](https://img.shields.io/badge/%23${latestPR.number}-Open-3fb950?style=flat-square&logo=github&logoColor=white)](${latestPR.url})`;
      badges += "\n";
    }
    badges += "\n";
  }

  // In development mods
  for (const mod of modsData.mods.in_development || []) {
    const url = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
    const prData = prStatus[mod.repo];
    const latestPR = prData?.prs?.[0];

    badges += `[![${
      mod.name
    }](https://img.shields.io/badge/${encodeURIComponent(mod.name).replace(
      /-/g,
      "--"
    )}-Dev-6e7681?style=flat-square&logo=curseforge&logoColor=white)](${url})`;

    if (latestPR) {
      const prColor = latestPR.status === "merged" ? "a371f7" : "3fb950";
      const prLabel = latestPR.status === "merged" ? "Merged" : "Open";
      badges += `[![#${latestPR.number}](https://img.shields.io/badge/%23${latestPR.number}-${prLabel}-${prColor}?style=flat-square&logo=github&logoColor=white)](${latestPR.url})`;
    }
    badges += "\n";
  }

  // Add link to full version if there are hidden items
  if (hasHiddenItems) {
    badges += `\n[📋 View all projects](./assets/mods-card-light-full.svg)\n`;
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
