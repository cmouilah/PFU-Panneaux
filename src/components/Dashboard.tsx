import { useEffect, useState } from 'react';
import { dashboard as dashboardApi, localDataManagement } from '../lib/api';
import { DashboardStats } from '../types/database';
import { MapPin, Activity, Wrench, Users, TrendingUp, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const unsubscribe = localDataManagement.subscribe(() => {
      loadStats();
    });
    return () => unsubscribe();
  }, []);

  async function loadStats() {
    try {
      const { data } = await dashboardApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Impossible de charger les statistiques</p>
      </div>
    );
  }

  const availabilityRate = stats.totalPanels > 0
    ? ((stats.functionalPanels / stats.totalPanels) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tableau de bord</h2>
        <p className="text-gray-600">Vue d'ensemble de la plateforme GeoSignal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 rounded-lg p-3">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.totalPanels}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Panneaux totaux</h3>
          <p className="text-xs text-gray-500 mt-1">{stats.intelligentPanels} intelligents</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 rounded-lg p-3">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{availabilityRate}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Taux de disponibilité</h3>
          <p className="text-xs text-gray-500 mt-1">{stats.functionalPanels} fonctionnels</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 rounded-lg p-3">
              <Wrench className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.totalInterventions}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Interventions</h3>
          <p className="text-xs text-gray-500 mt-1">{stats.inProgressInterventions} en cours</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 rounded-lg p-3">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.totalTechnicians}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Techniciens</h3>
          <p className="text-xs text-gray-500 mt-1">{stats.availableTechnicians} disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">État des panneaux</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Fonctionnels</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.functionalPanels}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">En maintenance</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.maintenancePanels}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Hors service</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.outOfServicePanels}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Interventions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Planifiées</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.pendingInterventions}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">En cours</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.inProgressInterventions}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Terminées</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.completedInterventions}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center mb-4">
          <TrendingUp className="w-6 h-6 mr-2" />
          <h3 className="text-lg font-semibold">Performance globale</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-blue-200 text-sm">Disponibilité</p>
            <p className="text-2xl font-bold">{availabilityRate}%</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Panneaux actifs</p>
            <p className="text-2xl font-bold">{stats.functionalPanels}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">En intervention</p>
            <p className="text-2xl font-bold">{stats.inProgressInterventions}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Techniciens actifs</p>
            <p className="text-2xl font-bold">{stats.availableTechnicians}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
