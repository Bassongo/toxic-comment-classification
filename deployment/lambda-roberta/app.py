"""
Lambda Handler - RoBERTa Toxic Comment Classifier
Déploiement AWS Lambda avec Docker
"""

import os
# Configure writable directories for Hugging Face (must be set before importing transformers)
os.environ['HF_HOME'] = '/tmp/hf_cache'
os.environ['TRANSFORMERS_CACHE'] = '/tmp/hf_cache'
os.environ['TORCH_HOME'] = '/tmp/torch_cache'

import json
import boto3
import torch
import torch.nn as nn
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from mangum import Mangum
from transformers import RobertaModel, RobertaTokenizer

# Configuration
S3_BUCKET = os.environ.get('S3_BUCKET', 'toxic-classifier-models-bucket')
MODEL_KEY = os.environ.get('MODEL_KEY', 'models/roberta_toxic_best.pt')
TOKENIZER_PREFIX = os.environ.get('TOKENIZER_PREFIX', 'models/roberta_tokenizer/')
LABEL_COLS = ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate']

# Device
device = torch.device('cpu')  # Lambda utilise CPU

# Application FastAPI
app = FastAPI(
    title="Toxic Comment Classifier API - RoBERTa",
    description="API de classification de commentaires toxiques avec RoBERTa (Deep Learning)",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class CommentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)

    class Config:
        json_schema_extra = {
            "example": {"text": "You are stupid!"}
        }

class BatchRequest(BaseModel):
    comments: List[str] = Field(..., min_items=1, max_items=20)  # Moins pour RoBERTa (plus lent)

class LabelDetail(BaseModel):
    detected: bool
    probability: float

class PredictionResponse(BaseModel):
    is_toxic: bool
    labels: Dict[str, LabelDetail]
    summary: Dict[str, Any]

# Architecture du modèle RoBERTa
class RobertaToxicClassifier(nn.Module):
    def __init__(self, num_labels=6, dropout=0.3):
        super().__init__()
        self.roberta = RobertaModel.from_pretrained('roberta-base')
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(self.roberta.config.hidden_size, num_labels)

    def forward(self, input_ids, attention_mask):
        outputs = self.roberta(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.last_hidden_state[:, 0, :]
        pooled_output = self.dropout(pooled_output)
        return self.classifier(pooled_output)

# Variables globales
model = None
tokenizer = None

def download_from_s3(bucket, key, local_path):
    """Télécharge un fichier depuis S3"""
    s3 = boto3.client('s3')
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    s3.download_file(bucket, key, local_path)
    print(f"Téléchargé: s3://{bucket}/{key} -> {local_path}")

def download_tokenizer_from_s3():
    """Télécharge le tokenizer depuis S3"""
    s3 = boto3.client('s3')
    local_dir = '/tmp/roberta_tokenizer/'
    os.makedirs(local_dir, exist_ok=True)

    # Lister les fichiers du tokenizer dans S3
    response = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix=TOKENIZER_PREFIX)

    for obj in response.get('Contents', []):
        key = obj['Key']
        filename = key.replace(TOKENIZER_PREFIX, '')
        if filename:
            local_path = os.path.join(local_dir, filename)
            s3.download_file(S3_BUCKET, key, local_path)
            print(f"Tokenizer file: {filename}")

    return local_dir

def load_model_from_s3():
    """Charge le modèle et le tokenizer depuis S3"""
    global model, tokenizer

    if model is not None and tokenizer is not None:
        return model, tokenizer

    print("Chargement du modèle RoBERTa depuis S3...")

    try:
        # Télécharger le tokenizer
        tokenizer_path = download_tokenizer_from_s3()
        tokenizer = RobertaTokenizer.from_pretrained(tokenizer_path)
        print("Tokenizer chargé!")

        # Télécharger le modèle
        model_path = '/tmp/roberta_toxic_best.pt'
        download_from_s3(S3_BUCKET, MODEL_KEY, model_path)

        # Charger le modèle
        model = RobertaToxicClassifier(num_labels=6)
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()
        print("Modèle RoBERTa chargé!")

        return model, tokenizer

    except Exception as e:
        print(f"Erreur chargement modèle: {e}")
        raise e

def predict_toxicity(text: str) -> Dict[str, Dict]:
    """Prédit la toxicité avec RoBERTa"""
    global model, tokenizer

    if model is None or tokenizer is None:
        load_model_from_s3()

    # Tokenisation
    encoding = tokenizer(
        text,
        padding='max_length',
        truncation=True,
        max_length=128,
        return_tensors='pt'
    )

    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)

    # Prédiction
    with torch.no_grad():
        outputs = model(input_ids, attention_mask)
        probs = torch.sigmoid(outputs).cpu().numpy()[0]

    # Formater les résultats
    results = {}
    threshold = 0.5

    for i, label in enumerate(LABEL_COLS):
        prob = float(probs[i])
        results[label] = {
            'probability': round(prob, 4),
            'detected': prob >= threshold
        }

    return results

# Endpoints
@app.get("/")
async def root():
    return {
        "message": "Toxic Comment Classifier API - RoBERTa",
        "version": "1.0.0",
        "model": "RoBERTa (Deep Learning)",
        "endpoints": ["/predict", "/predict/batch", "/health"]
    }

@app.get("/health")
async def health():
    global model, tokenizer
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "tokenizer_loaded": tokenizer is not None,
        "model_type": "RoBERTa",
        "device": str(device)
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: CommentRequest):
    """Prédit la toxicité d'un commentaire avec RoBERTa"""
    try:
        results = predict_toxicity(request.text)

        detected_labels = [label for label, info in results.items() if info['detected']]
        is_toxic = len(detected_labels) > 0

        # Calcul du score de sévérité
        if detected_labels:
            severity_score = np.mean([results[l]['probability'] for l in detected_labels])
        else:
            severity_score = 0.0

        return PredictionResponse(
            is_toxic=is_toxic,
            labels={label: LabelDetail(**info) for label, info in results.items()},
            summary={
                "total_labels_detected": len(detected_labels),
                "detected_labels": detected_labels,
                "severity_score": round(float(severity_score), 4),
                "model": "RoBERTa"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/batch")
async def predict_batch(request: BatchRequest):
    """Prédit la toxicité de plusieurs commentaires avec RoBERTa"""
    try:
        results = []
        toxic_count = 0

        for comment in request.comments:
            pred = predict_toxicity(comment)
            detected = [l for l, info in pred.items() if info['detected']]
            is_toxic = len(detected) > 0

            if is_toxic:
                toxic_count += 1

            results.append({
                "text": comment[:100] + "..." if len(comment) > 100 else comment,
                "is_toxic": is_toxic,
                "labels": pred,
                "detected_labels": detected
            })

        return {
            "total_comments": len(request.comments),
            "toxic_count": toxic_count,
            "clean_count": len(request.comments) - toxic_count,
            "model": "RoBERTa",
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Handler Lambda
handler = Mangum(app, api_gateway_base_path="/roberta")
