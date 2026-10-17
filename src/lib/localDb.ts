import initialProfiles from '../data/initialProfiles.json';
import initialUsers from '../data/initialUsers.json';
import initialPanels from '../data/initialPanels.json';
import initialTechnicians from '../data/initialTechnicians.json';
import initialInterventions from '../data/initialInterventions.json';
import initialCommands from '../data/initialCommands.json';
import signCatalog from '../data/signCatalog.json';

import {
  Panel,
  Technician,
  Intervention,
  InterventionType,
  InterventionStatus,
  InterventionPriority,
  PanelCommand,
  Profile,
  DashboardStats,
  PanelCategory
} from '../types/database';

export interface StoredUser {
  id: string;
  email: string;
  password?: string;
  profile_id: string;
  created_at: string;
}

const STORAGE_KEYS = {
  PROFILES: 'geosignal_profiles',
  USERS: 'geosignal_users',
  PANELS: 'geosignal_panels',
  TECHNICIANS: 'geosignal_technicians',
  INTERVENTIONS: 'geosignal_interventions',
  COMMANDS: 'geosignal_commands',
  INITIALIZED: 'geosignal_data_initialized',
};

// Safe localStorage access
function getStoredItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyLocalChange(key);
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

// Broadcast updates for real-time multi-tab sync
let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('geosignal_sync');
  }
} catch {
  // BroadcastChannel unavailable or restricted
}

function notifyLocalChange(key: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('geosignal_update', { detail: { key } }));
  if (channel) {
    channel.postMessage({ key, timestamp: Date.now() });
  }
}

export function subscribeToUpdates(callback: (key: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<{ key: string }>;
    if (custom.detail?.key) {
      callback(custom.detail.key);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key && e.key.startsWith('geosignal_')) {
      callback(e.key);
    }
  };

  const handleChannelMessage = (e: MessageEvent) => {
    if (e.data?.key) {
      callback(e.data.key);
    }
  };

  window.addEventListener('geosignal_update', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  if (channel) {
    channel.addEventListener('message', handleChannelMessage);
  }

  return () => {
    window.removeEventListener('geosignal_update', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
    }
  };
}

// Initialize default data if not present
export function initializeLocalDatabase(): void {
  if (typeof window === 'undefined') return;

  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!initialized) {
    resetToDefaultData();
  }
}

export function resetToDefaultData(): void {
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(initialProfiles));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
  localStorage.setItem(STORAGE_KEYS.PANELS, JSON.stringify(initialPanels));
  localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(initialTechnicians));
  localStorage.setItem(STORAGE_KEYS.INTERVENTIONS, JSON.stringify(initialInterventions));
  localStorage.setItem(STORAGE_KEYS.COMMANDS, JSON.stringify(initialCommands));
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  notifyLocalChange('all');
}

// Auto-run on module load
initializeLocalDatabase();

// --------------------------------------------------------------------------
// PROFILES & USERS
// --------------------------------------------------------------------------

export function getProfiles(): Profile[] {
  return getStoredItem<Profile[]>(STORAGE_KEYS.PROFILES, initialProfiles as Profile[]);
}

export function getUsers(): StoredUser[] {
  return getStoredItem<StoredUser[]>(STORAGE_KEYS.USERS, initialUsers as StoredUser[]);
}

export function getProfileById(id: string): Profile | null {
  const profiles = getProfiles();
  return profiles.find((p) => p.id === id) || null;
}

export function authenticateLocalUser(email: string, password: string): {
  token: string;
  user: { id: string; email: string };
  profile: Profile;
} {
  const users = getUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || user.password !== password) {
    throw new Error('Identifiants invalides');
  }

  const profile = getProfileById(user.profile_id);
  if (!profile) {
    throw new Error('Profil utilisateur introuvable');
  }

  const token = `local_token_${user.id}_${Date.now()}`;
  return {
    token,
    user: { id: user.id, email: user.email },
    profile,
  };
}

export function registerLocalUser(email: string, password: string, fullName: string): void {
  const users = getUsers();
  const profiles = getProfiles();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Un compte avec cette adresse email existe déjà');
  }

  const profileId = `prof-${Date.now()}`;
  const userId = `user-${Date.now()}`;
  const now = new Date().toISOString();

  const newProfile: Profile = {
    id: profileId,
    full_name: fullName,
    role: 'observateur',
    created_at: now,
    updated_at: now,
  };

  const newUser: StoredUser = {
    id: userId,
    email,
    password,
    profile_id: profileId,
    created_at: now,
  };

  profiles.push(newProfile);
  users.push(newUser);

  setStoredItem(STORAGE_KEYS.PROFILES, profiles);
  setStoredItem(STORAGE_KEYS.USERS, users);
}

