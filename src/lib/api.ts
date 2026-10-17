/**
 * 100% Local, Offline API Service.
 * Replaces all remote HTTP / Axios calls with local file & localStorage persistence.
 * Zero network dependencies.
 */

import * as localDb from './localDb';

export const auth = {
  login: async (credentials: { email?: string; password?: string }) => {
    const result = localDb.authenticateLocalUser(
      credentials.email || '',
      credentials.password || ''
    );
    return { data: result };
  },

  register: async (data: { email?: string; password?: string; fullName?: string }) => {
    localDb.registerLocalUser(
      data.email || '',
      data.password || '',
      data.fullName || ''
    );
    return { data: { message: 'User created successfully' } };
  },

  getMe: async () => {
    const savedUserStr = localStorage.getItem('user');
    const savedProfileStr = localStorage.getItem('profile');

    if (savedProfileStr) {
      return { data: JSON.parse(savedProfileStr) };
    }

    if (savedUserStr) {
      const user = JSON.parse(savedUserStr);
      const profile = localDb.getProfiles().find((p) => p.id === user.profile_id) || localDb.getProfiles()[0];
      return { data: profile };
    }

    throw new Error('Not authenticated');
  },
};

export const technicians = {
  getAll: async () => {
    const data = localDb.getTechnicians();
    return { data };
  },

  getAvailableProfiles: async () => {
    const data = localDb.getAvailableProfilesForTechnicians();
    return { data };
  },

  create: async (data: Parameters<typeof localDb.createTechnician>[0]) => {
    const created = localDb.createTechnician(data);
    return { data: created };
  },

  update: async (id: string, data: Parameters<typeof localDb.updateTechnician>[1]) => {
    const updated = localDb.updateTechnician(id, data);
    return { data: updated };
  },

  delete: async (id: string) => {
    localDb.deleteTechnician(id);
    return { data: { message: 'Technician deleted' } };
  },
};

export const panels = {
  getAll: async () => {
    const data = localDb.getPanels();
    return { data };
  },

  getById: async (id: string) => {
    const data = localDb.getPanelById(id);
    if (!data) throw new Error('Panel not found');
    return { data };
  },

  create: async (data: Parameters<typeof localDb.createPanel>[0]) => {
    const created = localDb.createPanel(data);
    return { data: created };
  },

  update: async (id: string, data: Parameters<typeof localDb.updatePanel>[1]) => {
    const updated = localDb.updatePanel(id, data);
    return { data: updated };
  },

  delete: async (id: string) => {
    localDb.deletePanel(id);
    return { data: { message: 'Panel deleted' } };
  },

  getImageList: async (category: string) => {
    const list = localDb.getSignImageList(category);
    return { data: list };
  },
};

export const interventions = {
  getAll: async () => {
    const data = localDb.getInterventions();
    return { data };
  },

  create: async (data: Parameters<typeof localDb.createIntervention>[0]) => {
    const created = localDb.createIntervention(data);
    return { data: created };
  },

  update: async (id: string, data: Parameters<typeof localDb.updateIntervention>[1]) => {
    const updated = localDb.updateIntervention(id, data);
    return { data: updated };
  },
};

export const dashboard = {
  getStats: async () => {
    const stats = localDb.getDashboardStats();
    return { data: stats };
  },
};

export const commands = {
  getAll: async () => {
    const data = localDb.getCommands();
    return { data };
  },

  create: async (data: Parameters<typeof localDb.createCommand>[0]) => {
    const created = localDb.createCommand(data);
    return { data: created };
  },
};

export const localDataManagement = {
  resetToDefaults: () => localDb.resetToDefaultData(),
  exportJson: () => localDb.exportAllDataAsJson(),
  importJson: (json: string) => localDb.importAllDataFromJson(json),
  exportPanelsCsv: () => localDb.exportPanelsToCSV(),
  exportInterventionsCsv: () => localDb.exportInterventionsToCSV(),
  subscribe: (cb: (key: string) => void) => localDb.subscribeToUpdates(cb),
};

export default {
  auth,
  technicians,
  panels,
  interventions,
  dashboard,
  commands,
  localDataManagement,
};
