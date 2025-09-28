// Decision Support System JavaScript

// Global variables
let assessmentData = {};
let currentStep = 1;
let totalSteps = 5;
let eligibilityResults = null;
let documentFiles = [];

// Form validation rules
const validationRules = {
    community_name: { required: true, minLength: 2 },
    district: { required: true },
    block: { required: true },
    village: { required: true },
    forest_area: { required: true, min: 0.1 },
    households: { required: true, min: 1 },
    population: { required: true, min: 1 },
    tribal_population: { required: true, min: 0 },
    forest_dependence: { required: true },
    traditional_occupation: { required: true }
};

// Initialize DSS
function initializeDSS() {
    setupStepNavigation();
    setupFormValidation();
    loadSavedData();
    updateStepIndicators();
    
    console.log('Decision Support System initialized');
}

function setupStepNavigation() {
    // Next/Previous buttons
    const nextBtns = document.querySelectorAll('.step-next');
    const prevBtns = document.querySelectorAll('.step-prev');
    
    nextBtns.forEach(btn => {
        btn.addEventListener('click', nextStep);
    });
    
    prevBtns.forEach(btn => {
        btn.addEventListener('click', prevStep);
    });
    
    // Step indicators
    const stepIndicators = document.querySelectorAll('.step-indicator');
    stepIndicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => goToStep(index + 1));
    });
}

function setupFormValidation() {
    // Real-time validation for inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
    
    // Form submission
    const assessmentForm = document.getElementById('assessmentForm');
    if (assessmentForm) {
        assessmentForm.addEventListener('submit', handleFormSubmit);
    }
}

// Step navigation functions
function nextStep() {
    if (validateCurrentStep()) {
        saveCurrentStepData();
        
        if (currentStep < totalSteps) {
            hideStep(currentStep);
            currentStep++;
            showStep(currentStep);
            updateStepIndicators();
            updateProgressBar();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        saveCurrentStepData();
        hideStep(currentStep);
        currentStep--;
        showStep(currentStep);
        updateStepIndicators();
        updateProgressBar();
    }
}

function goToStep(stepNumber) {
    if (stepNumber >= 1 && stepNumber <= totalSteps) {
        // Validate all previous steps
        for (let i = 1; i < stepNumber; i++) {
            if (!validateStep(i)) {
                showAlert(`Please complete step ${i} before proceeding`, 'warning');
                return;
            }
        }
        
        saveCurrentStepData();
        hideStep(currentStep);
        currentStep = stepNumber;
        showStep(currentStep);
        updateStepIndicators();
        updateProgressBar();
    }
}

function showStep(stepNumber) {
    const step = document.getElementById(`step${stepNumber}`);
    if (step) {
        step.style.display = 'block';
        step.classList.add('active');
        
        // Focus on first input
        const firstInput = step.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

function hideStep(stepNumber) {
    const step = document.getElementById(`step${stepNumber}`);
    if (step) {
        step.style.display = 'none';
        step.classList.remove('active');
    }
}

function updateStepIndicators() {
    const indicators = document.querySelectorAll('.step-indicator');
    indicators.forEach((indicator, index) => {
        const stepNum = index + 1;
        indicator.classList.remove('active', 'completed');
        
        if (stepNum === currentStep) {
            indicator.classList.add('active');
        } else if (stepNum < currentStep) {
            indicator.classList.add('completed');
        }
    });
}

function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }
}

// Validation functions
function validateCurrentStep() {
    return validateStep(currentStep);
}

function validateStep(stepNumber) {
    const step = document.getElementById(`step${stepNumber}`);
    if (!step) return true;
    
    const inputs = step.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    const rules = validationRules[fieldName];
    
    if (!rules) return true;
    
    let isValid = true;
    let errorMessage = '';
    
    // Required validation
    if (rules.required && !value) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    
    // Min length validation
    if (isValid && rules.minLength && value.length < rules.minLength) {
        isValid = false;
        errorMessage = `Minimum ${rules.minLength} characters required`;
    }
    
    // Min value validation
    if (isValid && rules.min !== undefined) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < rules.min) {
            isValid = false;
            errorMessage = `Minimum value is ${rules.min}`;
        }
    }
    
    // Custom validations
    if (isValid) {
        switch (fieldName) {
            case 'forest_area':
                if (parseFloat(value) > 1000) {
                    isValid = false;
                    errorMessage = 'Area seems too large. Please verify.';
                }
                break;
            case 'population':
            case 'households':
                if (!Number.isInteger(parseFloat(value))) {
                    isValid = false;
                    errorMessage = 'Must be a whole number';
                }
                break;
        }
    }
    
    // Show/hide error
    if (isValid) {
        clearFieldError(field);
    } else {
        showFieldError(field, errorMessage);
    }
    
    return isValid;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('is-invalid');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    
    const existingError = field.parentNode.querySelector('.invalid-feedback');
    if (existingError) {
        existingError.remove();
    }
}

