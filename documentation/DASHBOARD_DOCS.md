# Documentation des Dashboards

## Vue d'ensemble

Le projet comprend 3 interfaces utilisateur deployees sur AWS S3:

1. **Application Principale** - Analyseur de commentaires toxiques
2. **Dashboard Comparatif** - Comparaison des 3 modeles en temps reel
3. **Wikipedia Live** - Analyse en temps reel des modifications Wikipedia

## 1. Application Principale (Analyseur)

### Description
Interface principale permettant d'analyser un commentaire avec le choix du modele.

### Fonctionnalites
- Selection du modele (XGBoost, RoBERTa, Multilingue)
- Saisie de texte libre
- Affichage des resultats avec:
  - Verdict (Toxique/Propre)
  - Probabilite de toxicite
  - Categories detectees (pour XGBoost/RoBERTa)
  - Langue detectee (pour Multilingue)
  - Niveau de confiance

### Design
- Theme: Rouge/Orange/Noir (theme toxicite)
- Icone: Triangle d'avertissement
- Gradient: Rouge sombre vers noir

### URL
`http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com/`

---

## 2. Dashboard Comparatif

### Description
Dashboard permettant de comparer les 3 modeles simultanement sur un meme texte.

### Fonctionnalites

#### Statistiques Globales
- Nombre total d'analyses
- Commentaires toxiques detectes
- Commentaires propres
- Temps de reponse moyen

#### Cartes des Modeles
Pour chaque modele (XGBoost, RoBERTa, Multilingue):
- Indicateur de statut (En ligne/Hors ligne)
- Nombre d'analyses effectuees
- Temps de reponse moyen
- Taux de toxicite detecte
- Performance (F1/Langues)

#### Test Comparatif
- Champ de saisie unique
- Analyse simultanee par les 3 modeles
- Affichage cote-a-cote des resultats
- Barre de progression pour chaque modele

#### Graphiques
- **Pie Chart**: Repartition toxique/propre
- **Bar Chart**: Comparaison des modeles

#### Historique
Tableau des 20 dernieres analyses avec:
- Texte analyse
- Resultat de chaque modele
- Langue detectee
- Heure

### Design
- Theme coherent avec l'application principale
- Couleurs par modele:
  - XGBoost: Vert (#10b981)
  - RoBERTa: Rouge/Orange (#dc2626)
  - Multilingue: Bleu (#2563eb)

### URL
`http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com/dashboard.html`

---

## 3. Wikipedia Live Analyzer

### Description
Interface d'analyse en temps reel des modifications recentes de Wikipedia.

### Fonctionnalites

#### Configuration
- **Edition Wikipedia**: FR, EN, DE, ES, IT, AR
- **Nombre de modifications**: 10, 25, 50, 100
- **Modele d'analyse**: Multilingue (recommande), XGBoost, RoBERTa

#### Controles
- Bouton Lancer/Arreter l'analyse
- Bouton Effacer les resultats
- Barre de progression

#### Statistiques
- Commentaires analyses
- Toxiques detectes
- Commentaires propres
- Taux de toxicite (%)

#### Graphiques
- **Doughnut**: Repartition des resultats
- **Line Chart**: Evolution en temps reel

#### Liste des Commentaires
- Filtrage: Tous / Toxiques / Propres
- Pour chaque commentaire:
  - Utilisateur Wikipedia
  - Article modifie
  - Date/heure
  - Texte du commentaire de modification
  - Badge toxique/propre
  - Langue detectee
  - Probabilite avec barre visuelle

### Workflow
1. Recuperation via API Wikipedia (`recentchanges`)
2. Filtrage des modifications avec commentaires
3. Analyse sequentielle via notre API
4. Affichage en temps reel des resultats

### Design
- Theme coherent (rouge/orange/noir)
- Icone Wikipedia SVG
- Animations de chargement

### URL
`http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com/wikipedia.html`

---

## Navigation

Les 3 pages sont interconnectees via une barre de navigation commune:

```
┌─────────────────────────────────────────────────────────────┐
│  [Analyseur]    [Dashboard]    [Wikipedia Live]             │
└─────────────────────────────────────────────────────────────┘
```

- Lien actif: Fond rouge, texte blanc
- Lien inactif: Texte rose clair, bordure au survol

---

## Technologies Utilisees

### Frontend
- **React** (Application principale)
- **Vanilla JS** (Dashboard, Wikipedia)
- **Chart.js** - Graphiques interactifs
- **Axios** - Requetes HTTP
- **CSS3** - Animations et design

### Backend
- **AWS API Gateway** - Point d'entree API
- **AWS Lambda** - Fonctions serverless
- **Docker** - Conteneurisation
- **FastAPI + Mangum** - Framework Python

### Hebergement
- **AWS S3** - Site statique
- **URL**: `http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com`

---

## Architecture Globale

```
                    ┌──────────────────────────────────────┐
                    │           AWS S3 Website              │
                    │  ┌──────────┐ ┌──────────┐ ┌────────┐│
                    │  │index.html│ │dashboard │ │wikipedia││
                    │  │  (React) │ │  .html   │ │ .html  ││
                    │  └────┬─────┘ └────┬─────┘ └───┬────┘│
                    └───────┼────────────┼───────────┼─────┘
                            │            │           │
                            ▼            ▼           ▼
                    ┌──────────────────────────────────────┐
                    │        AWS API Gateway               │
                    │    /xgboost  /roberta  /multilingual │
                    └───────────────────┬──────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
            │ Lambda XGBoost│   │ Lambda RoBERTa│   │ Lambda Multi  │
            │   (Docker)    │   │   (Docker)    │   │   (Docker)    │
            └───────────────┘   └───────────────┘   └───────────────┘
```

---

## Maintenance

### Deploiement Frontend
```bash
# Build React
cd deployment/frontend
npm run build

# Sync avec S3
aws s3 sync build/ s3://toxic-classifier-frontend-836192637207 --delete

# Upload des pages statiques
aws s3 cp dashboard/index.html s3://toxic-classifier-frontend-836192637207/dashboard.html
aws s3 cp dashboard/wikipedia.html s3://toxic-classifier-frontend-836192637207/wikipedia.html
```

### Verification Sante
```bash
# Tester les endpoints
curl https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/xgboost/health
curl https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/roberta/health
curl https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/multilingual/health
```
