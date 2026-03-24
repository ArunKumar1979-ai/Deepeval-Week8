import React from 'react';
import { LLMEvalResponse } from './types';

interface ResponsePanelProps {
  response: LLMEvalResponse | null;
  isLoading: boolean;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, isLoading }) => {
  if (isLoading) {
    return (
      <div className="llm-eval-response-panel">
        <h3 className="llm-eval-response-title">Response</h3>
        <div className="llm-eval-loading-container">
          <div className="llm-eval-loader"></div>
          <span className="llm-eval-loading-text">Evaluating your metrics...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="llm-eval-response-panel">
        <h3 className="llm-eval-response-title">Response</h3>
        <div className="llm-eval-placeholder-text">
          Click "Evaluate" to see results
        </div>
      </div>
    );
  }

  try {
    // Debug: Log the full response
    console.log("📥 ResponsePanel received:", JSON.stringify(response, null, 2));

    const getVerdictClass = (verdict: string | null | undefined): string => {
      if (!verdict) return 'llm-eval-verdict-neutral';
      const lowerVerdict = verdict.toLowerCase();
      
      // GREEN for positive verdicts (FAITHFUL, HIGH, RELEVANT, HIGH_RECALL, HIGH_PRECISION)
      if (
        lowerVerdict.includes('faithful') ||
        lowerVerdict.includes('high') ||
        lowerVerdict.includes('relevant') ||
        lowerVerdict === 'yes' ||
        lowerVerdict === 'excellent' ||
        lowerVerdict === 'good'
      ) {
        return 'llm-eval-verdict-faithful';
      }
      
      // RED for negative verdicts (NOT_FAITHFUL, LOW, NOT_RELEVANT, LOW_RECALL, LOW_PRECISION)
      if (
        lowerVerdict.includes('not_') ||
        lowerVerdict.includes('low') ||
        lowerVerdict === 'poor' ||
        lowerVerdict === 'no' ||
        lowerVerdict === 'false'
      ) {
        return 'llm-eval-verdict-unfaithful';
      }
      
      // AMBER for PARTIAL or ACCEPTABLE verdicts
      if (
        lowerVerdict.includes('partial') ||
        lowerVerdict.includes('acceptable') ||
        lowerVerdict.includes('medium')
      ) {
        return 'llm-eval-verdict-partial';
      }
      
      return 'llm-eval-verdict-neutral';
    };

    // Check if this is a multi-metric response (All or RAGAS)
    const isMultiMetric = (response as any).allMetrics === true || ((response as any).results && Array.isArray((response as any).results));
    
    if (isMultiMetric) {
      // Handle multi-metric response (All metrics or RAGAS)
      const results = (response as any).results || [];
      const query = response.query || null;
      const output = response.output || null;

      return (
        <div className="llm-eval-response-panel">
          <h3 className="llm-eval-response-title">Response</h3>
          <div className="llm-eval-response-content">
            {/* Multi-Metric Header */}
            <div className="llm-eval-response-section">
              <h4 className="llm-eval-response-section-title">
                📊 {(response as any).metric === 'all' ? 'All Metrics Evaluation' : 'RAGAS Evaluation Results'}
              </h4>
              <p className="llm-eval-response-text" style={{ fontSize: '0.9em', color: '#666' }}>
                {(response as any).totalMetrics ? `Total Metrics: ${(response as any).totalMetrics}` : `${results.length} metrics evaluated`}
              </p>
            </div>

            {/* Multi-Metric Table */}
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9em',
                border: '1px solid #e0e0e0',
                borderRadius: '4px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Metric</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Score</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Verdict</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>
                        {result.metric_name?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#2196F3' }}>
                        {result.score !== null && result.score !== undefined 
                          ? (typeof result.score === 'number' ? result.score.toFixed(2) : result.score)
                          : 'N/A'
                        }
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span className={`llm-eval-verdict ${getVerdictClass(result.verdict)}`}>
                          {result.verdict || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.85em', color: '#555' }}>
                        {(result.explanation || 'No explanation').substring(0, 80)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Query & Output Section */}
            {(query || output) && (
              <div className="llm-eval-response-section">
                <h4 className="llm-eval-response-section-title">Evaluation Input</h4>
                {query && (
                  <div className="llm-eval-response-subsection">
                    <strong className="llm-eval-response-sublabel">Query:</strong>
                    <p className="llm-eval-response-text">{query}</p>
                  </div>
                )}
                {output && (
                  <div className="llm-eval-response-subsection">
                    <strong className="llm-eval-response-sublabel">Output:</strong>
                    <p className="llm-eval-response-text">{output}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      // Handle single-metric response
      const score = response.score ?? null;
      
      // Extract metric name from response
      const metricName = String(response.metric_name || response.metric || 'Unknown Metric')
        .replace(/_/g, ' ');
      
      const explanation = response.explanation || null;
      
      // Use verdict from server (don't override with PASS/FAIL)
      let verdict = response.verdict || null;
      
      console.log("🎯 Extracted verdict:", verdict);
      
      const reference_used = response.reference_used || null;
      const query = response.query || null;
      const output = response.output || null;

      return (
        <div className="llm-eval-response-panel">
          <h3 className="llm-eval-response-title">Response</h3>
          <div className="llm-eval-response-content">
            {/* Metric & Score Row */}
            <div className="llm-eval-response-grid">
              <div className="llm-eval-response-card llm-eval-response-metric">
                <div className="llm-eval-response-card-label">Metric</div>
                <div className="llm-eval-response-card-value">
                  {metricName.toUpperCase()}
                </div>
              </div>

              <div className="llm-eval-response-card llm-eval-response-score">
                <div className="llm-eval-response-card-label">Score</div>
                <div className="llm-eval-response-card-score">
                  {score !== null ? (typeof score === 'number' ? score.toFixed(4) : score) : 'N/A'}
                </div>
              </div>

              {verdict && (
                <div className="llm-eval-response-card llm-eval-response-verdict-card">
                  <div className="llm-eval-response-card-label">Verdict</div>
                  <div className={`llm-eval-verdict ${getVerdictClass(verdict)}`}>
                    {verdict}
                  </div>
                </div>
              )}
            </div>

            {/* Explanation Section */}
            {explanation && (
              <div className="llm-eval-response-section">
                <h4 className="llm-eval-response-section-title">Explanation</h4>
                <p className="llm-eval-response-text">{explanation}</p>
              </div>
            )}

            {/* Reference Section */}
            {reference_used && (
              <div className="llm-eval-response-section">
                <h4 className="llm-eval-response-section-title">Reference Used</h4>
                <div className="llm-eval-response-reference">
                  <p className="llm-eval-response-text">{reference_used}</p>
                </div>
              </div>
            )}

            {/* Query & Output Section */}
            {(query || output) && (
              <div className="llm-eval-response-section">
                <h4 className="llm-eval-response-section-title">Evaluation Input</h4>
                {query && (
                  <div className="llm-eval-response-subsection">
                    <strong className="llm-eval-response-sublabel">Query:</strong>
                    <p className="llm-eval-response-text">{query}</p>
                  </div>
                )}
                {output && !metricName.toLowerCase().includes('contextual') && (
                  <div className="llm-eval-response-subsection">
                    <strong className="llm-eval-response-sublabel">Output:</strong>
                    <p className="llm-eval-response-text">{output}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error('ResponsePanel render error:', error);
    return (
      <div className="llm-eval-response-panel">
        <h3 className="llm-eval-response-title">Response</h3>
        <div className="llm-eval-error-alert">
          <p>⚠️ Error displaying response data</p>
        </div>
      </div>
    );
  }
};
