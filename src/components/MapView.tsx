import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat } from 'ol/proj';
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';

import { panels as panelsApi, localDataManagement } from '../lib/api';
import { Panel, PanelStatus } from '../types/database';
import { Filter, X, Compass, Layers, Radio, Sparkles } from 'lucide-react';
import { getSignImagePath, getOfflineSignSvgFallback } from '../lib/signImageHelper';
import ainTemouchentGeoJson from '../data/ainTemouchentMap.json';

type BasemapMode = 'osm' | 'vector_detailed' | 'vector_minimal' | 'none';

export default function MapView() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const panelsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const basemapLayersRef = useRef<VectorLayer<VectorSource>[]>([]);
  const osmLayerRef = useRef<TileLayer<OSM> | null>(null);

  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [filterStatus, setFilterStatus] = useState<PanelStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('osm');

  /* =========================
     STYLES DU FOND DE CARTE HORS LIGNE
     ========================= */

  // Couleurs par quartier
  const DISTRICT_COLORS: Record<string, string> = {
    'Centre-Ville':        'rgba(219, 234, 254, 0.75)',  // bleu clair
    'Sidi Said':           'rgba(220, 252, 231, 0.75)',  // vert clair
    'Hai Castors':         'rgba(254, 249, 195, 0.75)',  // jaune clair
    'Hai Moulay':          'rgba(253, 230, 138, 0.55)',  // ambre clair
    'Hai Sbaa':            'rgba(237, 233, 254, 0.75)',  // violet clair
    'Zone Industrielle Nord': 'rgba(226, 232, 240, 0.70)', // gris
  };

  function getBasemapFeatureStyle(feature: Feature, mode: BasemapMode): Style | undefined {
    if (mode === 'none') return undefined;

    const type = feature.get('type');
    const name = feature.get('name') || '';

    // ─── Périmètre urbain ──────────────────────────────────────
    if (type === 'boundary') {
      return new Style({
        stroke: new Stroke({
          color: '#64748b',
          width: mode === 'vector_detailed' ? 2.5 : 1.5,
          lineDash: [8, 5],
        }),
        fill: new Fill({
          color: mode === 'vector_detailed'
            ? 'rgba(241, 245, 249, 0.92)'
            : 'rgba(241, 245, 249, 0.50)',
        }),
      });
    }

    // ─── Quartiers ─────────────────────────────────────────────
    if (type === 'district') {
      const fillColor = DISTRICT_COLORS[name] ?? 'rgba(248, 250, 252, 0.65)';
      return new Style({
        stroke: new Stroke({
          color: 'rgba(148, 163, 184, 0.8)',
          width: 1.2,
          lineDash: mode === 'vector_minimal' ? [4, 4] : undefined,
        }),
        fill: new Fill({ color: mode === 'vector_detailed' ? fillColor : 'transparent' }),
        text: mode === 'vector_detailed'
          ? new Text({
              text: name,
              font: 'bold 11px Inter, sans-serif',
              fill: new Fill({ color: '#334155' }),
              stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 3 }),
            })
          : undefined,
      });
    }

    // ─── Zone industrielle ──────────────────────────────────────
    if (type === 'industrial') {
      return new Style({
        stroke: new Stroke({ color: '#94a3b8', width: 1 }),
        fill: new Fill({ color: 'rgba(226, 232, 240, 0.60)' }),
        text: mode === 'vector_detailed'
          ? new Text({
              text: 'Zone Industrielle',
              font: '9px Inter, sans-serif',
              fill: new Fill({ color: '#64748b' }),
              stroke: new Stroke({ color: '#ffffff', width: 2 }),
            })
          : undefined,
      });
    }

    // ─── Routes ────────────────────────────────────────────────
    if (type === 'road') {
      const hierarchy = feature.get('hierarchy');
      const isHighway   = hierarchy === 'highway';
      const isPrimary   = hierarchy === 'primary';
      const isSecondary = hierarchy === 'secondary';
      // Couleur de la chaussée selon hiérarchie
      const roadColor = isHighway
        ? '#e2e8f0'   // RN : gris perle large
        : isPrimary
        ? '#f1f5f9'   // boulevard : gris clair
        : isSecondary
        ? '#f8fafc'   // rue secondaire
        : 'rgba(248,250,252,0.8)'; // voie tertiaire
      const roadWidth  = isHighway ? 8 : isPrimary ? 6 : isSecondary ? 4.5 : 3;
      // Retourner le style de la route
      return new Style({
        stroke: new Stroke({
          color: roadColor,
          width: roadWidth,
          lineCap: 'round',
          lineJoin: 'round',
        }),
        text: mode === 'vector_detailed' && (isPrimary || isHighway)
          ? new Text({
              text: name,
              font: isHighway ? 'bold 10px Inter,sans-serif' : '9px Inter,sans-serif',
              fill: new Fill({ color: '#475569' }),
              stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
              placement: 'line' as 'line',
              repeat: 300,
              overflow: true,
            })
          : undefined,
        zIndex: isHighway ? 3 : isPrimary ? 2 : 1,
      }) as unknown as Style; // cast for zIndex support
    }

    // ─── Voie ferrée ────────────────────────────────────────────
    if (type === 'railway') {
      return new Style({
        stroke: new Stroke({
          color: '#94a3b8',
          width: 2,
          lineDash: [8, 4],
          lineCap: 'butt',
        }),
      });
    }

    // ─── Oued / Rivière ────────────────────────────────────────
    if (type === 'river') {
      return new Style({
        stroke: new Stroke({
          color: '#93c5fd',
          width: 2.5,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      });
    }

    // ─── Points d'intérêt ───────────────────────────────────────
    if (type === 'landmark' && mode === 'vector_detailed') {
      const iconColors: Record<string, string> = {
        hospital:   '#ef4444',
        university: '#8b5cf6',
        stadium:    '#10b981',
        park:       '#22c55e',
        building:   '#3b82f6',
        train:      '#f59e0b',
        bus:        '#f97316',
        mosque:     '#06b6d4',
      };
      const icon = feature.get('icon') || 'building';
      const dotColor = iconColors[icon] ?? '#64748b';
      return new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: dotColor }),
          stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
        }),
        text: new Text({
          text: name,
          offsetY: -13,
          font: 'bold 9px Inter,sans-serif',
          fill: new Fill({ color: '#1e293b' }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.95)', width: 3 }),
        }),
        zIndex: 5,
      }) as unknown as Style;
    }

    return undefined;
  }

  /* =========================
     INITIALISATION CARTE 100% LOCALE
     ========================= */
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Load local GeoJSON features
    const geojsonFormat = new GeoJSON({
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });

    const features = geojsonFormat.readFeatures(ainTemouchentGeoJson);
    const basemapSource = new VectorSource({ features });

    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: basemapMode === 'osm',
      zIndex: 0,
    });
    osmLayerRef.current = osmLayer;

    const basemapLayer = new VectorLayer({
      source: basemapSource,
      visible: basemapMode === 'vector_detailed' || basemapMode === 'vector_minimal',
      style: (feat) => getBasemapFeatureStyle(feat as Feature, basemapMode),
      zIndex: 1,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [osmLayer, basemapLayer],
      view: new View({
        center: fromLonLat([-1.1400, 35.2890]), // Centre d'Aïn Témouchent
        zoom: 15,
        minZoom: 11,
        maxZoom: 19,
      }),
    });

    basemapLayersRef.current = [basemapLayer];

    // Pointer cursor on hover over features
    map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const pixel = map.getEventPixel(evt.originalEvent);
      const hit = map.hasFeatureAtPixel(pixel, {
        layerFilter: (l) => l === panelsLayerRef.current,
      });
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    // Feature selection on click
    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(
        evt.pixel,
        (f) => f,
        { layerFilter: (l) => l === panelsLayerRef.current }
      );
      setSelectedPanel(feature ? (feature.get('panel') as Panel) : null);
    });

    mapInstanceRef.current = map;
    setTimeout(() => map.updateSize(), 100);

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, []);

  // Update basemap styling and visibility on mode change
  useEffect(() => {
    if (osmLayerRef.current) {
      osmLayerRef.current.setVisible(basemapMode === 'osm');
    }
    if (basemapLayersRef.current[0]) {
      const showVector = basemapMode === 'vector_detailed' || basemapMode === 'vector_minimal';
      basemapLayersRef.current[0].setVisible(showVector);
      if (showVector) {
        basemapLayersRef.current[0].setStyle((feat) =>
          getBasemapFeatureStyle(feat as Feature, basemapMode)
        );
      }
    }
  }, [basemapMode]);

  /* =========================
     CHARGEMENT DES PANNEAUX
     ========================= */
  useEffect(() => {
    loadPanels();

    // Subscribe to multi-tab / local storage updates
    const unsubscribe = localDataManagement.subscribe(() => {
      loadPanels();
    });

    return () => unsubscribe();
  }, [filterStatus, filterCategory]);

  async function loadPanels() {
    try {
      const { data } = await panelsApi.getAll();
      let filteredData = data || [];

      if (filterStatus !== 'all') {
        filteredData = filteredData.filter((p: Panel) => p.status === filterStatus);
      }
      if (filterCategory !== 'all') {
        filteredData = filteredData.filter((p: Panel) => p.category === filterCategory);
      }

      setPanels(filteredData);
    } catch (err) {
      console.error('Erreur chargement panneaux:', err);
    }
  }

  /* =========================
     AFFICHAGE DES PANNEAUX SUR LA CARTE
     ========================= */
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (panelsLayerRef.current) {
      mapInstanceRef.current.removeLayer(panelsLayerRef.current);
    }

    const source = new VectorSource();

    panels.forEach((panel) => {
      if (!panel.location?.coordinates) return;

      const [lon, lat] = panel.location.coordinates;
      const feature = new Feature({
        geometry: new Point(fromLonLat([lon, lat])),
        panel,
      });

      feature.setStyle(getPanelStyle(panel));
      source.addFeature(feature);
    });

    const panelsLayer = new VectorLayer({
      source,
      zIndex: 10,
    });

    mapInstanceRef.current.addLayer(panelsLayer);
    panelsLayerRef.current = panelsLayer;
  }, [panels]);

  /* =========================
     STYLE DES MARQUEURS
     ========================= */
  function getPanelStyle(panel: Panel): Style[] {
    let color = '#10b981'; // Green for functional
    if (panel.status === 'en_maintenance') color = '#f59e0b'; // Amber
    if (panel.status === 'hors_service') color = '#ef4444'; // Red

    const styles: Style[] = [];

    // Outer glow ring for intelligent panels
    if (panel.is_intelligent) {
      styles.push(
        new Style({
          image: new CircleStyle({
            radius: 12,
            stroke: new Stroke({ color: 'rgba(59, 130, 246, 0.6)', width: 3 }),
            fill: new Fill({ color: 'rgba(59, 130, 246, 0.15)' }),
          }),
        })
      );
    }

    // Main marker circle
    styles.push(
      new Style({
        image: new CircleStyle({
          radius: panel.is_intelligent ? 7.5 : 6,
          fill: new Fill({ color }),
          stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
        }),
        text: new Text({
          text: panel.code,
          offsetY: -16,
          font: 'bold 11px Inter, sans-serif',
          fill: new Fill({ color: '#0f172a' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        }),
      })
    );

    return styles;
  }

  function handleResetView() {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.getView().animate({
      center: fromLonLat([-1.1400, 35.2890]),
      zoom: 14.5,
      duration: 600,
    });
  }

  function handleFitPanels() {
    if (!mapInstanceRef.current || !panelsLayerRef.current) return;
    const extent = panelsLayerRef.current.getSource()?.getExtent();
    if (extent && !extent.some(isNaN)) {
      mapInstanceRef.current.getView().fit(extent, {
        padding: [60, 60, 60, 60],
        maxZoom: 16,
        duration: 500,
      });
    }
  }

  return (
    <div className="space-y-4 relative">
      {/* HEADER + BOUTONS ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-gray-900">Carte SIG Hors Ligne</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
              100% Local (Aïn Témouchent)
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-0.5">
            Localisation et supervision en temps réel des {panels.length} panneaux
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mode Fond de Carte */}
          <div className="relative inline-flex items-center bg-white border border-gray-300 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setBasemapMode('osm')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                basemapMode === 'osm'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Carte OpenStreetMap de la ville d'Aïn Témouchent"
            >
              OpenStreetMap
            </button>
            <button
              onClick={() => setBasemapMode('vector_detailed')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                basemapMode === 'vector_detailed'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Plan vectoriel de la ville avec voirie et quartiers"
            >
              Plan Ville
            </button>
            <button
              onClick={() => setBasemapMode('vector_minimal')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                basemapMode === 'vector_minimal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Vue épurée technique"
            >
              Épuré
            </button>
            <button
              onClick={() => setBasemapMode('none')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                basemapMode === 'none'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Marqueurs seuls sans fond de carte"
            >
              Sans fond
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filtres
          </button>
        </div>
      </div>

      {/* FILTRES DÉROULANTS */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">État du panneau</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as PanelStatus | 'all')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les états ({panels.length})</option>
                <option value="fonctionnel">Fonctionnel</option>
                <option value="en_maintenance">En maintenance</option>
                <option value="hors_service">Hors service</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Catégorie de signalisation</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les catégories</option>
                <option value="A">Type A - Danger</option>
                <option value="B">Type B - Priorité</option>
                <option value="C">Type C - Prescription</option>
                <option value="D">Type D - Indication</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* CONTENEUR CARTE */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-300 shadow-md bg-slate-50">
        <div
          ref={mapRef}
          className="w-full h-[620px]"
        />

        {/* CONTROLES FLOTTANTS CARTE */}
        <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
          <button
            onClick={handleResetView}
            className="p-2.5 bg-white/95 backdrop-blur rounded-xl shadow-md border border-gray-200 hover:bg-white text-gray-700 hover:text-blue-600 transition-colors"
            title="Recentrer sur le centre d'Aïn Témouchent"
          >
            <Compass className="w-5 h-5" />
          </button>
          <button
            onClick={handleFitPanels}
            className="p-2.5 bg-white/95 backdrop-blur rounded-xl shadow-md border border-gray-200 hover:bg-white text-gray-700 hover:text-blue-600 transition-colors"
            title="Ajuster la vue à l'ensemble des panneaux"
          >
            <Layers className="w-5 h-5" />
          </button>
        </div>

        {/* LÉGENDE RAPIDE HORS LIGNE */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/96 backdrop-blur-sm rounded-xl shadow-md border border-gray-200 p-3 text-xs">
          {/* État des panneaux */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white shadow-xs"></span>
              <span className="text-gray-700 font-medium">Fonctionnel</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border border-white shadow-xs"></span>
              <span className="text-gray-700 font-medium">Maintenance</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block border border-white shadow-xs"></span>
              <span className="text-gray-700 font-medium">Hors service</span>
            </div>
            <div className="flex items-center space-x-1.5 border-l border-gray-200 pl-3">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-blue-100 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-blue-600"></span>
              </span>
              <span className="text-gray-700 font-medium">Intelligent</span>
            </div>
          </div>

          {/* Mention OpenStreetMap */}
          {basemapMode === 'osm' && (
            <div className="border-t border-gray-100 pt-2 mt-1 flex items-center justify-between text-[11px] text-gray-500 font-medium">
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 inline-block animate-pulse"></span>
                Fond : OpenStreetMap (Aïn Témouchent)
              </span>
              <span className="text-gray-400 text-[10px]">Tuiles en ligne</span>
            </div>
          )}

          {/* Quartiers + Fond de carte — visibles seulement en mode Plan Ville */}
          {basemapMode === 'vector_detailed' && (
            <div className="border-t border-gray-100 pt-2 mt-1">
              <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wide mb-1.5">Quartiers de la ville</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {[
                  { label: 'Centre-Ville',  color: 'bg-blue-200' },
                  { label: 'Sidi Saïd',     color: 'bg-green-200' },
                  { label: 'Hai Castors',   color: 'bg-yellow-200' },
                  { label: 'Hai Moulay',    color: 'bg-amber-200' },
                  { label: 'Hai Sbaa',      color: 'bg-purple-200' },
                  { label: 'Zone Ind.',     color: 'bg-slate-200' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center space-x-1">
                    <span className={`w-3 h-3 rounded-sm inline-block border border-white/60 shadow-xs ${color}`}></span>
                    <span className="text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-1 border-t border-gray-100">
                <div className="flex items-center space-x-1.5">
                  <span className="inline-block w-6 border-t-2 border-blue-300 rounded"></span>
                  <span className="text-gray-600">Oued Charef</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="inline-block w-6 border-t-2 border-slate-400 border-dashed rounded"></span>
                  <span className="text-gray-600">Voie ferrée</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* POPUP DÉTAILS DU PANNEAU SÉLECTIONNÉ */}
        {selectedPanel && (
          <div className="absolute top-4 right-4 z-20 bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 max-w-sm w-full animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
                  <img
                    src={getSignImagePath(selectedPanel.code, selectedPanel.category)}
                    alt={selectedPanel.code}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getOfflineSignSvgFallback(
                        selectedPanel.code,
                        selectedPanel.category
                      );
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-gray-900 text-lg">{selectedPanel.code}</h3>
                    {selectedPanel.is_intelligent && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 flex items-center">
                        <Radio className="w-3 h-3 mr-1" />
                        Intelligent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Catégorie {selectedPanel.category}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPanel(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Adresse :</span>
                <span className="font-semibold text-gray-900 text-right">{selectedPanel.address || 'Non spécifiée'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">État :</span>
                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    selectedPanel.status === 'fonctionnel'
                      ? 'bg-emerald-50 text-emerald-700'
                      : selectedPanel.status === 'en_maintenance'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {selectedPanel.status === 'fonctionnel'
                    ? 'Fonctionnel'
                    : selectedPanel.status === 'en_maintenance'
                    ? 'En maintenance'
                    : 'Hors service'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Coordonnées GPS :</span>
                <span className="font-mono text-gray-800">
                  {selectedPanel.location.coordinates[1].toFixed(5)}°N, {selectedPanel.location.coordinates[0].toFixed(5)}°E
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Installation :</span>
                <span className="text-gray-800">
                  {new Date(selectedPanel.installation_date).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            {selectedPanel.is_intelligent && (
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <a
                  href={`/?display=${selectedPanel.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Ouvrir l'écran d'affichage simulateur
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
