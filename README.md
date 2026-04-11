# maDMP Compliance & Storage Tier Tool

**Automatiseret mapping af forskningsdata til sikkerhedsprofiler og storage tiers.**

Et webbaseret værktøj der lader forskere beskrive deres datasæt via [RDA maDMP Common Standard v1.2](https://github.com/RDA-DMP-Common/RDA-DMP-Common-Standard) og automatisk mapper beskrivelsen til danske compliance-krav, sikkerhedsprofiler og storage tier-anbefalinger.

> Udviklet i konteksten af rapporten *"Strategisk rapport: Informationssikkerhed og IT-sikkerhed for Forskningsdata"* (April 2026).

---

## 🚀 Kom i gang

### Online (GitHub Pages)

Besøg: **[https://rolfmadsen.github.io/datamanagementplan/](https://rolfmadsen.github.io/datamanagementplan/)**

### Lokalt

```bash
git clone https://github.com/rolfmadsen/datamanagementplan.git
cd datamanagementplan
python3 -m http.server 8080
# Åbn http://localhost:8080/src/index.html
```

Eller brug VS Code Live Server og åbn `src/index.html`.

---

## 📋 Funktioner

### To skiftbare views

| View | Formål |
|------|--------|
| **✏️ Editor** | Udfyld en maDMP-skabelon med strukturerede felter. Eksportér som JSON. |
| **📊 Dashboard** | Se compliance-analyse med sikkerhedsprofil, storage tier og regulatorisk mapping. |

### Crosswalk-motor (Policy-as-Code)

Værktøjet implementerer en automatiseret "Crosswalk"-logik der mapper datasæt-metadata til juridiske og tekniske krav:

| Trigger | Hjemmel | Konsekvens |
|---------|---------|------------|
| `personal_data = yes` | GDPR Artikel 6 | Profil ≥ Gul, kryptering |
| `sensitive_data = yes` | GDPR Artikel 9 / DBL § 10 | Profil = Rød, Safe Haven |
| Nøgleord i security & privacy | DBL § 10 | Profil ≥ Orange |
| Host geo-lokation ∉ Datatilsynets liste | URIS / GDPR Kap. V | TIA + SCC-krav |
| Projekt slutdato overskredet | GDPR Art. 17 | Cold Tier (WORM) |
| Etiske issues eksisterer | Dansk kodeks 2026 | Profil ≥ Gul |
| Lukket adgang + persondata/følsomt | NIS2 § 6 | VPN + MFA + logkrav |

### Sikkerhedsprofiler (dansk 4-trins model)

| Niveau | Farve | Beskrivelse |
|--------|-------|-------------|
| 0 | 🟢 Grøn | Offentlig — Ingen risiko ved offentliggørelse |
| 1 | 🟡 Gul | Intern — Forbeholdt medarbejdere; lav negativ effekt |
| 2 | 🟠 Orange | Fortrolig — Risiko for betydelig skade |
| 3 | 🔴 Rød | Følsom — Højeste sikkerhedskrav; katastrofal effekt |

### Storage Tiers

| Tier | Beskrivelse |
|------|-------------|
| Critical | High Performance — Aktiv HPC-analyse |
| Hot | Active Research — Daglig adgang til aktive filer |
| Warm | Collaboration — Hyppig deling, versionsstyring |
| Cold | Archive — Langtidsbevaring (5-10 år), WORM |

### Import / Eksport

- **Importér** en eksisterende maDMP JSON-fil (drag-and-drop eller fil-vælger)
- **Eksportér** udfyldt formular som maDMP JSON
- **Download compliance-rapport** som tekstfil

---

## 🧪 Prøv med eksempeldata

Værktøjet inkluderer 10 RDA-eksempelfiler direkte i **📋 Eksempler**-menuen i toppen. Prøv f.eks. `ex9` som indeholder 3 datasæt med varierende compliance-profiler:

| Dataset | Persondata | Følsomt | Forventet profil |
|---------|:---:|:---:|:---:|
| Client application | Nej | Nej | 🟢 Grøn |
| Image collection | Nej | Ja | 🔴 Rød |
| Interviews | Ja | Nej | 🟡 Gul |

1. Åbn værktøjet
2. Vælg **📋 Eksempler → ex9** i header-menuen
3. Se compliance-analysen i **📊 Dashboard**
4. Skift til **✏️ Editor** for at tilrette felterne og se ændringerne live

---

## 🏗️ Arkitektur

Ren client-side applikation (HTML + CSS + JavaScript). Ingen build-step, ingen server, ingen afhængigheder.

```
datamanagementplan/
├── index.html                          ← Redirect til src/ (GitHub Pages)
├── example_dmp_metadata/               ← RDA eksempelfiler (fra RDA-DMP-Common-Standard)
│   ├── ex8-dmp-minimal-content.json
│   ├── ex9-dmp-long.json
│   └── ...
├── schema/
│   └── maDMP-schema-1.2.json          ← RDA maDMP v1.2 JSON Schema
├── src/
│   ├── index.html                     ← App shell
│   ├── css/styles.css                 ← KU designskabelon
│   ├── js/
│   │   ├── app.js                     ← Entry point
│   │   ├── schema-loader.js           ← JSON Schema resolver
│   │   ├── crosswalk-engine.js        ← Compliance mapping motor
│   │   ├── editor.js                  ← Dynamisk maDMP-formular
│   │   ├── dashboard.js               ← Compliance dashboard
│   │   └── import-export.js           ← JSON import/eksport
│   └── data/
│       └── crosswalk-rules.json       ← Deklarative crosswalk-regler
```

---

## 📦 RDA maDMP Common Standard

Dette projekt anvender JSON Schema og eksempelfiler fra [RDA DMP Common Standards Working Group](https://github.com/RDA-DMP-Common/RDA-DMP-Common-Standard):

- **`schema/maDMP-schema-1.2.json`** — JSON Schema der definerer den maskinlæsbare DMP-struktur (maDMP v1.2)
- **`example_dmp_metadata/`** — Eksempelfiler fra RDA-repositoriet (ex1–ex10), der demonstrerer forskellige DMP-scenarier

Schema og eksempelfiler er publiceret af RDA under [The Unlicense](https://github.com/RDA-DMP-Common/RDA-DMP-Common-Standard/blob/master/LICENSE.md) (public domain). Se den officielle [RDA maDMP specification](https://doi.org/10.15497/rda00039) for fuldstændig dokumentation.

---

## 📚 Grundlag

- [RDA maDMP Common Standard v1.2](https://github.com/RDA-DMP-Common/RDA-DMP-Common-Standard) — Schema og eksempler (The Unlicense)
- [Databeskyttelsesloven](https://www.retsinformation.dk/eli/lta/2024/289) — DBL § 10 (følsomme oplysninger)
- [Databeskyttelsesforordningen (GDPR)](https://www.retsinformation.dk/eli/retsinfo/2016/679) — Artikel 6, 9, 17
- [NIS2-loven](https://www.retsinformation.dk/eli/lta/2025/434)
- [Datatilsynet — Tredjelandsoverførsler](https://www.datatilsynet.dk/internationalt/tredjelandsoverfoersler)
- [URIS-retningslinjer](https://ufm.dk/publikationer/2022/maj/afrapportering-udvalg-om-retningslinjer-for-internationalt-forsknings-og-innovationssamarbejde/)
- [Dansk kodeks for integritet i forskning (2026)](https://ufsn.dk/publikationer/2026/januar/det-danske-kodeks-for-integritet-i-forskning/)
- [Københavns Universitets designguide](https://designguide.ku.dk)

---

## 📄 Licens

Dette projekt er licenseret under **GNU General Public License v3.0** — se [LICENSE](LICENSE).

**Bemærk:** JSON Schema og eksempelfiler i `schema/` og `example_dmp_metadata/` stammer fra [RDA-DMP-Common-Standard](https://github.com/RDA-DMP-Common/RDA-DMP-Common-Standard) og er publiceret under [The Unlicense](https://unlicense.org/) (public domain). The Unlicense er fuldt kompatibel med GPL 3.0 — public domain-materiale kan frit inkorporeres i GPL-licenserede projekter.

