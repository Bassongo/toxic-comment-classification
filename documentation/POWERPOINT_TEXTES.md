# Textes pour Presentation PowerPoint
## Projet: Classification de Commentaires Toxiques

---

## SLIDE 1: Page de Titre

**Titre:** Classification de Commentaires Toxiques par Machine Learning

**Sous-titre:** Detection automatique de toxicite multilingue avec XGBoost, RoBERTa et XLM-RoBERTa

**Contexte:** Projet NLP - Analyse de commentaires Wikipedia

---

## SLIDE 2: Contexte et Problematique

**Titre:** Pourquoi detecter la toxicite en ligne?

**Points cles:**
- Les plateformes en ligne font face a des millions de commentaires quotidiens
- La moderation manuelle est couteuse et lente
- Les commentaires toxiques nuisent a l'experience utilisateur
- Wikipedia recoit des milliers de modifications par minute

**Objectif:** Developper un systeme automatique de detection de toxicite capable d'analyser des commentaires en temps reel, en plusieurs langues.

---

## SLIDE 3: Donnees d'Entrainement

**Titre:** Dataset Jigsaw Toxic Comment Classification

**Description:**
- Source: Competition Kaggle par Jigsaw/Google
- Volume: ~160,000 commentaires Wikipedia annotes
- 6 categories de toxicite:
  - Toxic (toxique general)
  - Severe Toxic (toxicite extreme)
  - Obscene (langage obscene)
  - Threat (menaces)
  - Insult (insultes)
  - Identity Hate (haine identitaire)

**Defi:** Dataset desequilibre - moins de 10% de commentaires toxiques

---

## SLIDE 4: Approche Multi-Modeles

**Titre:** Strategie: 3 Modeles Complementaires

| Modele | Type | Forces | Cas d'usage |
|--------|------|--------|-------------|
| XGBoost | ML Classique | Rapidite, legerete | Production haute frequence |
| RoBERTa | Deep Learning | Precision, contexte | Analyse approfondie |
| XLM-RoBERTa | Multilingue | 100+ langues | Contenu international |

**Principe:** Chaque modele repond a un besoin specifique, offrant flexibilite et robustesse.

---

## SLIDE 5: Modele 1 - XGBoost

**Titre:** XGBoost: Rapidite et Efficacite