// --------------------------------------------------------------------------
// PANELS
// --------------------------------------------------------------------------

export function getPanels(): Panel[] {
  const panels = getStoredItem<Panel[]>(STORAGE_KEYS.PANELS, initialPanels as Panel[]);
  return panels.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getPanelById(id: string): Panel | null {
  const panels = getPanels();
  return panels.find((p) => p.id === id) || null;
}

export function createPanel(panelData: Omit<Panel, 'id' | 'created_at' | 'updated_at' | 'last_maintenance'> & Partial<Panel>): Panel {
  const panels = getPanels();
  const now = new Date().toISOString();
  const newPanel: Panel = {
    id: `panel-${Date.now()}`,
    code: panelData.code,
    category: panelData.category,
    location: panelData.location,
    address: panelData.address || '',
    status: panelData.status || 'fonctionnel',
    is_intelligent: Boolean(panelData.is_intelligent),
    installation_date: panelData.installation_date || now.split('T')[0],
    last_maintenance: panelData.last_maintenance || null,
    created_at: now,
    updated_at: now,
  };

  panels.unshift(newPanel);
  setStoredItem(STORAGE_KEYS.PANELS, panels);
  return newPanel;
}

export function updatePanel(id: string, updates: Partial<Panel>): Panel {
  const panels = getPanels();
  const index = panels.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error('Panneau introuvable');
  }

  const updated: Panel = {
    ...panels[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  panels[index] = updated;
  setStoredItem(STORAGE_KEYS.PANELS, panels);
  return updated;
}

export function deletePanel(id: string): boolean {
  const panels = getPanels();
  const filtered = panels.filter((p) => p.id !== id);
  if (filtered.length === panels.length) {
    throw new Error('Panneau introuvable');
  }

  setStoredItem(STORAGE_KEYS.PANELS, filtered);

  // Clean related interventions
  const interventions = getInterventions();
  const updatedInterventions = interventions.filter((i) => i.panel_id !== id);
  if (updatedInterventions.length !== interventions.length) {
    setStoredItem(STORAGE_KEYS.INTERVENTIONS, updatedInterventions);
  }

  return true;
}

export function getSignImageList(category: string): string[] {
  const cat = (category || 'A').toUpperCase() as PanelCategory;
  const catalog = signCatalog as Record<string, string[]>;
  return catalog[cat] || [];
}

// --------------------------------------------------------------------------
// TECHNICIANS
// --------------------------------------------------------------------------

export function getTechnicians(): Technician[] {
  const techs = getStoredItem<Technician[]>(STORAGE_KEYS.TECHNICIANS, initialTechnicians as Technician[]);
  const profiles = getProfiles();

  return techs
    .map((tech) => ({
      ...tech,
      profile: profiles.find((p) => p.id === tech.profile_id),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getAvailableProfilesForTechnicians(): Profile[] {
  const profiles = getProfiles();
  const techs = getStoredItem<Technician[]>(STORAGE_KEYS.TECHNICIANS, initialTechnicians as Technician[]);
  const assignedProfileIds = new Set(techs.map((t) => t.profile_id));

  return profiles.filter((p) => p.role === 'technicien' && !assignedProfileIds.has(p.id));
}

export function createTechnician(data: {
  profile_id: string;
  specialization: string;
  phone: string;
  status?: Technician['status'];
}): Technician {
  const techs = getStoredItem<Technician[]>(STORAGE_KEYS.TECHNICIANS, initialTechnicians as Technician[]);
  const now = new Date().toISOString();

  const newTech: Technician = {
    id: `tech-${Date.now()}`,
    profile_id: data.profile_id,
    specialization: data.specialization || '',
    phone: data.phone || '',
    status: data.status || 'disponible',
    created_at: now,
    updated_at: now,
  };

  techs.unshift(newTech);
  setStoredItem(STORAGE_KEYS.TECHNICIANS, techs);

  const profiles = getProfiles();
  return {
    ...newTech,
    profile: profiles.find((p) => p.id === newTech.profile_id),
  };
}

export function updateTechnician(id: string, updates: Partial<Technician>): Technician {
  const techs = getStoredItem<Technician[]>(STORAGE_KEYS.TECHNICIANS, initialTechnicians as Technician[]);
  const index = techs.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error('Technicien introuvable');
  }

  const updated: Technician = {
    ...techs[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  techs[index] = updated;
  setStoredItem(STORAGE_KEYS.TECHNICIANS, techs);

  const profiles = getProfiles();
  return {
    ...updated,
    profile: profiles.find((p) => p.id === updated.profile_id),
  };
}

export function deleteTechnician(id: string): boolean {
  const techs = getStoredItem<Technician[]>(STORAGE_KEYS.TECHNICIANS, initialTechnicians as Technician[]);
  const filtered = techs.filter((t) => t.id !== id);
  if (filtered.length === techs.length) {
    throw new Error('Technicien introuvable');
  }

  setStoredItem(STORAGE_KEYS.TECHNICIANS, filtered);

  // Set technician_id = null in interventions
  const interventions = getInterventions();
  const updatedInterventions = interventions.map((i) =>
    i.technician_id === id ? { ...i, technician_id: null } : i
  );
  setStoredItem(STORAGE_KEYS.INTERVENTIONS, updatedInterventions);

  return true;
}

// --------------------------------------------------------------------------
// INTERVENTIONS
// --------------------------------------------------------------------------

export function getInterventions(): Intervention[] {
  const interventions = getStoredItem<Intervention[]>(STORAGE_KEYS.INTERVENTIONS, initialInterventions as Intervention[]);
  const panels = getPanels();
  const technicians = getTechnicians();

  return interventions
    .map((interv) => ({
      ...interv,
      panel: panels.find((p) => p.id === interv.panel_id),
      technician: technicians.find((t) => t.id === interv.technician_id),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function createIntervention(data: {
  panel_id: string;
  technician_id?: string | null;
  type: InterventionType;
  status?: InterventionStatus;
  priority?: InterventionPriority;
  description?: string;
  scheduled_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string;
  created_by?: string | null;
}): Intervention {
  const interventions = getStoredItem<Intervention[]>(STORAGE_KEYS.INTERVENTIONS, initialInterventions as Intervention[]);
  const now = new Date().toISOString();

  const newInterv: Intervention = {
    id: `interv-${Date.now()}`,
    panel_id: data.panel_id,
    technician_id: data.technician_id || null,
    type: data.type,
    status: data.status || 'planifiee',
    priority: data.priority || 'normale',
    description: data.description || '',
    scheduled_date: data.scheduled_date || null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    notes: data.notes || '',
    created_by: data.created_by || null,
    created_at: now,
    updated_at: now,
  };

  interventions.unshift(newInterv);
  setStoredItem(STORAGE_KEYS.INTERVENTIONS, interventions);

  const panels = getPanels();
  const technicians = getTechnicians();
  return {
    ...newInterv,
    panel: panels.find((p) => p.id === newInterv.panel_id),
    technician: technicians.find((t) => t.id === newInterv.technician_id),
  };
}

export function updateIntervention(id: string, updates: Partial<Intervention>): Intervention {
  const interventions = getStoredItem<Intervention[]>(STORAGE_KEYS.INTERVENTIONS, initialInterventions as Intervention[]);
  const index = interventions.findIndex((i) => i.id === id);
  if (index === -1) {
    throw new Error('Intervention introuvable');
  }

  const updated: Intervention = {
    ...interventions[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  interventions[index] = updated;
  setStoredItem(STORAGE_KEYS.INTERVENTIONS, interventions);

  const panels = getPanels();
  const technicians = getTechnicians();
  return {
    ...updated,
    panel: panels.find((p) => p.id === updated.panel_id),
    technician: technicians.find((t) => t.id === updated.technician_id),
  };
}

// --------------------------------------------------------------------------
// COMMANDS
// --------------------------------------------------------------------------

export function getCommands(): PanelCommand[] {
  const commands = getStoredItem<PanelCommand[]>(STORAGE_KEYS.COMMANDS, initialCommands as PanelCommand[]);
  const panels = getPanels();

  return commands
    .map((cmd) => ({
      ...cmd,
      panel: panels.find((p) => p.id === cmd.panel_id),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30);
}

export function createCommand(data: {
  panel_id: string;
  command_type: PanelCommand['command_type'];
  old_code?: string | null;
  new_code?: string | null;
  status?: PanelCommand['status'];
  sent_by?: string | null;
  sent_at?: string | null;
  notes?: string;
}): PanelCommand {
  const commands = getStoredItem<PanelCommand[]>(STORAGE_KEYS.COMMANDS, initialCommands as PanelCommand[]);
  const now = new Date().toISOString();

  const newCmd: PanelCommand = {
    id: `cmd-${Date.now()}`,
    panel_id: data.panel_id,
    command_type: data.command_type,
    old_code: data.old_code || null,
    new_code: data.new_code || null,
    status: data.status || 'executed',
    sent_by: data.sent_by || null,
    sent_at: data.sent_at || now,
    executed_at: now,
    notes: data.notes || '',
    created_at: now,
  };

  commands.unshift(newCmd);
  setStoredItem(STORAGE_KEYS.COMMANDS, commands);

  // If changing code, update the panel immediately in local storage!
  if (data.command_type === 'change_code' && data.new_code) {
    updatePanel(data.panel_id, {
      code: data.new_code,
      updated_at: now,
    });
  }

  const panels = getPanels();
  return {
    ...newCmd,
    panel: panels.find((p) => p.id === newCmd.panel_id),
  };
}

// --------------------------------------------------------------------------
// DASHBOARD STATS
// --------------------------------------------------------------------------

export function getDashboardStats(): DashboardStats {
  const panels = getPanels();
  const interventions = getInterventions();
  const technicians = getTechnicians();

  const functionalPanels = panels.filter((p) => p.status === 'fonctionnel').length;
  const maintenancePanels = panels.filter((p) => p.status === 'en_maintenance').length;
  const outOfServicePanels = panels.filter((p) => p.status === 'hors_service').length;
  const intelligentPanels = panels.filter((p) => p.is_intelligent).length;

  const pendingInterventions = interventions.filter((i) => i.status === 'planifiee').length;
  const inProgressInterventions = interventions.filter((i) => i.status === 'en_cours').length;
  const completedInterventions = interventions.filter((i) => i.status === 'terminee').length;

  const availableTechnicians = technicians.filter((t) => t.status === 'disponible').length;

  return {
    totalPanels: panels.length,
    functionalPanels,
    maintenancePanels,
    outOfServicePanels,
    intelligentPanels,
    totalInterventions: interventions.length,
    pendingInterventions,
    inProgressInterventions,
    completedInterventions,
    totalTechnicians: technicians.length,
    availableTechnicians,
  };
}

// --------------------------------------------------------------------------
// LOCAL DATA IMPORT / EXPORT (CSV / JSON)
// --------------------------------------------------------------------------

export function exportAllDataAsJson(): string {
  const fullBackup = {
    exportDate: new Date().toISOString(),
    version: '1.0.0-offline',
    profiles: getProfiles(),
    users: getUsers().map(({ password: _, ...rest }) => rest), // don't expose passwords directly in standard export
    panels: getPanels(),
    technicians: getTechnicians(),
    interventions: getInterventions(),
    commands: getCommands(),
  };
  return JSON.stringify(fullBackup, null, 2);
}

export function importAllDataFromJson(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.panels || !Array.isArray(data.panels)) {
      throw new Error('Format de fichier JSON invalide');
    }

    if (data.profiles) setStoredItem(STORAGE_KEYS.PROFILES, data.profiles);
    if (data.panels) setStoredItem(STORAGE_KEYS.PANELS, data.panels);
    if (data.technicians) setStoredItem(STORAGE_KEYS.TECHNICIANS, data.technicians);
    if (data.interventions) setStoredItem(STORAGE_KEYS.INTERVENTIONS, data.interventions);
    if (data.commands) setStoredItem(STORAGE_KEYS.COMMANDS, data.commands);

    notifyLocalChange('all');
    return true;
  } catch (err) {
    console.error('Import failed:', err);
    throw err;
  }
}

export function exportPanelsToCSV(): string {
  const panels = getPanels();
  const headers = ['id', 'code', 'category', 'latitude', 'longitude', 'address', 'status', 'is_intelligent', 'installation_date'];
  const rows = panels.map((p) => [
    p.id,
    p.code,
    p.category,
    p.location.coordinates[1],
    p.location.coordinates[0],
    `"${(p.address || '').replace(/"/g, '""')}"`,
    p.status,
    p.is_intelligent ? 'true' : 'false',
    p.installation_date,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportInterventionsToCSV(): string {
  const interventions = getInterventions();
  const headers = ['id', 'panel_code', 'technician_name', 'type', 'priority', 'status', 'scheduled_date', 'description'];
  const rows = interventions.map((i) => [
    i.id,
    i.panel?.code || '',
    `"${(i.technician?.profile?.full_name || '').replace(/"/g, '""')}"`,
    i.type,
    i.priority,
    i.status,
    i.scheduled_date || '',
    `"${(i.description || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
