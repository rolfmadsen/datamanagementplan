/**
 * Import/Export — JSON import, eksport og validering
 * Understøtter drag-and-drop og fil-vælger.
 */
export class ImportExport {
  constructor() {
    this.onImport = null;
  }

  /**
   * Opret import-zone UI-element
   * @returns {HTMLElement}
   */
  createImportZone() {
    const zone = document.createElement('div');
    zone.className = 'import-zone';
    zone.id = 'import-zone';
    zone.innerHTML = `
      <div class="import-zone__icon">📂</div>
      <div class="import-zone__text">Træk en maDMP JSON-fil hertil, eller klik for at vælge</div>
      <div class="import-zone__hint">Understøtter RDA maDMP Common Standard v1.2</div>
      <input type="file" accept=".json,application/json" id="file-input">
    `;

    const fileInput = zone.querySelector('#file-input');

    // Klik for at åbne fil-vælger
    zone.addEventListener('click', (e) => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });

    // Fil valgt
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this._readFile(file);
    });

    // Drag-and-drop
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('import-zone--dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('import-zone--dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('import-zone--dragover');
      const file = e.dataTransfer.files[0];
      if (file) this._readFile(file);
    });

    return zone;
  }

  /**
   * Læs og parse JSON-fil
   */
  _readFile(file) {
    if (!file.name.endsWith('.json')) {
      alert('Kun JSON-filer understøttes.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const dmpData = this._extractDMP(data);

        if (!dmpData) {
          alert('Filen indeholder ikke et gyldigt maDMP-objekt. Forventet struktur: { "dmp": { ... } }');
          return;
        }

        if (this.onImport) {
          this.onImport(dmpData);
        }
      } catch (err) {
        alert(`Fejl ved parsing af JSON: ${err.message}`);
      }
    };

    reader.readAsText(file);
  }

  /**
   * Udtræk DMP-data fra JSON (håndterer { dmp: {...} } wrapper)
   */
  _extractDMP(data) {
    // Direkte dmp-wrapper
    if (data.dmp) {
      return data.dmp;
    }

    // Allerede et DMP-objekt (har dataset og dmp_id)
    if (data.dataset && data.dmp_id) {
      return data;
    }

    return null;
  }

  /**
   * Eksportér DMP-data som JSON-fil download
   * @param {object} dmpData — dmp-objektet
   */
  exportJSON(dmpData) {
    const wrapper = {
      "$schema": "../schema/maDMP-schema-1.2.json",
      dmp: dmpData
    };

    const json = JSON.stringify(wrapper, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const title = dmpData.title ? dmpData.title.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, '_').toLowerCase() : 'madmp';
    a.download = `${title}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Eksportér compliance-rapport som tekst
   * @param {object} result — crosswalk-resultat
   * @param {object} dmpData — dmp-data
   */
  exportReport(result, dmpData) {
    if (!result || !result.hasData) {
      alert('Ingen compliance-data at eksportere. Udfyld editoren først.');
      return;
    }

    const lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('COMPLIANCE-RAPPORT — maDMP Crosswalk Analyse');
    lines.push(`Genereret: ${new Date().toLocaleString('da-DK')}`);
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`DMP Titel: ${dmpData.title || 'Ikke angivet'}`);
    lines.push(`DMP ID: ${dmpData.dmp_id?.identifier || 'Ikke angivet'}`);
    lines.push('');

    lines.push('── SAMLET VURDERING ──────────────────────────────────────────');
    lines.push(`Sikkerhedsprofil: ${result.overall.profileLabel.name} (${result.overall.profileLabel.level})`);
    lines.push(`  → ${result.overall.profileLabel.description}`);
    lines.push(`Storage Tier: ${result.overall.tierLabel.name}`);
    lines.push(`  → ${result.overall.tierLabel.description}`);
    lines.push('');

    lines.push('── DATASÆT ───────────────────────────────────────────────────');
    for (const ds of result.datasets) {
      lines.push(`  ${ds.title}`);
      lines.push(`    Profil: ${ds.profileLabel.name} | Tier: ${ds.tierLabel.name}`);
      lines.push(`    Persondata: ${ds.personalData} | Følsomme data: ${ds.sensitiveData}`);
    }
    lines.push('');

    if (result.triggeredRules.length > 0) {
      lines.push('── AKTIVEREDE REGLER ─────────────────────────────────────────');
      for (const rule of result.triggeredRules) {
        lines.push(`  ▸ ${rule.name}`);
        lines.push(`    Hjemmel: ${rule.regulation}`);
        if (rule.datasetTitle) lines.push(`    Datasæt: ${rule.datasetTitle}`);
      }
      lines.push('');
    }

    if (result.requirements.length > 0) {
      lines.push('── PÅKRÆVEDE FORANSTALTNINGER ────────────────────────────────');
      for (const req of result.requirements) {
        lines.push(`  • ${req}`);
      }
      lines.push('');
    }

    if (result.thirdCountryWarnings.length > 0) {
      lines.push('── TREDJELANDSADVARSLER ──────────────────────────────────────');
      for (const w of result.thirdCountryWarnings) {
        lines.push(`  ⚠️ ${w.message}`);
      }
      lines.push('');
    }

    lines.push('── ANBEFALEDE PLATFORME ──────────────────────────────────────');
    for (const p of result.platformRecommendations) {
      lines.push(`  ${p.recommended ? '✅' : '⛔'} ${p.name} — ${p.description}`);
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('Genereret af maDMP Compliance Tool — Københavns Universitet');

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_rapport_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
