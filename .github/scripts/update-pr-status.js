const fs = require("fs");
const path = require("path");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_AUTHOR = "crabsatellite";

async function fetchPRs(repo) {
  const [owner, repoName] = repo.split("/");

  // Search for open PRs by author
  const openUrl = `https://api.github.com/search/issues?q=repo:${repo}+author:${GITHUB_AUTHOR}+type:pr+state:open&sort=updated&order=desc&per_page=1`;

  // Search for merged PRs by author
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
    const openData = await openResponse.json();

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
    console.error(`Error fetching PRs for ${repo}:`, error.message);
    return null;
  }
}

async function main() {
  const dataPath = path.join(__dirname, "../../data/mods.json");
  const modsData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  console.log("Updating PR status for all mods...\n");

  const prStatus = {};

  for (const mod of modsData.mods.in_development) {
    console.log(`Checking ${mod.name} (${mod.repo})...`);
    const pr = await fetchPRs(mod.repo);

    if (pr) {
      prStatus[mod.repo] = pr;
      console.log(`  → ${pr.status.toUpperCase()}: PR #${pr.number}`);
    } else {
      console.log(`  → No PRs found`);
    }

    // Rate limiting - wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Update the mods.json with PR status
  modsData.pr_status = prStatus;
  modsData.last_updated = new Date().toISOString();

  fs.writeFileSync(dataPath, JSON.stringify(modsData, null, 2) + "\n");
  console.log("\n✓ PR status updated successfully!");
  console.log(`Last updated: ${modsData.last_updated}`);

  // Generate README section
  await generateReadmeSection(modsData);
}

async function generateReadmeSection(modsData) {
  const readmePath = path.join(__dirname, "../../README.md");
  let readme = fs.readFileSync(readmePath, "utf8");

  // CurseForge URL mapping
  const curseforgeUrls = {
    "AlexModGuy/AlexsMobs":
      "https://www.curseforge.com/minecraft/mc-mods/alexs-mobs",
    "AlexModGuy/AlexsCaves":
      "https://www.curseforge.com/minecraft/mc-mods/alexs-caves",
    "AlexModGuy/Rats": "https://www.curseforge.com/minecraft/mc-mods/rats",
    "AlexModGuy/Citadel":
      "https://www.curseforge.com/minecraft/mc-mods/citadel",
    "MinecraftModDevelopmentMods/Extra-Golems":
      "https://www.curseforge.com/minecraft/mc-mods/extra-golems",
    "skyjay1/Pelagic-Prehistory":
      "https://www.curseforge.com/minecraft/mc-mods/pelagic-prehistory",
    "skyjay1/GreekFantasy":
      "https://www.curseforge.com/minecraft/mc-mods/greekfantasy",
    "skyjay1/RPG-Gods": "https://www.curseforge.com/minecraft/mc-mods/rpg-gods",
  };

  // Generate the In Development section HTML
  let cardsHtml = "";

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

    const curseforgeUrl = curseforgeUrls[mod.repo] || "#";

    cardsHtml += `    <div class="card">
      <h3><a href="${curseforgeUrl}">${mod.name}</a>${prLink}</h3>
      <p>${mod.description}</p>
      <span class="tag">${mod.role}</span>
      <span class="tag">In Progress</span>
      <span class="tag">${mod.migration}</span>
    </div>\n`;
  }

  // Replace the In Development section
  const sectionStart =
    '<div class="section">\n  <h2>In Development — Active Migration</h2>';
  const sectionEnd = "</div>\n</div>\n\n---";

  const startIndex = readme.indexOf(sectionStart);
  const endIndex = readme.indexOf(sectionEnd, startIndex) + sectionEnd.length;

  if (startIndex !== -1 && endIndex !== -1) {
    const newSection = `<div class="section">
  <h2>In Development — Active Migration</h2>
  <div class="grid">
${cardsHtml}  </div>
</div>

---`;

    readme =
      readme.substring(0, startIndex) + newSection + readme.substring(endIndex);
    fs.writeFileSync(readmePath, readme);
    console.log("✓ README.md updated!");
  }
}

main().catch(console.error);
