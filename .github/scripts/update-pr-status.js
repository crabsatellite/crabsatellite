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

  // Generate README sections
  await generateReadmeSections(modsData);
}

/**
 * Generate both Released and In Development sections in README
 */
async function generateReadmeSections(modsData) {
  const readmePath = path.join(__dirname, "../../README.md");
  let readme = fs.readFileSync(readmePath, "utf8");

  // Generate Released section
  let releasedCardsHtml = "";
  for (const mod of modsData.mods.released) {
    const curseforgeUrl = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
    releasedCardsHtml += `    <div class="card">
      <h3><a href="${curseforgeUrl}">${mod.name}</a></h3>
      <p>${mod.description}</p>
      <span class="tag">${mod.role}</span>
      <span class="tag">Released</span>
      <span class="tag">${mod.migration}</span>
    </div>\n`;
  }

  // Generate In Development section
  let devCardsHtml = "";
  for (const mod of modsData.mods.in_development) {
    const pr = modsData.pr_status[mod.repo];
    let prLink = "";

    if (pr) {
      if (pr.status === "open") {
        prLink = ` <a href="${pr.url}" class="pr-link">→ PR</a>`;
      } else if (pr.status === "merged") {
        prLink = ` <a href="${pr.url}" class="pr-link merged">✓ Merged</a>`;
      }
    }

    const curseforgeUrl = `${CURSEFORGE_BASE}/${mod.curseforge_slug}`;
    devCardsHtml += `    <div class="card">
      <h3><a href="${curseforgeUrl}">${mod.name}</a>${prLink}</h3>
      <p>${mod.description}</p>
      <span class="tag">${mod.role}</span>
      <span class="tag">In Progress</span>
      <span class="tag">${mod.migration}</span>
    </div>\n`;
  }

  // Replace Released section using regex for better matching
  const releasedRegex =
    /<div class="section">\s*<h2>Released.*?Version Migration Complete<\/h2>[\s\S]*?<\/div>\s*<\/div>\s*(?=<div class="section">)/;

  const newReleasedSection = `<div class="section">
  <h2>Released — Version Migration Complete</h2>
  <div class="grid">
${releasedCardsHtml}  </div>
</div>

`;

  if (releasedRegex.test(readme)) {
    readme = readme.replace(releasedRegex, newReleasedSection);
    console.log("✓ Released section updated!");
  } else {
    console.log("⚠ Released section not found in README");
  }

  // Replace In Development section using regex
  const devRegex =
    /<div class="section">\s*<h2>In Development.*?Active Migration<\/h2>[\s\S]*?<\/div>\s*<\/div>\s*---/;

  const newDevSection = `<div class="section">
  <h2>In Development — Active Migration</h2>
  <div class="grid">
${devCardsHtml}  </div>
</div>

---`;

  if (devRegex.test(readme)) {
    readme = readme.replace(devRegex, newDevSection);
    fs.writeFileSync(readmePath, readme);
    console.log("✓ In Development section updated!");
  } else {
    console.log("⚠ In Development section not found in README");
  }
}

main().catch(console.error);
