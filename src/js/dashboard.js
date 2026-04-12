/**
 * Dashboard — Compliance Dashboard rendering
 * Viser crosswalk-resultater med sikkerhedsprofil, storage tier,
 * triggered rules, platformanbefalinger og tredjelandsadvarsler.
 */
export class Dashboard {
  constructor(container) {
    this.container = container;
    this.result = null;
  }

  /**
   * Opdater dashboard med nye crosswalk-resultater
   * @param {object} result — output fra CrosswalkEngine.analyze()
   */
  update(result) {
    this.result = result;
    this.render();
  }

  render() {
    this.container.innerHTML = '';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `
      <div class="toolbar__group">
        <h2 style="font-size: var(--font-size-xl); font-weight: 600;">Compliance Dashboard</h2>
      </div>
      <div class="toolbar__group" id="dashboard-toolbar-actions"></div>
    `;
    this.container.appendChild(toolbar);

    if (!this.result || !this.result.hasData) {
      this._renderEmptyState();
      return;
    }

    // Tredjelandsadvarsler (øverst)
    if (this.result.thirdCountryWarnings.length > 0) {
      this._renderThirdCountryWarnings();
    }

    // Metadata oversigt (Ny)
    this._renderMetadata();
    
    // Summary grid: profil + tier
    this._renderSummary();

    // Dataset breakdown
    this._renderDatasetBreakdown();

    // Triggered rules
    this._renderTriggeredRules();

    // Krav
    this._renderRequirements();

    // Smart Alert: Arkivering af følsomme data (Funktion 2)
    if (this.result.overall.tier === 'cold' && this.result.overall.profile >= 2) {
      this._renderArchiveWarning();
    }

    // Platformanbefalinger
    this._renderPlatforms();
  }

  _renderEmptyState() {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📋</div>
        <div class="empty-state__title">Ingen data at analysere</div>
        <p>Udfyld maDMP-editoren eller importér en JSON-fil for at se compliance-analyse.</p>
      </div>
    `;
    this.container.appendChild(empty);
  }

  _renderMetadata() {
    const { title, contact, dataset, created, modified, description } = this.result.dmp || {};
    const dmpTitle = title || 'Navnløs DMP';
    const contactName = contact?.name || 'Ikke angivet';
    const dateStr = created ? new Date(created).toLocaleDateString('da-DK') : 'Ukendt dato';
    
    const card = document.createElement('div');
    card.className = 'card metadata-card';
    card.innerHTML = `
      <div class="metadata-grid">
        <div class="metadata-item">
          <label>DMP Titel</label>
          <div class="metadata-value">${this._escapeHtml(dmpTitle)}</div>
        </div>
        <div class="metadata-item">
          <label>Ansvarlig</label>
          <div class="metadata-value">${this._escapeHtml(contactName)}</div>
        </div>
        <div class="metadata-item">
          <label>Oprettet</label>
          <div class="metadata-value">${dateStr}</div>
        </div>
        <div class="metadata-item">
          <label>Datasæt</label>
          <div class="metadata-value">${this.result.datasets.length} stk.</div>
        </div>
      </div>
      ${description ? `
      <div class="metadata-description mt-lg">
        <label class="form-label">DMP Beskrivelse</label>
        <div class="metadata-value">${this._safeHtml(description)}</div>
      </div>` : ''}
    `;
    this.container.appendChild(card);
  }

  _renderThirdCountryWarnings() {
    for (const warning of this.result.thirdCountryWarnings) {
      const banner = document.createElement('div');
      banner.className = 'warning-banner';
      banner.innerHTML = `
        <div class="warning-banner__icon">⚠️</div>
        <div class="warning-banner__content">
          <div class="warning-banner__title">Tredjelandsoverførsel detekteret</div>
          <div class="warning-banner__text">${this._escapeHtml(warning.message)} Kræver Transfer Impact Assessment (TIA) og standardkontraktbestemmelser (SCC) iht. GDPR Kapitel V og URIS-retningslinjer.</div>
        </div>
      `;
      this.container.appendChild(banner);
    }
  }

  _renderSummary() {
    const grid = document.createElement('div');
    grid.className = 'summary-grid';

    const { overall } = this.result;

    // Profil badge
    const profileCard = document.createElement('div');
    profileCard.className = 'card';
    const colorClass = overall.profileLabel.color;
    profileCard.innerHTML = `
      <div class="card__header">
        <h3 class="card__title">🛡️ Sikkerhedsprofil</h3>
      </div>
      <div class="profile-badge profile-badge--${colorClass} profile-badge--animate">
        <div class="profile-badge__level">${this._profileEmoji(overall.profile)}</div>
        <div class="profile-badge__name">${overall.profileLabel.name}</div>
        <div class="profile-badge__description">${overall.profileLabel.level} — ${overall.profileLabel.description}</div>
      </div>
    `;
    grid.appendChild(profileCard);

    // Tier indikator
    const tierCard = document.createElement('div');
    tierCard.className = 'card';
    tierCard.innerHTML = `
      <div class="card__header">
        <h3 class="card__title">💾 Storage Tier</h3>
      </div>
      <div style="text-align: center; margin-bottom: var(--space-lg);">
        <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--tier-${overall.tier});">
          ${overall.tierLabel.name}
        </div>
        <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">
          ${overall.tierLabel.description}
        </div>
      </div>
      <div class="tier-indicator">
        <div class="tier-indicator__segment tier-indicator__segment--critical ${overall.tier === 'critical' ? 'tier-indicator__segment--active' : ''}">Critical</div>
        <div class="tier-indicator__segment tier-indicator__segment--hot ${overall.tier === 'hot' ? 'tier-indicator__segment--active' : ''}">Hot</div>
        <div class="tier-indicator__segment tier-indicator__segment--warm ${overall.tier === 'warm' ? 'tier-indicator__segment--active' : ''}">Warm</div>
        <div class="tier-indicator__segment tier-indicator__segment--cold ${overall.tier === 'cold' ? 'tier-indicator__segment--active' : ''}">Cold</div>
      </div>
    `;
    grid.appendChild(tierCard);

    this.container.appendChild(grid);
  }

  _renderDatasetBreakdown() {
    if (this.result.datasets.length === 0) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__header">
        <h3 class="card__title">📊 Datasæt-oversigt</h3>
        <span class="card__badge bg-${this.result.overall.profileLabel.color} text-${this.result.overall.profileLabel.color}">${this.result.datasets.length} datasæt</span>
      </div>
    `;

