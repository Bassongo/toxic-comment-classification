"""
Lambda Handler - XGBoost Toxic Comment Classifier
Déploiement AWS Lambda avec Docker
"""

import json
import os
import pickle
import re
import boto3
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from mangum import Mangum
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# Télécharger les ressources NLTK au démarrage
nltk.data.path.append('/tmp/nltk_data')
try:
    nltk.download('stopwords', download_dir='/tmp/nltk_data', quiet=True)
    nltk.download('punkt', download_dir='/tmp/nltk_data', quiet=True)
    nltk.download('punkt_tab', download_dir='/tmp/nltk_data', quiet=True)
except:
    pass

# Configuration
S3_BUCKET = os.environ.get('S3_BUCKET', 'toxic-classifier-models-bucket')
MODEL_KEY = os.environ.get('MODEL_KEY', 'models/toxic_classifier.pkl')
LABEL_COLS = ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate']

# Application FastAPI
app = FastAPI(
    title="Toxic Comment Classifier API - XGBoost",
    description="API de classification de commentaires toxiques avec XGBoost",
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
    comments: List[str] = Field(..., min_items=1, max_items=50)

class LabelDetail(BaseModel):
    detected: bool
    probability: float
    threshold: float

class PredictionResponse(BaseModel):
    is_toxic: bool
    labels: Dict[str, LabelDetail]
    summary: Dict[str, Any]

# Variable globale pour le modèle
classifier = None

def load_model_from_s3():
    """Charge le modèle depuis S3"""
    global classifier

    if classifier is not None:
        return classifier

    print(f"Chargement du modèle depuis s3://{S3_BUCKET}/{MODEL_KEY}")

    s3 = boto3.client('s3')
    local_path = '/tmp/toxic_classifier.pkl'

    try:
        s3.download_file(S3_BUCKET, MODEL_KEY, local_path)
        with open(local_path, 'rb') as f:
            classifier = pickle.load(f)
        print("Modèle chargé avec succès!")
        return classifier
    except Exception as e:
        print(f"Erreur chargement modèle: {e}")
        raise e

class ToxicClassifierWrapper:
    """Wrapper pour le classificateur avec preprocessing intégré"""

    def __init__(self, model_data):
        self.vectorizer = model_data['tfidf']
        self.models = model_data['models']
        self.thresholds = model_data['thresholds']
        self.stop_words = model_data.get('stop_words', set(stopwords.words('english')))

    def preprocess(self, text):
        """Prétraitement du texte"""
        text = str(text).lower()
        text = re.sub(r'http\S+|www\S+|https\S+', '', text)
        text = re.sub(r'<.*?>', '', text)
        text = re.sub(r'\d+', '', text)
        text = re.sub(r'[^\w\s]', '', text)

        try:
            tokens = word_tokenize(text)
            tokens = [t for t in tokens if t not in self.stop_words and len(t) > 2]
            return ' '.join(tokens)
        except:
            return text

    def predict(self, text):
        """Prédit la toxicité d'un commentaire"""
        text_clean = self.preprocess(text)
        X = self.vectorizer.transform([text_clean])

        results = {}
        for label in LABEL_COLS:
            proba = self.models[label].predict_proba(X)[0][1]
            threshold = self.thresholds[label]
            results[label] = {
                'probability': float(proba),
                'threshold': threshold,
                'detected': proba >= threshold
            }

        return results

# Endpoints
@app.get("/")
async def root():
    return {
        "message": "Toxic Comment Classifier API - XGBoost",
        "version": "1.0.0",
        "model": "XGBoost",
        "endpoints": ["/predict", "/predict/batch", "/health"]
    }

@app.get("/health")
async def health():
    global classifier
    return {
        "status": "healthy",
        "model_loaded": classifier is not None,
        "model_type": "XGBoost"
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: CommentRequest):
    """Prédit la toxicité d'un commentaire"""
    global classifier

    try:
        if classifier is None:
            model_data = load_model_from_s3()
            classifier = ToxicClassifierWrapper(model_data)

        results = classifier.predict(request.text)

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
                "severity_score": round(severity_score, 4)
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/batch")
async def predict_batch(request: BatchRequest):
    """Prédit la toxicité de plusieurs commentaires"""
    global classifier

    try:
        if classifier is None:
            model_data = load_model_from_s3()
            classifier = ToxicClassifierWrapper(model_data)

        results = []
        toxic_count = 0

        for comment in request.comments:
            pred = classifier.predict(comment)
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
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Handler Lambda
handler = Mangum(app, api_gateway_base_path="/xgboost")
