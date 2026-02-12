# Dataset - Jigsaw Toxic Comment Classification

## Source

Les données proviennent de la compétition Kaggle "Jigsaw Toxic Comment Classification Challenge".

Lien : https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge/data

## Téléchargement

1. Créer un compte Kaggle si ce n'est pas déjà fait
2. Accepter les règles de la compétition
3. Télécharger les fichiers suivants :
   - train.csv (159 571 commentaires annotés)
   - test.csv (153 164 commentaires)
   - test_labels.csv (labels du jeu de test)

## Structure des données

Le fichier train.csv contient les colonnes suivantes :

- id : identifiant unique du commentaire
- comment_text : texte du commentaire Wikipedia
- toxic : label binaire (0 ou 1)
- severe_toxic : label binaire (0 ou 1)
- obscene : label binaire (0 ou 1)
- threat : label binaire (0 ou 1)
- insult : label binaire (0 ou 1)
- identity_hate : label binaire (0 ou 1)

## Statistiques

- Nombre total de commentaires : 159 571
- Commentaires toxiques : environ 10%
- Multi-label : un commentaire peut avoir plusieurs labels

## Utilisation

Placer le fichier train.csv dans ce dossier avant d'exécuter les notebooks d'entraînement.
