import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';
import { panels as panelsApi, localDataManagement } from '../lib/api';
import { Panel, PanelStatus, PanelCategory } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Search,
  Image as ImageIcon,
  X,
  Download,
  Upload,
  RotateCcw,
  FileSpreadsheet,
  FileJson,
  Loader2,
  Check
} from 'lucide-react';
import { getSignImagePath, getOfflineSignSvgFallback, getSignFolder } from '../lib/signImageHelper';
import ainTemouchentGeoJson from '../data/ainTemouchentMap.json';

export default function PanelManagement() {
  const { profile } = useAuth();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [showDataTools, setShowDataTools] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = profile?.role === 'admin' || profile?.role === 'responsable';

  useEffect(() => {
    loadPanels();

    const unsubscribe = localDataManagement.subscribe(() => {
      loadPanels();
    });

    return () => unsubscribe();
  }, []);

  async function loadPanels() {
    try {
      const { data } = await panelsApi.getAll();
      setPanels(data || []);
    } catch (error) {
      console.error('Error loading panels:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deletePanel(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce panneau ?')) return;

    try {
      await panelsApi.delete(id);
      loadPanels();
    } catch (error) {
      console.error('Error deleting panel:', error);
      alert('Erreur lors de la suppression du panneau');
    }
  }

  function handleExportJson() {
    const jsonStr = localDataManagement.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geosignal_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    const csvStr = localDataManagement.exportPanelsCsv();
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panneaux_geosignal_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        localDataManagement.importJson(content);
        alert('Données locales importées avec succès !');
        loadPanels();
      } catch {
        alert('Erreur lors de la lecture du fichier de sauvegarde JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleResetData() {
    if (!confirm('Voulez-vous réinitialiser toutes les données aux valeurs par défaut d\'Aïn Témouchent ? Vos modifications locales seront remplacées.')) return;
    localDataManagement.resetToDefaults();
    loadPanels();
    alert('Données réinitialisées avec succès aux valeurs d\'origine !');
  }

  const filteredPanels = panels.filter(
    (panel) =>
      panel.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      panel.address.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des panneaux</h2>
          <p className="text-gray-600">Inventaire et configuration des panneaux de signalisation locale</p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Menu Export / Import Local */}
          <div className="relative">
            <button
              onClick={() => setShowDataTools(!showDataTools)}
              className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5 text-gray-500" />
              Données Locales
            </button>

            {showDataTools && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40 text-xs font-medium">
                <button
                  onClick={() => {
                    handleExportJson();
                    setShowDataTools(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center text-gray-700"
                >
                  <FileJson className="w-4 h-4 mr-2 text-blue-600" />
                  Exporter Base Complète (JSON)
                </button>
                <button
                  onClick={() => {
                    handleExportCsv();
                    setShowDataTools(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center text-gray-700"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                  Exporter Panneaux (CSV)
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowDataTools(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center text-gray-700 border-t border-gray-100"
                >
                  <Upload className="w-4 h-4 mr-2 text-purple-600" />
                  Importer Sauvegarde (JSON)
                </button>
                <button
                  onClick={() => {
                    handleResetData();
                    setShowDataTools(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center border-t border-gray-100"
                >
                  <RotateCcw className="w-4 h-4 mr-2 text-red-500" />
                  Réinitialiser aux Défauts
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
          </div>

          {canEdit && (
            <button
              onClick={() => {
                setEditingPanel(null);
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un panneau
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par code ou adresse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Icône
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  État
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Installation
                </th>
                {canEdit && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPanels.map((panel) => (
                <tr key={panel.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-semibold text-gray-900">{panel.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 p-0.5">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">Type {panel.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{panel.address || 'Non renseignée'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        panel.status === 'fonctionnel'
                          ? 'bg-emerald-100 text-emerald-800'
                          : panel.status === 'en_maintenance'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {panel.status === 'fonctionnel'
                        ? 'Fonctionnel'
                        : panel.status === 'en_maintenance'
                        ? 'Maintenance'
                        : 'Hors service'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {panel.is_intelligent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Intelligent
                        </span>
                      ) : (
                        'Standard'
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(panel.installation_date).toLocaleDateString('fr-FR')}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingPanel(panel);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded hover:bg-blue-50"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {profile?.role === 'admin' && (
                        <button
                          onClick={() => deletePanel(panel.id)}
                          className="text-rose-600 hover:text-rose-900 p-1 rounded hover:bg-rose-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredPanels.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="text-center py-12 text-gray-500">
                    Aucun panneau ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <PanelModal
          panel={editingPanel}
          onClose={() => {
            setShowModal(false);
            setEditingPanel(null);
          }}
          onSave={() => {
            loadPanels();
            setShowModal(false);
            setEditingPanel(null);
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
   GÉOCODAGE INVERSE & DÉTECTION DE RUE (AÏN TÉMOUCHENT)
   ========================================================================= */

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function pointInPolygon(point: [number, number], vs: [number, number][]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function findNearestStreetLocally(lat: number, lon: number): string {
  let closestStreet = '';
  let minDistance = Infinity;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features = (ainTemouchentGeoJson as any)?.features || [];
  for (const feat of features) {
    if (feat.properties?.type === 'road' && feat.geometry?.type === 'LineString') {
      const coords = feat.geometry.coordinates as [number, number][];
      for (let i = 0; i < coords.length - 1; i++) {
        const [x1, y1] = coords[i];
        const [x2, y2] = coords[i + 1];
        const dist = distanceToSegment(lon, lat, x1, y1, x2, y2);
        if (dist < minDistance) {
          minDistance = dist;
          closestStreet = feat.properties.name || '';
        }
      }
    }
  }

  let districtName = '';
  for (const feat of features) {
    if (feat.properties?.type === 'district' && feat.geometry?.type === 'Polygon') {
      const ring = feat.geometry.coordinates?.[0] as [number, number][];
      if (ring && pointInPolygon([lon, lat], ring)) {
        districtName = feat.properties.name;
        break;
      }
    }
  }

  if (closestStreet) {
    if (districtName && !closestStreet.toLowerCase().includes(districtName.toLowerCase())) {
      return `${closestStreet}, ${districtName}, Aïn Témouchent`;
    }
    return `${closestStreet}, Aïn Témouchent`;
  }

  if (districtName) {
    return `${districtName}, Aïn Témouchent`;
  }

  return 'Aïn Témouchent';
}

async function reverseGeocodeStreet(lat: number, lon: number, signal?: AbortSignal): Promise<string> {
  const localFallback = findNearestStreetLocally(lat, lon);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { signal }
    );
    if (!res.ok) return localFallback;
    const data = await res.json();
    const addr = data.address || {};
    const street =
      addr.road ||
      addr.pedestrian ||
      addr.street ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.city_district ||
      data.name;

    if (street) {
      const parts: string[] = [street];
      const quarter = addr.suburb || addr.neighbourhood || addr.city_district;
      if (quarter && quarter !== street && !parts.includes(quarter)) {
        parts.push(quarter);
      }
      parts.push('Aïn Témouchent');
      return parts.join(', ');
    }
    return localFallback;
  } catch {
    return localFallback;
  }
}

interface MapSelectorModalProps {
  initialLat: number;
  initialLon: number;
  initialAddress?: string;
  onClose: () => void;
  onSelect: (lat: number, lon: number, address: string) => void;
}

function MapSelectorModal({
  initialLat,
  initialLon,
  initialAddress = '',
  onClose,
  onSelect,
}: MapSelectorModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [selectedCoords, setSelectedCoords] = useState({ lat: initialLat, lon: initialLon });
  const [selectedStreet, setSelectedStreet] = useState<string>(
    initialAddress.trim() || findNearestStreetLocally(initialLat, initialLon)
  );
  const [loadingStreet, setLoadingStreet] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    // 1. Fond OpenStreetMap officiel
    const osmLayer = new TileLayer({
      source: new OSM(),
      zIndex: 0,
    });

    // 2. Marqueur position
    const markerFeature = new Feature({
      geometry: new Point(fromLonLat([initialLon, initialLat])),
    });

    markerFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 10,
          fill: new Fill({ color: '#2563eb' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        }),
        text: new Text({
          text: 'Position choisie',
          offsetY: -18,
          font: 'bold 11px Inter, sans-serif',
          fill: new Fill({ color: '#1e3a8a' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        }),
      })
    );

    const markerLayer = new VectorLayer({
      source: new VectorSource({ features: [markerFeature] }),
      zIndex: 20,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [osmLayer, markerLayer],
      view: new View({
        center: fromLonLat([initialLon, initialLat]),
        zoom: 16,
        minZoom: 12,
        maxZoom: 19,
      }),
    });

    mapInstanceRef.current = map;

    // Détection de la rue au clic
    map.on('click', (event) => {
      const coords = toLonLat(event.coordinate);
      const lon = coords[0];
      const lat = coords[1];

      markerFeature.setGeometry(new Point(event.coordinate));
      setSelectedCoords({ lat, lon });

      // Résolution immédiate locale
      const localStreet = findNearestStreetLocally(lat, lon);
      setSelectedStreet(localStreet);

      // Résolution OSM asynchrone (si réseau disponible)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoadingStreet(true);

      reverseGeocodeStreet(lat, lon, controller.signal)
        .then((resolvedStreet) => {
          if (!controller.signal.aborted && resolvedStreet) {
            setSelectedStreet(resolvedStreet);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoadingStreet(false);
          }
        });
    });

    setTimeout(() => map.updateSize(), 100);

    // Si pas d'adresse initiale, tenter un reverse geocoding initial
    if (!initialAddress.trim()) {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoadingStreet(true);
      reverseGeocodeStreet(initialLat, initialLon, controller.signal)
        .then((resolved) => {
          if (!controller.signal.aborted && resolved) {
            setSelectedStreet(resolved);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoadingStreet(false);
          }
        });
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      map.setTarget(undefined);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden h-[640px] border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-gray-900">
                Sélectionner l'emplacement à Aïn Témouchent
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                OpenStreetMap
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Cliquez sur la carte OpenStreetMap pour déplacer le pointeur et détecter automatiquement la rue
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative bg-slate-100">
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />

          {/* Badge de la rue sélectionnée (flottant en bas à gauche) */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-blue-200 max-w-md w-full">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Rue sélectionnée :
              </span>
              {loadingStreet ? (
                <span className="text-[10px] text-blue-600 font-medium flex items-center bg-blue-50 px-2 py-0.5 rounded">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Détection OSM...
                </span>
              ) : (
                <span className="text-[10px] text-emerald-600 font-medium flex items-center bg-emerald-50 px-2 py-0.5 rounded">
                  <Check className="w-3 h-3 mr-1" />
                  Prête à affecter
                </span>
              )}
            </div>
            <input
              type="text"
              value={selectedStreet}
              onChange={(e) => setSelectedStreet(e.target.value)}
              placeholder="Cliquez sur la carte pour détecter la rue..."
              className="w-full px-3 py-1.5 text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
            />
            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1.5 font-mono">
              <span>Lat: {selectedCoords.lat.toFixed(6)}°N</span>
              <span>Lon: {selectedCoords.lon.toFixed(6)}°E</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.getView().animate({
                  center: fromLonLat([-1.14099, 35.28954]),
                  zoom: 16,
                  duration: 400,
                });
              }
            }}
            className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-md border border-gray-200 hover:bg-white text-blue-600 font-semibold text-xs flex items-center transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 mr-1" />
            Centre-ville
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="hidden sm:flex items-center text-xs text-gray-600 truncate max-w-md">
            <span className="font-semibold text-gray-500 mr-1.5">Adresse affectée :</span>
            <span className="font-medium text-gray-900 truncate">
              {selectedStreet || 'Aucune'}
            </span>
          </div>
          <div className="flex items-center space-x-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition-colors rounded-lg font-medium"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => onSelect(selectedCoords.lat, selectedCoords.lon, selectedStreet)}
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-semibold flex items-center"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Valider la position
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PanelModalProps {
  panel: Panel | null;
  onClose: () => void;
  onSave: () => void;
}

function PanelModal({ panel, onClose, onSave }: PanelModalProps) {
  const [formData, setFormData] = useState({
    code: panel?.code || '',
    category: panel?.category || ('A' as PanelCategory),
    latitude: panel?.location.coordinates[1].toString() || '35.28954',
    longitude: panel?.location.coordinates[0].toString() || '-1.14099',
    address: panel?.address || '',
    status: panel?.status || ('fonctionnel' as PanelStatus),
    is_intelligent: panel?.is_intelligent || false,
    installation_date: panel?.installation_date || new Date().toISOString().split('T')[0],
  });

  const [showMapSelector, setShowMapSelector] = useState(false);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [loadingIcons, setLoadingIcons] = useState(false);

  useEffect(() => {
    loadIcons();
  }, [formData.category]);

  async function loadIcons() {
    setLoadingIcons(true);
    try {
      const { data } = await panelsApi.getImageList(formData.category);
      setAvailableIcons(data || []);
    } catch (error) {
      console.error('Error loading icons:', error);
    } finally {
      setLoadingIcons(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const panelData = {
        code: formData.code.trim(),
        category: formData.category,
        location: {
          type: 'Point' as const,
          coordinates: [
            parseFloat(formData.longitude.replace(',', '.')) || -1.14099,
            parseFloat(formData.latitude.replace(',', '.')) || 35.28954,
          ] as [number, number],
        },
        address: formData.address.trim(),
        status: formData.status,
        is_intelligent: formData.is_intelligent,
        installation_date: formData.installation_date,
      };

      if (panel) {
        await panelsApi.update(panel.id, panelData);
      } else {
        await panelsApi.create(panelData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving panel:', error);
      alert('Erreur lors de la sauvegarde du panneau');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900">
              {panel ? 'Modifier le panneau' : 'Ajouter un nouveau panneau'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Code du panneau (ex: A1, B14, C18...)
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: A1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as PanelCategory,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="A">Type A (Danger)</option>
                  <option value="B">Type B (Priorité)</option>
                  <option value="C">Type C (Prescription)</option>
                  <option value="D">Type D (Indication)</option>
                </select>
              </div>
            </div>

            {/* SELECTION RAPIDE D'ICONE LOCALE */}
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
              <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span className="flex items-center">
                  <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Catalogue de symboles locaux ({availableIcons.length} disponibles)
                </span>
                <span className="text-[11px] text-gray-500">Cliquez pour appliquer le code</span>
              </label>

              {loadingIcons ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-44 overflow-y-auto p-1.5 bg-white rounded-lg border border-gray-200">
                  {availableIcons.map((iconFile) => {
                    const iconCode = iconFile.replace(/\.[^/.]+$/, '');
                    const isSelected = formData.code === iconCode;
                    return (
                      <button
                        key={iconFile}
                        type="button"
                        onClick={() => setFormData({ ...formData, code: iconCode })}
                        className={`p-1.5 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-transparent hover:border-blue-300 bg-gray-50'
                        }`}
                        title={iconCode}
                      >
                        <img
                          src={`/images/${getSignFolder(formData.category)}/${iconFile}`}
                          alt={iconCode}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getOfflineSignSvgFallback(
                              iconCode,
                              formData.category
                            );
                          }}
                        />
                        <span className="text-[9px] font-mono text-gray-600 mt-0.5 truncate w-full text-center">
                          {iconCode}
                        </span>
                      </button>
                    );
                  })}
                  {availableIcons.length === 0 && (
                    <div className="col-span-8 text-center py-4 text-gray-500 text-xs">
                      Aucun symbole répertorié pour cette catégorie
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Longitude
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMapSelector(true)}
                    className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center shadow-xs text-xs font-semibold"
                    title="Choisir sur la carte d'Aïn Témouchent"
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Pointer
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Adresse / Voie
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: Avenue de la République, Aïn Témouchent"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  État opérationnel
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as PanelStatus })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="fonctionnel">Fonctionnel</option>
                  <option value="en_maintenance">En maintenance</option>
                  <option value="hors_service">Hors service</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date d'installation
                </label>
                <input
                  type="date"
                  value={formData.installation_date}
                  onChange={(e) =>
                    setFormData({ ...formData, installation_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex items-center pt-2">
              <input
                type="checkbox"
                id="is_intelligent"
                checked={formData.is_intelligent}
                onChange={(e) =>
                  setFormData({ ...formData, is_intelligent: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_intelligent" className="ml-2 block text-sm font-medium text-gray-700">
                Panneau intelligent (Pilotable à distance)
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors shadow-sm"
              >
                {panel ? 'Mettre à jour' : 'Ajouter le panneau'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showMapSelector && (
        <MapSelectorModal
          initialLat={parseFloat(formData.latitude.replace(',', '.')) || 35.28954}
          initialLon={parseFloat(formData.longitude.replace(',', '.')) || -1.14099}
          initialAddress={formData.address}
          onClose={() => setShowMapSelector(false)}
          onSelect={(lat, lon, address) => {
            setFormData({
              ...formData,
              latitude: lat.toFixed(6),
              longitude: lon.toFixed(6),
              address: address || formData.address,
            });
            setShowMapSelector(false);
          }}
        />
      )}
    </div>
  );
}
