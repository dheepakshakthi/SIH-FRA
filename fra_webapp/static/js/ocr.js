// OCR Module JavaScript

// Global variables
let selectedFiles = [];
let currentProcessingStep = 0;
let processingResults = [];
let isProcessing = false;

const processingSteps = [
    'Uploading files...',
    'Analyzing document structure...',
    'Extracting text content...',
    'Validating data format...',
    'Generating structured output...'
];

// File upload and management
function initializeFileUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // Set up drag and drop
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('dragleave', handleDragLeave, false);
    dropZone.addEventListener('drop', handleDrop, false);
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    console.log('File upload initialized');
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

function addFiles(files) {
    // Filter valid file types
    const validFiles = files.filter(file => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
        return validTypes.includes(file.type);
    });
    
    if (validFiles.length === 0) {
        showAlert('Please select valid PDF or image files (JPEG, PNG, TIFF)', 'error');
        return;
    }
    
    // Add to selected files
    selectedFiles = selectedFiles.concat(validFiles);
    updateFileList();
    updateProcessButton();
    
    console.log(`Added ${validFiles.length} files. Total: ${selectedFiles.length}`);
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    updateProcessButton();
}

function clearAllFiles() {
    selectedFiles = [];
    updateFileList();
    updateProcessButton();
    
    // Clear results if any
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '<p class="text-muted">No files selected</p>';
        return;
    }
    
    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <div class="file-info">
                <i class="fas ${getFileIcon(file.type)}"></i>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                </div>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function getFileIcon(mimeType) {
    switch (mimeType) {
        case 'application/pdf':
            return 'fa-file-pdf';
        case 'image/jpeg':
        case 'image/png':
        case 'image/tiff':
            return 'fa-file-image';
        default:
            return 'fa-file';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateProcessButton() {
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.disabled = selectedFiles.length === 0 || isProcessing;
        processBtn.innerHTML = isProcessing ? 
            '<i class="fas fa-spinner fa-spin"></i> Processing...' :
            '<i class="fas fa-play"></i> Start Processing';
    }
}

// OCR Processing
async function startProcessing() {
    if (selectedFiles.length === 0) {
        showAlert('Please select files to process', 'warning');
        return;
    }
    
    isProcessing = true;
    currentProcessingStep = 0;
    processingResults = [];
    
    updateProcessButton();
    showProcessingSteps();
    
    try {
        // Process each file
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            updateCurrentStep(`Processing ${file.name}...`);
            
            const result = await processFile(file);
            processingResults.push(result);
            updateProgressBar((i + 1) / selectedFiles.length * 100);
        }
        
        // Show results
        displayResults();
        showAlert(`Successfully processed ${selectedFiles.length} files`, 'success');
        
    } catch (error) {
        console.error('Processing error:', error);
        showAlert('Error processing files: ' + error.message, 'error');
    } finally {
        isProcessing = false;
        updateProcessButton();
        hideProcessingSteps();
    }
}

async function processFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/ocr/process', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.message);
        }
        
        return {
            filename: file.name,
            ...result
        };
        
    } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        return {
            filename: file.name,
            status: 'error',
            message: error.message,
            extracted_data: []
        };
    }
}

function showProcessingSteps() {
    const stepsContainer = document.getElementById('processingSteps');
    const progressSection = document.getElementById('progressSection');
    
    if (stepsContainer && progressSection) {
        progressSection.style.display = 'block';
        
        stepsContainer.innerHTML = processingSteps.map((step, index) => `
            <div class="step-item ${index === 0 ? 'active' : ''}" id="step-${index}">
                <div class="step-icon">
                    <i class="fas fa-circle"></i>
                </div>
                <span class="step-text">${step}</span>
            </div>
        `).join('');
    }
}

function updateCurrentStep(customMessage = null) {
    if (customMessage) {
        const activeStep = document.querySelector('.step-item.active .step-text');
        if (activeStep) {
            activeStep.textContent = customMessage;
        }
        return;
    }
    
    // Mark current step as completed
    const currentStepElement = document.getElementById(`step-${currentProcessingStep}`);
    if (currentStepElement) {
        currentStepElement.classList.remove('active');
        currentStepElement.classList.add('completed');
        const icon = currentStepElement.querySelector('.step-icon i');
        if (icon) {
            icon.className = 'fas fa-check';
        }
    }
    
    // Move to next step
    currentProcessingStep++;
    if (currentProcessingStep < processingSteps.length) {
        const nextStepElement = document.getElementById(`step-${currentProcessingStep}`);
        if (nextStepElement) {
            nextStepElement.classList.add('active');
        }
    }
}