**Architecture:**
- Algorithme: Gradient Boosting (ensemble d'arbres de decision)
- Vectorisation: TF-IDF (10,000 features, bigrams)
- Classification: Multi-label (6 sorties)

**Performance:**
- F1-Score: 0.76
- Temps de reponse: ~50ms
- Taille du modele: ~10 MB

**Avantages:** Ultra-rapide, interpretable, faible consommation de ressources

**Limitation:** Anglais uniquement, comprehension contextuelle limitee

---

## SLIDE 6: Modele 2 - RoBERTa

**Titre:** RoBERTa: Comprehension Contextuelle

**Architecture:**
- Base: Transformer pre-entraine (125M parametres)
- 12 couches d'attention
- Tokenisation WordPiece

**Performance:**
- F1-Score: 0.80 (+5% vs XGBoost)
- Temps de reponse: ~300ms
- Taille du modele: ~500 MB

**Avantages:** Meilleure comprehension du contexte, detecte les nuances

**Limitation:** Plus lent, necessite plus de ressources

---

## SLIDE 7: Modele 3 - XLM-RoBERTa Multilingue

**Titre:** XLM-RoBERTa: Le Polyglotte

**Architecture:**
- Base: XLM-RoBERTa (560M parametres)
- Pre-entraine sur 100+ langues
- Fine-tune pour detection de toxicite

**Langues supportees:**
- Francais, Anglais, Arabe, Espagnol, Allemand
- Chinois, Japonais, Russe, Portugais, Italien
- Et 90+ autres langues

**Performance:**
- Precision comparable a RoBERTa
- Detection de langue automatique

---

## SLIDE 8: Pipeline de Traitement

**Titre:** Du Texte Brut a la Prediction

```
Texte utilisateur
       │
       ▼
┌─────────────────┐
│  Preprocessing  │  Nettoyage, normalisation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tokenisation   │  Decoupe en tokens
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Modele ML    │  XGBoost / RoBERTa / XLM
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Predictions   │  Probabilites + Verdict
└─────────────────┘
```

---

## SLIDE 9: Architecture Cloud AWS

**Titre:** Deploiement Serverless sur AWS

**Composants:**
- **S3**: Hebergement du frontend (React + pages statiques)
- **API Gateway**: Point d'entree REST API
- **Lambda**: Fonctions serverless conteneurisees (Docker)
- **ECR**: Registre d'images Docker

**Avantages:**
- Scalabilite automatique
- Paiement a l'usage
- Haute disponibilite
- Pas de serveur a gerer

---

## SLIDE 10: Interfaces Utilisateur

**Titre:** 3 Dashboards Interactifs

**1. Analyseur Principal**
- Analyse de texte libre
- Choix du modele
- Affichage detaille des resultats

**2. Dashboard Comparatif**
- Comparaison simultanee des 3 modeles
- Statistiques en temps reel
- Graphiques interactifs

**3. Wikipedia Live**
- Analyse des modifications Wikipedia en direct
- Support multilingue (FR, EN, AR, DE, ES, IT)
- Visualisation temps reel

---

## SLIDE 11: Demonstration - Exemples

**Titre:** Exemples de Detection

| Texte | Modele | Resultat | Probabilite |
|-------|--------|----------|-------------|
| "You are stupid!" | XGBoost | Toxique | 92% |
| "Tu es vraiment nul!" | Multilingue | Toxique | 88% |
| "Great article, thanks!" | RoBERTa | Propre | 2% |
| "انت غبي جدا" (Tu es tres stupide) | Multilingue | Toxique | 85% |

**Observation:** Le modele multilingue detecte la toxicite dans differentes langues sans traduction prealable.

---

## SLIDE 12: Application Wikipedia

**Titre:** Cas d'Usage: Moderation Wikipedia

**Workflow:**
1. Connexion a l'API Wikipedia Recent Changes
2. Recuperation des commentaires de modification
3. Analyse en temps reel avec le modele multilingue
4. Affichage des resultats avec filtrage

**Resultats observes:**
- Taux de toxicite variable selon les editions
- Detection efficace dans toutes les langues testees
- Temps de traitement acceptable (<1s par commentaire)

---

## SLIDE 13: Comparaison des Performances

**Titre:** Benchmark des 3 Modeles

| Metrique | XGBoost | RoBERTa | XLM-RoBERTa |
|----------|---------|---------|-------------|
| F1-Score | 0.76 | 0.80 | ~0.78 |
| Latence | 50ms | 300ms | 400ms |
| Cold Start | 1s | 5s | 30s |
| RAM | 512MB | 2GB | 3GB |
| Langues | 1 | 1 | 100+ |

**Conclusion:** Choix du modele selon le contexte (vitesse vs precision vs multilinguisme)

---

## SLIDE 14: Defis Rencontres

**Titre:** Challenges Techniques

**1. Cold Start Lambda**
- Probleme: 30-45s pour le modele multilingue
- Solution: Pre-chargement du modele dans l'image Docker

**2. Taille des images Docker**
- Probleme: Modeles > 1GB
- Solution: Optimisation, cache HuggingFace

**3. Compatibilite NumPy/PyTorch**
- Probleme: NumPy 2.x incompatible
- Solution: Forcer NumPy < 2.0

**4. Timeout API Gateway**
- Probleme: Limite 29s
- Solution: Timeout Lambda 5 min + gestion asynchrone

---

## SLIDE 15: Ameliorations Futures

**Titre:** Perspectives d'Evolution

**Court terme:**
- Provisioned Concurrency pour reduire le cold start
- Cache des predictions frequentes
- Extension Chrome pour moderation en temps reel

**Moyen terme:**
- Bot Discord/Telegram
- Analyse de sentiment (positif/negatif/neutre)
- Dashboard CloudWatch avec metriques detaillees

**Long terme:**
- Modele distille plus leger
- Fine-tuning sur donnees specifiques
- Support de nouvelles categories

---

## SLIDE 16: Conclusion

**Titre:** Bilan du Projet

**Realisations:**
- 3 modeles de detection de toxicite deployes
- Support de 100+ langues
- Interface utilisateur complete
- Analyse Wikipedia en temps reel
- Architecture cloud scalable

**Apprentissages:**
- Compromis vitesse/precision en ML
- Deploiement de modeles lourds sur Lambda
- Importance du pre-traitement des donnees

**Impact:** Systeme operationnel capable de moderer des contenus multilingues en temps reel.

---

## SLIDE 17: Questions & Demo

**Titre:** Merci pour votre attention!

**URLs de demonstration:**
- Application: `http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com`
- Dashboard: `/dashboard.html`
- Wikipedia Live: `/wikipedia.html`

**API:**
- `https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/`

**Questions?**

---

## Notes pour le presentateur

### Timing suggere (20 min):
- Slides 1-3: 3 min (Introduction)
- Slides 4-7: 5 min (Les modeles)
- Slides 8-10: 4 min (Architecture)
- Slides 11-13: 4 min (Demo et resultats)
- Slides 14-17: 4 min (Conclusion)

### Points a souligner:
1. La complementarite des modeles (pas de solution unique)
2. L'aspect multilingue comme valeur ajoutee
3. Le cas concret Wikipedia comme preuve de concept
4. L'architecture serverless pour la scalabilite

### Demo suggeree:
1. Montrer l'analyseur avec un texte toxique en francais
2. Comparer les resultats sur le dashboard
3. Lancer une analyse Wikipedia en direct (5-10 modifications)
