# XGBoost Model: Technical Documentation

## Overview

The XGBoost (eXtreme Gradient Boosting) model is our classical machine learning solution for toxicity detection. It is the fastest and lightest model in the pipeline.

## Technical Specifications

### Architecture
| Parameter | Value |
|-----------|-------|
| Type | Ensemble learning (gradient boosting) |
| Algorithm | XGBoost Classifier |
| Vectorization | TF-IDF (Term Frequency-Inverse Document Frequency) |
| Number of estimators | 100 |
| Max depth | 6 |
| Learning rate | 0.1 |

### Training data
- **Dataset**: Jigsaw Toxic Comment Classification Challenge
- **Size**: ~160,000 Wikipedia comments
- **Source**: Kaggle competition
- **Languages**: English only

### Classification labels (6 categories)
1. **toxic**: general toxic content
2. **severe_toxic**: severe or extreme toxicity
3. **obscene**: obscene language
4. **threat**: threats
5. **insult**: insults
6. **identity_hate**: identity-based hate speech

## Processing Pipeline

```
Raw text
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
Predictions (6 probabilities)
```

## Performance

### Test set metrics
| Metric | Score |
|--------|-------|
| Macro F1-Score | 0.76 |
| Precision | 0.78 |
| Recall | 0.74 |
| AUC-ROC | 0.97 |

### Response time
- **Cold start**: ~1 second
- **Inference**: ~50 to 100 ms per request
- **Batch (20 texts)**: ~500 ms

## Strengths

1. **Speed**: very fast inference, well suited to production
2. **Small footprint**: model size of only a few MB
3. **Interpretability**: feature importance is available
4. **Multi-label**: detects several types of toxicity at once
5. **Robustness**: low sensitivity to overfitting

## Limitations

1. **English only**: no support for other languages
2. **Limited context**: no deep semantic understanding
3. **Fixed vocabulary**: constrained by the pretrained TF-IDF vectorizer
4. **Sarcasm**: struggles with irony and sarcasm

## AWS Deployment Architecture

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
│  │                  Docker container                       │     │
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
Analyzes a text and returns the probability for each category.

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
    "severity_level": "High"
  },
  "model": "XGBoost"
}
```

## Training Process

### 1. Data preparation
```python
# Load the Kaggle dataset
train_df = pd.read_csv('train.csv')
# ~160,000 annotated Wikipedia comments
```

### 2. Preprocessing
```python
def preprocess(text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    return text
```

### 3. TF-IDF vectorization
```python
vectorizer = TfidfVectorizer(
    max_features=10000,
    ngram_range=(1, 2),
    stop_words='english'
)
X_train = vectorizer.fit_transform(train_texts)
```

### 4. Multi-label training
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

### 5. Saving
```python
import joblib
joblib.dump(model, 'xgboost_model.pkl')
joblib.dump(vectorizer, 'tfidf_vectorizer.pkl')
```

## Recommended Use Cases

- **Fast moderation**: real-time filtering of high volumes
- **Pre-filtering**: first pass before deeper analysis
- **English applications**: English-only platforms
- **Constrained resources**: servers with limited RAM or CPU

## Production URLs

- **API endpoint**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/xgboost/`
- **Health check**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/xgboost/health`

## References

- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [Jigsaw Toxic Comment Classification](https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge)
- [TF-IDF Scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html)