function updateProgressBar(percentage) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(percentage)}%`;
    }
}

function hideProcessingSteps() {
    const progressSection = document.getElementById('progressSection');
    if (progressSection) {
        setTimeout(() => {
            progressSection.style.display = 'none';
        }, 2000);
    }
}

// Results display and management
function displayResults() {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!resultsSection || !resultsContainer) return;
    
    resultsSection.style.display = 'block';
    
    const summaryHtml = generateResultsSummary();
    const detailsHtml = generateResultsDetails();
    
    resultsContainer.innerHTML = `
        <div class="results-summary">
            ${summaryHtml}
        </div>
        <div class="results-details">
            ${detailsHtml}
        </div>
    `;
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function generateResultsSummary() {
    const totalFiles = processingResults.length;
    const successfulFiles = processingResults.filter(r => r.status === 'success').length;
    const totalRecords = processingResults.reduce((sum, r) => 
        sum + (r.extracted_data ? r.extracted_data.length : 0), 0);
    
    return `
        <div class="summary-cards">
            <div class="summary-card">
                <div class="card-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="card-content">
                    <h3>${totalFiles}</h3>
                    <p>Files Processed</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="card-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="card-content">
                    <h3>${successfulFiles}</h3>
                    <p>Successful Extractions</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="card-icon">
                    <i class="fas fa-database"></i>
                </div>
                <div class="card-content">
                    <h3>${totalRecords}</h3>
                    <p>Records Extracted</p>
                </div>
            </div>
        </div>
    `;
}

function generateResultsDetails() {
    return processingResults.map((result, index) => `
        <div class="result-item">
            <div class="result-header">
                <div class="result-info">
                    <h4>${result.filename}</h4>
                    <span class="status-badge status-${result.status}">${result.status}</span>
                </div>
                <div class="result-actions">
                    ${result.status === 'success' ? `
                        <button class="btn btn-sm btn-outline-primary" onclick="editResult(${index})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="exportResult(${index}, 'csv')">
                            <i class="fas fa-download"></i> CSV
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="exportResult(${index}, 'json')">
                            <i class="fas fa-download"></i> JSON
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="result-content">
                ${result.status === 'success' ? 
                    generateDataTable(result.extracted_data, index) :
                    `<p class="text-danger">${result.message}</p>`
                }
            </div>
        </div>
    `).join('');
}

