# GeoSignal — Plateforme SIG de Gestion des Panneaux de Signalisation (100% Hors Ligne)

Plateforme intelligente de gestion, contrôle et maintenance des panneaux de signalisation pour la ville d'**Aïn Témouchent, Algérie**.

L'application fonctionne désormais de façon **100 % locale et autonome**, sans aucun serveur backend, sans base de données externe, et sans connexion Internet requise.

---

## 🎯 Fonctionnalités Principales

- **Tableau de bord dynamique** : Indicateurs en temps réel (taux de disponibilité, répartition des panneaux par état, suivi des interventions).
- **Carte SIG 100% Hors Ligne** : Visualisation cartographique vectorielle de la ville d'Aïn Témouchent (fond de carte GeoJSON local, voirie, quartiers, repères urbains, filtres interactifs et fiches panneaux).
- **Gestion complète de l'inventaire (CRUD)** : Ajout, modification, recherche et suppression de panneaux avec sélection de coordonnées sur carte vectorielle locale.
- **Suivi de la maintenance** : Création d'interventions, assignation aux techniciens locaux et mise à jour des statuts.
- **Télécommande & Simulateur PFU en temps réel** : Changement instantané du code affiché sur les panneaux intelligents avec synchronisation multi-onglets immédiate via `BroadcastChannel` / `localStorage`.
- **Gestion des données & Sauvegardes** : Exportation et importation complètes en JSON et CSV depuis l'interface.

---

## 🏗️ Architecture 100% Locale

- **Framework** : React 18 avec TypeScript & Vite
- **Styling** : Tailwind CSS & Lucide Icons
- **Cartographie** : OpenLayers (`ol`) avec couche vectorielle GeoJSON locale d'Aïn Témouchent (zéro tuile réseau, zéro dépendance OSM)
- **Persistance & Stockage** : Fichiers JSON locaux structurés (`src/data/*.json`), GeoJSON (`src/data/ainTemouchentMap.geojson`) et persistance dynamique dans le `localStorage` du navigateur
- **Synchronisation inter-fenêtres** : `BroadcastChannel` et événements de stockage pour une simulation en direct entre la console de contrôle et les écrans d'affichage
- **Serveur applicatif** : **Aucun** (architecture statique client exécutable hors ligne)

---

## 👥 Comptes de Démonstration Pré-configurés

Connexion immédiate en 1 clic sur la page de connexion :

| Rôle | Identifiant (Email) | Mot de passe |
|------|---------------------|--------------|
| **Administrateur** | `admin@admin.com` | `admin` |
| **Admin Principal** | `admin@geosignal.dz` | `admin123` |
| **Responsable** | `responsable@geosignal.dz` | `responsable123` |
| **Technicien** | `tech1@geosignal.dz` | `tech123` |
| **Observateur** | `observateur@geosignal.dz` | `obs123` |

---

## 🚀 Lancement et Utilisation

### 1. Installation des dépendances (une seule fois)

```bash
npm install
```

### 2. Démarrage en mode développement local

```bash
npm run dev
```

Accédez à [http://localhost:5173](http://localhost:5173).

### 3. Compilation pour exécution statique

```bash
npm run build
npm run preview
```

Le dossier compilé `dist/` peut être hébergé sur n'importe quel serveur de fichiers local ou ouvert sans accès Internet.
