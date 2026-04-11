/**
 * Editor — Dynamisk maDMP-formular baseret på JSON-schema
 * Genererer form-felter med fokus på compliance-relevante parametre.
 */
export class Editor {
  constructor(container, schemaLoader) {
    this.container = container;
    this.schema = schemaLoader;
    this.data = this._defaultDMP();
    this.activeDatasetIndex = 0;
    this.onDataChange = null;
  }

  /**
   * Standard DMP-struktur
   */
  _defaultDMP() {
    return {
      title: '',
      description: '',
      language: 'eng',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      dmp_id: { identifier: '', type: 'doi' },
      contact: {
        name: '',
        mbox: '',
        contact_id: { identifier: '', type: 'orcid' }
      },
      contributor: [],
      ethical_issues_exist: 'unknown',
      ethical_issues_description: '',
      ethical_issues_report: '',
      project: [{
        title: '',
        description: '',
        start: '',
        end: '',
        funding: []
      }],
      dataset: [this._defaultDataset()]
    };
  }

  _defaultDataset() {
    return {
      dataset_id: { identifier: '', type: 'handle' },
      title: '',
      type: '',
      description: '',
      personal_data: 'unknown',
      sensitive_data: 'unknown',
      security_and_privacy: [],
      technical_resource: [],
      distribution: [{
        title: '',
        byte_size: 0,
        data_access: 'open',
        format: [],
        host: {
          title: '',
          url: '',
          geo_location: '',
          support_versioning: 'unknown'
        },
        license: []
      }]
    };
  }

  /**
   * Indlæs data (f.eks. fra import)
   */
  loadData(dmpData) {
    this.data = dmpData;
    this.activeDatasetIndex = 0;
    this.render();
    this._notifyChange();
  }

  /**
   * Hent aktuelle data
   */
  getData() {
    return this.data;
  }

  /**
   * Render hele editoren
   */
  render() {
    this.container.innerHTML = '';

    // Toolbar
    const toolbar = this._createToolbar();
    this.container.appendChild(toolbar);

    // DMP Metadata sektion
    this.container.appendChild(this._renderDMPSection());

    // Kontakt sektion
    this.container.appendChild(this._renderContactSection());

    // Projekt sektion
    this.container.appendChild(this._renderProjectSection());

    // Etiske issues
    this.container.appendChild(this._renderEthicsSection());

    // Dataset tabs + aktive dataset
    this.container.appendChild(this._renderDatasetSection());
  }

  _createToolbar() {
    const div = document.createElement('div');
    div.className = 'toolbar';
    div.innerHTML = `
      <div class="toolbar__group">
        <h2 style="font-size: var(--font-size-xl); font-weight: 600;">maDMP Editor</h2>
      </div>
      <div class="toolbar__group">
        <button id="btn-clear-editor" class="btn btn--secondary btn--sm">🗑️ Ryd</button>
      </div>
    `;
    div.querySelector('#btn-clear-editor').addEventListener('click', () => {
      if (confirm('Er du sikker på at du vil rydde alle felter?')) {
        this.data = this._defaultDMP();
        this.activeDatasetIndex = 0;
        this.render();
        this._notifyChange();
      }
    });

    // Info-banner
    const info = document.createElement('div');
    info.style.cssText = 'background: #EBF0F5; border-left: 4px solid var(--ku-red); padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: var(--space-lg); font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6;';
    info.innerHTML = `
      <strong style="color: var(--text-primary);">📋 Sådan bruger du editoren</strong><br>
      Udfyld felterne nedenfor for at beskrive din Data Management Plan (DMP). Felter markeret med 
      <span style="color: var(--ku-red);">*</span> er påkrævede. Felter markeret med 🛡️ er 
      <strong>compliance-relevante</strong> og påvirker den anbefalede sikkerhedsprofil og storage tier.
      <br>Skift til <strong>📊 Dashboard</strong> for at se den automatiske compliance-analyse.
    `;
    div.appendChild(info);

    return div;
  }

