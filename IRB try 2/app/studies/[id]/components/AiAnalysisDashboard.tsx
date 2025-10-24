'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

interface AiAnalysisData {
  id: string;
  status: string;
  model: string;
  studyMetadata: any;
  executiveSummary: string;
  complexityScore: number;
  complianceScore: number;
  riskLevel: string;
  processingTimeMs: number;
  criteria: Array<{
    id: string;
    type: string;
    category: string;
    description: string;
    originalText: string;
    priority: number;
    confidence: number;
  }>;
  visitSchedule: Array<{
    id: string;
    visitName: string;
    visitNumber: number;
    dayRange: string;
    procedures: string[];
    duration: string;
    notes: string;
  }>;
  userFeedback: Array<{
    id: string;
    feedbackType: string;
    rating: number;
    comment: string;
    user: {
      firstName: string;
      lastName: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface AiAnalysisDashboardProps {
  studyId: string;
  userId: string;
}

export default function AiAnalysisDashboard({
  studyId,
  userId,
}: AiAnalysisDashboardProps) {
  const [analysis, setAnalysis] = useState<AiAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'summary' | 'criteria' | 'schedule' | 'feedback'
  >('summary');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    fetchAnalysis();
  }, [studyId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ai/analysis/${studyId}`);

      if (response.status === 404) {
        setAnalysis(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch analysis');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      const response = await fetch('/api/ai/analyze-protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      console.log('Analysis started:', result);

      // Poll for results
      setTimeout(() => fetchAnalysis(), 3000);
    } catch (err) {
      console.error('Error triggering analysis:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAnalyzing(false);
    }
  };

  const submitFeedback = async () => {
    if (!analysis) return;

    try {
      setSubmittingFeedback(true);

      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiAnalysisId: analysis.id,
          userId,
          feedbackType: 'usefulness',
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      // Refresh analysis to show new feedback
      await fetchAnalysis();
      setFeedbackComment('');
      setFeedbackRating(5);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="text-h3 text-brand-heading mb-2">No AI Analysis Yet</h3>
          <p className="text-body text-gray-600 mb-6">
            Start an AI analysis to extract study metadata, criteria, and visit schedules
            from your protocol document.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <Button
          onClick={triggerAnalysis}
          disabled={analyzing}
          className="bg-gradient-to-r from-brand-primary to-brand-accent"
        >
          {analyzing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Analyzing Protocol...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Start AI Analysis
            </>
          )}
        </Button>
      </div>
    );
  }

  const getRiskLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      age: 'bg-blue-100 text-blue-800',
      medical_history: 'bg-purple-100 text-purple-800',
      medication: 'bg-pink-100 text-pink-800',
      laboratory: 'bg-green-100 text-green-800',
      diagnostic: 'bg-yellow-100 text-yellow-800',
      pregnancy: 'bg-red-100 text-red-800',
      consent: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  const inclusionCriteria = analysis.criteria.filter((c) => c.type === 'inclusion');
  const exclusionCriteria = analysis.criteria.filter((c) => c.type === 'exclusion');

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="bg-gradient-to-r from-brand-heading to-brand-primary rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 font-bold mb-2">AI Protocol Analysis</h2>
            <p className="text-sm opacity-90">
              Analyzed with {analysis.model} in {analysis.processingTimeMs}ms
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-block px-4 py-2 rounded-full border-2 ${analysis.status === 'completed' ? 'bg-green-500 border-green-300' : 'bg-yellow-500 border-yellow-300'}`}>
              {analysis.status.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'summary', label: 'Summary', icon: '📊' },
              { id: 'criteria', label: `Criteria (${analysis.criteria.length})`, icon: '📋' },
              { id: 'schedule', label: `Visit Schedule (${analysis.visitSchedule.length})`, icon: '📅' },
              { id: 'feedback', label: 'Feedback', icon: '💬' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-4 border-brand-primary text-brand-primary bg-brand-primary/5'
                    : 'text-gray-600 hover:text-brand-primary hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Scores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 mb-2">Complexity Score</div>
                  <div className="text-4xl font-bold text-blue-700">{analysis.complexityScore}/10</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200">
                  <div className="text-sm font-semibold text-green-900 mb-2">Compliance Score</div>
                  <div className="text-4xl font-bold text-green-700">{analysis.complianceScore}%</div>
                </div>
                <div className={`p-6 rounded-xl border-2 ${getRiskLevelColor(analysis.riskLevel)}`}>
                  <div className="text-sm font-semibold mb-2">Risk Level</div>
                  <div className="text-4xl font-bold uppercase">{analysis.riskLevel}</div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="text-h4 font-bold text-brand-heading mb-3">Executive Summary</h3>
                <p className="text-body text-gray-700 leading-relaxed">{analysis.executiveSummary}</p>
              </div>

              {/* Study Metadata */}
              {analysis.studyMetadata && (
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-h4 font-bold text-brand-heading mb-4">Study Metadata</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(analysis.studyMetadata).map(([key, value]) => (
                      <div key={key} className="border-l-4 border-brand-primary pl-4">
                        <div className="text-sm text-gray-500 font-semibold capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="text-body text-gray-900">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Criteria Tab */}
          {activeTab === 'criteria' && (
            <div className="space-y-6">
              {/* Inclusion Criteria */}
              <div>
                <h3 className="text-h4 font-bold text-green-700 mb-4">
                  Inclusion Criteria ({inclusionCriteria.length})
                </h3>
                <div className="space-y-3">
                  {inclusionCriteria.map((criterion, idx) => (
                    <div
                      key={criterion.id}
                      className="bg-green-50 p-4 rounded-lg border border-green-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-700">#{idx + 1}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getCategoryColor(criterion.category)}`}>
                            {criterion.category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            Priority: {criterion.priority}/10
                          </span>
                        </div>
                        {criterion.confidence && (
                          <span className="text-xs text-gray-500">
                            {Math.round(criterion.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-body text-gray-900 mb-2">{criterion.description}</p>
                      <p className="text-sm text-gray-600 italic">&ldquo;{criterion.originalText}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exclusion Criteria */}
              <div>
                <h3 className="text-h4 font-bold text-red-700 mb-4">
                  Exclusion Criteria ({exclusionCriteria.length})
                </h3>
                <div className="space-y-3">
                  {exclusionCriteria.map((criterion, idx) => (
                    <div
                      key={criterion.id}
                      className="bg-red-50 p-4 rounded-lg border border-red-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-red-700">#{idx + 1}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getCategoryColor(criterion.category)}`}>
                            {criterion.category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            Priority: {criterion.priority}/10
                          </span>
                        </div>
                        {criterion.confidence && (
                          <span className="text-xs text-gray-500">
                            {Math.round(criterion.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-body text-gray-900 mb-2">{criterion.description}</p>
                      <p className="text-sm text-gray-600 italic">&ldquo;{criterion.originalText}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Visit Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {analysis.visitSchedule.map((visit) => (
                  <div
                    key={visit.id}
                    className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold">
                            {visit.visitNumber}
                          </span>
                          <div>
                            <h4 className="text-lg font-bold text-brand-heading">{visit.visitName}</h4>
                            <p className="text-sm text-gray-600">{visit.dayRange}</p>
                          </div>
                        </div>
                      </div>
                      {visit.duration && (
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Duration</div>
                          <div className="font-semibold text-brand-heading">{visit.duration}</div>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <h5 className="font-semibold text-brand-heading mb-2">Procedures:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {visit.procedures.map((proc, idx) => (
                          <li key={idx} className="text-body text-gray-700">
                            {proc}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {visit.notes && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-sm text-gray-600 italic">{visit.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {/* Submit Feedback Form */}
              <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 p-6 rounded-xl border-2 border-brand-primary/20">
                <h3 className="text-h4 font-bold text-brand-heading mb-4">Submit Feedback</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rating (1-5)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setFeedbackRating(rating)}
                          className={`w-12 h-12 rounded-full font-bold transition-all ${
                            feedbackRating === rating
                              ? 'bg-brand-primary text-white scale-110'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Comments (optional)
                    </label>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      rows={4}
                      placeholder="Share your thoughts on the AI analysis accuracy and usefulness..."
                    />
                  </div>

                  <Button
                    onClick={submitFeedback}
                    disabled={submittingFeedback}
                    className="bg-brand-primary hover:bg-brand-primary/90"
                  >
                    {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </div>

              {/* Previous Feedback */}
              {analysis.userFeedback.length > 0 && (
                <div>
                  <h3 className="text-h4 font-bold text-brand-heading mb-4">
                    Previous Feedback ({analysis.userFeedback.length})
                  </h3>
                  <div className="space-y-3">
                    {analysis.userFeedback.map((feedback) => (
                      <div key={feedback.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-gray-900">
                            {feedback.user.firstName} {feedback.user.lastName}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-500">★</span>
                            <span className="font-bold">{feedback.rating}/5</span>
                          </div>
                        </div>
                        {feedback.comment && (
                          <p className="text-body text-gray-700">{feedback.comment}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-500 capitalize">
                          {feedback.feedbackType}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