// Data management functions
function saveCurrentStepData() {
    const step = document.getElementById(`step${currentStep}`);
    if (!step) return;
    
    const inputs = step.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            assessmentData[input.name] = input.checked;
        } else if (input.type === 'radio') {
            if (input.checked) {
                assessmentData[input.name] = input.value;
            }
        } else {
            assessmentData[input.name] = input.value;
        }
    });
    
    // Save to localStorage
    localStorage.setItem('dss_assessment_data', JSON.stringify(assessmentData));
}

function loadSavedData() {
    try {
        const saved = localStorage.getItem('dss_assessment_data');
        if (saved) {
            assessmentData = JSON.parse(saved);
            populateFormData();
        }
    } catch (error) {
        console.error('Error loading saved data:', error);
    }
}

function populateFormData() {
    Object.keys(assessmentData).forEach(key => {
        const element = document.querySelector(`[name="${key}"]`);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = assessmentData[key];
            } else if (element.type === 'radio') {
                if (element.value === assessmentData[key]) {
                    element.checked = true;
                }
            } else {
                element.value = assessmentData[key];
            }
        }
    });
}

function clearSavedData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        assessmentData = {};
        documentFiles = [];
        eligibilityResults = null;
        localStorage.removeItem('dss_assessment_data');
        
        // Reset form
        const form = document.getElementById('assessmentForm');
        if (form) {
            form.reset();
        }
        
        // Reset to first step
        hideStep(currentStep);
        currentStep = 1;
        showStep(currentStep);
        updateStepIndicators();
        updateProgressBar();
        
        // Hide results
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        
        showAlert('All data cleared successfully', 'success');
    }
}

// Document upload functions
function initializeDocumentUpload() {
    const uploadArea = document.getElementById('documentUpload');
    const fileInput = document.getElementById('documentFiles');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDocumentDragOver);
        uploadArea.addEventListener('drop', handleDocumentDrop);
        fileInput.addEventListener('change', handleDocumentSelect);
    }
}

function handleDocumentDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDocumentDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    addDocumentFiles(files);
}

function handleDocumentSelect(e) {
    const files = Array.from(e.target.files);
    addDocumentFiles(files);
}

function addDocumentFiles(files) {
    const validFiles = files.filter(file => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword'];
        return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });
    
    if (validFiles.length === 0) {
        showAlert('Please select valid document files (PDF, JPG, PNG, DOC) under 10MB', 'error');
        return;
    }
    
    documentFiles = documentFiles.concat(validFiles);
    updateDocumentList();
}

function removeDocumentFile(index) {
    documentFiles.splice(index, 1);
    updateDocumentList();
}

