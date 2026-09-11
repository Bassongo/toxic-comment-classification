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

| Model | F1-Score | Latency | Languages | Size |
|-------|----------|---------|-----------|------|
| XGBoost + TF-IDF | 0.76 | ~50ms | English | small |
| RoBERTa | **0.80** | ~300ms | English | 125M params |
| XLM-RoBERTa | ~0.78 | ~400ms | **100+** | 560M params |

> **Best accuracy** : RoBERTa (F1 = 0.80) · **Best multilingual coverage** : XLM-RoBERTa (100+ languages)

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
- **F1 ceiling** : XGBoost (0.76) struggles on minority labels (`severe_toxic`, `threat`); upsampling or cost-sensitive learning could help
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
