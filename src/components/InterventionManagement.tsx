import { useEffect, useState } from 'react';
import {
  interventions as interventionsApi,
  panels as panelsApi,
  technicians as techniciansApi,
  localDataManagement
} from '../lib/api';
import { Intervention, Panel, Technician } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Calendar, User, MapPin, FileSpreadsheet } from 'lucide-react';

export default function InterventionManagement() {
  const { profile } = useAuth();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const canEdit = profile?.role === 'admin' || profile?.role === 'responsable';

  useEffect(() => {
    loadData();

    const unsubscribe = localDataManagement.subscribe(() => {
      loadData();
    });

    return () => unsubscribe();
  }, []);

  async function loadData() {
    try {
      const [interventionsRes, panelsRes, techniciansRes] = await Promise.all([
        interventionsApi.getAll(),
        panelsApi.getAll(),
        techniciansApi.getAll(),
      ]);

      setInterventions(interventionsRes.data || []);
      setPanels(panelsRes.data || []);
      setTechnicians(techniciansRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    const csvStr = localDataManagement.exportInterventionsCsv();
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interventions_geosignal_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredInterventions = interventions.filter(
    (intervention) => filterStatus === 'all' || intervention.status === filterStatus
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Suivi de la maintenance</h2>
          <p className="text-gray-600">Gestion des interventions et des techniciens locaux</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
            title="Exporter la liste en fichier CSV"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Export CSV
          </button>
          {canEdit && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle intervention
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filtrer par statut:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous</option>
            <option value="planifiee">Planifiées</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminées</option>
            <option value="annulee">Annulées</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInterventions.map((intervention) => (
          <InterventionCard
            key={intervention.id}
            intervention={intervention}
            onUpdate={loadData}
            canEdit={canEdit}
          />
        ))}
      </div>

      {filteredInterventions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucune intervention trouvée</p>
        </div>
      )}

      {showModal && (
        <InterventionModal
          panels={panels}
          technicians={technicians}
          onClose={() => setShowModal(false)}
          onSave={() => {
            loadData();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

interface InterventionCardProps {
  intervention: Intervention;
  onUpdate: () => void;
  canEdit: boolean;
}

function InterventionCard({ intervention, onUpdate, canEdit }: InterventionCardProps) {
  async function updateStatus(newStatus: string) {
    try {
      const updates: Record<string, unknown> = { status: newStatus };

      if (newStatus === 'en_cours' && !intervention.start_date) {
        updates.start_date = new Date().toISOString();
      } else if (newStatus === 'terminee' && !intervention.end_date) {
        updates.end_date = new Date().toISOString();
      }

      await interventionsApi.update(intervention.id, updates);

      if (newStatus === 'terminee' && intervention.panel && intervention.panel_id) {
        const panelUpdates = {
          status: 'fonctionnel' as const,
          last_maintenance: new Date().toISOString(),
        };
        await panelsApi.update(intervention.panel_id, panelUpdates);
      }

      onUpdate();
    } catch (error) {
      console.error('Error updating intervention:', error);
    }
  }

  const statusColors = {
    planifiee: 'bg-blue-100 text-blue-700',
    en_cours: 'bg-yellow-100 text-yellow-700',
    terminee: 'bg-green-100 text-green-700',
    annulee: 'bg-gray-100 text-gray-700',
  };

  const priorityColors = {
    basse: 'bg-gray-100 text-gray-700',
    normale: 'bg-blue-100 text-blue-700',
    haute: 'bg-orange-100 text-orange-700',
    urgente: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[intervention.status]}`}
        >
          {intervention.status === 'planifiee'
            ? 'Planifiée'
            : intervention.status === 'en_cours'
              ? 'En cours'
              : intervention.status === 'terminee'
                ? 'Terminée'
                : 'Annulée'}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[intervention.priority]}`}>
          {intervention.priority === 'basse'
            ? 'Basse'
            : intervention.priority === 'normale'
              ? 'Normale'
              : intervention.priority === 'haute'
                ? 'Haute'
                : 'Urgente'}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-2 capitalize">
        {intervention.type.replace('_', ' ')}
      </h3>

      <div className="space-y-2 mb-4">
        {intervention.panel && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Panneau {intervention.panel.code}</span>
          </div>
        )}

        {intervention.technician && (
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{intervention.technician.profile?.full_name}</span>
          </div>
        )}

        {intervention.scheduled_date && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
      </div>

      {intervention.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{intervention.description}</p>
      )}

      {canEdit && intervention.status !== 'terminee' && intervention.status !== 'annulee' && (
        <div className="flex gap-2">
          {intervention.status === 'planifiee' && (
            <button
              onClick={() => updateStatus('en_cours')}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Démarrer
            </button>
          )}
          {intervention.status === 'en_cours' && (
            <button
              onClick={() => updateStatus('terminee')}
              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              Terminer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface InterventionModalProps {
  panels: Panel[];
  technicians: Technician[];
  onClose: () => void;
  onSave: () => void;
}

function InterventionModal({ panels, technicians, onClose, onSave }: InterventionModalProps) {
  const [formData, setFormData] = useState({
    panel_id: '',
    technician_id: '',
    type: 'maintenance_preventive',
    priority: 'normale',
    description: '',
    scheduled_date: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Create intervention
      await interventionsApi.create({
        panel_id: formData.panel_id,
        technician_id: formData.technician_id || null,
        type: formData.type as any,
        priority: formData.priority as any,
        description: formData.description,
        scheduled_date: formData.scheduled_date || null,
        status: 'planifiee',
      });

      if (formData.panel_id) {
        await panelsApi.update(formData.panel_id, { status: 'en_maintenance' as const });
      }

      onSave();
    } catch (error) {
      console.error('Error creating intervention:', error);
      alert('Erreur lors de la création de l\'intervention');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Nouvelle intervention</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Panneau</label>
              <select
                required
                value={formData.panel_id}
                onChange={(e) => setFormData({ ...formData, panel_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner un panneau</option>
                {panels.map((panel) => (
                  <option key={panel.id} value={panel.id}>
                    {panel.code} - {panel.address}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technicien</label>
              <select
                required
                value={formData.technician_id}
                onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner un technicien</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.profile?.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="maintenance_preventive">Maintenance préventive</option>
                  <option value="reparation">Réparation</option>
                  <option value="installation">Installation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date planifiée
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
