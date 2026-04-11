/**
 * Crosswalk Engine — Policy-as-Code compliance mapping
 * Mapper maDMP-data til sikkerhedsprofiler og storage tiers
 * baseret på deklarative regler fra crosswalk-rules.json.
 */
export class CrosswalkEngine {
  constructor(rules) {
    this.rules = rules.rules;
    this.adequateCountries = this._buildCountrySet(rules.adequateCountries);
    this.platforms = rules.platforms;
    this.profileLabels = rules.profileLabels;
    this.tierLabels = rules.tierLabels;
  }

  /**
   * Byg et Set af alle sikre landekoder (EU/EØS + tilstrækkelige tredjelande)
   */
  _buildCountrySet(config) {
    const set = new Set();
    for (const code of (config.euEea || [])) set.add(code.toUpperCase());
    for (const code of (config.adequate || [])) set.add(code.toUpperCase());
    return set;
  }

  /**
   * Kør komplet crosswalk-analyse på en maDMP
   * @param {object} dmpData — dmp objektet fra maDMP JSON
   * @returns {object} — samlet resultat med profil, tier, triggered rules, advarsler
   */
  analyze(dmpData) {
    if (!dmpData) {
      return this._emptyResult();
    }

    const datasets = dmpData.dataset || [];
    const datasetResults = datasets.map((ds, i) => this._analyzeDataset(ds, dmpData, i));

    // DMP-niveau: højeste profil + passende tier
    const overallProfile = Math.max(0, ...datasetResults.map(r => r.profile));
    const overallTier = this._determineTier(dmpData, datasets);

    // Saml alle triggered rules
    const allTriggered = [];
    const seenRules = new Set();
    for (const dr of datasetResults) {
      for (const rule of dr.triggeredRules) {
        const key = `${rule.id}-${dr.datasetIndex}`;
        if (!seenRules.has(key)) {
          seenRules.add(key);
          allTriggered.push({ ...rule, datasetTitle: dr.title, datasetIndex: dr.datasetIndex });
        }
      }
    }

    // DMP-niveau regler (etiske issues)
    const dmpRules = this._checkDmpLevelRules(dmpData);
    for (const rule of dmpRules) {
      if (!seenRules.has(rule.id)) {
        seenRules.add(rule.id);
        allTriggered.push(rule);
      }
    }

    // Tredjelandsadvarsler
    const thirdCountryWarnings = this._checkThirdCountry(dmpData, datasets);

    // Platformanbefalinger
    const platformRecommendations = this._recommendPlatforms(overallProfile);

    // Saml alle krav
    const allRequirements = new Set();
    for (const rule of allTriggered) {
      for (const req of (rule.requirements || [])) {
        allRequirements.add(req);
      }
    }

    return {
      overall: {
        profile: overallProfile,
        profileLabel: this.profileLabels[overallProfile],
        tier: overallTier,
        tierLabel: this.tierLabels[overallTier]
      },
      datasets: datasetResults,
      triggeredRules: allTriggered,
      thirdCountryWarnings,
      platformRecommendations,
      requirements: [...allRequirements],
      hasData: true
    };
  }

  /**
   * Analysér et enkelt datasæt
   */
  _analyzeDataset(dataset, dmpData, index) {
    let profile = 0;
    const triggeredRules = [];
    const requirements = [];

    // Regel 1: Personal data
    if (dataset.personal_data === 'yes') {
      const rule = this.rules.find(r => r.id === 'gdpr-art6');
      if (rule) {
        profile = Math.max(profile, rule.consequence.min_profile);
        triggeredRules.push({
          id: rule.id,
          name: rule.name,
          regulation: rule.regulation,
          description: rule.description,
          requirements: rule.consequence.requirements
        });
        requirements.push(...rule.consequence.requirements);
      }
    }

    // Regel 2: Sensitive data
    if (dataset.sensitive_data === 'yes') {
      const rule = this.rules.find(r => r.id === 'gdpr-art9');
      if (rule) {
        profile = Math.max(profile, rule.consequence.min_profile);
        triggeredRules.push({
          id: rule.id,
          name: rule.name,
          regulation: rule.regulation,
          description: rule.description,
          requirements: rule.consequence.requirements
        });
        requirements.push(...rule.consequence.requirements);
      }
    }

    // Regel 3: Security & privacy nøgleord
    if (dataset.security_and_privacy && Array.isArray(dataset.security_and_privacy)) {
      const ruleConfig = this.rules.find(r => r.id === 'dbl-10-keywords');
      if (ruleConfig) {
        const keywords = ruleConfig.trigger.value;
        const allText = dataset.security_and_privacy
          .map(sp => `${sp.title || ''} ${sp.description || ''}`.toLowerCase())
          .join(' ');

        if (keywords.some(kw => allText.includes(kw))) {
          profile = Math.max(profile, ruleConfig.consequence.min_profile);
          triggeredRules.push({
            id: ruleConfig.id,
            name: ruleConfig.name,
            regulation: ruleConfig.regulation,
            description: ruleConfig.description,
            requirements: ruleConfig.consequence.requirements
          });
          requirements.push(...ruleConfig.consequence.requirements);
        }
      }
    }

    // Regel 7: NIS2 — closed + persondata/sensitiv
    if (dataset.distribution && Array.isArray(dataset.distribution)) {
      const hasClosed = dataset.distribution.some(d => d.data_access === 'closed');
      const hasSensitiveOrPersonal = dataset.personal_data === 'yes' || dataset.sensitive_data === 'yes';

      if (hasClosed && hasSensitiveOrPersonal) {
        const rule = this.rules.find(r => r.id === 'nis2-closed-sensitive');
        if (rule) {
          profile = Math.max(profile, rule.consequence.min_profile);
          triggeredRules.push({
            id: rule.id,
            name: rule.name,
            regulation: rule.regulation,
            description: rule.description,
            requirements: rule.consequence.requirements
          });
          requirements.push(...rule.consequence.requirements);
        }
      }
    }

    // Bestem tier for dette datasæt
    const tier = this._determineTier(dmpData, [dataset]);

    return {
      datasetIndex: index,
      title: dataset.title || `Datasæt ${index + 1}`,
      type: dataset.type || 'Ukendt',
      personalData: dataset.personal_data,
      sensitiveData: dataset.sensitive_data,
      profile,
      profileLabel: this.profileLabels[profile],
      tier,
      tierLabel: this.tierLabels[tier],
      triggeredRules,
      requirements: [...new Set(requirements)]
    };
  }