  // ─── DMP Metadata ───────────────────────────────────────
  _renderDMPSection() {
    const card = this._card('📋 DMP Metadata');
    const grid = document.createElement('div');
    grid.className = 'form-group--inline';

    grid.appendChild(this._textInput('Titel', this.data.title, v => {
      this.data.title = v;
    }, true, 'text', 'F.eks. "DMP for klimadata-projekt 2026"'));

    grid.appendChild(this._selectInput('Sprog', this.data.language, [
      { value: 'eng', label: 'Engelsk' },
      { value: 'dan', label: 'Dansk' },
      { value: 'deu', label: 'Tysk' }
    ], v => { this.data.language = v; }));

    card.appendChild(grid);

    card.appendChild(this._textareaInput('Beskrivelse', this.data.description, v => {
      this.data.description = v;
    }, 'Kort beskrivelse af hvad denne DMP dækker — projektet, datasæt og datahåndtering.'));

    const idGrid = document.createElement('div');
    idGrid.className = 'form-group--inline';
    idGrid.appendChild(this._textInput('DMP ID', this.data.dmp_id?.identifier || '', v => {
      this.data.dmp_id.identifier = v;
    }, true, 'text', 'Persistent identifier for DMP\'en, f.eks. 10.1371/journal.pcbi.1006750'));
    idGrid.appendChild(this._selectInput('ID Type', this.data.dmp_id?.type || 'doi', [
      { value: 'doi', label: 'DOI' },
      { value: 'handle', label: 'Handle' },
      { value: 'ark', label: 'ARK' },
      { value: 'url', label: 'URL' }
    ], v => { this.data.dmp_id.type = v; }));
    card.appendChild(idGrid);

    return card;
  }

  // ─── Kontakt ────────────────────────────────────────────
  _renderContactSection() {
    const card = this._card('👤 Kontaktperson');
    const grid = document.createElement('div');
    grid.className = 'form-group--inline';

    const contact = this.data.contact || {};

    grid.appendChild(this._textInput('Navn', contact.name || '', v => {
      this.data.contact.name = v;
    }, true, 'text', 'Fulde navn på den primære kontaktperson for denne DMP'));
    grid.appendChild(this._textInput('E-mail', contact.mbox || '', v => {
      this.data.contact.mbox = v;
    }, true, 'email', 'Institutionel e-mailadresse'));

    card.appendChild(grid);

    const idGrid = document.createElement('div');
    idGrid.className = 'form-group--inline';
    const cid = contact.contact_id || (Array.isArray(contact.contact_id) ? contact.contact_id[0] : {});
    idGrid.appendChild(this._textInput('Kontakt-ID', cid?.identifier || '', v => {
      if (!this.data.contact.contact_id) this.data.contact.contact_id = {};
      if (Array.isArray(this.data.contact.contact_id)) {
        this.data.contact.contact_id[0].identifier = v;
      } else {
        this.data.contact.contact_id.identifier = v;
      }
    }, false, 'text', 'F.eks. ORCID: 0000-0002-1234-5678'));
    idGrid.appendChild(this._selectInput('ID Type', cid?.type || 'orcid', [
      { value: 'orcid', label: 'ORCID' },
      { value: 'isni', label: 'ISNI' },
      { value: 'other', label: 'Andet' }
    ], v => {
      if (Array.isArray(this.data.contact.contact_id)) {
        this.data.contact.contact_id[0].type = v;
      } else {
        this.data.contact.contact_id.type = v;
      }
    }));
    card.appendChild(idGrid);

    return card;
  }

  // ─── Projekt ────────────────────────────────────────────
  _renderProjectSection() {
    const card = this._card('🔬 Projekt');
    const project = this.data.project?.[0] || {};

    card.appendChild(this._textInput('Projekttitel', project.title || '', v => {
      if (!this.data.project) this.data.project = [{}];
      this.data.project[0].title = v;
    }, true, 'text', 'Det fulde navn på forskningsprojektet'));

    card.appendChild(this._textareaInput('Projektbeskrivelse', project.description || '', v => {
      this.data.project[0].description = v;
    }, 'Kort abstract der beskriver projektets mål, metode og forventet resultat.'));

    const dateGrid = document.createElement('div');
    dateGrid.className = 'form-group--inline';
    dateGrid.appendChild(this._dateInput('🛡️ Startdato', project.start || '', v => {
      this.data.project[0].start = v;
    }, false, 'Projektets officielle startdato'));
    dateGrid.appendChild(this._dateInput('🛡️ Slutdato', project.end || '', v => {
      this.data.project[0].end = v;
    }, false, 'Når slutdato er passeret anbefales Cold storage tier med WORM-arkivering'));
    card.appendChild(dateGrid);

    return card;
  }

