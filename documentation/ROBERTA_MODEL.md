# Modele RoBERTa - Documentation Technique

## Vue d'ensemble

RoBERTa (Robustly optimized BERT Approach) est notre modele de Deep Learning base sur l'architecture Transformer. Il offre une meilleure comprehension contextuelle que XGBoost, au prix d'une latence legerement plus elevee.

## Caracteristiques Techniques

### Architecture
| Parametre | Valeur |
|-----------|--------|
| Type | Transformer (Deep Learning) |
| Modele de base | RoBERTa-base |
| Nombre de parametres | ~125 millions |
| Couches | 12 couches Transformer |
| Attention heads | 12 |
| Hidden size | 768 |
| Max tokens | 512 |

### Modele Pre-entraine
- **Source**: `s-nlp/roberta_toxicity_classifier`
- **Fine-tuning**: Sur donnees de toxicite
- **Langues**: Anglais principalement

### Labels de classification (6 categories)
1. **toxic** - Contenu toxique general
2. **severe_toxic** - Toxicite severe
3. **obscene** - Langage obscene
4. **threat** - Menaces
5. **insult** - Insultes
6. **identity_hate** - Discours haineux

## Pipeline de Traitement

```
Texte brut
    │
    ▼
┌─────────────────────────┐
│   RoBERTa Tokenizer     │
│   - WordPiece           │
│   - Special tokens      │
│   - Padding/Truncation  │
└─────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│   Input IDs             │
│   Attention Mask        │
└─────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│   RoBERTa Encoder       │
│   - 12 Transformer      │
│     layers              │
│   - Self-attention      │
└─────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│   Classification Head   │
│   - Linear layer        │
│   - Sigmoid activation  │
└─────────────────────────┘
    │
    ▼
Predictions (6 probabilites)
```

## Performance

### Metriques sur le jeu de test
| Metrique | Score |
|----------|-------|
| F1-Score Macro | 0.80 |
| Precision | 0.82 |
| Recall | 0.78 |
| AUC-ROC | 0.98 |

### Temps de reponse
- **Cold Start**: ~5-10 secondes
- **Inference**: ~200-500ms par requete
- **Batch (20 textes)**: ~2-3 secondes

## Avantages

1. **Comprehension contextuelle**: Comprend le sens des phrases
2. **Meilleure precision**: F1 superieur a XGBoost
3. **Robustesse linguistique**: Gere mieux les variations
4. **Transfer learning**: Beneficie du pre-entrainement massif
5. **Nuances**: Detecte mieux les insultes subtiles

## Limitations

1. **Anglais uniquement**: Pas de support multilingue
2. **Latence**: Plus lent que XGBoost
3. **Ressources**: Necessite plus de RAM (1-2 GB)
4. **Cold start**: Temps de chargement initial

## Architecture de Deploiement AWS

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│                      /roberta/predict                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Lambda                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                  Container Docker                       │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │     │
│  │  │   FastAPI    │  │   PyTorch    │  │ Transformers │  │     │
│  │  │   + Mangum   │  │   (CPU)      │  │   HuggingFace│  │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │     │
│  │                                                         │     │
│  │  ┌──────────────────────────────────────────────────┐  │     │
│  │  │        RoBERTa Model (~500MB)                    │  │     │
│  │  │        Pre-telecharge dans l'image               │  │     │
│  │  └──────────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Memory: 2048 MB | Timeout: 120s | Architecture: x86_64         │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST /roberta/predict
Analyse un texte avec le modele RoBERTa.

**Request:**
```json
{
  "text": "You are the worst person I have ever met!"
}
```

**Response:**
```json
{
  "is_toxic": true,
  "labels": {
    "toxic": {"probability": 0.95, "is_toxic": true},
    "severe_toxic": {"probability": 0.25, "is_toxic": false},
    "obscene": {"probability": 0.30, "is_toxic": false},
    "threat": {"probability": 0.05, "is_toxic": false},
    "insult": {"probability": 0.91, "is_toxic": true},
    "identity_hate": {"probability": 0.03, "is_toxic": false}
  },
  "summary": {
    "severity_score": 0.95,
    "detected_categories": ["toxic", "insult"],
    "severity_level": "Tres eleve"
  },
  "model": "RoBERTa"
}
```

## Processus d'Entrainement

### 1. Chargement du modele pre-entraine
```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer

model_name = "s-nlp/roberta_toxicity_classifier"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
```

### 2. Tokenisation
```python
def tokenize_text(text):
    return tokenizer(
        text,
        padding='max_length',
        truncation=True,
        max_length=512,
        return_tensors='pt'
    )
```

### 3. Inference
```python
def predict(text):
    inputs = tokenize_text(text)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.sigmoid(logits)

    return probs.numpy()
```

### 4. Fine-tuning (optionnel)
```python
from transformers import Trainer, TrainingArguments

training_args = TrainingArguments(
    output_dir='./results',
    num_train_epochs=3,
    per_device_train_batch_size=16,
    learning_rate=2e-5,
    warmup_steps=500,
    weight_decay=0.01
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset
)

trainer.train()
```

## Comparaison XGBoost vs RoBERTa

| Aspect | XGBoost | RoBERTa |
|--------|---------|---------|
| F1-Score | 0.76 | 0.80 |
| Latence | ~50ms | ~300ms |
| RAM | ~512MB | ~2GB |
| Contexte | Limite | Excellent |
| Sarcasme | Faible | Modere |
| Cold start | ~1s | ~5-10s |

## Cas d'Usage Recommandes

- **Haute precision**: Quand la qualite prime sur la vitesse
- **Contenu complexe**: Textes longs ou nuances
- **Moderation approfondie**: Deuxieme passe apres XGBoost
- **Analyse de sentiment**: Comprehension fine du contexte

## URLs de Production

- **API Endpoint**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/roberta/`
- **Health Check**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/roberta/health`

## References

- [RoBERTa Paper](https://arxiv.org/abs/1907.11692)
- [Hugging Face Model](https://huggingface.co/s-nlp/roberta_toxicity_classifier)
- [Transformers Library](https://huggingface.co/transformers/)
