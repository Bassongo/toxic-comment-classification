# RoBERTa Model: Technical Documentation

## Overview

RoBERTa (Robustly optimized BERT Approach) is our deep learning model, built on the Transformer architecture. It offers better contextual understanding than XGBoost, at the cost of slightly higher latency.

## Technical Specifications

### Architecture
| Parameter | Value |
|-----------|-------|
| Type | Transformer (deep learning) |
| Base model | RoBERTa-base |
| Number of parameters | ~125 million |
| Layers | 12 Transformer layers |
| Attention heads | 12 |
| Hidden size | 768 |
| Max tokens | 512 |

### Pretrained model
- **Source**: `s-nlp/roberta_toxicity_classifier`
- **Fine-tuning**: on toxicity data
- **Languages**: primarily English

### Classification labels (6 categories)
1. **toxic**: general toxic content
2. **severe_toxic**: severe toxicity
3. **obscene**: obscene language
4. **threat**: threats
5. **insult**: insults
6. **identity_hate**: identity-based hate speech

## Processing Pipeline

```
Raw text
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
Predictions (6 probabilities)
```

## Performance

### Test set metrics
| Metric | Score |
|--------|-------|
| Macro F1-Score | 0.80 |
| Precision | 0.82 |
| Recall | 0.78 |
| AUC-ROC | 0.98 |

### Response time
- **Cold start**: ~5 to 10 seconds
- **Inference**: ~200 to 500 ms per request
- **Batch (20 texts)**: ~2 to 3 seconds

## Strengths

1. **Contextual understanding**: captures sentence meaning
2. **Higher accuracy**: F1 above XGBoost
3. **Linguistic robustness**: handles variation better
4. **Transfer learning**: benefits from large-scale pretraining
5. **Nuance**: better detection of subtle insults

## Limitations

1. **English only**: no multilingual support
2. **Latency**: slower than XGBoost
3. **Resources**: requires more RAM (1 to 2 GB)
4. **Cold start**: initial loading time

## AWS Deployment Architecture

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
│  │                  Docker container                       │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │     │
│  │  │   FastAPI    │  │   PyTorch    │  │ Transformers │  │     │
│  │  │   + Mangum   │  │   (CPU)      │  │   HuggingFace│  │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │     │
│  │                                                         │     │
│  │  ┌──────────────────────────────────────────────────┐  │     │
│  │  │        RoBERTa model (~500MB)                    │  │     │
│  │  │        Pre-downloaded into the image             │  │     │
│  │  └──────────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Memory: 2048 MB | Timeout: 120s | Architecture: x86_64         │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST /roberta/predict
Analyzes a text with the RoBERTa model.

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
    "severity_level": "Very high"
  },
  "model": "RoBERTa"
}
```

## Training Process

### 1. Loading the pretrained model
```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer

model_name = "s-nlp/roberta_toxicity_classifier"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
```

### 2. Tokenization
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

### 4. Fine-tuning (optional)
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

## XGBoost vs RoBERTa

| Aspect | XGBoost | RoBERTa |
|--------|---------|---------|
| F1-Score | 0.76 | 0.80 |
| Latency | ~50ms | ~300ms |
| RAM | ~512MB | ~2GB |
| Context | Limited | Excellent |
| Sarcasm | Weak | Moderate |
| Cold start | ~1s | ~5 to 10s |

## Recommended Use Cases

- **High accuracy**: when quality matters more than speed
- **Complex content**: long or nuanced texts
- **In-depth moderation**: second pass after XGBoost
- **Sentiment analysis**: fine-grained contextual understanding

## Production URLs

- **API endpoint**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/roberta/`
- **Health check**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/roberta/health`

## References

- [RoBERTa Paper](https://arxiv.org/abs/1907.11692)
- [Hugging Face Model](https://huggingface.co/s-nlp/roberta_toxicity_classifier)
- [Transformers Library](https://huggingface.co/transformers/)
