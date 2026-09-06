# GitHub profile

The README is a visual navigation page. Its motion is decorative, not a display
of research output, rankings, download totals or contribution metrics. Keep the
name and links concise; detailed work belongs on the linked websites.
The scene is the cover's main subject. Keep Alex Chengyu Li in the upper left
and a clear, outlined Explore my work button as the entry cue. The whole banner
links to the personal site. Do not restore an oversized handle,
add a replacement slogan, or turn the cover into a personal achievement poster.
Keep the GitHub bio factual and work-focused. Do not restore Sigma Xi membership
or similar credential claims to the bio or README; the author removed that
promotional framing. Membership may remain in LinkedIn's Organizations section.

`data/profile.json` owns the navigation labels and URLs. Run
`node .github/scripts/generate-profile.mjs` after editing it or the SVG renderer;
`node .github/scripts/generate-profile.mjs --check` verifies the committed output.
The embedded SVG animates in the browser without JavaScript, external assets,
scheduled regeneration or metadata polling. Retain reduced-motion support and
accessible ordinary links. Inspect the result in GitHub's actual README view.
The dark cover is a compact nebula; the light cover is a minimal
shoreline in warm paper white, muted blue-grey and vermilion. Use fine vector
curves, smooth tides and a small crab based on the Crab Research mark. Avoid
photoreal AI-generated images, broad gradients, soft clip-art clouds, cartoon
faces and oversized mascot graphics. Keep the crab clear of the entry button.
The user prefers refinement and smooth motion over visual complexity.
Do not add a red sun disc or national-symbol styling to the cover. Crab legs
must attach to the body and bend at connected joints; do not animate detached
leg fragments or rotate whole limbs around the body's center.
All three portals have matching dark and light palettes.
README picture sources use GitHub's supported prefers-color-scheme
selection, with the light variant as fallback. Generate both themes together;
keep their navigation and reduced-motion behavior synchronized. Inspect actual
image currentSrc in GitHub after switching appearance, not only SVG previews.

Typography uses licensed Instrument Serif for the signature and Instrument Sans
for navigation. The fonts are converted to SVG paths to avoid browser fallback.
`data/typography.json` contains outlines, kerning and font-source hashes; update
it with `python .github/scripts/prepare-typography.py` when changing the fonts.
Ordinary generation and CI need only Node. Keep font licenses in `assets/`.

The independent mod-data workflow feeds CrabMods and the existing personal
site's open-source page. Preserve `data/portfolio_mods.json` and its updater.
It does not own this README. Reconcile its automatic commits before pushing;
never force-push or add Co-Authored-By lines.
