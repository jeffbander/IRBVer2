/**
 * Test fixtures and mock data for E2E tests
 */

export const mockPatients = [
  {
    name: 'Alice Johnson',
    phoneNumber: '+15551001001',
    dateOfBirth: '1975-03-15',
    gender: 'female',
    conditions: ['Hypertension', 'Type 2 Diabetes'],
    medications: ['Metformin 1000mg', 'Lisinopril 10mg'],
    primaryConcern: 'Blood sugar management',
    callObjectives: ['Check blood glucose readings', 'Verify medication compliance'],
    consentToRecord: true
  },
  {
    name: 'Bob Smith',
    phoneNumber: '+15551002002',
    dateOfBirth: '1982-07-22',
    gender: 'male',
    conditions: ['Asthma'],
    medications: ['Albuterol inhaler'],
    primaryConcern: 'Seasonal asthma symptoms',
    callObjectives: ['Assess inhaler usage', 'Check for emergency room visits'],
    consentToRecord: true
  },
  {
    name: 'Carol Martinez',
    phoneNumber: '+15551003003',
    dateOfBirth: '1968-11-08',
    gender: 'female',
    conditions: ['COPD', 'Heart Disease'],
    medications: ['Spiriva', 'Aspirin 81mg', 'Atorvastatin 40mg'],
    primaryConcern: 'Shortness of breath management',
    callObjectives: ['Monitor oxygen levels', 'Check medication side effects'],
    consentToRecord: false
  },
  {
    name: 'David Chen',
    phoneNumber: '+15551004004',
    dateOfBirth: '1990-05-30',
    gender: 'male',
    conditions: ['Anxiety', 'High Blood Pressure'],
    medications: ['Sertraline 50mg', 'Amlodipine 5mg'],
    primaryConcern: 'Managing stress and anxiety',
    callObjectives: ['Discuss coping strategies', 'Monitor blood pressure'],
    consentToRecord: true
  },
  {
    name: 'Emma Wilson',
    phoneNumber: '+15551005005',
    dateOfBirth: '1955-12-12',
    gender: 'female',
    conditions: ['Osteoporosis', 'Arthritis'],
    medications: ['Calcium supplements', 'Vitamin D', 'Ibuprofen as needed'],
    primaryConcern: 'Bone health and mobility',
    callObjectives: ['Assess fall risk', 'Review exercise routine'],
    consentToRecord: true
  }
];

export const mockCallRecord = {
  status: 'completed',
  duration: 245,
  transcript: 'This is a mock transcript of a patient wellness call.',
  date: new Date().toISOString()
};

/**
 * Helper function to create a patient via API
 */
export async function createTestPatient(request, baseURL, patientData) {
  const response = await request.post(`${baseURL}/api/patients`, {
    data: patientData
  });
  return await response.json();
}

/**
 * Helper function to delete a patient via API
 */
export async function deleteTestPatient(request, baseURL, patientId) {
  return await request.delete(`${baseURL}/api/patients/${patientId}`);
}

/**
 * Helper function to clean up test data
 */
export async function cleanupTestData(request, baseURL) {
  const response = await request.get(`${baseURL}/api/patients`);
  const { patients } = await response.json();

  // Delete all test patients (those with "Test" in the name)
  for (const patient of patients) {
    if (patient.name.includes('Test')) {
      await deleteTestPatient(request, baseURL, patient.id);
    }
  }
}
