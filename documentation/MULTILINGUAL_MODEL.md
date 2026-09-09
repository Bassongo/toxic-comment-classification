# Multilingual XLM-RoBERTa Model: Documentation

## Overview

The multilingual model is based on **XLM-RoBERTa** (Cross-lingual Language Model, RoBERTa), a transformer pretrained on more than 100 languages. We use the fine-tuned `unitary/multilingual-toxic-xlm-roberta` checkpoint, specialized in multilingual toxicity detection.

## Technical Specifications

### Architecture
| Parameter | Value |
|-----------|-------|
| Base model | XLM-RoBERTa |
| Size | ~560M parameters |
| Supported languages | 100+ |
| Task | Binary classification (toxic / clean) |
| Max tokens | 512 |

### Main supported languages
- **French (FR)**: primary target language
- **English (EN)**: reference language
- **Arabic (AR)**: RTL (right to left) support
- **Spanish, German, Italian, Portuguese, Russian, Chinese, Japanese and others**

## Model Comparison

| Characteristic | XGBoost | RoBERTa | Multilingual XLM-RoBERTa |
|----------------|---------|---------|--------------------------|
| Type | Classical ML | Deep learning | Deep learning |
| Languages | English | English | 100+ languages |
| Categories | 6 labels | 6 labels | Binary (toxic / clean) |
| Speed | Very fast | Fast | Moderate |
| Cold start | ~1s | ~5s | ~30 to 45s |
| Accuracy (EN) | F1: 0.76 | F1: 0.80 | Comparable |
| Use case | Fast production | English accuracy | Multilingual |

## AWS Deployment Architecture

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
│  │                  Docker container                       │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │     │
│  │  │   FastAPI    │  │   PyTorch    │  │ Transformers │  │     │
│  │  │   + Mangum   │  │   (CPU)      │  │   HuggingFace│  │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │     │
│  │                                                         │     │
│  │  ┌──────────────────────────────────────────────────┐  │     │
│  │  │        XLM-RoBERTa model (~1.1GB)                │  │     │
│  │  │        Pre-downloaded into the image             │  │     │
│  │  └──────────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Memory: 3008 MB | Timeout: 300s | Architecture: x86_64         │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST /multilingual/predict
Analyzes a text in any supported language.

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
  "confidence": "Very high",
  "language_detected": "fr",
  "model": "XLM-RoBERTa Multilingual"
}
```

### POST /multilingual/predict/batch
Analyzes several texts in a single request.

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
Returns the health status of the service.

## Detection Examples by Language

### French
| Text | Toxic | Probability |
|------|-------|-------------|
| "Tu es vraiment stupide!" (You are really stupid) | Yes | 98.5% |
| "Merci beaucoup pour cette aide!" (Thank you for the help) | No | 0.1% |
| "Je vais te tuer!" (I am going to kill you) | Yes | 99.2% |

### English
| Text | Toxic | Probability |
|------|-------|-------------|
| "You are stupid!" | Yes | 99.2% |
| "Great article, thanks!" | No | 0.05% |

### Arabic
| Text | Toxic | Probability |
|------|-------|-------------|
| "انت غبي" (You are stupid) | Yes | ~85% |
| "شكرا جزيلا" (Thank you very much) | No | 0.1% |

## Implemented Optimizations

### 1. Model preloading
The model is downloaded and stored in the Docker image at build time, which avoids downloads at runtime.

```dockerfile
ENV HF_HOME=/var/task/hf_cache
RUN python -c "AutoModelForSequenceClassification.from_pretrained(...)"
```

### 2. Eager loading
The model is loaded when the Python module starts, not on the first request.

```python
# Preload the model at startup
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, local_files_only=True)
```

### 3. NumPy compatibility
NumPy below 2.0 is pinned to avoid incompatibilities with PyTorch.

```dockerfile
RUN pip install --no-cache-dir "numpy<2"
```

## Limitations

1. **Cold start**: ~30 to 45 seconds on the first call (loading the model into memory)
2. **Binary classification**: unlike the other models, it does not return detailed categories
3. **Cost**: a Lambda with 3 GB of RAM is more expensive to run
4. **API Gateway timeout**: 29 seconds maximum, which can fail on a cold start

## Possible Future Improvements

1. **Provisioned concurrency**: keep Lambda instances warm
2. **EFS**: store the model on EFS for faster loading
3. **SageMaker endpoint**: for more stable latency
4. **Distillation**: use a lighter distilled model

## Production URLs

- **API endpoint**: `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/multilingual/`
- **Frontend**: `http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com`

## References

- [XLM-RoBERTa Paper](https://arxiv.org/abs/1911.02116)
- [Hugging Face Model](https://huggingface.co/unitary/multilingual-toxic-xlm-roberta)
- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