  // ─── Etiske Issues ──────────────────────────────────────
  _renderEthicsSection() {
    const card = this._card('⚖️ Etiske problemstillinger');

    card.appendChild(this._radioInput(
      '🛡️ Etiske problemstillinger',
      this.data.ethical_issues_exist || 'unknown',
      [
        { value: 'yes', label: 'Ja' },
        { value: 'no', label: 'Nej' },
        { value: 'unknown', label: 'Ukendt' }
      ],
      v => {
        this.data.ethical_issues_exist = v;
        this._notifyChange();
      },
      true,
      'Vælg "Ja" hvis projektet involverer: mennesker, dyr, følsomme emner, GDPR-overholdelse, informeret samtykke, eller er underlagt etisk komité-godkendelse. Trigger: minimum Gul sikkerhedsprofil.'
    ));

    if (this.data.ethical_issues_exist === 'yes') {
      card.appendChild(this._textareaInput('Beskrivelse af etiske issues', this.data.ethical_issues_description || '', v => {
        this.data.ethical_issues_description = v;
      }));
      card.appendChild(this._textInput('Link til etisk rapport', this.data.ethical_issues_report || '', v => {
        this.data.ethical_issues_report = v;
      }, false, 'url'));
    }

    return card;
  }

  // ─── Datasæt ────────────────────────────────────────────
  _renderDatasetSection() {
    const wrapper = document.createElement('div');

    // Tabs
    const tabBar = document.createElement('div');
    tabBar.className = 'dataset-tabs';

    const datasets = this.data.dataset || [];
    datasets.forEach((ds, i) => {
      const tab = document.createElement('button');
      tab.className = `dataset-tab ${i === this.activeDatasetIndex ? 'dataset-tab--active' : ''}`;
      tab.textContent = ds.title || `Datasæt ${i + 1}`;
      tab.addEventListener('click', () => {
        this.activeDatasetIndex = i;
        this.render();
      });
      tabBar.appendChild(tab);
    });

    // Add-knap
    const addTab = document.createElement('button');
    addTab.className = 'dataset-tab dataset-tab--add';
    addTab.textContent = '+';
    addTab.title = 'Tilføj datasæt';
    addTab.addEventListener('click', () => {
      this.data.dataset.push(this._defaultDataset());
      this.activeDatasetIndex = this.data.dataset.length - 1;
      this.render();
      this._notifyChange();
    });
    tabBar.appendChild(addTab);
    wrapper.appendChild(tabBar);

    // Aktivt datasæt
    if (datasets.length > 0) {
      wrapper.appendChild(this._renderDatasetFields(this.activeDatasetIndex));
    }

    return wrapper;
  }

  _renderDatasetFields(index) {
    const ds = this.data.dataset[index];
    if (!ds) return document.createElement('div');

    const card = this._card(`📊 Datasæt: ${ds.title || 'Nyt datasæt'}`);

    // Titel + type
    const topGrid = document.createElement('div');
    topGrid.className = 'form-group--inline';
    topGrid.appendChild(this._textInput('Titel', ds.title || '', v => {
      ds.title = v;
      this.render(); // Opdater tab-titel
    }, true));
    topGrid.appendChild(this._textInput('Type', ds.type || '', v => { ds.type = v; },
      false, 'text', 'F.eks. Source code, Images, Survey, raw data'));
    card.appendChild(topGrid);

    card.appendChild(this._textareaInput('Beskrivelse', ds.description || '', v => {
      ds.description = v;
    }));

    // ── Compliance-kritiske felter ──
    const complianceHeader = document.createElement('div');
    complianceHeader.className = 'form-section__title';
    complianceHeader.innerHTML = '🛡️ Compliance-relevante parametre';
    card.appendChild(complianceHeader);

    card.appendChild(this._radioInput(
      '🛡️ Personoplysninger',
      ds.personal_data || 'unknown',
      [
        { value: 'yes', label: 'Ja' },
        { value: 'no', label: 'Nej' },
        { value: 'unknown', label: 'Ukendt' }
      ],
      v => { ds.personal_data = v; this._notifyChange(); },
      true,
      'Vælg "Ja" hvis datasættet kan identificere enkeltpersoner — f.eks. navne, e-mails, IP-adresser, stemme-/videooptagelser, GPS-lokationer, eller interviewdata. (GDPR Art. 6 → minimum Gul profil, kryptering påkrævet)'
    ));

    card.appendChild(this._radioInput(
      '🛡️ Følsomme data',
      ds.sensitive_data || 'unknown',
      [
        { value: 'yes', label: 'Ja' },
        { value: 'no', label: 'Nej' },
        { value: 'unknown', label: 'Ukendt' }
      ],
      v => { ds.sensitive_data = v; this._notifyChange(); },
      true,
      'Vælg "Ja" hvis datasættet indeholder: helbredsoplysninger, CPR-numre, biometrisk data (DNA, fingeraftryk), etnisk oprindelse, politisk overbevisning, fagforeningsmedlemskab, eller data under NDA. (GDPR Art. 9 → Rød profil, Safe Haven krævet)'
    ));

    // Distribution
    card.appendChild(this._renderDistributionFields(ds, index));

    // Slet-knap
    if (this.data.dataset.length > 1) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn--danger btn--sm';
      deleteBtn.textContent = '🗑️ Slet dette datasæt';
      deleteBtn.style.marginTop = 'var(--space-lg)';
      deleteBtn.addEventListener('click', () => {
        this.data.dataset.splice(index, 1);
        this.activeDatasetIndex = Math.max(0, this.activeDatasetIndex - 1);
        this.render();
        this._notifyChange();
      });
      card.appendChild(deleteBtn);
    }

