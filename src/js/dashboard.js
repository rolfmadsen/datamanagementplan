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

    // Summary grid: profil + tier
    this._renderSummary();

    // Dataset breakdown
    this._renderDatasetBreakdown();

    // Triggered rules
    this._renderTriggeredRules();

    // Krav
    this._renderRequirements();

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

    const list = document.createElement('ul');
    list.style.cssText = 'list-style: none; display: grid; gap: var(--space-sm);';
    for (const req of this.result.requirements) {
      const li = document.createElement('li');
      li.style.cssText = 'display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm); background: var(--bg-page); border-radius: 6px; font-size: var(--font-size-sm);';
      li.innerHTML = `<span style="color: var(--ku-red);">▸</span> ${this._escapeHtml(req)}`;
      list.appendChild(li);
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

  _profileEmoji(level) {
    return ['🟢', '🟡', '🟠', '🔴'][level] || '⚪';
  }

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
