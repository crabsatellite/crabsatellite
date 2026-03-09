# Alex Li

Research engineer. Combinatorial optimization, AI governance, developer tooling.

M.S. Computer Engineering, New York University. Building open-source tools that fix real problems.

[![Personal Site](https://img.shields.io/badge/crabsatellite.com-blue?style=flat-square&logo=google-chrome&logoColor=white)](https://crabsatellite.com)

---

### Dockerfile Doctor

The only Dockerfile linter that **fixes what it finds**. 80 rules, 51 auto-fixers, pure Python, zero dependencies.

```
$ dockerfile-doctor --fix Dockerfile
  Line 3   [WARNING]  DD003  Missing --no-install-recommends  ✔ fixed
  Line 5   [WARNING]  DD004  Missing apt cache cleanup        ✔ fixed
  Line 8   [WARNING]  DD009  pip install without --no-cache-dir  ✔ fixed
  Applied 3 fixes → Dockerfile
```

[![PyPI](https://img.shields.io/pypi/v/dockerfile-doctor?style=flat-square&logo=pypi&logoColor=white)](https://pypi.org/project/dockerfile-doctor/)
[![CI](https://img.shields.io/github/actions/workflow/status/crabsatellite/dockerfile-doctor/ci.yml?style=flat-square&logo=github&label=CI)](https://github.com/crabsatellite/dockerfile-doctor/actions)
[![GitHub](https://img.shields.io/badge/GitHub-dockerfile--doctor-181717?style=flat-square&logo=github)](https://github.com/crabsatellite/dockerfile-doctor)

### Learned Control Layers for MaxSAT

First RL-based dynamic algorithm configuration for MaxSAT local search. PPO controller adjusts clause-weighting parameters during solving, discovering an explore-then-exploit noise schedule. Outperforms Bayesian-optimized static at scale (7/10 wins, p=0.019).

[![DOI](https://img.shields.io/badge/DOI-10.5281/zenodo.18924836-blue?style=flat-square&logo=zenodo)](https://doi.org/10.5281/zenodo.18924836)
[![GitHub](https://img.shields.io/badge/GitHub-learned--control--layers-181717?style=flat-square&logo=github)](https://github.com/crabsatellite/learned-control-layers)

### Z3 Tactic Evolution

A fixed tactic string that improves Z3's solve rate on nonlinear integer arithmetic (QF_NIA) by +2.2pp on test and +4.3pp on validation, with zero solver modification. Cross-validated on 3 external benchmark families.

[![DOI](https://img.shields.io/badge/DOI-10.5281/zenodo.18909825-blue?style=flat-square&logo=zenodo)](https://doi.org/10.5281/zenodo.18909825)
[![GitHub](https://img.shields.io/badge/GitHub-z3--tactic--evolution-181717?style=flat-square&logo=github)](https://github.com/crabsatellite/z3-tactic-evolution)

---

### Community

**Minecraft Modding** — 3 published mods on [CurseForge](https://www.curseforge.com/members/crabmods). Ported 9 mods to NeoForge/Forge 1.21 (Alex's Mobs, Alex's Caves, Tanuki Decor, Pelagic Prehistory, etc.).

[![CurseForge](https://img.shields.io/badge/CurseForge-CrabMods-F16436?style=flat-square&logo=curseforge&logoColor=white)](https://www.curseforge.com/members/crabmods)
