"""
Lambda Handler - Multilingual Toxic Comment Classifier
Utilise le modele pre-entraine unitary/multilingual-toxic-xlm-roberta
Supporte: Francais, Anglais, Arabe et 100+ autres langues
"""

import os
# Configure Hugging Face cache - utilise le cache pre-telecharge dans l'image Docker
os.environ['HF_HOME'] = '/var/task/hf_cache'
os.environ['TRANSFORMERS_CACHE'] = '/var/task/hf_cache'
os.environ['TORCH_HOME'] = '/tmp/torch_cache'

import json
import torch
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from mangum import Mangum
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Configuration
MODEL_NAME = 'unitary/multilingual-toxic-xlm-roberta'
LABELS = ['toxic']  # Ce modele fait une classification binaire

# Device
device = torch.device('cpu')

# Application FastAPI
app = FastAPI(
    title="Toxic Comment Classifier API - Multilingual",
    description="API multilingue de classification de toxicite (FR, EN, AR, +100 langues)",
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
            "example": {"text": "Tu es stupide!"}
        }

class BatchRequest(BaseModel):
    comments: List[str] = Field(..., min_items=1, max_items=20)

class PredictionResponse(BaseModel):
    is_toxic: bool
    toxic_probability: float
    confidence: str
    language_detected: Optional[str] = None
    model: str = "XLM-RoBERTa Multilingual"

# Variables globales
model = None
tokenizer = None

# Pre-charger le modele au demarrage du module
print("Pre-chargement du modele au demarrage...")
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, local_files_only=True)
    model.to(device)
    model.eval()
    print("Modele pre-charge avec succes!")
except Exception as e:
    print(f"Pre-chargement echoue, chargement differe: {e}")
    model = None
    tokenizer = None

def load_model():
    """Charge le modele depuis Hugging Face"""
    global model, tokenizer

    if model is not None and tokenizer is not None:
        return model, tokenizer

    print(f"Chargement du modele {MODEL_NAME}...")

    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        model.to(device)
        model.eval()
        print("Modele charge avec succes!")
        return model, tokenizer

    except Exception as e:
        print(f"Erreur chargement modele: {e}")
        raise e

def detect_language(text: str) -> str:
    """Detection de la langue basee sur les caracteres et mots courants"""
    text_lower = text.lower()

    # Arabe (caracteres arabes)
    arabic_count = sum(1 for char in text if '\u0600' <= char <= '\u06FF')
    if arabic_count > len(text) * 0.3:
        return 'ar'

    # Chinois (caracteres CJK)
    chinese_count = sum(1 for char in text if '\u4e00' <= char <= '\u9fff')
    if chinese_count > len(text) * 0.3:
        return 'zh'

    # Japonais (Hiragana, Katakana)
    japanese_count = sum(1 for char in text if '\u3040' <= char <= '\u30ff')
    if japanese_count > len(text) * 0.2:
        return 'ja'

    # Russe (Cyrillique)
    cyrillic_count = sum(1 for char in text if '\u0400' <= char <= '\u04ff')
    if cyrillic_count > len(text) * 0.3:
        return 'ru'

    # Detection par mots-cles pour langues latines
    # Francais
    french_words = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'les', 'des', 'est', 'sont',
                   'une', 'dans', 'pour', 'pas', 'que', 'qui', 'sur', 'avec', 'ce', 'cette',
                   'mais', 'ou', 'donc', 'car', 'tres', 'bien', 'merci', 'bonjour']
    french_chars = set('éèêëàâäùûüôöîïçœæ')

    french_score = sum(1 for word in french_words if f' {word} ' in f' {text_lower} ')
    french_score += sum(2 for char in text_lower if char in french_chars)

    # Espagnol
    spanish_words = ['el', 'la', 'los', 'las', 'es', 'son', 'una', 'uno', 'que', 'con',
                    'por', 'para', 'pero', 'muy', 'como', 'cuando', 'donde', 'hola']
    spanish_chars = set('ñáéíóú¿¡')

    spanish_score = sum(1 for word in spanish_words if f' {word} ' in f' {text_lower} ')
    spanish_score += sum(2 for char in text_lower if char in spanish_chars)

    # Allemand
    german_words = ['ich', 'du', 'er', 'sie', 'wir', 'ihr', 'das', 'der', 'die', 'ist',
                   'sind', 'ein', 'eine', 'und', 'oder', 'aber', 'mit', 'von', 'zu']
    german_chars = set('äöüß')

    german_score = sum(1 for word in german_words if f' {word} ' in f' {text_lower} ')
    german_score += sum(2 for char in text_lower if char in german_chars)

    # Italien
    italian_words = ['il', 'lo', 'la', 'gli', 'le', 'un', 'una', 'che', 'non', 'sono',
                    'per', 'con', 'come', 'molto', 'bene', 'grazie', 'ciao']

    italian_score = sum(1 for word in italian_words if f' {word} ' in f' {text_lower} ')

    # Portugais
    portuguese_words = ['eu', 'tu', 'ele', 'ela', 'nos', 'voce', 'que', 'nao', 'com',
                       'para', 'por', 'muito', 'bem', 'obrigado', 'ola']
    portuguese_chars = set('ãõç')

    portuguese_score = sum(1 for word in portuguese_words if f' {word} ' in f' {text_lower} ')
    portuguese_score += sum(2 for char in text_lower if char in portuguese_chars)

    # Anglais
    english_words = ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will',
                    'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall',
                    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
                    'and', 'but', 'or', 'so', 'because', 'if', 'when', 'where', 'how',
                    'you', 'your', 'they', 'their', 'its', 'very', 'really', 'just']

    english_score = sum(1 for word in english_words if f' {word} ' in f' {text_lower} ')

    # Trouver le score maximum
    scores = {
        'fr': french_score,
        'es': spanish_score,
        'de': german_score,
        'it': italian_score,
        'pt': portuguese_score,
        'en': english_score
    }

    max_lang = max(scores, key=scores.get)
    max_score = scores[max_lang]

    # Si aucun score significatif, retourner 'en' par defaut
    if max_score < 2:
        return 'en'

    return max_lang

