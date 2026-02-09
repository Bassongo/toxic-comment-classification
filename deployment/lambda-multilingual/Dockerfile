# Dockerfile pour Lambda XLM-RoBERTa Multilingual
FROM public.ecr.aws/lambda/python:3.9

# Installer les outils de compilation necessaires
RUN yum install -y gcc gcc-c++ && yum clean all

# Copier requirements
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Installer NumPy compatible et PyTorch CPU
RUN pip install --no-cache-dir "numpy<2"
RUN pip install --no-cache-dir torch==2.0.1 --index-url https://download.pytorch.org/whl/cpu

# Installer sentencepiece
RUN pip install --no-cache-dir sentencepiece==0.1.99

# Installer transformers compatible avec torch 2.0.1
RUN pip install --no-cache-dir transformers==4.31.0

# Installer les autres dependances
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Pre-telecharger le modele Hugging Face dans le task root
ENV HF_HOME=/var/task/hf_cache
ENV TRANSFORMERS_CACHE=/var/task/hf_cache
RUN python -c "from transformers import AutoModelForSequenceClassification, AutoTokenizer; \
    print('Telechargement du tokenizer...'); \
    AutoTokenizer.from_pretrained('unitary/multilingual-toxic-xlm-roberta'); \
    print('Telechargement du modele...'); \
    AutoModelForSequenceClassification.from_pretrained('unitary/multilingual-toxic-xlm-roberta'); \
    print('Modele telecharge!')"

# Copier le code
COPY app.py ${LAMBDA_TASK_ROOT}/

CMD ["app.handler"]
