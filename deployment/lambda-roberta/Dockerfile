# Dockerfile pour Lambda RoBERTa
FROM public.ecr.aws/lambda/python:3.9

# Installer les dépendances système
RUN yum install -y gcc gcc-c++ && yum clean all

# Copier les requirements et installer les dépendances
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Installer PyTorch CPU et les autres dépendances
RUN pip install --no-cache-dir torch==2.1.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Pré-télécharger le modèle RoBERTa base (pour éviter de le télécharger à chaque cold start)
RUN python -c "from transformers import RobertaModel, RobertaTokenizer; RobertaModel.from_pretrained('roberta-base'); RobertaTokenizer.from_pretrained('roberta-base')"

# Copier le code de l'application
COPY app.py ${LAMBDA_TASK_ROOT}/

# Handler
CMD ["app.handler"]
