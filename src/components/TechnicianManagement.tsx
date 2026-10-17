import { useEffect, useState } from 'react';
import { technicians as techniciansApi, localDataManagement } from '../lib/api';
import { Technician, Profile, TechnicianStatus } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, Phone, Briefcase, Edit2, Trash2, X } from 'lucide-react';

export default function TechnicianManagement() {
  const { profile } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    loadData();

    const unsubscribe = localDataManagement.subscribe(() => {
      loadData();
    });

    return () => unsubscribe();
  }, [isAdmin]);

  async function loadData() {
    try {
      const [techniciansRes, profilesRes] = await Promise.all([
        techniciansApi.getAll(),
        techniciansApi.getAvailableProfiles()
      ]);

      setTechnicians(techniciansRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTechnician(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce technicien ?')) return;

    try {
      await techniciansApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting technician:', error);
      alert('Erreur lors de la suppression du technicien');
    }
  }

  const filteredTechnicians = technicians
    .filter((tech) => filterStatus === 'all' || tech.status === filterStatus)
    .filter((tech) =>
      tech.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès refusé</h3>
        <p className="text-gray-600">Seuls les administrateurs peuvent gérer les techniciens.</p>
      </div>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Techniciens</h2>
          <p className="text-gray-600">Gérer les techniciens et leurs informations</p>
        </div>
        <button
          onClick={() => {
            setEditingTechnician(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau technicien
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{technicians.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">
                {technicians.filter((t) => t.status === 'disponible').length}
              </p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En intervention</p>
              <p className="text-2xl font-bold text-yellow-600">
                {technicians.filter((t) => t.status === 'en_intervention').length}
              </p>
            </div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Indisponibles</p>
              <p className="text-2xl font-bold text-gray-600">
                {technicians.filter((t) => t.status === 'indisponible').length}
              </p>
            </div>
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="disponible">Disponible</option>
            <option value="en_intervention">En intervention</option>
            <option value="indisponible">Indisponible</option>
          </select>
        </div>
      </div>

      {/* Technicians Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spécialisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTechnicians.map((technician) => (
                <tr key={technician.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {technician.profile?.full_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600">
                      <Briefcase className="w-4 h-4 mr-2" />
                      {technician.specialization || 'Non spécifié'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {technician.phone || 'Non renseigné'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${technician.status === 'disponible'
                        ? 'bg-green-100 text-green-800'
                        : technician.status === 'en_intervention'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {technician.status === 'disponible'
                        ? 'Disponible'
                        : technician.status === 'en_intervention'
                          ? 'En intervention'
                          : 'Indisponible'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingTechnician(technician);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTechnician(technician.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTechnicians.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun technicien trouvé</p>
          </div>
        )}
      </div>

      {showModal && (
        <TechnicianModal
          technician={editingTechnician}
          profiles={profiles}
          onClose={() => {
            setShowModal(false);
            setEditingTechnician(null);
          }}
          onSave={() => {
            loadData();
            setShowModal(false);
            setEditingTechnician(null);
          }}
        />
      )}
    </div>
  );
}

interface TechnicianModalProps {
  technician: Technician | null;
  profiles: Profile[];
  onClose: () => void;
  onSave: () => void;
}

function TechnicianModal({ technician, profiles, onClose, onSave }: TechnicianModalProps) {
  const [formData, setFormData] = useState({
    profile_id: technician?.profile_id || '',
    specialization: technician?.specialization || '',
    phone: technician?.phone || '',
    status: technician?.status || 'disponible',
  });

  // Combine available profiles with the current technician's profile if editing
  const availableProfiles = [...profiles];
  if (technician?.profile && !availableProfiles.find(p => p.id === technician.profile_id)) {
    availableProfiles.push(technician.profile);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (technician) {
        // Update existing technician
        await techniciansApi.update(technician.id, formData);
      } else {
        // Create new technician
        await techniciansApi.create(formData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving technician:', error);
      alert('Erreur lors de l\'enregistrement du technicien');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {technician ? 'Modifier le technicien' : 'Nouveau technicien'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilisateur (rôle technicien)
              </label>
              <select
                required
                disabled={!!technician}
                value={formData.profile_id}
                onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Sélectionner un utilisateur</option>
                {availableProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </option>
                ))}
              </select>
              {!technician && availableProfiles.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  Aucun utilisateur avec le rôle "technicien" disponible
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spécialisation
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="Ex: Électricité, Mécanique, Signalisation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: 0555123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TechnicianStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="disponible">Disponible</option>
                <option value="en_intervention">En intervention</option>
                <option value="indisponible">Indisponible</option>
              </select>
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
                {technician ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
