import { useEffect, useState } from 'react';
import { commands as commandsApi, panels as panelsApi, localDataManagement } from '../lib/api';
import { Panel, PanelCommand } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { Radio, Send, Clock, CheckCircle, XCircle, Image as ImageIcon, Share2 } from 'lucide-react';
import { getSignImagePath, getOfflineSignSvgFallback, getSignFolder } from '../lib/signImageHelper';

export default function RemoteControl() {
  const { profile } = useAuth();
  const [intelligentPanels, setIntelligentPanels] = useState<Panel[]>([]);
  const [commands, setCommands] = useState<PanelCommand[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('A');
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [loadingIcons, setLoadingIcons] = useState(false);
  const [sending, setSending] = useState(false);

  const canControl = profile?.role === 'admin' || profile?.role === 'responsable';

  useEffect(() => {
    loadData();

    // Subscribe to multi-tab or local updates
    const unsubscribe = localDataManagement.subscribe(() => {
      loadData();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedPanel) {
      setSelectedCategory(selectedPanel.category);
    }
  }, [selectedPanel]);

  useEffect(() => {
    if (selectedCategory) {
      loadIcons();
    } else {
      setAvailableIcons([]);
    }
  }, [selectedCategory]);

  async function loadIcons() {
    if (!selectedCategory) return;
    setLoadingIcons(true);
    try {
      const { data } = await panelsApi.getImageList(selectedCategory);
      setAvailableIcons(data || []);
    } catch (error) {
      console.error('Error loading icons:', error);
    } finally {
      setLoadingIcons(false);
    }
  }

  async function loadData() {
    try {
      await Promise.all([loadPanels(), loadCommands()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPanels() {
    try {
      const { data } = await panelsApi.getAll();
      const intelligent = (data || []).filter((p: Panel) => p.is_intelligent);
      setIntelligentPanels(intelligent);

      // Keep selectedPanel in sync if already selected
      if (selectedPanel) {
        const fresh = intelligent.find((p: Panel) => p.id === selectedPanel.id);
        if (fresh) setSelectedPanel(fresh);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCommands() {
    try {
      const { data } = await commandsApi.getAll();
      setCommands(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function sendCommand() {
    if (!selectedPanel || !newCode || !canControl) return;

    setSending(true);
    try {
      await commandsApi.create({
        panel_id: selectedPanel.id,
        command_type: 'change_code',
        old_code: selectedPanel.code,
        new_code: newCode,
        status: 'executed',
        sent_by: profile?.id,
        sent_at: new Date().toISOString(),
      });

      alert(`Commande transmise avec succès ! Le panneau ${selectedPanel.code} affiche désormais ${newCode}.`);
      setNewCode('');
      await loadData();
    } catch (error) {
      console.error('Error sending command:', error);
      alert('Erreur lors de l\'envoi de la commande');
    } finally {
      setSending(false);
    }
  }

  async function copySimulationLink(panelId: string) {
    const url = `${window.location.origin}/?display=${panelId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Lien de simulation copié dans le presse-papier ! Ouvrez-le dans un nouvel onglet ou sur un autre écran.');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Contrôle à distance (SIG / PFU)</h2>
        <p className="text-gray-600">Pilotage dynamique et instantané des panneaux à message variable</p>
      </div>

      {!canControl && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm">
            Vous disposez d'un compte en lecture seule. Seuls les administrateurs et responsables peuvent télécommander les panneaux.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4 pb-3 border-b border-gray-100">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-3">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Télécommande de signalisation</h3>
              <p className="text-xs text-gray-500">Sélectionnez le panneau et le symbole à afficher</p>
            </div>
          </div>

          {canControl ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Panneau intelligent cible
                </label>
                <select
                  value={selectedPanel?.id || ''}
                  onChange={(e) => {
                    const panel = intelligentPanels.find((p) => p.id === e.target.value);
                    setSelectedPanel(panel || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Sélectionnez un panneau intelligent...</option>
                  {intelligentPanels.map((panel) => (
                    <option key={panel.id} value={panel.id}>
                      {panel.code} — {panel.address || 'Sans adresse'} (Type {panel.category})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPanel && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Catégorie de destination
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="A">Type A (Danger)</option>
                        <option value="B">Type B (Priorité)</option>
                        <option value="C">Type C (Prescription)</option>
                        <option value="D">Type D (Indication)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nouveau code à afficher
                      </label>
                      <input
                        type="text"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.trim())}
                        placeholder="Ex: A14, B1, C18..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono font-bold text-sm"
                      />
                    </div>
                  </div>

                  {/* Comparatif Visuel Actuel vs Nouveau */}
                  <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center p-1">
                        <img
                          src={getSignImagePath(selectedPanel.code, selectedPanel.category)}
                          alt={selectedPanel.code}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getOfflineSignSvgFallback(
                              selectedPanel.code,
                              selectedPanel.category
                            );
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium uppercase">Affichage actuel</p>
                        <p className="text-base font-bold text-gray-900">{selectedPanel.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 border-l border-gray-200 pl-3">
                      <div className="w-12 h-12 bg-white rounded-lg border border-blue-200 flex items-center justify-center p-1">
                        <img
                          src={getSignImagePath(newCode || selectedPanel.code, selectedCategory)}
                          alt={newCode || selectedPanel.code}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getOfflineSignSvgFallback(
                              newCode || selectedPanel.code,
                              selectedCategory
                            );
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-blue-600 font-medium uppercase">Nouvel affichage</p>
                        <p className="text-base font-bold text-blue-700">{newCode || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* SELECTEUR D'ICONES */}
                  <div className="border border-gray-200 rounded-xl p-3 bg-white">
                    <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center">
                        <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Choisir une icône du catalogue ({availableIcons.length} disponibles)
                      </span>
                      <span className="text-[10px] text-gray-400">Cliquez pour sélectionner</span>
                    </label>

                    {loadingIcons ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1.5 bg-gray-50 rounded-lg border border-gray-200">
                        {availableIcons.map((iconFile) => {
                          const iconCode = iconFile.replace(/\.[^/.]+$/, '');
                          const isSelected = newCode === iconCode;
                          return (
                            <button
                              key={iconFile}
                              type="button"
                              onClick={() => setNewCode(iconCode)}
                              className={`p-1.5 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                                  : 'border-transparent hover:border-blue-300 bg-white'
                              }`}
                              title={iconCode}
                            >
                              <img
                                src={`/images/${getSignFolder(selectedCategory)}/${iconFile}`}
                                alt={iconCode}
                                className="w-7 h-7 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getOfflineSignSvgFallback(
                                    iconCode,
                                    selectedCategory
                                  );
                                }}
                              />
                              <span className="text-[8px] font-mono text-gray-600 mt-0.5 truncate w-full text-center">
                                {iconCode}
                              </span>
                            </button>
                          );
                        })}
                        {availableIcons.length === 0 && (
                          <div className="col-span-6 text-center py-4 text-gray-500 text-xs">
                            Aucune icône disponible
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={sendCommand}
                      disabled={!newCode || sending}
                      className="flex-1 flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold shadow-sm"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sending ? 'Transmission...' : 'Appliquer sur le panneau'}
                    </button>
                    <button
                      onClick={() => copySimulationLink(selectedPanel.id)}
                      className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center text-xs font-semibold"
                      title="Copier l'URL de simulation pour l'ouvrir dans un second onglet"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Simulateur
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">
              Accès restreint aux administrateurs et responsables.
            </p>
          )}
        </div>

        {/* LISTE DES PANNEAUX INTELLIGENTS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Panneaux intelligents d'Aïn Témouchent</h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {intelligentPanels.length} connectés
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {intelligentPanels.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Aucun panneau intelligent configuré
              </p>
            ) : (
              intelligentPanels.map((panel) => (
                <div
                  key={panel.id}
                  onClick={() => setSelectedPanel(panel)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedPanel?.id === panel.id
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                      : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/70 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-white rounded-lg border border-gray-200 flex items-center justify-center p-0.5">
                      <img
                        src={getSignImagePath(panel.code, panel.category)}
                        alt={panel.code}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getOfflineSignSvgFallback(
                            panel.code,
                            panel.category
                          );
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{panel.code}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {panel.address || 'Sans adresse'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        panel.status === 'fonctionnel'
                          ? 'bg-emerald-100 text-emerald-800'
                          : panel.status === 'en_maintenance'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {panel.status === 'fonctionnel' ? 'Actif' : panel.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copySimulationLink(panel.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white"
                      title="Copier le lien simulateur"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* HISTORIQUE DES COMMANDES */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
          Journal des commandes locales
        </h3>

        <div className="space-y-3">
          {commands.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Aucune commande enregistrée</p>
          ) : (
            commands.map((command) => (
              <div
                key={command.id}
                className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    {command.status === 'executed' && (
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-2" />
                    )}
                    {command.status === 'sent' && (
                      <Clock className="w-5 h-5 text-blue-600 mr-2" />
                    )}
                    {command.status === 'failed' && (
                      <XCircle className="w-5 h-5 text-rose-600 mr-2" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        Panneau {command.panel?.code || 'Cible'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(command.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center space-x-3 text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                    <span className="font-mono font-semibold text-gray-600">
                      {command.old_code || '—'}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-mono font-bold text-blue-600">
                      {command.new_code}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Exécutée avec succès
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
