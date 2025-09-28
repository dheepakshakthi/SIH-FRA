// Main JavaScript for FRA Atlas Portal

// Global variables
let currentStats = {};
let searchResults = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadStatistics();
    setupEventListeners();
});

function initializeApp() {
    // Set current date
    const currentDate = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const dateElements = document.querySelectorAll('[data-current-date]');
    dateElements.forEach(el => el.textContent = currentDate);
    
    // Initialize mobile menu
    setupMobileMenu();
    
    // Load districts for dropdowns
    loadDistricts();
    
    console.log('FRA Atlas Portal initialized successfully');
}

function setupMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on links
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

function setupEventListeners() {
    // Search form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
    
    // Download form
    const downloadForm = document.getElementById('downloadForm');
    if (downloadForm) {
        downloadForm.addEventListener('submit', handleDownload);
    }
    
    // Accessibility button
    const accessibilityBtn = document.querySelector('.btn-accessibility');
    if (accessibilityBtn) {
        accessibilityBtn.addEventListener('click', toggleAccessibilityOptions);
    }
    
    // Skip to content
    const skipContent = document.querySelector('.skip-content');
    if (skipContent) {
        skipContent.addEventListener('click', function(e) {
            e.preventDefault();
            const mainContent = document.querySelector('main') || document.querySelector('.hero');
            if (mainContent) {
                mainContent.scrollIntoView({ behavior: 'smooth' });
                mainContent.focus();
            }
        });
    }
}

async function loadStatistics() {
    try {
        showLoading();
        
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.status === 'success') {
            currentStats = data.stats;
            updateStatistics(currentStats);
        } else {
            console.error('Error loading statistics:', data.message);
            // Load fallback statistics
            loadFallbackStatistics();
        }
    } catch (error) {
        console.error('Error fetching statistics:', error);
        loadFallbackStatistics();
    } finally {
        hideLoading();
    }
}

function loadFallbackStatistics() {
    // Fallback statistics for demonstration
    currentStats = {
        total_beneficiaries: 15420,
        total_districts: 25,
        total_area_covered: 45678.5,
        status_breakdown: {
            'Approved': 12336,
            'Pending': 2084,
            'Under Review': 800,
            'Rejected': 200
        }
    };
    updateStatistics(currentStats);
}

function updateStatistics(stats) {
    // Update hero statistics
    animateCounter('#total-beneficiaries', stats.total_beneficiaries || 0);
    animateCounter('#total-districts', stats.total_districts || 0);
    animateCounter('#total-area', Math.round(stats.total_area_covered || 0));
    
    // Calculate approval rate
    const totalClaims = stats.total_beneficiaries || 0;
    const approvedClaims = stats.status_breakdown?.Approved || 0;
    const approvalRate = totalClaims > 0 ? Math.round((approvedClaims / totalClaims) * 100) : 0;
    animateCounter('#approval-rate', approvalRate, '%');
}

function animateCounter(selector, targetValue, suffix = '') {
    const element = document.querySelector(selector);
    if (!element) return;
    
    const startValue = 0;
    const duration = 2000; // 2 seconds
    const startTime = Date.now();
    
    function updateCounter() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
        
        element.textContent = currentValue.toLocaleString() + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    updateCounter();
}

async function loadDistricts() {
    try {
        const response = await fetch('/api/districts');
        const data = await response.json();
        
        if (data.status === 'success') {
            populateDistrictDropdowns(data.districts);
        } else {
            console.error('Error loading districts:', data.message);
            // Load fallback districts
            const fallbackDistricts = [
                'Angul', 'Balasore', 'Bargarh', 'Bhadrak', 'Bolangir', 'Boudh',
                'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam',
                'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kendrapara',
                'Keonjhar', 'Khurda', 'Malkangiri', 'Mayurbhanj', 'Nayagarh',
                'Nuapada', 'Rayagada', 'Sambalpur', 'Subarnapur'
            ];
            populateDistrictDropdowns(fallbackDistricts);
        }
    } catch (error) {
        console.error('Error fetching districts:', error);
    }
}

function populateDistrictDropdowns(districts) {
    const dropdowns = ['#searchDistrict', '#downloadDistrict'];
    
    dropdowns.forEach(selector => {
        const dropdown = document.querySelector(selector);
        if (dropdown) {
            // Clear existing options (except first one)
            while (dropdown.children.length > 1) {
                dropdown.removeChild(dropdown.lastChild);
            }
            
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                dropdown.appendChild(option);
            });
        }
    });
}

