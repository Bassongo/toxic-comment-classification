import React, { useState } from 'react';
import axios from 'axios';
import config from './config';

// Exemples de commentaires (multilingues)
const EXAMPLES = [
  { text: "You are stupid and I hate you!", type: "toxic", lang: "EN" },
  { text: "Tu es vraiment stupide!", type: "toxic", lang: "FR" },
  { text: "Great article, thanks for sharing!", type: "clean", lang: "EN" },
  { text: "Merci beaucoup pour cette aide!", type: "clean", lang: "FR" },
];

// Labels avec leurs traductions
const LABEL_NAMES = {
  toxic: 'Toxique',
  severe_toxic: 'Tres Toxique',
  obscene: 'Obscene',
  threat: 'Menace',
  insult: 'Insulte',
  identity_hate: 'Haine Identitaire'
};

function App() {
  const [text, setText] = useState('');
  const [model, setModel] = useState('xgboost');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeComment = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    let endpoint;
    if (model === 'xgboost') {
      endpoint = config.ENDPOINTS.XGBOOST.predict;
    } else if (model === 'roberta') {
      endpoint = config.ENDPOINTS.ROBERTA.predict;
    } else {
      endpoint = config.ENDPOINTS.MULTILINGUAL.predict;
    }

    try {
      const response = await axios.post(
        `${config.API_BASE_URL}${endpoint}`,
        { text: text },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000
        }
      );
      setResult(response.data);
    } catch (err) {
      console.error('Erreur:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Erreur lors de l\'analyse. Verifiez que l\'API est deployee.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (probability, detected) => {
    if (detected) return '#dc2626';
    if (probability > 0.3) return '#f59e0b';
    return '#10b981';
  };

  const getSeverityLevel = (score) => {
    if (score >= 0.7) return { text: 'Critique', color: '#dc2626' };
    if (score >= 0.4) return { text: 'Modere', color: '#f59e0b' };
    return { text: 'Faible', color: '#10b981' };
  };

  return (
    <div className="app-container">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0a0a;
          min-height: 100vh;
        }

        .app-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%);
          padding: 20px 20px 40px;
        }

        /* Navigation Bar */
        .nav-bar {
          max-width: 1000px;
          margin: 0 auto 20px;
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 12px;
          background: rgba(30, 30, 30, 0.8);
          border-radius: 12px;
          border: 1px solid rgba(220, 38, 38, 0.2);
          backdrop-filter: blur(10px);
        }

        .nav-link {
          padding: 10px 20px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #a0a0a0;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-link:hover {
          background: rgba(220, 38, 38, 0.1);
          border-color: rgba(220, 38, 38, 0.3);
          color: #ff6b6b;
        }

        .nav-link.active {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          border-color: transparent;
          color: white;
        }

        .nav-icon {
          width: 16px;
          height: 16px;
        }

        .main-card {
          max-width: 1000px;
          margin: 0 auto;
          background: linear-gradient(180deg, #1a1a1a 0%, #141414 100%);
          border-radius: 24px;
          border: 1px solid rgba(220, 38, 38, 0.15);
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(220, 38, 38, 0.15), 0 0 100px -20px rgba(220, 38, 38, 0.1);
        }

        .header {
          background: linear-gradient(135deg, #1a0505 0%, #2d0a0a 50%, #1a0505 100%);
          padding: 48px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid rgba(220, 38, 38, 0.2);
        }

        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(220, 38, 38, 0.08) 0%, transparent 50%);
          animation: pulse-bg 4s ease-in-out infinite;
        }

        @keyframes pulse-bg {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        .header-content {
          position: relative;
          z-index: 1;
        }

        .logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 10px 40px -10px rgba(220, 38, 38, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .logo svg {
          width: 44px;
          height: 44px;
          color: white;
        }

        .title {
          font-size: 2.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, #ffffff 0%, #fca5a5 50%, #dc2626 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 1.1rem;
          color: #a0a0a0;
          font-weight: 400;
        }

        .subtitle span {
          color: #dc2626;
          font-weight: 600;
        }

        .body {
          padding: 40px;
        }

        .model-selector {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
        }

        .model-btn {
          flex: 1;
          padding: 20px 24px;
          border: 2px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(30, 30, 30, 0.5);
          text-align: left;
        }

        .model-btn:hover {
          background: rgba(50, 50, 50, 0.5);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .model-btn.active {
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.1) 100%);
          border-color: rgba(220, 38, 38, 0.4);
          box-shadow: 0 10px 40px -10px rgba(220, 38, 38, 0.3);
        }

        .model-btn-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .model-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 700;
        }

        .model-icon.xgboost {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: white;
        }

        .model-icon.roberta {
          background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);
          color: white;
        }

        .model-icon.multilingual {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
        }

        .model-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e0e0e0;
        }

        .model-badge {
          margin-left: auto;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.6);
        }

        .model-btn.active .model-badge {
          background: rgba(220, 38, 38, 0.2);
          color: #fca5a5;
        }

        .model-desc {
          font-size: 0.875rem;
          color: #707070;
          margin-left: 56px;
        }

        .model-btn.active .model-desc {
          color: #a0a0a0;
        }

        .input-section {
          margin-bottom: 24px;
        }

        .input-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #808080;
          margin-bottom: 8px;
        }

        .textarea {
          width: 100%;
          min-height: 160px;
          padding: 20px;
          font-size: 1rem;
          font-family: inherit;
          background: rgba(20, 20, 20, 0.8);
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          color: #e0e0e0;
          resize: vertical;
          transition: all 0.3s ease;
          outline: none;
        }

        .textarea::placeholder {
          color: #505050;
        }

        .textarea:focus {
          border-color: rgba(220, 38, 38, 0.4);
          box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1);
        }

        .examples-section {
          margin-bottom: 24px;
        }

        .examples-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #808080;
          margin-bottom: 12px;
        }

        .examples-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .example-btn {
          padding: 10px 16px;
          background: rgba(40, 40, 40, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #b0b0b0;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .example-btn:hover {
          background: rgba(60, 60, 60, 0.6);
          border-color: rgba(255, 255, 255, 0.15);
          color: #e0e0e0;
        }

        .example-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .example-dot.toxic {
          background: #dc2626;
          box-shadow: 0 0 8px rgba(220, 38, 38, 0.5);
        }

        .example-dot.clean {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }

        .analyze-btn {
          width: 100%;
          padding: 18px 32px;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 10px 40px -10px rgba(220, 38, 38, 0.4);
        }

        .analyze-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px -10px rgba(220, 38, 38, 0.5);
        }

        .analyze-btn:disabled {
          background: #333;
          color: #666;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .loading-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
          gap: 16px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #333;
          border-top-color: #dc2626;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          color: #808080;
          font-size: 0.95rem;
        }

        .error-box {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 12px;
          padding: 16px 20px;
          margin-top: 24px;
          color: #fca5a5;
          font-size: 0.95rem;
        }

        .result-section {
          margin-top: 32px;
        }

        .result-card {
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid;
        }

        .result-card.toxic {
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%);
          border-color: rgba(220, 38, 38, 0.3);
        }

        .result-card.clean {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .result-header {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .result-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .result-icon.toxic {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        }

        .result-icon.clean {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .result-icon svg {
          width: 32px;
          height: 32px;
          color: white;
        }

        .result-info h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .result-info h2.toxic {
          color: #fca5a5;
        }

        .result-info h2.clean {
          color: #6ee7b7;
        }

        .result-meta {
          display: flex;
          gap: 20px;
          color: #808080;
          font-size: 0.9rem;
        }

        .result-meta span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .severity-badge {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-left: auto;
        }

        .labels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          padding: 24px;
        }

        .label-card {
          background: rgba(20, 20, 20, 0.5);
          border-radius: 14px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .label-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .label-name {
          font-weight: 600;
          color: #d0d0d0;
          font-size: 0.95rem;
        }

        .label-status {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .label-status.detected {
          background: rgba(220, 38, 38, 0.2);
          color: #fca5a5;
        }

        .label-status.safe {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }

        .progress-container {
          margin-bottom: 10px;
        }

        .progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .label-footer {
          display: flex;
          justify-content: space-between;
          color: #606060;
          font-size: 0.85rem;
        }

        .footer {
          background: rgba(10, 10, 10, 0.8);
          padding: 24px 40px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .footer-title {
          color: #c0c0c0;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .footer-subtitle {
          color: #606060;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .app-container {
            padding: 15px 12px;
          }

          .nav-bar {
            flex-wrap: wrap;
            gap: 8px;
          }

          .nav-link {
            padding: 8px 14px;
            font-size: 0.8rem;
          }

          .header {
            padding: 32px 24px;
          }

          .title {
            font-size: 1.8rem;
          }

          .body {
            padding: 24px;
          }

          .model-selector {
            flex-direction: column;
          }

          .model-desc {
            margin-left: 0;
            margin-top: 8px;
          }

          .labels-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Navigation Bar */}
      <nav className="nav-bar">
        <a href="/" className="nav-link active">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          Analyseur
        </a>
        <a href="/dashboard.html" className="nav-link">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </a>
        <a href="/wikipedia.html" className="nav-link">
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          Wikipedia Live
        </a>
      </nav>

      <div className="main-card">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h1 className="title">Toxic Comment Classifier</h1>
            <p className="subtitle">Detection de <span>toxicite</span> par Intelligence Artificielle</p>
          </div>
        </div>

        {/* Body */}
        <div className="body">
          {/* Model Selector */}
          <div className="model-selector">
            <button
              className={`model-btn ${model === 'xgboost' ? 'active' : ''}`}
              onClick={() => setModel('xgboost')}
            >
              <div className="model-btn-header">
                <div className="model-icon xgboost">XG</div>
                <span className="model-name">XGBoost</span>
                <span className="model-badge">F1: 0.76</span>
              </div>
              <p className="model-desc">Machine Learning classique - Reponse rapide</p>
            </button>

            <button
              className={`model-btn ${model === 'roberta' ? 'active' : ''}`}
              onClick={() => setModel('roberta')}
            >
              <div className="model-btn-header">
                <div className="model-icon roberta">RB</div>
                <span className="model-name">RoBERTa</span>
                <span className="model-badge">F1: 0.80</span>
              </div>
              <p className="model-desc">Deep Learning Transformer - Meilleure precision</p>
            </button>

            <button
              className={`model-btn ${model === 'multilingual' ? 'active' : ''}`}
              onClick={() => setModel('multilingual')}
            >
              <div className="model-btn-header">
                <div className="model-icon multilingual">ML</div>
                <span className="model-name">Multilingue</span>
                <span className="model-badge">100+ Langues</span>
              </div>
              <p className="model-desc">XLM-RoBERTa - FR, EN, AR et plus</p>
            </button>
          </div>

          {/* Input Section */}
          <div className="input-section">
            <label className="input-label">Commentaire a analyser</label>
            <textarea
              className="textarea"
              placeholder="Saisissez le texte a analyser..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* Examples */}
          <div className="examples-section">
            <p className="examples-label">Exemples de test</p>
            <div className="examples-grid">
              {EXAMPLES.map((example, idx) => (
                <button
                  key={idx}
                  className="example-btn"
                  onClick={() => setText(example.text)}
                >
                  <span className={`example-dot ${example.type}`}></span>
                  {example.text.length > 35 ? example.text.substring(0, 35) + '...' : example.text}
                </button>
              ))}
            </div>
          </div>

          {/* Analyze Button */}
          <button
            className="analyze-btn"
            onClick={analyzeComment}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                Analyse en cours...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                Analyser le commentaire
              </>
            )}
          </button>

          {/* Loading */}
          {loading && (
            <div className="loading-section">
              <div className="spinner"></div>
              <span className="loading-text">
                Analyse avec le modele {model === 'xgboost' ? 'XGBoost' : model === 'roberta' ? 'RoBERTa' : 'Multilingue'}...
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="result-section">
              <div className={`result-card ${result.is_toxic ? 'toxic' : 'clean'}`}>
                <div className="result-header">
                  <div className={`result-icon ${result.is_toxic ? 'toxic' : 'clean'}`}>
                    {result.is_toxic ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    )}
                  </div>
                  <div className="result-info">
                    <h2 className={result.is_toxic ? 'toxic' : 'clean'}>
                      {result.is_toxic ? 'Contenu Toxique Detecte' : 'Contenu Non Toxique'}
                    </h2>
                    <div className="result-meta">
                      {result.labels ? (
                        <>
                          <span>{result.summary?.total_labels_detected || 0} categorie(s) detectee(s)</span>
                          <span>Score: {((result.summary?.severity_score || 0) * 100).toFixed(1)}%</span>
                        </>
                      ) : (
                        <>
                          <span>Probabilite: {((result.toxic_probability || 0) * 100).toFixed(1)}%</span>
                          <span>Confiance: {result.confidence || 'N/A'}</span>
                          {result.language_detected && <span>Langue: {result.language_detected.toUpperCase()}</span>}
                        </>
                      )}
                    </div>
                  </div>
                  {result.is_toxic && (
                    <div
                      className="severity-badge"
                      style={{
                        background: `${getSeverityLevel(result.summary?.severity_score || result.toxic_probability || 0).color}20`,
                        color: getSeverityLevel(result.summary?.severity_score || result.toxic_probability || 0).color
                      }}
                    >
                      Severite: {getSeverityLevel(result.summary?.severity_score || result.toxic_probability || 0).text}
                    </div>
                  )}
                </div>

                {result.labels ? (
                  <div className="labels-grid">
                    {Object.entries(result.labels || {}).map(([label, info]) => (
                      <div key={label} className="label-card">
                        <div className="label-header">
                          <span className="label-name">{LABEL_NAMES[label] || label}</span>
                          <span className={`label-status ${info.detected ? 'detected' : 'safe'}`}>
                            {info.detected ? 'Detecte' : 'OK'}
                          </span>
                        </div>
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${(info.probability || 0) * 100}%`,
                                background: getProgressColor(info.probability, info.detected)
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="label-footer">
                          <span>Probabilite: {((info.probability || 0) * 100).toFixed(1)}%</span>
                          {info.threshold && <span>Seuil: {(info.threshold * 100).toFixed(0)}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="labels-grid">
                    <div className="label-card">
                      <div className="label-header">
                        <span className="label-name">Toxicite</span>
                        <span className={`label-status ${result.is_toxic ? 'detected' : 'safe'}`}>
                          {result.is_toxic ? 'Detecte' : 'OK'}
                        </span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${(result.toxic_probability || 0) * 100}%`,
                              background: getProgressColor(result.toxic_probability, result.is_toxic)
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="label-footer">
                        <span>Probabilite: {((result.toxic_probability || 0) * 100).toFixed(1)}%</span>
                        <span>Modele: {result.model || 'Multilingue'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <p className="footer-title">Projet NLP - Classification de Commentaires Toxiques</p>
          <p className="footer-subtitle">XGBoost | RoBERTa | XLM-RoBERTa Multilingue (FR, EN, AR +100)</p>
        </div>
      </div>
    </div>
  );
}

export default App;
