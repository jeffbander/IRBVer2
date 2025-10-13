/**
 * Aigents Integration Service
 * Unified module for bidirectional webhook communication with Aigents AI
 *
 * OUTBOUND: Trigger Aigents chains
 * INBOUND: Process webhook responses (see /api/webhooks/aigents)
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface TriggerAigentsParams {
  chainToRun: string;
  documentId?: string;
  studyId?: string;
  documentName?: string;
  documentType?: string;
  documentContent?: string;
  firstStepInput?: string;
  startingVariables?: Record<string, any>;
  email?: string;
}

export interface AigentsResponse {
  success: boolean;
  chainRunId: string;
  rawResponse?: string;
  status: 'success' | 'error';
  error?: string;
}

export interface AigentsWebhookPayload {
  run_id: string;
  chain_name: string;
  status: 'completed' | 'failed' | 'processing';
  result?: {
    analysis: string;
    actionable_items?: string[];
    summary?: string;
    metadata?: Record<string, any>;
  };
  error?: string;
  completed_at?: string;
}

export interface AigentsChainConfig {
  chainName: string;
  description: string;
  documentTypes: string[];
}

// ============================================================================
// Chain Configuration
// ============================================================================

export const AIGENTS_CHAINS: Record<string, AigentsChainConfig> = {
  'Protocol analyzer': {
    chainName: 'Protocol analyzer',
    description: 'Analyzes research protocols and extracts key information, objectives, and requirements',
    documentTypes: ['PROTOCOL'],
  },
  'Consent Form Reviewer': {
    chainName: 'Consent Form Reviewer',
    description: 'Reviews consent forms for completeness and regulatory compliance',
    documentTypes: ['CONSENT_FORM'],
  },
  'Document Analyzer': {
    chainName: 'Document Analyzer',
    description: 'General document analysis for any IRB-related document',
    documentTypes: ['PROTOCOL', 'CONSENT_FORM', 'AMENDMENT', 'PROGRESS_REPORT', 'OTHER'],
  },
  'Adverse Event Analyzer': {
    chainName: 'Adverse Event Analyzer',
    description: 'Analyzes adverse event reports for severity and required actions',
    documentTypes: ['ADVERSE_EVENT'],
  },
};

// ============================================================================
// Trigger Aigents Chain
// ============================================================================

/**
 * Trigger an Aigents automation chain
 * Returns the Chain Run ID which will be used to match the webhook response
 */
export async function triggerAigentsChain(
  params: TriggerAigentsParams
): Promise<AigentsResponse> {
  const {
    chainToRun,
    documentId,
    studyId,
    documentName,
    documentType,
    documentContent,
    firstStepInput,
    startingVariables = {},
    email = process.env.AIGENTS_EMAIL || 'Mills.reed@mswheart.com',
  } = params;

  const requestBody = {
    run_email: email,
    chain_to_run: chainToRun,
    human_readable_record: 'IRB Management System - Document Analysis',
    source_id: documentId || studyId || 'manual-trigger',
    first_step_user_input:
      firstStepInput ||
      documentContent ||
      `Analyze document: ${documentName || 'Unknown document'}`,
    starting_variables: {
      document_id: documentId,
      document_name: documentName,
      document_type: documentType,
      study_id: studyId,
      analysis_type: 'full',
      ...startingVariables,
    },
  };

  console.log('🚀 Triggering Aigents chain:', {
    chain: chainToRun,
    documentId,
    studyId,
  });

  try {
    const response = await fetch(
      process.env.AIGENTS_API_URL ||
        'https://start-chain-run-943506065004.us-central1.run.app',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Aigents API error:', {
        status: response.status,
        error: errorText,
      });

      return {
        success: false,
        chainRunId: '',
        status: 'error',
        error: `API returned ${response.status}: ${errorText}`,
      };
    }

    const responseText = await response.text();
    console.log('✅ Aigents response received:', responseText.substring(0, 200));

    // Extract Chain Run ID from response
    const chainRunId = extractChainRunIdFromResponse(responseText);

    if (!chainRunId) {
      console.error('❌ No Chain Run ID found in response');
      return {
        success: false,
        chainRunId: '',
        rawResponse: responseText,
        status: 'error',
        error: 'No Chain Run ID in response',
      };
    }

    console.log('✅ Chain Run ID extracted:', chainRunId);

    return {
      success: true,
      chainRunId,
      rawResponse: responseText,
      status: 'success',
    };
  } catch (error: any) {
    console.error('❌ Error triggering Aigents:', error);
    return {
      success: false,
      chainRunId: '',
      status: 'error',
      error: error.message,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract Chain Run ID from API response text
 */
function extractChainRunIdFromResponse(responseText: string): string {
  const chainRunPatterns = [
    /"ChainRun_ID"\s*:\s*"([^"]+)"/,
    /"Chain Run ID"\s*:\s*"([^"]+)"/,
    /"chainRunId"\s*:\s*"([^"]+)"/,
    /"chain_run_id"\s*:\s*"([^"]+)"/,
    /"runId"\s*:\s*"([^"]+)"/,
    /"run_id"\s*:\s*"([^"]+)"/,
  ];

  for (const pattern of chainRunPatterns) {
    const match = responseText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Try parsing as JSON
  try {
    const jsonResponse = JSON.parse(responseText);

    // Direct fields at root level
    if (jsonResponse.ChainRun_ID) return jsonResponse.ChainRun_ID;
    if (jsonResponse['Chain Run ID']) return jsonResponse['Chain Run ID'];
    if (jsonResponse.chainRunId) return jsonResponse.chainRunId;
    if (jsonResponse.chain_run_id) return jsonResponse.chain_run_id;
    if (jsonResponse.runId) return jsonResponse.runId;
    if (jsonResponse.run_id) return jsonResponse.run_id;

    // New structure: batchResults[0].runs[0].run_id
    if (jsonResponse.batchResults &&
        Array.isArray(jsonResponse.batchResults) &&
        jsonResponse.batchResults.length > 0) {
      const firstBatch = jsonResponse.batchResults[0];
      if (firstBatch.runs &&
          Array.isArray(firstBatch.runs) &&
          firstBatch.runs.length > 0) {
        const firstRun = firstBatch.runs[0];
        if (firstRun.run_id) {
          console.log(`📋 Extracted run_id from batchResults: ${firstRun.run_id}`);
          return firstRun.run_id;
        }
      }
    }

    return '';
  } catch (e) {
    console.warn('Could not parse response as JSON:', e);
  }

  return '';
}