  /**
   * Tjek DMP-niveau regler (etiske issues)
   */
  _checkDmpLevelRules(dmpData) {
    const triggered = [];

    // Etiske issues
    if (dmpData.ethical_issues_exist === 'yes') {
      const rule = this.rules.find(r => r.id === 'ethical-issues');
      if (rule) {
        triggered.push({
          id: rule.id,
          name: rule.name,
          regulation: rule.regulation,
          description: rule.description,
          requirements: rule.consequence.requirements,
          datasetTitle: 'DMP-niveau'
        });
      }
    }

    return triggered;
  }

  /**
   * Tjek tredjelandsoverførsler
   */
  _checkThirdCountry(dmpData, datasets) {
    const warnings = [];

    // Tjek host geo_location i distributions
    for (const ds of datasets) {
      if (!ds.distribution) continue;
      for (const dist of ds.distribution) {
        if (dist.host?.geo_location) {
          const code = dist.host.geo_location.toUpperCase();
          if (!this.adequateCountries.has(code)) {
            warnings.push({
              type: 'geo_location',
              country: code,
              dataset: ds.title || 'Ukendt datasæt',
              host: dist.host.title || 'Ukendt host',
              message: `Host "${dist.host.title || 'Ukendt'}" er placeret i ${code}, som ikke har tilstrækkelighedsafgørelse.`
            });
          }
        }
      }
    }

    // Tjek contributor affiliations (landekoder i identifier/name)
    if (dmpData.contributor && Array.isArray(dmpData.contributor)) {
      for (const contrib of dmpData.contributor) {
        if (contrib.affiliation && Array.isArray(contrib.affiliation)) {
          for (const aff of contrib.affiliation) {
            // Tjek om affiliation_id indeholder en landekode
            if (aff.affiliation_id?.identifier) {
              const match = aff.affiliation_id.identifier.match(/^([A-Z]{2})/i);
              if (match) {
                const code = match[1].toUpperCase();
                if (!this.adequateCountries.has(code)) {
                  warnings.push({
                    type: 'affiliation',
                    country: code,
                    contributor: contrib.name || 'Ukendt',
                    message: `Bidragyder "${contrib.name}" er tilknyttet en institution i ${code}.`
                  });
                }
              }
            }
          }
        }
      }
    }

    return warnings;
  }

  /**
   * Bestem storage tier baseret på projektfase og data
   */
  _determineTier(dmpData, datasets) {
    const now = new Date();

    // Tjek om projekt er afsluttet
    const projects = dmpData.project || [];
    let projectEnded = false;
    let projectActive = false;

    for (const p of projects) {
      if (p.end) {
        const endDate = new Date(p.end);
        if (endDate < now) {
          projectEnded = true;
        } else {
          projectActive = true;
        }
      } else {
        projectActive = true; // Intet slutdato = aktivt
      }
    }

    if (projects.length === 0) {
      projectActive = true; // Default: aktivt
    }

    // Tjek om technical_resource indikerer HPC
    const hpcKeywords = ['hpc', 'gpu', 'cluster', 'supercomputer', 'high performance'];
    let hasHPC = false;
    for (const ds of datasets) {
      if (ds.technical_resource && Array.isArray(ds.technical_resource)) {
        for (const tr of ds.technical_resource) {
          const text = `${tr.name || ''} ${tr.description || ''}`.toLowerCase();
          if (hpcKeywords.some(kw => text.includes(kw))) {
            hasHPC = true;
          }
        }
      }
    }

    // Tier-logik
    if (projectEnded && !projectActive) {
      return 'cold';
    }
    if (hasHPC) {
      return 'critical';
    }

    // Tjek for samarbejdsindikatorer
    const hasVersioning = datasets.some(ds =>
      ds.distribution?.some(d => d.host?.support_versioning === 'yes')
    );
    if (hasVersioning) {
      return 'warm';
    }

    return 'hot';
  }

  /**
   * Anbefal platforme baseret på sikkerhedsprofil
   */
  _recommendPlatforms(profile) {
    return this.platforms.map(platform => ({
      ...platform,
      recommended: platform.supported_profiles.includes(profile),
      suitable: platform.supported_profiles.includes(profile)
    }));
  }

  /**
   * Tomt resultat når ingen data er tilgængelig
   */
  _emptyResult() {
    return {
      overall: null,
      datasets: [],
      triggeredRules: [],
      thirdCountryWarnings: [],
      platformRecommendations: [],
      requirements: [],
      hasData: false
    };
  }
}
