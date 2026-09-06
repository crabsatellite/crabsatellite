# GitHub profile

The README is a visual navigation page. Its motion is decorative, not a display
of research output, rankings, download totals or contribution metrics. Keep the
name and links concise; detailed work belongs on the linked websites.

`data/profile.json` owns the navigation labels and URLs. Run
`node .github/scripts/generate-profile.mjs` after editing it or the SVG renderer;
`node .github/scripts/generate-profile.mjs --check` verifies the committed output.
The embedded SVG animates in the browser without JavaScript, external assets,
scheduled regeneration or metadata polling. Retain reduced-motion support and
accessible ordinary links. Inspect the result in GitHub's actual README view.

The independent mod-data workflow feeds CrabMods and the existing personal
site's open-source page. Preserve `data/portfolio_mods.json` and its updater.
It does not own this README. Reconcile its automatic commits before pushing;
never force-push or add Co-Authored-By lines.