async function handleSearch(e) {
    e.preventDefault();
    
    const query = document.getElementById('searchQuery').value.trim();
    const district = document.getElementById('searchDistrict').value;
    
    if (!query) {
        showAlert('Please enter a search query', 'warning');
        return;
    }
    
    try {
        showSearchLoading();
        
        // Build search URL
        let searchUrl = `/api/search?q=${encodeURIComponent(query)}`;
        if (district) {
            searchUrl += `&district=${encodeURIComponent(district)}`;
        }
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.status === 'success') {
            displaySearchResults(data.results);
        } else {
            showAlert('Error searching: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showAlert('Error performing search', 'error');
    } finally {
        hideSearchLoading();
    }
}

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No results found.</p>';
        return;
    }
    
    results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.innerHTML = `
            <h5>${result.name || 'N/A'}</h5>
            <p><strong>Village:</strong> ${result.village || 'N/A'}</p>
            <p><strong>District:</strong> ${result.district || 'N/A'}</p>
            <p><strong>Status:</strong> <span class="status-${(result.status || '').toLowerCase()}">${result.status || 'N/A'}</span></p>
            <p><strong>Area:</strong> ${result.area_acres || 'N/A'} acres</p>
        `;
        
        resultItem.addEventListener('click', () => {
            showBeneficiaryDetails(result);
        });
        
        resultsContainer.appendChild(resultItem);
    });
}

async function handleDownload(e) {
    e.preventDefault();
    
    const district = document.getElementById('downloadDistrict').value;
    const format = document.getElementById('downloadFormat').value;
    
    if (!district) {
        showAlert('Please select a district', 'warning');
        return;
    }
    
    try {
        showDownloadLoading();
        
        const response = await fetch(`/api/export/${format}/${encodeURIComponent(district)}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${district}_fra_data.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showAlert('Download completed successfully', 'success');
            closeDownloadModal();
        } else {
            const errorData = await response.json();
            showAlert('Download failed: ' + errorData.message, 'error');
        }
    } catch (error) {
        console.error('Download error:', error);
        showAlert('Error downloading file', 'error');
    } finally {
        hideDownloadLoading();
    }
}

// Modal functions
function openSearchModal() {
    document.getElementById('searchModal').style.display = 'block';
    document.getElementById('searchQuery').focus();
}

function closeSearchModal() {
    document.getElementById('searchModal').style.display = 'none';
    document.getElementById('searchResults').innerHTML = '';
}

function openDownloadModal() {
    document.getElementById('downloadModal').style.display = 'block';
}

function closeDownloadModal() {
    document.getElementById('downloadModal').style.display = 'none';
}

// Loading states
function showLoading() {
    // Add loading state to statistics
    ['#total-beneficiaries', '#total-districts', '#total-area', '#approval-rate'].forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = '<div class="loading-spinner"></div>';
        }
    });
}

function hideLoading() {
    // Loading will be hidden when statistics are updated
}

function showSearchLoading() {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><span>Searching...</span></div>';
    }
}

function hideSearchLoading() {
    // Loading will be hidden when results are displayed
}

function showDownloadLoading() {
    const button = document.querySelector('#downloadForm button[type="submit"]');
    if (button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
        button.disabled = true;
    }
}

function hideDownloadLoading() {
    const button = document.querySelector('#downloadForm button[type="submit"]');
    if (button) {
        button.innerHTML = '<i class="fas fa-download"></i> Download';
        button.disabled = false;
    }
}

// Utility functions
function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${getAlertIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function showBeneficiaryDetails(beneficiary) {
    // Create modal for beneficiary details
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Beneficiary Details</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="beneficiary-details">
                    <div class="detail-row">
                        <label>Name:</label>
                        <span>${beneficiary.name || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Father's Name:</label>
                        <span>${beneficiary.father_name || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Village:</label>
                        <span>${beneficiary.village || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <label>District:</label>
                        <span>${beneficiary.district || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Survey Number:</label>
                        <span>${beneficiary.survey_number || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Area:</label>
                        <span>${beneficiary.area_acres || 'N/A'} acres</span>
                    </div>
                    <div class="detail-row">
                        <label>Claim Type:</label>
                        <span>${beneficiary.claim_type || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Status:</label>
                        <span class="status-badge status-${(beneficiary.status || '').toLowerCase()}">${beneficiary.status || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Approval Date:</label>
                        <span>${beneficiary.approval_date || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Community Type:</label>
                        <span>${beneficiary.community_type || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function toggleAccessibilityOptions() {
    // Simple accessibility toggle - can be expanded
    const body = document.body;
    
    if (body.classList.contains('high-contrast')) {
        body.classList.remove('high-contrast');
        localStorage.setItem('accessibility-high-contrast', 'false');
    } else {
        body.classList.add('high-contrast');
        localStorage.setItem('accessibility-high-contrast', 'true');
    }
}

// Load accessibility preferences
function loadAccessibilityPreferences() {
    if (localStorage.getItem('accessibility-high-contrast') === 'true') {
        document.body.classList.add('high-contrast');
    }
}

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Load accessibility preferences on page load
loadAccessibilityPreferences();