# GitHub profile

The README is a short technical introduction for the developer community: a
cover with the name and two lines about the work, then three project cards.
It introduces the work, not a professional persona. Keep the real name: formal
attributions point here (Google DeepMind's Formal Conjectures records Erdős
#1212 as solved by Alex Chengyu Li and links this account; IBM's DFAH-Bench
credits AEGIS with a link to it). Do not show the employer, job titles, a
résumé-style headline, an oversized handle or a slogan. Keep the GitHub bio
factual and work-focused. Do not restore Sigma Xi membership or similar
credential claims to the bio or README; the author removed that promotional
framing. Membership may remain in LinkedIn's Organizations section.

Each project card states one plain sentence about the project, then the
external source and what it records, in that source's own terms (for example
"recorded as solved", "credits AEGIS"). Do not upgrade the wording into claims
the source does not make. Team work stays attributed to the team: HotBath is a
CrabMods team mod and is not presented as a solo project. Pinned repositories
carry breadth; avoid repeating the card projects there.

`data/profile.json` owns the cover copy, project cards and footer links. Run
`node .github/scripts/generate-profile.mjs` after editing it or the renderer;
`node .github/scripts/generate-profile.mjs --check` verifies the committed
output, and the generator fails if any line is wider than its box.

Design system: the cover and the cards share one card shape (14 radius,
hairline edge, warm paper or ink ground), equal gutters, one vermilion accent,
one line-drawing stroke weight and one type scale (Instrument Serif for names
and titles, Instrument Sans for everything else). Each card image is a third
of the row with the card inset inside it, so outer edges align with the cover.
The cover figure is computed: lattice points in a fixed window and a real
admissible unit-step path for the Erdős 1212 setting. Keep it truthful if the
window changes; the generator searches and fails when no path crosses.
Motion is slow and decorative, stops under reduced motion, and needs no
JavaScript, external assets, scheduled regeneration or metadata polling.
README picture sources use GitHub's prefers-color-scheme selection with the
light variant as fallback. Generate both themes together and inspect the
actual GitHub README view in both appearances, not only SVG previews.

Typography is converted to SVG paths to avoid browser fallback.
`data/typography.json` holds outlines for printable ASCII plus the extra
characters listed in `.github/scripts/prepare-typography.py` (currently ő, ·
and —), with kerning and font-source hashes. Add a character there and rerun
`python .github/scripts/prepare-typography.py` (needs fontTools) before using
it. Ordinary generation and CI need only Node. Keep font licenses in `assets/`.

The independent mod-data workflow feeds CrabMods and the existing personal
site's open-source page. Preserve `data/portfolio_mods.json` and its updater.
It does not own this README. Reconcile its automatic commits before pushing;
never force-push or add Co-Authored-By lines.
