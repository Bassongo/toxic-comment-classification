# Modele XGBoost - Documentation Technique

## Vue d'ensemble

Le modele XGBoost (eXtreme Gradient Boosting) est notre solution de Machine Learning classique pour la detection de toxicite. C'est le modele le plus rapide et le plus leger de notre pipeline.

## Caracteristiques Techniques

### Architecture
| Parametre | Valeur |
|-----------|--------|
| Type | Ensemble Learning (Gradient Boosting) |
| Algorithme | XGBoost Classifier |
| Vectorisation | TF-IDF (Term Frequency-Inverse Document Frequency) |
| Nombre d'estimateurs | 100 |
| Profondeur max | 6 |
| Learning rate | 0.1 |

### Donnees d'entrainement
- **Dataset**: Jigsaw Toxic Comment Classification Challenge
- **Taille**: ~160,000 commentaires Wikipedia
- **Source**: Kaggle Competition
- **Langues**: Anglais uniquement

### Labels de classification (6 categories)
1. **toxic** - Contenu toxique general
2. **severe_toxic** - Toxicite severe/extreme
3. **obscene** - Langage obscene
4. **threat** - Menaces
5. **insult** - Insultes
6. **identity_hate** - Discours haineux base sur l'identite

## Pipeline de Traitement

```
Texte brut
    │
    ▼
┌─────────────────────┐
│  Preprocessing      │
│  - Lowercase        │
│  - Remove special   │
│  - Tokenization     │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  TF-IDF Vectorizer  │
│  - max_features:    │
│    10,000           │
│  - ngram: (1,2)     │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  XGBoost Classifier │
│  - Multi-label      │
│  - 6 outputs        │
└─────────────────────┘
    │
    ▼
Predictions (6 probabilites)
```

## Performance

### Metriques sur le jeu de test
| Metrique | Score |
|----------|-------|
| F1-Score Macro | 0.76 |
| Precision | 0.78 |
| Recall | 0.74 |
| AUC-ROC | 0.97 |

### Temps de reponse
- **Cold Start**: ~1 seconde
- **Inference**: ~50-100ms par requete
- **Batch (20 textes)**: ~500ms

## Avantages

1. **Rapidite**: Inference tres rapide (ideal pour la production)
2. **Legerete**: Modele de quelques Mo seulement
3. **Interpretabilite**: Importance des features disponible
4. **Multi-label**: Detecte plusieurs types de toxicite simultanement
5. **Robustesse**: Peu sensible au surajustement

## Limitations

1. **Anglais uniquement**: Ne supporte pas d'autres langues
2. **Contexte limite**: Ne comprend pas le contexte semantique profond
3. **Vocabulaire fixe**: Limite par le TF-IDF pre-entraine
4. **Sarcasme**: Difficulte avec l'ironie et le sarcasme

## Architecture de Deploiement AWS

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│                      /xgboost/predict                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Lambda                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                  Container Docker                       │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │     │
│  │  │   FastAPI    │  │   XGBoost    │  │   Scikit-    │  │     │
│  │  │   + Mangum   │  │   (~10MB)    │  │   learn      │  │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Memory: 512 MB | Timeout: 30s | Architecture: x86_64           │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST /xgboost/predict
Analyse un texte et retourne les probabilites pour chaque categorie.

**Request:**
```json
{
  "text": "You are so stupid and ugly!"
}
```

**Response:**
```json
{
  "is_toxic": true,
  "labels": {
    "toxic": {"probability": 0.92, "is_toxic": true},
    "severe_toxic": {"probability": 0.15, "is_toxic": false},
    "obscene": {"probability": 0.45, "is_toxic": false},
    "threat": {"probability": 0.02, "is_toxic": false},
    "insult": {"probability": 0.88, "is_toxic": true},
    "identity_hate": {"probability": 0.05, "is_toxic": false}
  },
  "summary": {
    "severity_score": 0.92,
    "detected_categories": ["toxic", "insult"],
    "severity_level": "Eleve"
  },
  "model": "XGBoost"
}
```

## Processus d'Entrainement

### 1. Preparation des donnees
```python
# Chargement du dataset Kaggle
train_df = pd.read_csv('train.csv')
# ~160,000 commentaires Wikipedia annotes
```

### 2. Preprocessing
```python
def preprocess(text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    return text
```

### 3. Vectorisation TF-IDF
```python
vectorizer = TfidfVectorizer(
    max_features=10000,
    ngram_range=(1, 2),
    stop_words='english'
)
X_train = vectorizer.fit_transform(train_texts)
```

### 4. Entrainement multi-label
```python
from xgboost import XGBClassifier
from sklearn.multioutput import MultiOutputClassifier

base_model = XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    use_label_encoder=False,
    eval_metric='logloss'
)

model = MultiOutputClassifier(base_model)
model.fit(X_train, y_train)
```

### 5. Sauvegarde
```python
import joblib
joblib.dump(model, 'xgboost_model.pkl')
joblib.dump(vectorizer, 'tfidf_vectorizer.pkl')
```

## Cas d'Usage Recommandes

- **Moderation rapide**: Filtrage en temps reel de gros volumes
- **Pre-filtrage**: Premiere passe avant analyse plus approfondie
- **Applications anglaises**: Plateformes en anglais uniquement
- **Ressources limitees**: Serveurs avec peu de RAM/CPU

## URLs de Production

- **API Endpoint**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/xgboost/`
- **Health Check**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/xgboost/health`

## References

- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [Jigsaw Toxic Comment Classification](https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge)
- [TF-IDF Scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html)
