let patients = [];
let selectedPatient = null;
let editingPatientId = null;

// Load patients on page load
window.addEventListener('DOMContentLoaded', async () => {
    await loadPatients();
    updateStats();
});

async function loadPatients() {
    try {
        const response = await fetch('/api/patients');
        const data = await response.json();
        patients = data.patients || [];
        renderPatientsList();
        updateStats();
    } catch (error) {
        console.error('Error loading patients:', error);
        showToast('Error loading patients', 'error');
    }
}

function renderPatientsList() {
    const listEl = document.getElementById('patients-list');

    if (patients.length === 0) {
        listEl.innerHTML = `
            <div class="p-12 text-center text-gray-500">
                <div class="text-6xl mb-4">👤</div>
                <p class="text-lg font-semibold">No patients yet</p>
                <p class="text-sm mt-2">Click "Add Patient" to get started</p>
            </div>`;
        return;
    }

    listEl.innerHTML = patients.map((patient, index) => `
        <div class="glass-morphism m-4 rounded-2xl p-5 cursor-pointer hover-lift card-glow transition-all ${selectedPatient?.id === patient.id ? 'ring-2 ring-purple-500' : ''}"
             onclick="selectPatient('${patient.id}')"
             style="animation: fadeIn 0.4s ease-out ${index * 0.05}s both;">
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <div class="text-white font-bold text-lg mb-1">${patient.name}</div>
                    <div class="text-gray-400 text-xs font-mono">MRN: ${patient.mrn}</div>
                </div>
                <div class="text-2xl">👤</div>
            </div>
            <div class="space-y-1.5">
                <div class="text-gray-400 text-sm flex items-center">
                    <span class="mr-2">📞</span>
                    <span>${patient.phoneNumber}</span>
                </div>
                ${patient.age ? `
                    <div class="text-gray-400 text-sm flex items-center">
                        <span class="mr-2">🎂</span>
                        <span>${patient.age} years • ${patient.gender || 'N/A'}</span>
                    </div>
                ` : ''}
                ${patient.conditions && patient.conditions.length > 0 ? `
                    <div class="text-purple-400 text-xs flex items-start mt-2 pt-2 border-t border-gray-700">
                        <span class="mr-2">🏥</span>
                        <span class="flex-1">${patient.conditions.slice(0, 2).join(', ')}${patient.conditions.length > 2 ? '...' : ''}</span>
                    </div>
                ` : ''}
            </div>
            <div class="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-xs">
                <span class="text-gray-500">
                    <span class="font-semibold text-white">${patient.callHistory?.length || 0}</span> calls
                </span>
                <span class="text-gray-500">
                    Last: ${patient.lastContact ? new Date(patient.lastContact).toLocaleDateString() : 'Never'}
                </span>
            </div>
        </div>
    `).join('');
}

async function selectPatient(patientId) {
    try {
        const response = await fetch(`/api/patients/${patientId}`);
        selectedPatient = await response.json();
        renderPatientDetails();
        renderPatientsList(); // Re-render to update active state
    } catch (error) {
        console.error('Error loading patient details:', error);
        showToast('Error loading patient details', 'error');
    }
}

