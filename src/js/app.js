/**
 * App — Entry point, view routing og application state
 * Koordinerer Editor, Dashboard, CrosswalkEngine og ImportExport.
 */
import { SchemaLoader } from './schema-loader.js';
import { CrosswalkEngine } from './crosswalk-engine.js';
import { Editor } from './editor.js';
import { Dashboard } from './dashboard.js';
import { ImportExport } from './import-export.js';

class App {
  constructor() {
    this.schemaLoader = new SchemaLoader();
    this.crosswalkEngine = null;
    this.editor = null;
    this.dashboard = null;
    this.importExport = new ImportExport();
    this.currentView = 'editor';
    this.lastResult = null;
  }

  async init() {
    try {
      // Indlæs schema og crosswalk-regler parallelt
      const [, crosswalkRules] = await Promise.all([
        this.schemaLoader.load('../schema/maDMP-schema-1.2.json'),
        fetch('data/crosswalk-rules.json').then(r => r.json())
      ]);

      // Initialiser crosswalk engine
      this.crosswalkEngine = new CrosswalkEngine(crosswalkRules);

      // Initialiser editor
      const editorContainer = document.getElementById('view-editor');
      this.editor = new Editor(editorContainer, this.schemaLoader);
      this.editor.onDataChange = (data) => this._onDataChange(data);
      this.editor.render();

      // Initialiser dashboard
      const dashboardContainer = document.getElementById('view-dashboard');
      this.dashboard = new Dashboard(dashboardContainer);

      // Import zone i dashboard
      this._setupDashboardImport(dashboardContainer);

      // View switching
      this._setupViewSwitcher();

      // Header actions
      this._setupHeaderActions();

      // Import handler
      this.importExport.onImport = (dmpData) => this._handleImport(dmpData);

      // Initial analyse
      this._onDataChange(this.editor.getData());

      console.log('maDMP Compliance Tool initialiseret.');
    } catch (error) {
      console.error('Initialiseringsfejl:', error);
      document.getElementById('view-editor').innerHTML = `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state__icon">❌</div>
            <div class="empty-state__title">Initialiseringsfejl</div>
            <p>${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  _setupViewSwitcher() {
    const buttons = document.querySelectorAll('.view-switcher__btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this._switchView(view);
      });
    });
  }

  _switchView(view) {
    this.currentView = view;

    // Opdater knapper
    document.querySelectorAll('.view-switcher__btn').forEach(btn => {
      btn.classList.toggle('view-switcher__btn--active', btn.dataset.view === view);
    });

    // Opdater views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('view--active', v.id === `view-${view}`);
    });

    // Re-render dashboard ved switch
    if (view === 'dashboard' && this.lastResult) {
      this.dashboard.update(this.lastResult);
    }
  }

  _setupHeaderActions() {
    const exportBtn = document.getElementById('btn-export');
    const importBtn = document.getElementById('btn-import');
    const reportBtn = document.getElementById('btn-report');
    const exampleSelector = document.getElementById('example-selector');

    // Eksempel-vælger
    if (exampleSelector) {
      exampleSelector.addEventListener('change', async () => {
        const filename = exampleSelector.value;
        if (!filename) return;

        try {
          const response = await fetch(`../example_dmp_metadata/${filename}`);
          if (!response.ok) throw new Error(`Kunne ikke hente ${filename}`);
          const data = await response.json();
          const dmpData = data.dmp || data;
          this._handleImport(dmpData);

          // Reset dropdown til placeholder
          exampleSelector.selectedIndex = 0;
        } catch (err) {
          alert(`Fejl ved indlæsning af eksempel: ${err.message}`);
          exampleSelector.selectedIndex = 0;
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.importExport.exportJSON(this.editor.getData());
      });
    }

    if (importBtn) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const data = JSON.parse(ev.target.result);
              const dmpData = data.dmp || data;
              this._handleImport(dmpData);
            } catch (err) {
              alert(`Fejl ved parsing: ${err.message}`);
            }
          };
          reader.readAsText(file);
          fileInput.value = '';
        }
      });
    }

    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        this.importExport.exportReport(this.lastResult, this.editor.getData());
      });
    }
  }

  _setupDashboardImport(container) {
    // Tilføj import-zone som det første i dashboard (vises kun når ingen data)
    // Import-zonen flyttes op over dashboard-indhold
  }

  _handleImport(dmpData) {
    this.editor.loadData(dmpData);
    this._switchView('dashboard');
  }

  _onDataChange(dmpData) {
    if (!this.crosswalkEngine) return;
    this.lastResult = this.crosswalkEngine.analyze(dmpData);

    // Live-opdatering af dashboard hvis synlig
    if (this.currentView === 'dashboard') {
      this.dashboard.update(this.lastResult);
    }
  }
}

// Start applikationen
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