function updateDocumentList() {
    const listContainer = document.getElementById('documentList');
    if (!listContainer) return;
    
    if (documentFiles.length === 0) {
        listContainer.innerHTML = '<p class="text-muted">No documents uploaded</p>';
        return;
    }
    
    listContainer.innerHTML = documentFiles.map((file, index) => `
        <div class="document-item">
            <div class="document-info">
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
                <small class="text-muted">(${formatFileSize(file.size)})</small>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeDocumentFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Assessment submission and processing
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateAllSteps()) {
        showAlert('Please complete all required fields', 'error');
        return;
    }
    
    saveCurrentStepData();
    await processAssessment();
}

function validateAllSteps() {
    for (let i = 1; i <= totalSteps; i++) {
        if (!validateStep(i)) {
            goToStep(i);
            return false;
        }
    }
    return true;
}

async function processAssessment() {
    try {
        showProcessingIndicator(true);
        
        // Prepare assessment data
        const formData = new FormData();
        formData.append('assessment_data', JSON.stringify(assessmentData));
        
        // Add documents
        documentFiles.forEach((file, index) => {
            formData.append(`document_${index}`, file);
        });
        
        // Submit assessment
        const response = await fetch('/api/dss/assess', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            eligibilityResults = result.assessment;
            displayResults();
        } else {
            throw new Error(result.message || 'Assessment failed');
        }
        
    } catch (error) {
        console.error('Assessment error:', error);
        showAlert('Error processing assessment: ' + error.message, 'error');
    } finally {
        showProcessingIndicator(false);
    }
}

function showProcessingIndicator(show) {
    const indicator = document.getElementById('processingIndicator');
    const submitBtn = document.getElementById('submitAssessment');
    
    if (indicator) {
        indicator.style.display = show ? 'block' : 'none';
    }
    
    if (submitBtn) {
        submitBtn.disabled = show;
        submitBtn.innerHTML = show ? 
            '<i class="fas fa-spinner fa-spin"></i> Processing...' :
            '<i class="fas fa-check"></i> Submit Assessment';
    }
}

// Results display
function displayResults() {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!resultsSection || !resultsContainer || !eligibilityResults) return;
    
    resultsSection.style.display = 'block';
    
    const html = `
        <div class="results-header">
            <h3>Assessment Results</h3>
            <div class="eligibility-status ${eligibilityResults.eligible ? 'eligible' : 'not-eligible'}">
                <i class="fas ${eligibilityResults.eligible ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                <span>${eligibilityResults.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}</span>
            </div>
        </div>
        
        <div class="results-content">
            <div class="row">
                <div class="col-md-6">
                    <div class="score-card">
                        <h4>Overall Score</h4>
                        <div class="score-circle">
                            <div class="score-value">${eligibilityResults.overall_score}</div>
                            <div class="score-label">out of 100</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="criteria-scores">
                        <h4>Criteria Scores</h4>
                        ${generateCriteriaScores()}
                    </div>
                </div>
            </div>
            
            <div class="recommendations">
                <h4>Recommendations</h4>
                ${generateRecommendations()}
            </div>
            
            <div class="required-documents">
                <h4>Required Documents</h4>
                ${generateRequiredDocuments()}
            </div>
            
            <div class="next-steps">
                <h4>Next Steps</h4>
                ${generateNextSteps()}
            </div>
        </div>
        
        <div class="results-actions">
            <button class="btn btn-primary" onclick="generateReport()">
                <i class="fas fa-file-pdf"></i> Generate Report
            </button>
            <button class="btn btn-success" onclick="exportResults()">
                <i class="fas fa-download"></i> Export Results
            </button>
            <button class="btn btn-info" onclick="saveAssessment()">
                <i class="fas fa-save"></i> Save Assessment
            </button>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
    
    // Animate score circle
    animateScoreCircle();
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    
    showAlert('Assessment completed successfully', 'success');
}

function generateCriteriaScores() {
    if (!eligibilityResults.criteria_scores) return '<p>No criteria data available</p>';
    
    return Object.entries(eligibilityResults.criteria_scores)
        .map(([criteria, score]) => `
            <div class="criteria-item">
                <span class="criteria-name">${formatCriteriaName(criteria)}</span>
                <div class="criteria-bar">
                    <div class="criteria-progress" style="width: ${score}%"></div>
                </div>
                <span class="criteria-score">${score}</span>
            </div>
        `).join('');
}

function generateRecommendations() {
    if (!eligibilityResults.recommendations || eligibilityResults.recommendations.length === 0) {
        return '<p>No specific recommendations available</p>';
    }
    
    return `
        <ul class="recommendations-list">
            ${eligibilityResults.recommendations.map(rec => `
                <li class="recommendation-item">
                    <i class="fas fa-lightbulb"></i>
                    <span>${rec}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function generateRequiredDocuments() {
    const requiredDocs = eligibilityResults.required_documents || [
        'Community forest rights claim application',
        'Village assembly resolution',
        'Survey settlement records',
        'Genealogy of claimants',
        'Any other evidence of occupation/use'
    ];
    
    return `
        <ul class="documents-list">
            ${requiredDocs.map(doc => `
                <li class="document-item">
                    <i class="fas fa-file-alt"></i>
                    <span>${doc}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function generateNextSteps() {
    const steps = eligibilityResults.next_steps || [
        'Prepare all required documents',
        'Submit application to Forest Rights Committee',
        'Attend village assembly meeting',
        'Await verification by Sub-Divisional Level Committee'
    ];
    
    return `
        <ol class="next-steps-list">
            ${steps.map(step => `
                <li class="next-step-item">${step}</li>
            `).join('')}
        </ol>
    `;
}

function formatCriteriaName(criteria) {
    return criteria.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function animateScoreCircle() {
    const scoreCircle = document.querySelector('.score-circle');
    if (scoreCircle) {
        scoreCircle.style.transform = 'scale(0.8)';
        setTimeout(() => {
            scoreCircle.style.transform = 'scale(1)';
        }, 100);
    }
}

// Action functions
async function generateReport() {
    try {
        const response = await fetch('/api/dss/generate-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assessment_data: assessmentData,
                results: eligibilityResults
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FRA_Assessment_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            
            showAlert('Report generated successfully', 'success');
        } else {
            throw new Error('Failed to generate report');
        }
    } catch (error) {
        console.error('Report generation error:', error);
        showAlert('Error generating report', 'error');
    }
}

function exportResults() {
    const exportData = {
        assessment_data: assessmentData,
        results: eligibilityResults,
        timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FRA_Assessment_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showAlert('Results exported successfully', 'success');
}

function saveAssessment() {
    const assessmentId = `assessment_${Date.now()}`;
    const saveData = {
        id: assessmentId,
        assessment_data: assessmentData,
        results: eligibilityResults,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(assessmentId, JSON.stringify(saveData));
    showAlert('Assessment saved successfully', 'success');
}

// Utility functions
function showAlert(message, type = 'info') {
    // Reuse the alert function from main.js if available
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeDSS();
    initializeDocumentUpload();
    console.log('Decision Support System initialized');
});