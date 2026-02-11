# 🛡️ Toxic Comment Classification

Classification multi-label de commentaires toxiques utilisant 3 modeles de Machine Learning deployes sur AWS.

[![Live Demo](https://img.shields.io/badge/Demo-Live-green)](http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange)](https://aws.amazon.com/lambda/)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://www.python.org/)

## 🎯 Demo en Ligne

**Application**: [http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com](http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com)

| Page | Description |
|------|-------------|
| [Analyseur](http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com) | Analyse de commentaires avec choix du modele |
| [Dashboard](http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com/dashboard.html) | Comparaison des 3 modeles en temps reel |
| [Wikipedia Live](http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com/wikipedia.html) | Analyse des modifications Wikipedia |

## 📊 Dataset

- **Source**: [Kaggle Jigsaw Toxic Comment Classification](https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge)
- **Taille**: 159,571 commentaires Wikipedia annotes
- **Labels**: 6 categories de toxicite
  - `toxic` - Toxicite generale
  - `severe_toxic` - Toxicite extreme
  - `obscene` - Langage obscene
  - `threat` - Menaces
  - `insult` - Insultes
  - `identity_hate` - Discours haineux

## 🤖 Les 3 Modeles

### 1. XGBoost (Machine Learning Classique)
| Caracteristique | Valeur |
|----------------|--------|
| F1-Score | 0.76 |
| Latence | ~50ms |
| Langues | Anglais |
| Vectorisation | TF-IDF |

**Ideal pour**: Production haute frequence, filtrage rapide

### 2. RoBERTa (Deep Learning)
| Caracteristique | Valeur |
|----------------|--------|
| F1-Score | 0.80 |
| Latence | ~300ms |
| Langues | Anglais |
| Architecture | Transformer (125M params) |

**Ideal pour**: Analyse approfondie, comprehension contextuelle

### 3. XLM-RoBERTa Multilingue
| Caracteristique | Valeur |
|----------------|--------|
| Langues | 100+ |
| Latence | ~400ms |
| Architecture | Transformer (560M params) |
| Detection langue | Automatique |

**Langues supportees**: Francais, Anglais, Arabe, Espagnol, Allemand, Chinois, Japonais, Russe, Portugais, Italien...

**Ideal pour**: Contenu international, Wikipedia multilingue

## 🏗️ Architecture

```
                     ┌─────────────────────────────────────┐
                     │        AWS S3 (Frontend)           │
                     │   React App + Dashboard HTML       │
                     └───────────────┬─────────────────────┘
                                     │
                                     ▼
                     ┌─────────────────────────────────────┐
                     │         AWS API Gateway            │
                     │   /xgboost  /roberta  /multilingual│
                     └───────────────┬─────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │  Lambda XGBoost │   │ Lambda RoBERTa  │   │ Lambda Multiling│
    │    (Docker)     │   │    (Docker)     │   │    (Docker)     │
    │    512 MB       │   │    2048 MB      │   │    3008 MB      │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
```

## 📁 Structure du Projet

```
toxic-comment-classification/
├── deployment/
│   ├── lambda-xgboost/          # Modele XGBoost
│   │   ├── app.py               # API FastAPI
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── lambda-roberta/          # Modele RoBERTa
│   │   ├── app.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── lambda-multilingual/     # Modele Multilingue
│   │   ├── app.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── frontend/                # Application React
│   │   ├── src/App.js
│   │   └── package.json
│   └── dashboard/               # Pages statiques
│       ├── index.html           # Dashboard comparatif
│       └── wikipedia.html       # Analyseur Wikipedia
├── documentation/
│   ├── XGBOOST_MODEL.md
│   ├── ROBERTA_MODEL.md
│   ├── MULTILINGUAL_MODEL.md
│   ├── DASHBOARD_DOCS.md
│   └── POWERPOINT_TEXTES.md
└── README.md
```

## 🚀 Deploiement

### Prerequisites
- AWS CLI configure
- Docker Desktop
- Node.js 18+

### 1. Build et Push des images Docker
```bash
# XGBoost
cd deployment/lambda-xgboost
docker build -t toxic-xgboost .
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag toxic-xgboost:latest <account>.dkr.ecr.us-east-1.amazonaws.com/toxic-xgboost:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/toxic-xgboost:latest

# Repeter pour roberta et multilingual
```

### 2. Deployer le Frontend
```bash
cd deployment/frontend
npm install
npm run build
aws s3 sync build/ s3://toxic-classifier-frontend-<account> --delete
aws s3 cp ../dashboard/index.html s3://toxic-classifier-frontend-<account>/dashboard.html
aws s3 cp ../dashboard/wikipedia.html s3://toxic-classifier-frontend-<account>/wikipedia.html
```

## 📡 API Endpoints

Base URL: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod`

| Endpoint | Methode | Description |
|----------|---------|-------------|
| `/xgboost/predict` | POST | Analyse avec XGBoost |
| `/roberta/predict` | POST | Analyse avec RoBERTa |
| `/multilingual/predict` | POST | Analyse multilingue |
| `/*/health` | GET | Health check |

### Exemple de requete
```bash
curl -X POST https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/multilingual/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Tu es vraiment nul!"}'
```

### Exemple de reponse
```json
{
  "is_toxic": true,
  "toxic_probability": 0.89,
  "language_detected": "fr",
  "confidence": "high",
  "model": "XLM-RoBERTa Multilingual"
}
```

## 🌐 Fonctionnalites

### Application Principale
- Analyse de texte libre
- Selection du modele (XGBoost, RoBERTa, Multilingue)
- Affichage detaille des resultats
- Detection automatique de langue

### Dashboard Comparatif
- Comparaison simultanee des 3 modeles
- Statistiques en temps reel
- Graphiques interactifs (Chart.js)
- Historique des analyses

### Wikipedia Live Analyzer
- Analyse des modifications Wikipedia en temps reel
- Support multi-editions (FR, EN, DE, ES, IT, AR)
- Filtrage toxique/propre
- Visualisation des tendances

## 📈 Performance

| Modele | F1-Score | Latence | Cold Start | RAM |
|--------|----------|---------|------------|-----|
| XGBoost | 0.76 | 50ms | 1s | 512MB |
| RoBERTa | 0.80 | 300ms | 5s | 2GB |
| Multilingue | ~0.78 | 400ms | 30s | 3GB |

## 📚 Documentation

- [Documentation XGBoost](documentation/XGBOOST_MODEL.md)
- [Documentation RoBERTa](documentation/ROBERTA_MODEL.md)
- [Documentation Multilingue](documentation/MULTILINGUAL_MODEL.md)
- [Documentation Dashboards](documentation/DASHBOARD_DOCS.md)
- [Textes PowerPoint](documentation/POWERPOINT_TEXTES.md)

## 🛠️ Technologies

- **Backend**: Python 3.11, FastAPI, Mangum
- **ML/DL**: XGBoost, PyTorch, Transformers (HuggingFace)
- **Frontend**: React, Chart.js, Axios
- **Cloud**: AWS Lambda, API Gateway, S3, ECR
- **Conteneurisation**: Docker

## 👥 Equipe

- Groupe3-Projet NLP

## 📄 Licence

MIT License