function generateDataTable(data, resultIndex) {
    if (!data || data.length === 0) {
        return '<p class="text-muted">No data extracted</p>';
    }
    
    const headers = Object.keys(data[0]);
    
    return `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${formatHeader(header)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.slice(0, 10).map((row, rowIndex) => `
                        <tr>
                            ${headers.map(header => `
                                <td onclick="editCell(${resultIndex}, ${rowIndex}, '${header}')">${row[header] || ''}</td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${data.length > 10 ? `<p class="text-muted">Showing 10 of ${data.length} records</p>` : ''}
        </div>
    `;
}

function formatHeader(header) {
    return header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Data editing functions
function editResult(resultIndex) {
    const result = processingResults[resultIndex];
    showEditModal(result, resultIndex);
}

function editCell(resultIndex, rowIndex, field) {
    const result = processingResults[resultIndex];
    const currentValue = result.extracted_data[rowIndex][field] || '';
    
    const newValue = prompt(`Edit ${formatHeader(field)}:`, currentValue);
    
    if (newValue !== null) {
        result.extracted_data[rowIndex][field] = newValue;
        displayResults(); // Refresh display
        showAlert('Cell updated successfully', 'success');
    }
}

function showEditModal(result, resultIndex) {
    const modal = document.getElementById('editModal');
    const modalTitle = document.getElementById('editModalTitle');
    const modalBody = document.getElementById('editModalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = `Edit Data - ${result.filename}`;
    
    // Generate editable form
    modalBody.innerHTML = generateEditForm(result.extracted_data, resultIndex);
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

function generateEditForm(data, resultIndex) {
    if (!data || data.length === 0) return '<p>No data to edit</p>';
    
    const headers = Object.keys(data[0]);
    
    return `
        <div class="edit-form">
            <div class="row">
                <div class="col-md-6">
                    <label for="recordSelect">Select Record:</label>
                    <select id="recordSelect" class="form-control" onchange="loadRecordForEdit(${resultIndex})">
                        ${data.map((_, index) => `
                            <option value="${index}">Record ${index + 1}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <button class="btn btn-success mt-4" onclick="addNewRecord(${resultIndex})">
                        <i class="fas fa-plus"></i> Add New Record
                    </button>
                </div>
            </div>
            <hr>
            <div id="recordEditForm">
                ${generateRecordEditForm(data[0], resultIndex, 0, headers)}
            </div>
        </div>
    `;
}

function generateRecordEditForm(record, resultIndex, recordIndex, headers) {
    return `
        <form id="editForm-${resultIndex}-${recordIndex}">
            ${headers.map(header => `
                <div class="mb-3">
                    <label class="form-label">${formatHeader(header)}</label>
                    <input type="text" class="form-control" name="${header}" 
                           value="${record[header] || ''}" 
                           placeholder="Enter ${formatHeader(header)}">
                </div>
            `).join('')}
            <div class="form-actions">
                <button type="button" class="btn btn-primary" onclick="saveRecord(${resultIndex}, ${recordIndex})">
                    <i class="fas fa-save"></i> Save Changes
                </button>
                <button type="button" class="btn btn-danger" onclick="deleteRecord(${resultIndex}, ${recordIndex})">
                    <i class="fas fa-trash"></i> Delete Record
                </button>
            </div>
        </form>
    `;
}

function loadRecordForEdit(resultIndex) {
    const recordSelect = document.getElementById('recordSelect');
    const recordIndex = parseInt(recordSelect.value);
    const result = processingResults[resultIndex];
    const record = result.extracted_data[recordIndex];
    const headers = Object.keys(result.extracted_data[0]);
    
    const formContainer = document.getElementById('recordEditForm');
    formContainer.innerHTML = generateRecordEditForm(record, resultIndex, recordIndex, headers);
}

function saveRecord(resultIndex, recordIndex) {
    const form = document.getElementById(`editForm-${resultIndex}-${recordIndex}`);
    const formData = new FormData(form);
    
    const updatedRecord = {};
    for (let [key, value] of formData.entries()) {
        updatedRecord[key] = value;
    }
    
    processingResults[resultIndex].extracted_data[recordIndex] = updatedRecord;
    
    showAlert('Record saved successfully', 'success');
    displayResults(); // Refresh display
}

function deleteRecord(resultIndex, recordIndex) {
    if (confirm('Are you sure you want to delete this record?')) {
        processingResults[resultIndex].extracted_data.splice(recordIndex, 1);
        showAlert('Record deleted successfully', 'success');
        
        // Close modal and refresh display
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        modal.hide();
        displayResults();
    }
}

function addNewRecord(resultIndex) {
    const result = processingResults[resultIndex];
    const headers = Object.keys(result.extracted_data[0]);
    
    const newRecord = {};
    headers.forEach(header => newRecord[header] = '');
    
    result.extracted_data.push(newRecord);
    
    // Update record select
    const recordSelect = document.getElementById('recordSelect');
    const newIndex = result.extracted_data.length - 1;
    const option = new Option(`Record ${newIndex + 1}`, newIndex);
    recordSelect.add(option);
    recordSelect.value = newIndex;
    
    // Load new record for editing
    loadRecordForEdit(resultIndex);
    
    showAlert('New record added', 'success');
}

// Export functions
function exportResult(resultIndex, format) {
    const result = processingResults[resultIndex];
    
    if (!result.extracted_data || result.extracted_data.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }
    
    const filename = `${result.filename.replace(/\.[^/.]+$/, '')}_extracted.${format}`;
    
    switch (format) {
        case 'csv':
            exportToCSV(result.extracted_data, filename);
            break;
        case 'json':
            exportToJSON(result.extracted_data, filename);
            break;
        case 'excel':
            exportToExcel(result.extracted_data, filename);
            break;
    }
}

function exportToCSV(data, filename) {
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    downloadFile(csvContent, filename, 'text/csv');
}

function exportToJSON(data, filename) {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, filename, 'application/json');
}

function exportAllResults() {
    const allData = processingResults
        .filter(result => result.status === 'success' && result.extracted_data)
        .reduce((acc, result) => {
            result.extracted_data.forEach(record => {
                acc.push({
                    source_file: result.filename,
                    ...record
                });
            });
            return acc;
        }, []);
    
    if (allData.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }
    
    const format = document.getElementById('exportFormat').value;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `fra_ocr_results_${timestamp}.${format}`;
    
    switch (format) {
        case 'csv':
            exportToCSV(allData, filename);
            break;
        case 'json':
            exportToJSON(allData, filename);
            break;
    }
    
    showAlert(`Exported ${allData.length} records`, 'success');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
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
    initializeFileUpload();
    console.log('OCR module initialized');
});