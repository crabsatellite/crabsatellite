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
The dark cover is a nebula; the light cover is a sunny beach with drifting
clouds, small waves and a red crab walking sideways, moving its legs and claws.
Keep the crab on the sand and clear of the entry button. Do not recolor the
nebula white or restore an empty sky-only cover.
All three portals have matching dark and light palettes.
README picture sources use GitHub's supported prefers-color-scheme
selection, with the light variant as fallback. Generate both themes together;
keep their navigation and reduced-motion behavior synchronized. Inspect actual
image currentSrc in GitHub after switching appearance, not only SVG previews.

The independent mod-data workflow feeds CrabMods and the existing personal
site's open-source page. Preserve `data/portfolio_mods.json` and its updater.
It does not own this README. Reconcile its automatic commits before pushing;
never force-push or add Co-Authored-By lines.
