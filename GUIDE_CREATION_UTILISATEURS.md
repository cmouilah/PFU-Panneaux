# Guide : Utilisateurs et Authentification Locale

L'application **GeoSignal** fonctionne désormais en **architecture 100 % locale et hors ligne**.
Aucune base de données externe ou serveur backend n'est requis. L'authentification et les profils sont gérés directement via le moteur de persistance local (`localStorage`).

---

## 🎯 Comptes de Démonstration Pré-configurés

Vous pouvez vous connecter instantanément avec l'un des comptes de test suivants (disponibles en 1 clic sur la page de connexion) :

| Rôle | Email | Mot de passe | Permissions |
|------|-------|--------------|-------------|
| **Admin** | `admin@admin.com` | `admin` | Accès complet (Panneaux, Techniciens, Maintenance, Télécommande, Export/Import) |
| **Admin Principal** | `admin@geosignal.dz` | `admin123` | Accès complet |
| **Responsable** | `responsable@geosignal.dz` | `responsable123` | Gestion panneaux, télécommande, maintenance |
| **Technicien 1** | `tech1@geosignal.dz` | `tech123` | Suivi et consultation des interventions |
| **Technicien 2** | `tech2@geosignal.dz` | `tech123` | Suivi et consultation des interventions |
| **Observateur** | `observateur@geosignal.dz` | `obs123` | Consultation en lecture seule |

---

## 📝 Création de Nouveaux Comptes

1. Cliquez sur **"Pas de compte ? S'inscrire"** sur la page de connexion.
2. Remplissez votre nom complet, votre adresse email et votre mot de passe.
3. Le compte est immédiatement créé et enregistré dans votre navigateur.
4. Par défaut, un nouvel utilisateur dispose du rôle **"observateur"**.

---

## 🔄 Gestion des Données et Réinitialisation

Dans le menu **Gestion des panneaux** > **Données Locales** :
- **Exporter Base Complète (JSON)** : Sauvegarde tous les utilisateurs, profils, panneaux, techniciens et interventions dans un fichier JSON.
- **Importer Sauvegarde (JSON)** : Restaure les données depuis un fichier JSON.
- **Réinitialiser aux Défauts** : Réinitialise l'application aux données d'origine d'Aïn Témouchent.

---

## 🚀 Démarrer l'Application

```bash
npm run dev
```

Ouvrez ensuite [http://localhost:5173](http://localhost:5173) dans votre navigateur.