def get_confidence_level(probability: float) -> str:
    """Retourne le niveau de confiance"""
    if probability >= 0.9:
        return 'Tres eleve'
    elif probability >= 0.7:
        return 'Eleve'
    elif probability >= 0.5:
        return 'Modere'
    elif probability >= 0.3:
        return 'Faible'
    else:
        return 'Tres faible'

def predict_toxicity(text: str) -> Dict[str, Any]:
    """Predit la toxicite d'un texte"""
    global model, tokenizer

    if model is None or tokenizer is None:
        load_model()

    # Tokenisation
    inputs = tokenizer(
        text,
        return_tensors='pt',
        truncation=True,
        max_length=512,
        padding=True
    )

    inputs = {k: v.to(device) for k, v in inputs.items()}

    # Prediction
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits

        # Verifier la forme du output
        if logits.shape[-1] == 1:
            # Modele binaire avec une seule sortie (sigmoid)
            toxic_prob = torch.sigmoid(logits[0][0]).item()
        else:
            # Modele avec deux classes (softmax)
            probs = torch.softmax(logits, dim=1)
            toxic_prob = probs[0][1].item()

        is_toxic = toxic_prob >= 0.5

    # Detection de langue
    lang = detect_language(text)

    return {
        'is_toxic': is_toxic,
        'toxic_probability': round(toxic_prob, 4),
        'confidence': get_confidence_level(toxic_prob),
        'language_detected': lang,
        'model': 'XLM-RoBERTa Multilingual'
    }

# Endpoints
@app.get("/")
async def root():
    return {
        "message": "Toxic Comment Classifier API - Multilingual",
        "version": "1.0.0",
        "model": "XLM-RoBERTa Multilingual (unitary/multilingual-toxic-xlm-roberta)",
        "languages": ["en", "fr", "ar", "+100 autres"],
        "endpoints": ["/predict", "/predict/batch", "/health"]
    }

@app.get("/health")
async def health():
    global model, tokenizer
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "tokenizer_loaded": tokenizer is not None,
        "model_type": "XLM-RoBERTa Multilingual",
        "supported_languages": ["en", "fr", "ar", "es", "de", "it", "pt", "ru", "zh", "ja", "+90 autres"]
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: CommentRequest):
    """Predit la toxicite d'un commentaire (multilingue)"""
    try:
        result = predict_toxicity(request.text)
        return PredictionResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/batch")
async def predict_batch(request: BatchRequest):
    """Predit la toxicite de plusieurs commentaires"""
    try:
        results = []
        toxic_count = 0

        for comment in request.comments:
            pred = predict_toxicity(comment)
            if pred['is_toxic']:
                toxic_count += 1

            results.append({
                "text": comment[:100] + "..." if len(comment) > 100 else comment,
                **pred
            })

        return {
            "total_comments": len(request.comments),
            "toxic_count": toxic_count,
            "clean_count": len(request.comments) - toxic_count,
            "model": "XLM-RoBERTa Multilingual",
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Handler Lambda
handler = Mangum(app, api_gateway_base_path="/multilingual")
