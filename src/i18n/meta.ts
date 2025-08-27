export type MetaKey = 'home' | 'calendar' | 'config' | 'movements' | 'about';

interface MetaEntry { title: string; description: string; }

type Locale = 'en' | 'it';

type MetaMap = Record<Locale, Record<MetaKey, MetaEntry>>;

export const metaContent: MetaMap = {
  en: {
    home: {
      title: 'JANET – Expense & Budget Tracker',
      description: 'Privacy-first expense tracker with recurring templates, monthly budgets, projections and calendar insights.'
    },
    calendar: {
      title: 'Calendar – JANET',
      description: 'Monthly calendar of incomes & expenses with synthetic recurring previews.'
    },
    config: {
      title: 'Configuration – JANET',
      description: 'Configure recurring or one-off expenses, manage budgets and workspace collaboration.'
    },
    movements: {
      title: 'Movements – JANET',
      description: 'Chronological ledger of incomes and expenses with running balance and projections.'
    },
    about: {
      title: 'About – JANET',
      description: 'What JANET offers: fast input, recurring automation, budgets, projections, shared workspaces.'
    }
  },
  it: {
    home: {
      title: 'JANET – Tracker Spese & Budget',
      description: 'Tracker spese privacy-first con ricorrenze, budget mensili, proiezioni e vista calendario.'
    },
    calendar: {
      title: 'Calendario – JANET',
      description: 'Calendario mensile di entrate e uscite con anteprima ricorrenze sintetiche.'
    },
    config: {
      title: 'Configurazione – JANET',
      description: 'Configura spese una tantum o ricorrenti, gestisci i budget e la collaborazione workspace.'
    },
    movements: {
      title: 'Movimenti – JANET',
      description: 'Registro cronologico di entrate e uscite con saldo progressivo e proiezioni.'
    },
    about: {
      title: 'Informazioni – JANET',
      description: 'Cosa offre JANET: inserimento rapido, ricorrenze automatiche, budget, proiezioni, workspace condivisi.'
    }
  }
};

export function getMeta(locale: Locale, key: MetaKey): MetaEntry {
  const loc = (locale === 'it' || locale === 'en') ? locale : 'en';
  return metaContent[loc][key] || metaContent.en[key];
}