/**
 * Extract Chain Run ID from webhook payload
 */
export function extractChainRunId(webhookPayload: any): string | null {
  const possibleFields = [
    'chainRunId',
    'Chain Run ID',
    'ChainRun_ID',
    'chain_run_id',
    'runId',
    'run_id',
  ];

  for (const field of possibleFields) {
    if (webhookPayload[field]) {
      return webhookPayload[field].toString();
    }
  }

  return null;
}

/**
 * Extract agent response from webhook payload
 */
export function extractAgentResponse(webhookPayload: any): string {
  const possibleFields = [
    'agentResponse',
    'summ',
    'summary',
    'response',
    'content',
    'result',
    'output',
    'Final_Output',
    'Generated_Content',
    'Patient_Summary',
    'Analysis_Result',
    'Protocol_Analysis',
    'Consent_Review',
    'Document_Analysis',
  ];

  for (const field of possibleFields) {
    if (
      webhookPayload[field] &&
      webhookPayload[field].toString().trim().length > 0
    ) {
      return webhookPayload[field].toString();
    }
  }

  return 'Webhook received (no response content found)';
}

/**
 * Get chain name for document type
 */
export function getChainNameForDocumentType(documentType: string): string {
  const chainMap: Record<string, string> = {
    PROTOCOL: 'Protocol analyzer',
    CONSENT_FORM: 'Consent Form Reviewer',
    ADVERSE_EVENT: 'Adverse Event Analyzer',
    AMENDMENT: 'Document Analyzer',
    PROGRESS_REPORT: 'Document Analyzer',
    APPROVAL_LETTER: 'Document Analyzer',
    OTHER: 'Document Analyzer',
  };

  return chainMap[documentType] || 'Document Analyzer';
}

/**
 * Get available chains for a document type
 */
export function getAvailableChainsForDocumentType(documentType: string): AigentsChainConfig[] {
  return Object.values(AIGENTS_CHAINS).filter((chain) =>
    chain.documentTypes.includes(documentType)
  );
}

/**
 * Format Aigents analysis for display
 */
export function formatAigentsAnalysis(analysis: string): {
  summary: string;
  details: string[];
  actionItems: string[];
} {
  const lines = analysis.split('\n');
  const summary = lines[0] || 'Analysis completed';
  const details: string[] = [];
  const actionItems: string[] = [];

  let currentSection = 'details';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.toLowerCase().includes('action item') || line.toLowerCase().includes('todo')) {
      currentSection = 'actions';
      continue;
    }

    if (currentSection === 'actions') {
      actionItems.push(line);
    } else {
      details.push(line);
    }
  }

  return { summary, details, actionItems };
}

/**
 * Validate webhook signature (for production security)
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // For development, skip validation
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // In production, implement proper HMAC validation
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(payload)
  //   .digest('hex');
  // return signature === expectedSignature;

  return true;
}

/**
 * Mock Aigents response for local testing
 */
export function getMockAigentsResponse(documentType: string, documentName: string): AigentsWebhookPayload {
  const analyses: Record<string, string> = {
    PROTOCOL: `Protocol Analysis Complete\n\nKey Findings:\n- Study Duration: 12 months\n- Target Enrollment: 100 participants\n- Primary Endpoint: Change in cardiovascular health markers\n- Secondary Endpoints: Quality of life measures\n\nAction Items:\n- Ensure informed consent includes genetic testing disclosure\n- Verify insurance coverage for experimental procedures\n- Schedule safety monitoring committee meetings`,

    CONSENT_FORM: `Consent Form Review Complete\n\nCompliance Check:\n- All required elements present\n- Language is clear and at appropriate reading level\n- Risks and benefits adequately described\n\nAction Items:\n- Add contact information for study coordinator\n- Clarify compensation structure for participant time\n- Update emergency contact procedures`,

    ADVERSE_EVENT: `Adverse Event Analysis\n\nSeverity Assessment: Grade 2 (Moderate)\n\nFindings:\n- Event appears related to study intervention\n- Patient recovered with supportive care\n- No permanent sequelae noted\n\nAction Items:\n- Report to IRB within 5 business days\n- Update safety monitoring report\n- Consider protocol modification for similar events`,
  };

  return {
    run_id: `R_mock_${Date.now()}`,
    chain_name: 'Document Analyzer',
    status: 'completed',
    result: {
      analysis: analyses[documentType] || `Analysis of ${documentName}\n\nDocument has been processed successfully.\n\nAction Items:\n- Review findings with study team\n- Update study documentation as needed`,
      actionable_items: [
        'Review findings with study team',
        'Update documentation',
        'File in study records',
      ],
      summary: `Analysis completed for ${documentName}`,
    },
    completed_at: new Date().toISOString(),
  };
}