function renderPatientDetails() {
    const detailsEl = document.getElementById('details-content');

    if (!selectedPatient) {
        detailsEl.innerHTML = `
            <div class="text-center py-24">
                <div class="text-8xl mb-6 animate-pulse-glow">🎯</div>
                <h3 class="text-2xl font-bold text-white mb-2">Select a Patient</h3>
                <p class="text-gray-400">View detailed information, call history, and AI insights</p>
            </div>`;
        return;
    }

    detailsEl.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <!-- Patient Header Card -->
            <div class="glass-morphism rounded-2xl p-6">
                <div class="flex items-start justify-between mb-6">
                    <div class="flex items-center space-x-4">
                        <div class="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center text-3xl">
                            👤
                        </div>
                        <div>
                            <h3 class="text-3xl font-black text-white mb-1">${selectedPatient.name}</h3>
                            <p class="text-gray-400 text-sm font-mono">MRN: ${selectedPatient.mrn}</p>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="editPatient()" class="glass-morphism px-4 py-2 rounded-xl text-white font-semibold hover-lift">
                            ✏️ Edit
                        </button>
                        <button onclick="deletePatient()" class="bg-red-600 px-4 py-2 rounded-xl text-white font-semibold hover-lift">
                            🗑️ Delete
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-gray-800/50 rounded-xl p-4">
                        <div class="text-gray-400 text-xs uppercase tracking-wider mb-1">Phone</div>
                        <div class="text-white font-semibold">${selectedPatient.phoneNumber}</div>
                    </div>
                    <div class="bg-gray-800/50 rounded-xl p-4">
                        <div class="text-gray-400 text-xs uppercase tracking-wider mb-1">Age</div>
                        <div class="text-white font-semibold">${selectedPatient.age || 'N/A'}</div>
                    </div>
                    <div class="bg-gray-800/50 rounded-xl p-4">
                        <div class="text-gray-400 text-xs uppercase tracking-wider mb-1">Gender</div>
                        <div class="text-white font-semibold">${selectedPatient.gender || 'Not specified'}</div>
                    </div>
                </div>
            </div>

            <!-- Medical Information -->
            <div class="glass-morphism rounded-2xl p-6">
                <h4 class="text-xl font-bold text-white mb-4 flex items-center">
                    <span class="mr-2">🏥</span>
                    Medical Information
                </h4>
                <div class="space-y-4">
                    <div>
                        <div class="text-gray-400 text-sm font-semibold mb-2">Medical Conditions</div>
                        <div class="flex flex-wrap gap-2">
                            ${selectedPatient.conditions?.length > 0
                                ? selectedPatient.conditions.map(c => `
                                    <span class="bg-red-600/20 text-red-400 px-3 py-1 rounded-lg text-sm font-medium">${c}</span>
                                `).join('')
                                : '<span class="text-gray-500">None listed</span>'}
                        </div>
                    </div>
                    <div>
                        <div class="text-gray-400 text-sm font-semibold mb-2">Current Medications</div>
                        <div class="flex flex-wrap gap-2">
                            ${selectedPatient.medications?.length > 0
                                ? selectedPatient.medications.map(m => `
                                    <span class="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-sm font-medium">${m}</span>
                                `).join('')
                                : '<span class="text-gray-500">None listed</span>'}
                        </div>
                    </div>
                    ${selectedPatient.primaryConcern ? `
                        <div>
                            <div class="text-gray-400 text-sm font-semibold mb-2">Primary Concern</div>
                            <div class="text-white bg-gray-800/50 rounded-xl p-3">${selectedPatient.primaryConcern}</div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Call Objectives -->
            ${selectedPatient.callObjectives?.length > 0 ? `
                <div class="glass-morphism rounded-2xl p-6">
                    <h4 class="text-xl font-bold text-white mb-4 flex items-center">
                        <span class="mr-2">🎯</span>
                        Call Objectives
                    </h4>
                    <div class="space-y-2">
                        ${selectedPatient.callObjectives.map(obj => `
                            <div class="flex items-center text-gray-300">
                                <span class="text-purple-400 mr-2">▸</span>
                                ${obj}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Actions -->
            <div class="flex space-x-4">
                <button onclick="initiateCall()" class="flex-1 gradient-success px-8 py-4 rounded-xl text-white font-bold hover-lift shadow-xl flex items-center justify-center space-x-2">
                    <span class="text-2xl">📞</span>
                    <span>Initiate AI Call</span>
                </button>
            </div>

            <!-- Call History -->
            <div class="glass-morphism rounded-2xl p-6">
                <h4 class="text-xl font-bold text-white mb-4 flex items-center">
                    <span class="mr-2">📊</span>
                    Call History
                </h4>
                ${renderCallHistory()}
            </div>
        </div>
    `;
}

function renderCallHistory() {
    if (!selectedPatient.callHistory || selectedPatient.callHistory.length === 0) {
        return `
            <div class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">📞</div>
                <p>No call history yet</p>
            </div>`;
    }

    return `
        <div class="space-y-3">
            ${selectedPatient.callHistory.map((call, index) => {
                const statusColor = call.status === 'completed' ? 'green' : call.status === 'failed' ? 'red' : 'yellow';
                return `
                    <div class="bg-gray-800/50 rounded-xl p-4 hover-lift" style="animation: fadeIn 0.3s ease-out ${index * 0.05}s both;">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                                <div class="text-white font-semibold mb-1">${new Date(call.date).toLocaleString()}</div>
                                <div class="text-xs font-mono text-gray-500">Call ID: ${call.callId}</div>
                            </div>
                            <span class="bg-${statusColor}-600/20 text-${statusColor}-400 px-3 py-1 rounded-lg text-xs font-semibold uppercase">${call.status}</span>
                        </div>
                        <div class="flex items-center space-x-4 text-sm text-gray-400">
                            <span>⏱️ ${call.duration ? `${call.duration}s` : 'N/A'}</span>
                            ${call.transcript ? '<span>📝 Transcript available</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>`;
}

async function initiateCall() {
    if (!selectedPatient) return;

    try {
        const response = await fetch('/api/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId: selectedPatient.id })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        const result = await response.json();
        showToast('Call initiated successfully!');
        console.log('Call initiated:', result);

        // Reload patient to see updated call history
        setTimeout(() => selectPatient(selectedPatient.id), 2000);
    } catch (error) {
        console.error('Error initiating call:', error);
        showToast(error.message || 'Error initiating call', 'error');
    }
}


function editPatient() {
    if (!selectedPatient) return;

    editingPatientId = selectedPatient.id;
    document.getElementById('modal-title').textContent = 'Edit Patient';

    // Fill form with current values
    document.getElementById('form-mrn').value = selectedPatient.mrn || '';
    document.getElementById('form-name').value = selectedPatient.name || '';
    document.getElementById('form-phone').value = selectedPatient.phoneNumber || '';
    document.getElementById('form-dob').value = selectedPatient.dateOfBirth || '';
    document.getElementById('form-gender').value = selectedPatient.gender || '';
    document.getElementById('form-conditions').value = selectedPatient.conditions?.join(', ') || '';
    document.getElementById('form-medications').value = selectedPatient.medications?.join(', ') || '';
    document.getElementById('form-concern').value = selectedPatient.primaryConcern || '';
    document.getElementById('form-objectives').value = selectedPatient.callObjectives?.join(', ') || '';
    document.getElementById('form-consent').checked = selectedPatient.consentToRecord || false;

    document.getElementById('patient-modal').classList.remove('hidden');
    document.getElementById('patient-modal').classList.add('flex');
}

async function savePatient(event) {
    event.preventDefault();

    const patientData = {
        mrn: document.getElementById('form-mrn').value || undefined,
        name: document.getElementById('form-name').value,
        phoneNumber: document.getElementById('form-phone').value,
        dateOfBirth: document.getElementById('form-dob').value || undefined,
        gender: document.getElementById('form-gender').value || undefined,
        conditions: document.getElementById('form-conditions').value.split(',').map(s => s.trim()).filter(Boolean),
        medications: document.getElementById('form-medications').value.split(',').map(s => s.trim()).filter(Boolean),
        primaryConcern: document.getElementById('form-concern').value || undefined,
        callObjectives: document.getElementById('form-objectives').value.split(',').map(s => s.trim()).filter(Boolean),
        consentToRecord: document.getElementById('form-consent').checked
    };

    try {
        const url = editingPatientId ? `/api/patients/${editingPatientId}` : '/api/patients';
        const method = editingPatientId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patientData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        const savedPatient = await response.json();
        showToast(editingPatientId ? 'Patient updated successfully!' : 'Patient created successfully!');

        closeModal();
        await loadPatients();

        // Select the saved patient
        selectPatient(savedPatient.id);
    } catch (error) {
        console.error('Error saving patient:', error);
        showToast(error.message || 'Error saving patient', 'error');
    }
}

async function deletePatient() {
    if (!selectedPatient) return;

    if (!confirm(`Are you sure you want to delete ${selectedPatient.name}? This will archive the patient and all call history.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/patients/${selectedPatient.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        showToast('Patient deleted and archived successfully');
        selectedPatient = null;
        await loadPatients();
        renderPatientDetails();
    } catch (error) {
        console.error('Error deleting patient:', error);
        showToast(error.message || 'Error deleting patient', 'error');
    }
}

function searchPatients() {
    const query = document.getElementById('search-input').value;
    const listEl = document.getElementById('patients-list');

    if (!query) {
        renderPatientsList();
        return;
    }

    const filtered = patients.filter(p => {
        const searchText = `${p.name} ${p.mrn} ${p.phoneNumber}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
    });

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>No patients found</p></div>';
        return;
    }

    listEl.innerHTML = filtered.map(patient => `
        <div class="patient-card ${selectedPatient?.id === patient.id ? 'active' : ''}"
             onclick="selectPatient('${patient.id}')">
            <div class="patient-name">${patient.name}</div>
            <div class="patient-meta">MRN: ${patient.mrn} • ${patient.age ? `${patient.age} • ` : ''}${patient.gender || ''}</div>
            <div class="patient-meta">📞 ${patient.phoneNumber}</div>
            ${patient.conditions && patient.conditions.length > 0 ?
                `<div class="patient-conditions">🏥 ${patient.conditions.join(', ')}</div>` : ''}
        </div>
    `).join('');
}

function updateStats() {
    document.getElementById('stat-patients').textContent = patients.length;

    const today = new Date().toDateString();
    const callsToday = patients.reduce((count, p) => {
        const todayCalls = (p.callHistory || []).filter(call =>
            new Date(call.date).toDateString() === today
        );
        return count + todayCalls.length;
    }, 0);
    document.getElementById('stat-calls').textContent = callsToday;

    // Active calls would require real-time status checking
    document.getElementById('stat-active').textContent = '0';
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    const titleEl = document.getElementById('toast-title');
    const messageEl = document.getElementById('toast-message');

    const config = {
        success: { icon: '✓', title: 'Success', borderColor: 'border-green-500' },
        error: { icon: '✗', title: 'Error', borderColor: 'border-red-500' },
        info: { icon: 'ℹ', title: 'Info', borderColor: 'border-blue-500' }
    };

    const { icon, title, borderColor } = config[type] || config.success;

    titleEl.textContent = title;
    messageEl.textContent = message;

    const content = toastEl.querySelector('.glass-morphism');
    content.className = `glass-morphism rounded-2xl p-6 shadow-2xl animate-slide-in-right border-l-4 ${borderColor}`;
    content.querySelector('span.text-3xl').textContent = icon;

    toastEl.classList.remove('hidden');

    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3000);
}

function showAddPatientModal() {
    editingPatientId = null;
    document.getElementById('modal-title').textContent = 'Add New Patient';
    document.getElementById('patient-form').reset();
    document.getElementById('patient-modal').classList.remove('hidden');
    document.getElementById('patient-modal').classList.add('flex');
}

function closeModal() {
    document.getElementById('patient-modal').classList.add('hidden');
    document.getElementById('patient-modal').classList.remove('flex');
}