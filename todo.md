# TODO - GitHub PR Statistics

## État du projet
**Statut**: Planification terminée, prêt pour l'implémentation

---

## Phase 1: Infrastructure de base ⏳

- [ ] **1.1 Configuration Node.js/TypeScript**
  - [ ] Créer package.json
  - [ ] Installer TypeScript et types Node
  - [ ] Créer tsconfig.json
  - [ ] Créer structure de dossiers (src/, dist/)

- [ ] **1.2 Configuration API GitHub**
  - [ ] Installer @octokit/rest
  - [ ] Créer fichier de config pour constantes
  - [ ] Configurer authentification GitHub
  - [ ] Ajouter scripts npm (dev, build)

## Phase 2: Récupération des données ⏳

- [ ] **2.1 Module récupération PRs**
  - [ ] Créer src/github-client.ts
  - [ ] Fonction récupération PRs d'un repo
  - [ ] Filtrer PRs par période
  - [ ] Gérer pagination API

- [ ] **2.2 Module récupération reviews**
  - [ ] Fonction récupération reviews par PR
  - [ ] Récupérer timeline events
  - [ ] Extraire timestamps "review_requested"
  - [ ] Associer reviews aux auteurs

## Phase 3: Traitement des données ⏳

- [ ] **3.1 Structures de données**
  - [ ] Définir types TypeScript pour stats
  - [ ] Structure pour métriques intermédiaires
  - [ ] Modèle pour temps de réponse

- [ ] **3.2 Métriques de base**
  - [ ] Compter PRs ouvertes par personne
  - [ ] Compter reviews par type
  - [ ] Agréger données par utilisateur

- [ ] **3.3 Métriques temporelles**
  - [ ] Calculer temps jusqu'à première review
  - [ ] Calculer temps jusqu'à approbation
  - [ ] Implémenter moyenne, min, max, médiane
  - [ ] Gérer cas sans données

## Phase 4: Génération du rapport ⏳

- [ ] **4.1 Module formatage**
  - [ ] Créer src/formatter.ts
  - [ ] Implémenter format Markdown
  - [ ] Implémenter format CSV (optionnel)

- [ ] **4.2 Affichage résultats**
  - [ ] Formater tableau avec métriques
  - [ ] Convertir durées en format lisible
  - [ ] Ajouter en-têtes et métadonnées

## Phase 5: Orchestration ⏳

- [ ] **5.1 Script principal**
  - [ ] Créer src/index.ts
  - [ ] Orchestrer le flux complet
  - [ ] Gestion d'erreurs de base
  - [ ] Afficher résultats console

- [ ] **5.2 Configuration**
  - [ ] Fichier config avec constantes
  - [ ] Définir repo cible
  - [ ] Définir période
  - [ ] Choix format sortie

## Phase 6: Raffinement ⏳

- [ ] **6.1 Gestion erreurs**
  - [ ] Validation inputs
  - [ ] Gérer erreurs API
  - [ ] Messages informatifs

- [ ] **6.2 Documentation**
  - [ ] Mettre à jour README
  - [ ] Instructions token GitHub
  - [ ] Exemples utilisation

- [ ] **6.3 Build et test**
  - [ ] Script build
  - [ ] Tester compilation
  - [ ] Vérifier exécution complète

---

## Notes
- Pas de tests requis (spec)
- Constantes en dur pour v1
- Sortie console simple
- Focus sur fonctionnalité de base
