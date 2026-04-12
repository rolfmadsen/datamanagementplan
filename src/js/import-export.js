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
    console.log('Eksporterer JSON...');
    const wrapper = {
      "$schema": "../schema/maDMP-schema-1.2.json",
      dmp: dmpData
    };

    const json = JSON.stringify(wrapper, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.getElementById('hidden-download-link');
    a.href = url;
    const title = dmpData.title ? dmpData.title.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, '_').toLowerCase() : 'madmp';
    a.download = `${title}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    // Øget timeout for Linux/Brave stabilitet
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.href = '';
      a.download = '';
    }, 1000);
  }

  /**
   * Eksportér compliance-rapport som et rigt dokument (.doc / HTML)
   * @param {object} result — crosswalk-resultat
   * @param {object} dmpData — dmp-data
   */
  exportReport(result, dmpData) {
    if (!result || !result.hasData) {
      alert('Ingen compliance-data at eksportere. Udfyld editoren først.');
      return;
    }
    console.log('Genererer rapport...');

    const dateStr = new Date().toLocaleString('da-DK');
    const dmpTitle = dmpData.title || 'Ikke angivet';
    const dmpId = dmpData.dmp_id?.identifier || 'Ikke angivet';

    // Generér HTML-indhold til dokumentet
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Compliance Rapport</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #333; }
          .header { background-color: #901A1E; color: white; padding: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 24pt; }
          .header p { margin: 5px 0 0 0; opacity: 0.8; }
          
          h2 { color: #901A1E; border-bottom: 2px solid #E0E0E0; padding-bottom: 5px; margin-top: 30px; }
          h3 { color: #666; margin-top: 20px; }
          
          .summary-box { background: #F5F5F5; border-left: 5px solid #901A1E; padding: 15px; margin: 20px 0; }
          .summary-item { margin-bottom: 10px; }
          .label { font-weight: bold; color: #555; width: 150px; display: inline-block; }
          
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #EEEEEE; text-align: left; padding: 10px; border: 1px solid #DDD; }
          td { padding: 10px; border: 1px solid #DDD; vertical-align: top; }
          
          .badge { padding: 3px 8px; border-radius: 3px; font-weight: bold; font-size: 9pt; }
          .badge-green { background: #E8F5E9; color: #2E7D32; }
          .badge-yellow { background: #FFFDE7; color: #F9A825; }
          .badge-orange { background: #FFF3E0; color: #EF6C00; }
          .badge-red { background: #FFEBEE; color: #C62828; }
          
          .requirement { margin-bottom: 15px; border: 1px solid #E0E0E0; border-radius: 5px; }
          .req-title { background: #F9FAFB; padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #E0E0E0; }
          .req-body { padding: 10px 12px; font-size: 10pt; color: #555; }
          
          .footer { margin-top: 50px; font-size: 9pt; color: #888; text-align: center; border-top: 1px solid #EEE; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Compliance Rapport</h1>
          <p>maDMP Crosswalk Analyse · Genereret ${dateStr}</p>
        </div>

        <div class="summary-box">
          <div class="summary-item"><span class="label">DMP Titel:</span> ${this._escapeHtml(dmpTitle)}</div>
          <div class="summary-item"><span class="label">DMP ID:</span> ${this._escapeHtml(dmpId)}</div>
          <div class="summary-item"><span class="label">Sikkerhedsprofil:</span> <strong>${result.overall.profileLabel.name} (${result.overall.profileLabel.level})</strong></div>
          <div class="summary-item"><span class="label">Storage Tier:</span> <strong>${result.overall.tierLabel.name}</strong></div>
        </div>

        <h2>📊 Datasæt Oversigt</h2>
        <table>
          <thead>
            <tr>
              <th>Datasæt</th>
              <th>Type</th>
              <th>Persondata / Følsomme</th>
              <th>Sikkerhedsprofil</th>
              <th>Storage Tier</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const ds of result.datasets) {
      const color = ds.profileLabel.color;
      html += `
        <tr>
          <td><strong>${this._escapeHtml(ds.title)}</strong></td>
          <td>${this._escapeHtml(ds.type)}</td>
          <td>${ds.personalData} / ${ds.sensitiveData}</td>
          <td><span class="badge badge-${color}">${ds.profileLabel.name}</span></td>
          <td>${ds.tierLabel.name}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>

        <h2>📜 Regulatorisk Mapping</h2>
        <table>
          <thead>
            <tr>
              <th>Regel / Hjemmel</th>
              <th>Beskrivelse</th>
              <th>Datasæt</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (result.triggeredRules.length === 0) {
      html += `<tr><td colspan="3" style="text-align: center; color: green;">Ingen compliance-regler aktiveret.</td></tr>`;
    } else {
      for (const rule of result.triggeredRules) {
        html += `
          <tr>
            <td><strong>${this._escapeHtml(rule.name)}</strong><br><small>${this._escapeHtml(rule.regulation)}</small></td>
            <td>${this._escapeHtml(rule.description)}</td>
            <td>${this._escapeHtml(rule.datasetTitle || 'DMP-niveau')}</td>
          </tr>
        `;
      }
    }

    html += `
          </tbody>
        </table>

        <h2>✅ Påkrævede foranstaltninger</h2>
    `;

    if (result.requirements.length === 0) {
      html += `<p style="color: green;">Ingen særlige foranstaltninger påkrævet.</p>`;
    } else {
      for (const req of result.requirements) {
        const detail = result.requirementDetails[req] || 'Beskrivelse ikke tilgængelig.';
        html += `
          <div class="requirement">
            <div class="req-title">▸ ${this._escapeHtml(req)}</div>
            <div class="req-body">${this._escapeHtml(detail)}</div>
          </div>
        `;
      }
    }

    if (result.thirdCountryWarnings.length > 0) {
      html += `<h2>⚠️ Tredjelandsoverførsler</h2><ul>`;
      for (const w of result.thirdCountryWarnings) {
        html += `<li style="color: #EF6C00; margin-bottom: 5px;">${this._escapeHtml(w.message)}</li>`;
      }
      html += `</ul>`;
    }

    html += `
        <div class="footer">
          <p>Dette dokument er genereret automatisk af DMP Storage Guide — Københavns Universitet.</p>
          <p>Værktøjet benytter Crosswalk-logik baseret på GDPR, NIS2, URIS-retningslinjer og Dansk kodeks for integritet i forskning.</p>
        </div>
      </body>
      </html>
    `;

    // Download som .doc (via Data URI for at omgå Brave/HTTP blokering)
    const base64Html = btoa(unescape(encodeURIComponent('\ufeff' + html)));
    const dataUri = 'data:application/msword;base64,' + base64Html;

    const a = document.getElementById('hidden-download-link');
    a.href = dataUri;
    const fileNameTitle = dmpData.title ? dmpData.title.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, '_').toLowerCase() : 'madmp';
    a.download = `compliance_rapport_${fileNameTitle}_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();

    // Ryd op efter download
    setTimeout(() => {
      a.href = '';
      a.download = '';
    }, 1000);
  }

  /**
   * Escape HTML-specialkarakterer
   */
  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
