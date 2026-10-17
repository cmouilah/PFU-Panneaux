# Notes Techniques — GeoSignal (Architecture 100% Locale)

## 🗄️ Architecture de Persistance Locale

La plateforme GeoSignal a été entièrement migrée vers un modèle **Client-Side First / Offline-First** :

### 1. Fichiers de Données Structurées (`src/data/`)

- `initialPanels.json` : 15 panneaux de signalisation géo-référencés à Aïn Témouchent avec leurs coordonnées WGS84, adresses, états, types et métadonnées.
- `initialTechnicians.json` : Annuaire des techniciens avec téléphones, spécialisations et statuts.
- `initialProfiles.json` : Profils utilisateurs (Admin, Responsable, Technicien, Observateur).
- `initialUsers.json` : Identifiants et mots de passe pour l'authentification locale.
- `initialInterventions.json` : Fiches d'intervention avec priorités et états opérationnels.
- `initialCommands.json` : Journal des ordres de changement de code pour panneaux intelligents.
- `signCatalog.json` : Catalogue d'icônes par catégorie (Danger, Priorité, Prescription, Indication).
- `ainTemouchentMap.geojson` : Fond cartographique vectoriel local (périmètre urbain, quartiers, artères et voiries, repères urbains).

### 2. Moteur de Persistance Local (`src/lib/localDb.ts`)

- Stockage actif dans le `localStorage` du navigateur.
- Initialisation automatique au premier chargement à partir des fichiers JSON initiaux.
- Opérations CRUD instantanées, avec conservation de l'intégrité relationnelle (ex. liaisons technicien <-> profil, intervention <-> panneau).
- Recalcul dynamique des statistiques du tableau de bord.
- Fonctions d'exportation de sauvegarde (JSON), d'exportation tabulaire (CSV), d'importation et de réinitialisation.

### 3. Cartographie SIG Autonome (`src/components/MapView.tsx`)

- Moteur de rendu cartographique : **OpenLayers (`ol`)** en mode vectoriel pur.
- Aucun appel à OpenStreetMap (`ol/source/OSM` supprimé).
- Système de projection : Entrée WGS84 (`EPSG:4326`), projection cartographique `EPSG:3857`.
- Couches vectorielles hiérarchisées :
  1. Périmètre de la ville et quartiers (`Polygon`).
  2. Réseau routier principal et secondaire (`LineString`).
  3. Points de repère municipaux (`Point`).
  4. Panneaux de signalisation avec anneau pulsé pour les panneaux intelligents et styles colorés selon l'état.

### 4. Communication Temps Réel Multi-Fenêtres

- Utilisation de l'API navigateur `BroadcastChannel('geosignal_sync')` couplée aux événements `StorageEvent`.
- Toute commande envoyée depuis la vue **Contrôle à distance** modifie instantanément le panneau cible sur l'écran d'affichage plein écran (`/?display=<panelId>`), même situé dans un autre onglet ou sur un autre moniteur, sans aucun serveur ni socket réseau.
