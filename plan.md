# Plan de développement - GitHub PR Statistics

## Vue d'ensemble
Créer un outil qui analyse les statistiques des pull requests GitHub sur une période donnée pour un repository spécifique, avec des métriques par personne.

## Objectifs du projet
- Collecter des stats de PRs par personne : nombre de PRs ouvertes, reviews faites
- Calculer les temps de réponse (moyen, min, max, médiane) pour les reviews
- Générer un rapport en format Markdown (tableau) ou CSV

---

## Phase 1: Infrastructure de base

### 1.1 Configuration du projet Node.js/TypeScript
- Créer `package.json` avec les métadonnées du projet
- Installer les dépendances de base (TypeScript, types Node)
- Configurer `tsconfig.json` pour TypeScript
- Créer la structure de dossiers (src/, dist/)

### 1.2 Configuration de l'accès à l'API GitHub
- Installer `@octokit/rest` pour interagir avec l'API GitHub
- Créer un fichier de configuration pour les constantes (repo, période)
- Mettre en place l'authentification GitHub (token)
- Créer un script de développement (npm run dev)

---

## Phase 2: Récupération des données GitHub

### 2.1 Module de récupération des PRs
- Créer `src/github-client.ts` pour encapsuler Octokit
- Implémenter la fonction pour récupérer toutes les PRs d'un repo
- Filtrer les PRs par période de temps
- Gérer la pagination de l'API GitHub

### 2.2 Module de récupération des reviews
- Implémenter la fonction pour récupérer les reviews d'une PR
- Récupérer les review comments et timeline events
- Extraire les informations de "requested review" et timestamps
- Associer chaque review à son auteur

---

## Phase 3: Traitement et agrégation des données

### 3.1 Structure de données pour les statistiques
- Définir les types TypeScript pour les stats par personne
- Créer une structure pour stocker les métriques intermédiaires
- Implémenter un modèle pour les temps de réponse

### 3.2 Calcul des métriques de base
- Compter les PRs ouvertes par personne
- Compter les reviews par type (approved, commented, changes requested)
- Agréger toutes les données par utilisateur

### 3.3 Calcul des métriques temporelles
- Calculer les temps de réponse jusqu'à la première review
- Calculer les temps de réponse jusqu'à l'approbation/changes requested
- Implémenter les fonctions statistiques : moyenne, min, max, médiane
- Gérer les cas où il n'y a pas de données (PRs sans reviews, etc.)

---

## Phase 4: Génération du rapport

### 4.1 Module de formatage
- Créer `src/formatter.ts` pour les formats de sortie
- Implémenter le formatage Markdown (tableau)
- Implémenter le formatage CSV (optionnel)

### 4.2 Affichage des résultats
- Formater les métriques collectées en tableau
- Gérer l'affichage des durées (convertir en heures/jours lisibles)
- Ajouter des en-têtes et métadonnées au rapport (repo, période)

---

## Phase 5: Point d'entrée et orchestration

### 5.1 Script principal
- Créer `src/index.ts` comme point d'entrée
- Orchestrer les appels : récupération → traitement → formatage → affichage
- Ajouter la gestion d'erreurs de base
- Afficher les résultats dans la console

### 5.2 Configuration et constantes
- Définir les constantes dans un fichier config
- Repo cible, période de temps, token GitHub
- Format de sortie préféré (Markdown vs CSV)

---

## Phase 6: Raffinement et polish

### 6.1 Gestion d'erreurs robuste
- Ajouter la validation des inputs
- Gérer les erreurs d'API (rate limiting, repo non trouvé)
- Messages d'erreur informatifs

### 6.2 Documentation
- Mettre à jour le README avec instructions d'utilisation
- Documenter comment obtenir un token GitHub
- Exemples de configuration et de sortie

### 6.3 Build et exécution
- Ajouter un script de build (npm run build)
- Tester la compilation et l'exécution
- Vérifier que tout fonctionne de bout en bout

---

## Détails techniques

### Dépendances prévues
- `@octokit/rest` - Client API GitHub
- `typescript` - Compilation TypeScript
- `@types/node` - Types pour Node.js
- `ts-node` - Exécution directe de TypeScript (dev)

### Configuration minimale
- Repository: constante dans le code pour commencer
- Période: constante (ex: 30 derniers jours)
- Token GitHub: variable d'environnement ou fichier .env

### Format de sortie
```markdown
# PR Statistics for owner/repo

Period: 2024-10-01 to 2024-11-18

| Person | PRs Opened | Reviews (Approved/Commented/Changes) | First Review Time (avg/min/max/median) | Approval Time (avg/min/max/median) |
|--------|------------|--------------------------------------|----------------------------------------|-------------------------------------|
| user1  | 5          | 2/3/1                                | 2h/30m/5h/1.5h                        | 1d/4h/3d/18h                       |
```

---

## Notes d'implémentation

### Calculs de temps
- Temps = timestamp de la review - timestamp du "review requested"
- Gérer les cas où une personne est re-requested après une première review
- Pour la médiane: trier les valeurs et prendre la valeur du milieu

### Limitations acceptables (v1)
- Pas de tests (comme spécifié)
- Constantes en dur pour le repo et la période
- Pas d'interface CLI sophistiquée
- Sortie simple en console

### Points d'attention
- Rate limiting de l'API GitHub (5000 req/h avec auth)
- Gérer la pagination pour les repos avec beaucoup de PRs
- Timeline events pour capturer les "review_requested"