    return card;
  }

  _renderDistributionFields(ds, dsIndex) {
    const section = document.createElement('div');
    section.className = 'form-section';

    const title = document.createElement('div');
    title.className = 'form-section__title';
    title.textContent = '📦 Distribution';
    section.appendChild(title);

    const dist = ds.distribution?.[0] || {};

    const grid1 = document.createElement('div');
    grid1.className = 'form-group--inline';
    grid1.appendChild(this._textInput('Distributionstitel', dist.title || '', v => {
      if (!ds.distribution) ds.distribution = [{}];
      ds.distribution[0].title = v;
    }));
    grid1.appendChild(this._numberInput('Størrelse (bytes)', dist.byte_size || 0, v => {
      if (!ds.distribution) ds.distribution = [{}];
      ds.distribution[0].byte_size = parseInt(v) || 0;
    }, '🛡️ Bruges til storage tier estimering'));
    section.appendChild(grid1);

    const grid2 = document.createElement('div');
    grid2.className = 'form-group--inline';
    grid2.appendChild(this._selectInput('🛡️ Dataadgang', dist.data_access || 'open', [
      { value: 'open', label: 'Åben (Open)' },
      { value: 'shared', label: 'Delt (Shared)' },
      { value: 'closed', label: 'Lukket (Closed)' }
    ], v => {
      if (!ds.distribution) ds.distribution = [{}];
      ds.distribution[0].data_access = v;
      this._notifyChange();
    }));

    // Host geo_location
    grid2.appendChild(this._textInput('🛡️ Host geo-lokation (landekode)', dist.host?.geo_location || '', v => {
      if (!ds.distribution) ds.distribution = [{}];
      if (!ds.distribution[0].host) ds.distribution[0].host = {};
      ds.distribution[0].host.geo_location = v.toUpperCase();
      this._notifyChange();
    }, false, 'text', 'ISO 3166-1 kode, f.eks. DK, DE, US'));
    section.appendChild(grid2);

    // Host info
    const grid3 = document.createElement('div');
    grid3.className = 'form-group--inline';
    grid3.appendChild(this._textInput('Host navn', dist.host?.title || '', v => {
      if (!ds.distribution) ds.distribution = [{}];
      if (!ds.distribution[0].host) ds.distribution[0].host = {};
      ds.distribution[0].host.title = v;
    }));
    grid3.appendChild(this._textInput('Host URL', dist.host?.url || '', v => {
      if (!ds.distribution) ds.distribution = [{}];
      if (!ds.distribution[0].host) ds.distribution[0].host = {};
      ds.distribution[0].host.url = v;
    }, false, 'url'));
    section.appendChild(grid3);

    return section;
  }

  // ─── Form Helpers ───────────────────────────────────────
  _card(title) {
    const card = document.createElement('div');
    card.className = 'card';
    const header = document.createElement('div');
    header.className = 'card__header';
    header.innerHTML = `<h3 class="card__title">${title}</h3>`;
    card.appendChild(header);
    return card;
  }

  _textInput(label, value, onChange, required = false, type = 'text', hint = '') {
    const group = document.createElement('div');
    group.className = 'form-group';
    const isCompliance = label.startsWith('🛡️');
    const cleanLabel = label.replace('🛡️ ', '');

    group.innerHTML = `
      <label class="form-label ${required ? 'form-label--required' : ''} ${isCompliance ? 'form-label--compliance' : ''}">${cleanLabel}</label>
      <input class="form-input" type="${type}" value="${this._escapeHtml(value)}" ${required ? 'required' : ''}>
      ${hint ? `<div class="form-hint">${hint}</div>` : ''}
    `;
    const input = group.querySelector('input');
    input.addEventListener('input', () => {
      onChange(input.value);
      this._notifyChange();
    });
    return group;
  }

  _numberInput(label, value, onChange, hint = '') {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML = `
      <label class="form-label">${label}</label>
      <input class="form-input" type="number" value="${value}" min="0">
      ${hint ? `<div class="form-hint">${hint}</div>` : ''}
    `;
    const input = group.querySelector('input');
    input.addEventListener('input', () => {
      onChange(input.value);
      this._notifyChange();
    });
    return group;
  }

  _textareaInput(label, value, onChange, hint = '') {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML = `
      <label class="form-label">${label}</label>
      <textarea class="form-textarea">${this._escapeHtml(value)}</textarea>
      ${hint ? `<div class="form-hint">${hint}</div>` : ''}
    `;
    const textarea = group.querySelector('textarea');
    textarea.addEventListener('input', () => {
      onChange(textarea.value);
      this._notifyChange();
    });
    return group;
  }

  _selectInput(label, value, options, onChange) {
    const group = document.createElement('div');
    group.className = 'form-group';
    const isCompliance = label.startsWith('🛡️');
    const cleanLabel = label.replace('🛡️ ', '');

    const optionsHtml = options
      .map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`)
      .join('');

    group.innerHTML = `
      <label class="form-label ${isCompliance ? 'form-label--compliance' : ''}">${cleanLabel}</label>
      <select class="form-select">${optionsHtml}</select>
    `;
    const select = group.querySelector('select');
    select.addEventListener('change', () => {
      onChange(select.value);
      this._notifyChange();
    });
    return group;
  }

  _radioInput(label, value, options, onChange, required = false, hint = '') {
    const group = document.createElement('div');
    group.className = 'form-group';
    const isCompliance = label.startsWith('🛡️');
    const cleanLabel = label.replace('🛡️ ', '');
    const name = `radio-${cleanLabel.replace(/\s/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const radiosHtml = options.map(o => `
      <label class="radio-option">
        <input type="radio" name="${name}" value="${o.value}" ${o.value === value ? 'checked' : ''}>
        ${o.label}
      </label>
    `).join('');

    group.innerHTML = `
      <label class="form-label ${required ? 'form-label--required' : ''} ${isCompliance ? 'form-label--compliance' : ''}">${cleanLabel}</label>
      <div class="radio-group">${radiosHtml}</div>
      ${hint ? `<div class="form-hint">${hint}</div>` : ''}
    `;

    group.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        onChange(radio.value);
      });
    });

    return group;
  }

  _dateInput(label, value, onChange, required = false, hint = '') {
    const group = document.createElement('div');
    group.className = 'form-group';
    const isCompliance = label.startsWith('🛡️');
    const cleanLabel = label.replace('🛡️ ', '');

    group.innerHTML = `
      <label class="form-label ${required ? 'form-label--required' : ''} ${isCompliance ? 'form-label--compliance' : ''}">${cleanLabel}</label>
      <input class="form-input" type="date" value="${value}">
      ${hint ? `<div class="form-hint">${hint}</div>` : ''}
    `;
    const input = group.querySelector('input');
    input.addEventListener('change', () => {
      onChange(input.value);
      this._notifyChange();
    });
    return group;
  }

  _escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _notifyChange() {
    this.data.modified = new Date().toISOString();
    if (this.onDataChange) {
      this.onDataChange(this.data);
    }
  }
}
