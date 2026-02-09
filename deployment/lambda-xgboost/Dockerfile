# Dockerfile pour Lambda XGBoost
FROM public.ecr.aws/lambda/python:3.9

# Copier les requirements et installer les dépendances
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Télécharger les ressources NLTK
RUN python -c "import nltk; nltk.download('stopwords', download_dir='/tmp/nltk_data'); nltk.download('punkt', download_dir='/tmp/nltk_data'); nltk.download('punkt_tab', download_dir='/tmp/nltk_data')"
RUN cp -r /tmp/nltk_data ${LAMBDA_TASK_ROOT}/nltk_data

# Copier le code de l'application
COPY app.py ${LAMBDA_TASK_ROOT}/

# Définir les variables d'environnement
ENV NLTK_DATA=${LAMBDA_TASK_ROOT}/nltk_data

# Handler
CMD ["app.handler"]
