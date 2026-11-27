# Profile visual sources

The profile cover and project cards are built from SVG primitives in
`.github/scripts/generate-profile.mjs`. The cover figure is computed, not drawn:
its dots are integer lattice points and the highlighted path is a unit-step
path through the coprime points with a composite coordinate (the Erdős Problem
1212 setting), found by search in a fixed window. The small crab follows the
existing Crab Research mark. No generated photographic image is used.

Typography:

- Instrument Sans, by the Instrument Sans Project Authors:
  https://github.com/Instrument/instrument-sans
- Instrument Serif, by the Instrument Serif Project Authors:
  https://github.com/Instrument/instrument-serif

Font binaries were obtained from the corresponding `ofl/instrumentsans` and
`ofl/instrumentserif` directories of https://github.com/google/fonts.
The original SIL Open Font License files accompany both fonts in this folder.
The build uses vector outlines rather than fetching fonts from a third party.
