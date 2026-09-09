# Dashboards Documentation

## Overview

The project ships three user interfaces deployed on AWS S3:

1. **Main application**: toxic comment analyzer
2. **Comparison dashboard**: real-time comparison of the three models
3. **Wikipedia Live**: real-time analysis of Wikipedia edits

## 1. Main Application (Analyzer)

### Description
Primary interface for analyzing a single comment with a selectable model.

### Features
- Model selection (XGBoost, RoBERTa, Multilingual)
- Free text input
- Result display with:
  - Verdict (toxic / clean)
  - Toxicity probability
  - Detected categories (XGBoost and RoBERTa)
  - Detected language (Multilingual)
  - Confidence level

### Design
- Theme: red, orange and black (toxicity theme)
- Icon: warning triangle
- Gradient: dark red to black

### URL
`http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com/`

---

## 2. Comparison Dashboard

### Description
Dashboard for comparing the three models simultaneously on the same text.

### Features

#### Global statistics
- Total number of analyses
- Toxic comments detected
- Clean comments
- Average response time

#### Model cards
For each model (XGBoost, RoBERTa, Multilingual):
- Status indicator (online / offline)
- Number of analyses performed
- Average response time
- Detected toxicity rate
- Performance (F1 or number of languages)

#### Comparative test
- Single input field
- Simultaneous analysis by the three models
- Side-by-side result display
- Progress bar for each model

#### Charts
- **Pie chart**: toxic / clean split
- **Bar chart**: model comparison

#### History
Table of the last 20 analyses, with:
- Analyzed text
- Result from each model
- Detected language
- Timestamp

### Design
- Theme consistent with the main application
- Colors per model:
  - XGBoost: green (#10b981)
  - RoBERTa: red and orange (#dc2626)
  - Multilingual: blue (#2563eb)

### URL
`http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com/dashboard.html`

---

## 3. Wikipedia Live Analyzer

### Description
Interface for real-time analysis of recent Wikipedia edits.

### Features

#### Configuration
- **Wikipedia edition**: FR, EN, DE, ES, IT, AR
- **Number of edits**: 10, 25, 50, 100
- **Analysis model**: Multilingual (recommended), XGBoost, RoBERTa

#### Controls
- Start / stop analysis button
- Clear results button
- Progress bar

#### Statistics
- Comments analyzed
- Toxic comments detected
- Clean comments
- Toxicity rate (%)

#### Charts
- **Doughnut**: result distribution
- **Line chart**: evolution in real time

#### Comment list
- Filtering: all / toxic / clean
- For each comment:
  - Wikipedia user
  - Edited article
  - Date and time
  - Edit summary text
  - Toxic / clean badge
  - Detected language
  - Probability with a visual bar

### Workflow
1. Retrieval through the Wikipedia API (`recentchanges`)
2. Filtering of edits that carry a comment
3. Sequential analysis through our API
4. Real-time display of results

### Design
- Consistent theme (red, orange, black)
- Wikipedia SVG icon
- Loading animations

### URL
`http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com/wikipedia.html`

---

## Navigation

The three pages are linked through a shared navigation bar:

```
┌─────────────────────────────────────────────────────────────┐
│  [Analyzer]     [Dashboard]    [Wikipedia Live]             │
└─────────────────────────────────────────────────────────────┘
```

- Active link: red background, white text
- Inactive link: light pink text, border on hover

---

## Technologies Used

### Frontend
- **React** (main application)
- **Vanilla JS** (dashboard, Wikipedia)
- **Chart.js**: interactive charts
- **Axios**: HTTP requests
- **CSS3**: animations and styling

### Backend
- **AWS API Gateway**: API entry point
- **AWS Lambda**: serverless functions
- **Docker**: containerization
- **FastAPI + Mangum**: Python framework

### Hosting
- **AWS S3**: static website
- **URL**: `http://toxic-classifier-frontend-836192637207.s3-website-us-east-1.amazonaws.com`

---

## Overall Architecture

```
                    ┌──────────────────────────────────────┐
                    │           AWS S3 Website              │
                    │  ┌──────────┐ ┌──────────┐ ┌────────┐│
                    │  │index.html│ │dashboard │ │wikipedia││
                    │  │  (React) │ │  .html   │ │ .html  ││
                    │  └────┬─────┘ └────┬─────┘ └───┬────┘│
                    └───────┼────────────┼───────────┼─────┘
                            │            │           │
                            ▼            ▼           ▼
                    ┌──────────────────────────────────────┐
                    │        AWS API Gateway               │
                    │    /xgboost  /roberta  /multilingual │
                    └───────────────────┬──────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
            │ Lambda XGBoost│   │ Lambda RoBERTa│   │ Lambda Multi  │
            │   (Docker)    │   │   (Docker)    │   │   (Docker)    │
            └───────────────┘   └───────────────┘   └───────────────┘
```

---

## Maintenance

### Frontend deployment
```bash
# Build React
cd deployment/frontend
npm run build

# Sync with S3
aws s3 sync build/ s3://toxic-classifier-frontend-836192637207 --delete

# Upload the static pages
aws s3 cp dashboard/index.html s3://toxic-classifier-frontend-836192637207/dashboard.html
aws s3 cp dashboard/wikipedia.html s3://toxic-classifier-frontend-836192637207/wikipedia.html
```

### Health check
```bash
# Test the endpoints
curl https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/xgboost/health
curl https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/roberta/health
curl https://0hik6heuhc.execute-api.us-east-1.amazonaws.com/prod/multilingual/health
```
