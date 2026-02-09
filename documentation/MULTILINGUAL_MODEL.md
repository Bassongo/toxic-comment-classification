# Modele Multilingue XLM-RoBERTa - Documentation

## Vue d'ensemble

Le modele multilingue est base sur **XLM-RoBERTa** (Cross-lingual Language Model - RoBERTa), un transformer pre-entraine sur 100+ langues. Nous utilisons la version fine-tunee `unitary/multilingual-toxic-xlm-roberta` specialisee dans la detection de toxicite multilingue.

## Caracteristiques Techniques

### Architecture
| Parametre | Valeur |
|-----------|--------|
| Modele de base | XLM-RoBERTa |
| Taille | ~560M parametres |
| Langues supportees | 100+ |
| Tache | Classification binaire (toxique/non-toxique) |
| Max tokens | 512 |

### Langues Principales Supportees
- **Francais (FR)** - Langue cible principale
- **Anglais (EN)** - Langue de reference
- **Arabe (AR)** - Support RTL (droite a gauche)
- **Espagnol, Allemand, Italien, Portugais, Russe, Chinois, Japonais...**

## Comparaison des Modeles

| Caracteristique | XGBoost | RoBERTa | XLM-RoBERTa Multilingue |
|-----------------|---------|---------|-------------------------|
| Type | ML Classique | Deep Learning | Deep Learning |
| Langues | Anglais | Anglais | 100+ langues |
| Categories | 6 labels | 6 labels | Binaire (toxic/clean) |
| Vitesse | Tres rapide | Rapide | Moderee |
| Cold Start | ~1s | ~5s | ~30-45s |
| Precision (EN) | F1: 0.76 | F1: 0.80 | Comparable |
| Cas d'usage | Production rapide | Precision EN | Multilingue |

## Architecture de Deploiement AWS

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│                    /multilingual/predict                         │
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
│  │  │        XLM-RoBERTa Model (~1.1GB)                │  │     │
│  │  │        Pre-telecharge dans l'image               │  │     │
│  │  └──────────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Memory: 3008 MB | Timeout: 300s | Architecture: x86_64         │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST /multilingual/predict
Analyse un texte dans n'importe quelle langue supportee.

**Request:**
```json
{
  "text": "Tu es vraiment stupide!"
}
```

**Response:**
```json
{
  "is_toxic": true,
  "toxic_probability": 0.9846,
  "confidence": "Tres eleve",
  "language_detected": "fr",
  "model": "XLM-RoBERTa Multilingual"
}
```

### POST /multilingual/predict/batch
Analyse plusieurs textes en une seule requete.

**Request:**
```json
{
  "comments": [
    "You are stupid!",
    "Merci pour ton aide!",
    "انت غبي جدا"
  ]
}
```

### GET /multilingual/health
Verifie l'etat du service.

## Exemples de Detection par Langue

### Francais
| Texte | Toxique | Probabilite |
|-------|---------|-------------|
| "Tu es vraiment stupide!" | Oui | 98.5% |
| "Merci beaucoup pour cette aide!" | Non | 0.1% |
| "Je vais te tuer!" | Oui | 99.2% |

### Anglais
| Texte | Toxique | Probabilite |
|-------|---------|-------------|
| "You are stupid!" | Oui | 99.2% |
| "Great article, thanks!" | Non | 0.05% |

### Arabe
| Texte | Toxique | Probabilite |
|-------|---------|-------------|
| "انت غبي" (Tu es stupide) | Oui | ~85% |
| "شكرا جزيلا" (Merci beaucoup) | Non | 0.1% |

## Optimisations Implementees

### 1. Pre-chargement du Modele
Le modele est telecharge et stocke dans l'image Docker pendant le build, evitant les telechargements au runtime.

```dockerfile
ENV HF_HOME=/var/task/hf_cache
RUN python -c "AutoModelForSequenceClassification.from_pretrained(...)"
```

### 2. Chargement Eager
Le modele est charge au demarrage du module Python, pas a la premiere requete.

```python
# Pre-charger le modele au demarrage
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, local_files_only=True)
```

### 3. Compatibilite NumPy
Utilisation de NumPy < 2.0 pour eviter les incompatibilites avec PyTorch.

```dockerfile
RUN pip install --no-cache-dir "numpy<2"
```

## Limitations

1. **Cold Start**: ~30-45 secondes au premier appel (chargement du modele en memoire)
2. **Classification Binaire**: Contrairement aux autres modeles, ne fournit pas de categories detaillees
3. **Cout**: Lambda avec 3GB de RAM = cout plus eleve
4. **Timeout API Gateway**: 29 secondes max, peut echouer sur cold start

## Ameliorations Futures Possibles

1. **Provisioned Concurrency**: Garder des instances Lambda chaudes
2. **EFS**: Stocker le modele sur EFS pour un chargement plus rapide
3. **SageMaker Endpoint**: Pour une latence plus stable
4. **Distillation**: Utiliser un modele distille plus leger

## URLs de Production

- **API Endpoint**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/multilingual/`
- **Frontend**: `http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com`

## References

- [XLM-RoBERTa Paper](https://arxiv.org/abs/1911.02116)
- [Modele HuggingFace](https://huggingface.co/unitary/multilingual-toxic-xlm-roberta)
- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