    const breakdown = document.createElement('div');
    breakdown.className = 'dataset-breakdown';

    for (const ds of this.result.datasets) {
      const row = document.createElement('div');
      row.className = 'dataset-result';

      const profileColor = ds.profileLabel.color;
      row.innerHTML = `
        <div>
          <div class="dataset-result__title">${this._escapeHtml(ds.title)}</div>
          <div class="dataset-result__type">${this._escapeHtml(ds.type)} · Persondata: ${ds.personalData} · Følsomme: ${ds.sensitiveData}</div>
          ${ds.description ? `<div class="dataset-result__description mt-sm">${this._safeHtml(ds.description)}</div>` : ''}
          <div class="dataset-result__format mt-sm">
            <span class="badge badge--sm">${(ds.format && ds.format.length > 0) ? ds.format.join(', ') : 'Format ikke angivet'}</span>
          </div>
        </div>
        <span class="dataset-result__profile bg-${profileColor} text-${profileColor}">
          ${this._profileEmoji(ds.profile)} ${ds.profileLabel.name}
        </span>
        <span class="dataset-result__tier" style="color: var(--tier-${ds.tier});">
          ${ds.tierLabel.name}
        </span>
      `;
      breakdown.appendChild(row);
    }

    card.appendChild(breakdown);
    this.container.appendChild(card);
  }

  _renderTriggeredRules() {
    if (this.result.triggeredRules.length === 0) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card__header">
          <h3 class="card__title">📜 Regulatorisk mapping</h3>
        </div>
        <div class="empty-state" style="padding: var(--space-lg);">
          <p style="color: var(--profile-green);">✅ Ingen compliance-regler aktiveret. Datasættene kræver ingen særlige foranstaltninger.</p>
        </div>
      `;
      this.container.appendChild(card);
      return;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__header">
        <h3 class="card__title">📜 Regulatorisk mapping</h3>
        <span class="card__badge rule-tag rule-tag--triggered">${this.result.triggeredRules.length} regler aktiveret</span>
      </div>
    `;

    const table = document.createElement('table');
    table.className = 'rules-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Regel</th>
          <th>Hjemmel</th>
          <th>Datasæt</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    for (const rule of this.result.triggeredRules) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${this._escapeHtml(rule.name)}</strong>
          <div style="font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px;">${this._escapeHtml(rule.description)}</div>
        </td>
        <td><code style="font-size: var(--font-size-xs);">${this._escapeHtml(rule.regulation)}</code></td>
        <td>${this._escapeHtml(rule.datasetTitle || '-')}</td>
        <td><span class="rule-tag rule-tag--triggered">Aktiveret</span></td>
      `;
      tbody.appendChild(tr);
    }

    card.appendChild(table);
    this.container.appendChild(card);
  }

  _renderRequirements() {
    if (this.result.requirements.length === 0) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__header">
        <h3 class="card__title">✅ Påkrævede foranstaltninger</h3>
      </div>
    `;

    const list = document.createElement('div');
    list.className = 'requirements-list';

    for (const req of this.result.requirements) {
      // Hent beskrivelsen fra lookup-tabellen, eller brug en fallback
      const detailText = this.result.requirementDetails[req] || 'Der er ingen yderligere uddybning af dette krav.';

      const detailsElement = document.createElement('details');
      detailsElement.className = 'requirement-item';

      const summary = document.createElement('summary');
      summary.className = 'requirement-item__summary';
      // Pil-ikonet styles via CSS
      summary.innerHTML = `<span class="requirement-item__icon">▸</span> <strong>${this._escapeHtml(req)}</strong>`;

      const content = document.createElement('div');
      content.className = 'requirement-item__content';
      content.textContent = detailText;

      detailsElement.appendChild(summary);
      detailsElement.appendChild(content);
      list.appendChild(detailsElement);
    }

    card.appendChild(list);
    this.container.appendChild(card);
  }

  _renderPlatforms() {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__header">
        <h3 class="card__title">🏛️ Anbefalede platforme</h3>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'platform-cards';

    for (const platform of this.result.platformRecommendations) {
      const pCard = document.createElement('div');
      pCard.className = `platform-card ${platform.recommended ? 'platform-card--recommended' : 'platform-card--unsuitable'}`;
      pCard.innerHTML = `
        <div class="platform-card__name">
          ${platform.recommended ? '✅' : '⛔'} ${this._escapeHtml(platform.name)}
        </div>
        <div class="platform-card__profiles">${this._escapeHtml(platform.description)}</div>
        ${platform.recommended ? `<a href="${platform.url}" target="_blank" rel="noopener" style="font-size: var(--font-size-xs); color: var(--ku-red);">Besøg →</a>` : ''}
      `;
      grid.appendChild(pCard);
    }

    card.appendChild(grid);
    this.container.appendChild(card);
  }

  _renderArchiveWarning() {
    const alert = document.createElement('div');
    alert.className = 'archive-alert';
    alert.innerHTML = `
      <div class="archive-alert__icon">💡</div>
      <div class="archive-alert__content">
        <strong>Business Case: Sikker Arkivering (Passiv fase)</strong>
        <p>Projektet er i "Cold Tier", men indeholder følsomme data. Ved at flytte disse data fra den aktive analyseplatform til et <strong>Sikkert WORM-Arkiv</strong>, kan institutionen opnå betydelige besparelser på storage-overførsler og backup-omkostninger, samtidig med at integritetskravene overholdes 100%.</p>
        <p style="margin-top: 8px; font-style: italic; font-size: 0.9em;">Anbefaling: Kontakt IT for at anmode om en passiv arkiv-provisionering frem for at lade miljøet køre videre i aktiv tilstand.</p>
      </div>
    `;
    this.container.appendChild(alert);
  }

  _profileEmoji(level) {
    return ['🟢', '🟡', '🟠', '🔴'][level] || '⚪';
  }

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Sikker rendering af begrænset HTML (Sanitizer)
   */
  _safeHtml(html) {
    if (!html) return '';
    
    // Brug browserens indbyggede DOMParser til sikker parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Liste over tilladte tags
    const allowedTags = ['P', 'BR', 'B', 'I', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'A'];
    
    const sanitize = (node) => {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const child = node.childNodes[i];
        
        if (child.nodeType === 1) { // Element node
          if (!allowedTags.includes(child.tagName)) {
            // Hvis tagget ikke er tilladt, behold teksten men fjern tagget
            const text = document.createTextNode(child.textContent);
            node.replaceChild(text, child);
          } else {
            // Hvis det er et link, rens attributterne
            if (child.tagName === 'A') {
              const href = child.getAttribute('href');
              // Tillad kun http/https links
              if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                child.setAttribute('target', '_blank');
                child.setAttribute('rel', 'noopener noreferrer');
              } else {
                child.removeAttribute('href');
              }
            }
            // Rens alle andre attributter
            const attrs = child.attributes;
            for (let j = attrs.length - 1; j >= 0; j--) {
              const attrName = attrs[j].name;
              if (child.tagName === 'A' && (attrName === 'href' || attrName === 'target' || attrName === 'rel')) continue;
              child.removeAttribute(attrName);
            }
            sanitize(child);
          }
        } else if (child.nodeType !== 3) { // Ikke tekst node
          node.removeChild(child);
        }
      }
    };
    
    sanitize(doc.body);
    return doc.body.innerHTML;
  }
}
