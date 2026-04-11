/**
 * Schema Loader — Henter og resolver maDMP JSON Schema
 * Håndterer $ref-opløsning og returnerer en navigérbar struktur.
 */
export class SchemaLoader {
  constructor() {
    this.schema = null;
    this.defs = null;
  }

  /**
   * Indlæs schema fra sti
   * @param {string} path — relativ eller absolut sti til JSON-schema
   */
  async load(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Kunne ikke indlæse schema: ${response.statusText}`);
    }
    this.schema = await response.json();
    this.defs = this.schema.$defs || this.schema.definitions || {};
    return this.schema;
  }

  /**
   * Resolver en $ref til dens definition
   * @param {string} ref — f.eks. "#/$defs/Contact"
   */
  resolveRef(ref) {
    if (!ref || !ref.startsWith('#/')) return null;
    const parts = ref.replace('#/', '').split('/');
    let current = this.schema;
    for (const part of parts) {
      current = current?.[part];
      if (!current) return null;
    }
    return current;
  }

  /**
   * Resolver et property-objekt inklusive $ref, oneOf osv.
   * @param {object} prop — property-definition fra schema
   * @returns {object} — fuldt opløst property
   */
  resolveProperty(prop) {
    if (!prop) return prop;

    // Direkte $ref
    if (prop.$ref) {
      return this.resolveRef(prop.$ref);
    }

    // oneOf — tag første $ref
    if (prop.oneOf) {
      for (const option of prop.oneOf) {
        if (option.$ref) {
          return this.resolveRef(option.$ref);
        }
        if (option.type === 'array' && option.items?.$ref) {
          const resolved = this.resolveRef(option.items.$ref);
          return { type: 'array', items: resolved, ...option };
        }
      }
    }

    // Array items med $ref
    if (prop.type === 'array' && prop.items?.$ref) {
      const resolved = this.resolveRef(prop.items.$ref);
      return { ...prop, items: resolved };
    }

    return prop;
  }

  /**
   * Hent DMPData-definitionen (root-objektet)
   */
  getDMPSchema() {
    return this.defs?.DMPData || null;
  }

  /**
   * Hent Dataset-definitionen
   */
  getDatasetSchema() {
    return this.defs?.Dataset || null;
  }

  /**
   * Hent Distribution-definitionen
   */
  getDistributionSchema() {
    return this.defs?.Distribution || null;
  }

  /**
   * Hent alle properties for en given definition
   * @param {string} defName — f.eks. "Dataset", "Contact"
   * @returns {object} — properties med resolved refs
   */
  getPropertiesFor(defName) {
    const def = this.defs?.[defName];
    if (!def?.properties) return {};

    const resolved = {};
    for (const [key, prop] of Object.entries(def.properties)) {
      resolved[key] = {
        key,
        original: prop,
        resolved: this.resolveProperty(prop),
        required: (def.required || []).includes(key),
        title: prop.title || key,
        description: prop.description || '',
        type: prop.type || (prop.$ref ? 'object' : prop.oneOf ? 'oneOf' : 'unknown'),
        examples: prop.examples || []
      };
    }
    return resolved;
  }
}
