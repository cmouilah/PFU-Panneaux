import { useEffect, useState } from 'react';
import { panels as panelsApi, localDataManagement } from '../lib/api';
import { Panel } from '../types/database';
import { getSignImagePath, getOfflineSignSvgFallback } from '../lib/signImageHelper';

export default function PanelDisplay() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get panel ID from URL query parameter (?display=xxx)
  const urlParams = new URLSearchParams(window.location.search);
  const panelId = urlParams.get('display');

  useEffect(() => {
    if (!panelId) {
      setError('Aucun identifiant de panneau fourni');
      setLoading(false);
      return;
    }

    const fetchPanelState = async () => {
      try {
        const { data } = await panelsApi.getById(panelId);
        if (data) {
          setPanel(data);
          setError(null);
        } else {
          setError('Panneau introuvable');
        }
      } catch (err) {
        console.error('Error fetching panel state:', err);
        setError('Panneau introuvable dans la base locale');
      } finally {
        setLoading(false);
      }
    };

    fetchPanelState();

    // Subscribe to immediate real-time updates from other tabs
    const unsubscribe = localDataManagement.subscribe(() => {
      fetchPanelState();
    });

    // Lightweight backup poll every 2 seconds
    const interval = setInterval(fetchPanelState, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [panelId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-4 text-center">
        <p className="text-xl mb-4 text-red-400 font-bold">{error || 'Panneau introuvable'}</p>
        <p className="text-sm opacity-60">Vérifiez l'URL de simulation locale</p>
      </div>
    );
  }

  const imagePath = getSignImagePath(panel.code, panel.category);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-0 m-0 overflow-hidden select-none">
      <div className="w-full h-full flex items-center justify-center p-8">
        <img
          src={imagePath}
          alt={panel.code}
          className="w-full h-full object-contain animate-fade-in"
          key={panel.code} // Force re-animation on code change
          onError={(e) => {
            (e.target as HTMLImageElement).src = getOfflineSignSvgFallback(
              panel.code,
              panel.category
            );
          }}
        />
      </div>

      {/* Discret overlay ID & statut de synchronisation locale */}
      <div className="absolute bottom-3 right-3 text-[11px] text-white/40 font-mono flex items-center space-x-2 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Simulateur Hors Ligne</span>
        <span>|</span>
        <span>ID: {panel.id.substring(0, 8)}</span>
        <span>|</span>
        <span className="font-bold text-white/70">Code: {panel.code}</span>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
