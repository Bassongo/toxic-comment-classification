# Toxic Comment Classification

> Multi-label toxicity detection with 3 ML models, from a classical baseline to a multilingual Transformer, deployed as independent serverless microservices.

[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange)](https://aws.amazon.com/lambda/)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://www.python.org/)
[![HuggingFace](https://img.shields.io/badge/Transformers-yellow)](https://huggingface.co/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Deployment status.** This system ran in production on AWS (Lambda, API Gateway, S3) until July 2026, when the hosting account was closed. The public demo and API endpoints are therefore offline. The models, training notebooks, Docker images and deployment code below are complete and reproducible from this repository.

---

## Overview

This project builds a **multi-label toxic comment classifier** that detects 6 categories of harmful content in text. Three models, ranging from a fast classical ML baseline to a 560M-parameter multilingual Transformer, were each deployed as independent AWS Lambda microservices behind a unified API Gateway.

The system included a **real-time Wikipedia edit analyzer**, monitoring toxicity across 6 language editions (EN, FR, DE, ES, IT, AR), directly relevant to content moderation at scale.

The three front-end pages were an analyzer for single comments, a dashboard comparing the three models side by side, and the live Wikipedia monitor. Their source is in `deployment/frontend/` and `deployment/dashboard/`.

---

## Key Results
| Model | F1 micro | F1 macro | Latency | Languages | Size |
|-------|----------|----------|---------|-----------|------|
| XGBoost + TF-IDF (shipped model) | not measured | **0.547** | ~50ms | English | small |
| XGBoost + TF-IDF (best notebook run) | 0.706 | 0.676 | ~50ms | English | small |
| RoBERTa | **0.798** | 0.678 | ~300ms | English | 125M params |
| XLM-RoBERTa | not evaluated | not evaluated | ~400ms | **100+** | 560M params |

RoBERTa figures are taken from the saved training metrics (3 epochs, batch size 16, learning rate 1e-5, Hamming loss 0.0151). XGBoost figures come from the per-label evaluation in the training notebooks.

### XGBoost per label, shipped model with tuned thresholds

| Label | Threshold | F1 | ROC-AUC |
|-------|-----------|----|---------|
| `toxic` | 0.40 | 0.612 | 0.948 |
| `severe_toxic` | 0.70 | 0.430 | 0.960 |
| `obscene` | 0.50 | 0.794 | 0.968 |
| `threat` | 0.65 | 0.290 | 0.954 |
| `insult` | 0.55 | 0.703 | 0.955 |
| `identity_hate` | 0.75 | 0.453 | 0.939 |
| **macro average** | | **0.547** | **0.954** |

The gap between micro and macro F1 is the whole story of this dataset. Micro F1 is carried by `toxic`, `obscene` and `insult`, which dominate the label counts. Macro F1 gives `threat` the same weight as `toxic`, and `threat` is where every model here fails. A single headline F1 hides that, which is why both are reported above.

> **Correction, September 2026.** An earlier version of this README reported F1 = 0.76 for XGBoost and F1 = 0.80 for RoBERTa, both labelled macro. Re-reading the notebooks, the 0.80 is a **micro** F1: RoBERTa's macro F1 is 0.678. The 0.76 for XGBoost is not reproduced by any run in this repository. A figure of ~0.78 was also given for XLM-RoBERTa, which was deployed but never evaluated on a held-out split. The tables above are read directly from the saved metrics and the notebook outputs.

Scores are measured on a held-out split of the Jigsaw dataset. Performance on live, adversarial content is lower: see Limitations.

---

## Why this problem matters

Toxic content detection is a foundational problem in content moderation at scale :

- **Scalable oversight** : automated flagging of harmful content reduces human reviewer burden
- **Multilingual coverage** : XLM-RoBERTa enables monitoring beyond English-centric systems
- **Model comparison** : the dashboard exposes tradeoffs between speed, accuracy and coverage, which is what actually drives a deployment decision
- **Real-world grounding** : Wikipedia live monitoring tested the system on genuine adversarial content rather than a curated test set

---

## Dataset

- **Source** : [Kaggle Jigsaw Toxic Comment Classification Challenge](https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge)
- **Size** : 159,571 annotated Wikipedia comments
- **Task** : Multi-label classification (a comment can belong to multiple categories)

| Label | Description |
|-------|-------------|
| `toxic` | General toxicity |
| `severe_toxic` | Extreme toxicity |
| `obscene` | Obscene language |
| `threat` | Threats of violence |
| `insult` | Personal insults |
| `identity_hate` | Hate speech targeting identity |

---

## Architecture
```
┌─────────────────────────────────────┐
│         AWS S3 (Frontend)           │
│   React App · Dashboard · Wikipedia │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│         AWS API Gateway             │
│  /xgboost  /roberta  /multilingual  │
└──────────┬──────────┬───────────────┘
           │          │          │
           ▼          ▼          ▼
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │Lambda XGBoost│ │Lambda RoBERTa│ │Lambda XLM-R  │
  │  (Docker)    │ │  (Docker)    │ │  (Docker)    │
  │   512 MB     │ │   2048 MB    │ │   3008 MB    │
  └──────────────┘ └──────────────┘ └──────────────┘
```

Each model ran in an isolated Docker container on AWS Lambda, enabling independent scaling and versioning.

---

## API Reference

The endpoints below describe the deployed REST contract. They are documented for reference and for anyone redeploying the stack; the original base URL is no longer served.

| Endpoint | Method | Model |
|----------|--------|-------|
| `/xgboost/predict` | POST | XGBoost + TF-IDF |
| `/roberta/predict` | POST | RoBERTa |
| `/multilingual/predict` | POST | XLM-RoBERTa |
| `/*/health` | GET | Health check |

**Request**
```bash
curl -X POST https://<your-api-gateway>/prod/multilingual/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "You are absolutely worthless."}'
```

**Response**
```json
{
  "is_toxic": true,
  "toxic_probability": 0.89,
  "language_detected": "en",
  "confidence": "high",
  "model": "XLM-RoBERTa Multilingual"
}
```

---

## Project Structure
```
toxic-comment-classification/
├── deployment/
│   ├── lambda-xgboost/          # XGBoost microservice
│   │   ├── app.py               # FastAPI + Mangum handler
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── lambda-roberta/          # RoBERTa microservice
│   ├── lambda-multilingual/     # XLM-RoBERTa microservice
│   ├── frontend/                # React application
│   └── dashboard/               # Static comparison dashboard
├── documentation/
│   ├── XGBOOST_MODEL.md
│   ├── ROBERTA_MODEL.md
│   ├── MULTILINGUAL_MODEL.md
│   └── DASHBOARD_DOCS.md
├── notebooks/
└── README.md
```

---

## Quick Start

```bash
git clone https://github.com/Bassongo/toxic-comment-classification.git
cd toxic-comment-classification

# Deploy XGBoost Lambda
cd deployment/lambda-xgboost
docker build -t toxic-xgboost .
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag toxic-xgboost:latest <account>.dkr.ecr.us-east-1.amazonaws.com/toxic-xgboost:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/toxic-xgboost:latest
```

**Prerequisites** : AWS CLI · Docker Desktop · Node.js 18+

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| ML / NLP | XGBoost · PyTorch · HuggingFace Transformers |
| Backend | Python 3.11 · FastAPI · Mangum |
| Cloud | AWS Lambda · API Gateway · S3 · ECR |
| Frontend | React · Chart.js · Axios |
| DevOps | Docker |

---

## Limitations & Future Work

- **Benchmark scores are not production scores** : the Jigsaw dataset is curated and English-centric; live moderation traffic is imbalanced, adversarial and drifts
- **Minority labels are where this fails** : the shipped XGBoost model reaches 0.547 macro F1, dragged down by `threat` (0.290) and `severe_toxic` (0.430); cost-sensitive learning or targeted augmentation is the next step
- **XLM-RoBERTa was never evaluated** : it was trained, containerised and served, but no held-out score was ever computed for it, so every multilingual claim in this repository is untested
- **African languages** : XLM-RoBERTa covers Swahili but not Wolof, Bambara or Mooré, a natural extension given the African NLP gap
- **Evaluation depth** : adding AUC-ROC per label and calibration curves would better expose model reliability

---

## Author

**Marc MARE**, Statistics & ML Engineer
ENSAE Dakar | MSc SEP, University of Reims (2026)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Marc_MARE-0077B5?style=flat&logo=linkedin)](https://www.linkedin.com/in/marc-mare-data)
[![GitHub](https://img.shields.io/badge/GitHub-Bassongo-181717?style=flat&logo=github)](https://github.com/Bassongo)

---

## License

MIT License, see [LICENSE](LICENSE) for details.
