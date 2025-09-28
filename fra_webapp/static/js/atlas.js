// Atlas Map JavaScript

// Global variables
let map;
let beneficiariesData = [];
let potentialAreasData = [];
let currentFilters = {};
let activePopup = null;
let layers = {};

// Initialize the map
function initializeMap() {
    try {
        // Create map instance
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [84.9, 20.9], // Odisha center coordinates
            zoom: 7,
            attributionControl: false
        });

        // Add controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
        map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        // Add custom attribution
        map.addControl(new mapboxgl.AttributionControl({
            customAttribution: '© FRA Atlas Portal | Government of Odisha'
        }), 'bottom-right');

        // Map event listeners
        map.on('load', onMapLoad);
        map.on('click', onMapClick);
        map.on('mousemove', onMapMouseMove);

        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error initializing map:', error);
        showMapError('Failed to initialize map. Please check your internet connection.');
    }
}

function onMapLoad() {
    console.log('Map loaded successfully');
    hideLoadingIndicator();
    
    // Load map data
    loadMapData();
    
    // Add base layers
    addBaseLayers();
}

async function loadMapData() {
    try {
        showLoadingIndicator('Loading beneficiaries data...');
        
        // Load districts
        const districts = await loadDistricts();
        
        // Load beneficiaries for each district
        for (const district of districts) {
            try {
                const response = await fetch(`/api/beneficiaries/${encodeURIComponent(district)}`);
                const data = await response.json();
                
                if (data.status === 'success') {
                    beneficiariesData = beneficiariesData.concat(data.data);
                }
            } catch (error) {
                console.error(`Error loading data for ${district}:`, error);
            }
        }
        
        // Load potential areas
        showLoadingIndicator('Loading potential areas...');
        const potentialResponse = await fetch('/api/gis/potential-areas');
        const potentialData = await potentialResponse.json();
        
        if (potentialData.status === 'success') {
            potentialAreasData = potentialData.data;
        }
        
        // Add data to map
        addBeneficiariesLayer();
        addPotentialAreasLayer();
        updateStatistics();
        
        console.log(`Loaded ${beneficiariesData.length} beneficiaries and ${potentialAreasData.length} potential areas`);
        
    } catch (error) {
        console.error('Error loading map data:', error);
        showMapError('Failed to load map data');
    } finally {
        hideLoadingIndicator();
    }
}

async function loadDistricts() {
    try {
        const response = await fetch('/api/districts');
        const data = await response.json();
        
        if (data.status === 'success') {
            populateDistrictFilter(data.districts);
            return data.districts;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error loading districts:', error);
        // Return fallback districts
        const fallbackDistricts = [
            'Angul', 'Balasore', 'Bargarh', 'Bhadrak', 'Bolangir', 'Boudh',
            'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam'
        ];
        populateDistrictFilter(fallbackDistricts);
        return fallbackDistricts;
    }
}

function populateDistrictFilter(districts) {
    const districtFilter = document.getElementById('districtFilter');
    if (districtFilter) {
        // Clear existing options (except first)
        while (districtFilter.children.length > 1) {
            districtFilter.removeChild(districtFilter.lastChild);
        }
        
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtFilter.appendChild(option);
        });
    }
}

function addBaseLayers() {
    // Add forest cover visualization
    if (!map.getSource('forest-cover')) {
        map.addSource('forest-cover', {
            type: 'geojson',
            data: generateForestCoverGeoJSON()
        });

        map.addLayer({
            id: 'forest-cover-layer',
            type: 'fill',
            source: 'forest-cover',
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'forest_percent'],
                    0, '#f0f0f0',
                    30, '#a8d5a8',
                    50, '#4a7c59',
                    70, '#2d5a2d',
                    100, '#1a3d1a'
                ],
                'fill-opacity': 0.6
            },
            layout: {
                'visibility': 'none'
            }
        });
    }
    
    layers['forest'] = 'forest-cover-layer';
}

function addBeneficiariesLayer() {
    if (beneficiariesData.length === 0) return;
    
    // Convert beneficiaries to GeoJSON
    const geojsonData = {
        type: 'FeatureCollection',
        features: beneficiariesData.map(beneficiary => ({
            type: 'Feature',
            properties: {
                ...beneficiary,
                type: 'beneficiary'
            },
            geometry: {
                type: 'Point',
                coordinates: beneficiary.coordinates ? 
                    [beneficiary.coordinates.lng, beneficiary.coordinates.lat] :
                    [84.9 + (Math.random() - 0.5) * 2, 20.9 + (Math.random() - 0.5) * 2]
            }
        }))
    };
    
    // Add source
    if (map.getSource('beneficiaries')) {
        map.getSource('beneficiaries').setData(geojsonData);
    } else {
        map.addSource('beneficiaries', {
            type: 'geojson',
            data: geojsonData,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });
        
        // Add cluster layer
        map.addLayer({
            id: 'beneficiaries-clusters',
            type: 'circle',
            source: 'beneficiaries',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#51bbd6',
                    100, '#f1f075',
                    750, '#f28cb1'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20, 100, 30, 750, 40
                ]
            }
        });
        
        // Add cluster count labels
        map.addLayer({
            id: 'beneficiaries-cluster-count',
            type: 'symbol',
            source: 'beneficiaries',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        });
        
        // Add individual points
        map.addLayer({
            id: 'beneficiaries-points',
            type: 'circle',
            source: 'beneficiaries',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': [
                    'match',
                    ['get', 'status'],
                    'Approved', '#28a745',
                    'Pending', '#ffc107',
                    'Under Review', '#17a2b8',
                    'Rejected', '#dc3545',
                    '#6c757d'
                ],
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });
    }
    
    // Add click handlers
    map.on('click', 'beneficiaries-clusters', onClusterClick);
    map.on('click', 'beneficiaries-points', onBeneficiaryClick);
    
    // Add hover effects
    map.on('mouseenter', 'beneficiaries-points', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'beneficiaries-points', () => {
        map.getCanvas().style.cursor = '';
    });
    
    layers['beneficiaries'] = ['beneficiaries-clusters', 'beneficiaries-cluster-count', 'beneficiaries-points'];
}

function addPotentialAreasLayer() {
    if (potentialAreasData.length === 0) return;
    
    // Convert potential areas to GeoJSON
    const geojsonData = {
        type: 'FeatureCollection',
        features: potentialAreasData.map(area => ({
            type: 'Feature',
            properties: {
                ...area,
                type: 'potential'
            },
            geometry: {
                type: 'Point',
                coordinates: [area.coordinates.lng, area.coordinates.lat]
            }
        }))
    };
    
    // Add source
    if (map.getSource('potential-areas')) {
        map.getSource('potential-areas').setData(geojsonData);
    } else {
        map.addSource('potential-areas', {
            type: 'geojson',
            data: geojsonData
        });
        
        // Add layer
        map.addLayer({
            id: 'potential-areas-layer',
            type: 'circle',
            source: 'potential-areas',
            paint: {
                'circle-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'priority_score'],
                    0, '#6c757d',
                    30, '#fd7e14',
                    50, '#d73527'
                ],
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'priority_score'],
                    0, 6,
                    100, 12
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.8
            }
        });
        
        // Add click handler
        map.on('click', 'potential-areas-layer', onPotentialAreaClick);
        
        // Add hover effects
        map.on('mouseenter', 'potential-areas-layer', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'potential-areas-layer', () => {
            map.getCanvas().style.cursor = '';
        });
    }
    
    layers['potential'] = 'potential-areas-layer';
}

function onClusterClick(e) {
    const features = map.queryRenderedFeatures(e.point, {
        layers: ['beneficiaries-clusters']
    });
    
    const clusterId = features[0].properties.cluster_id;
    map.getSource('beneficiaries').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (!err) {
            map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom
            });
        }
    });
}

function onBeneficiaryClick(e) {
    const feature = e.features[0];
    const properties = feature.properties;
    
    // Close existing popup
    if (activePopup) {
        activePopup.remove();
    }
    
    // Create popup content
    const popupContent = `
        <div class="popup-content">
            <div class="popup-header">
                <h4 class="popup-title">${properties.name || 'Beneficiary'}</h4>
                <span class="popup-type">Beneficiary</span>
            </div>
            <div class="popup-body">
                <div class="popup-field">
                    <label>Village:</label>
                    <span>${properties.village || 'N/A'}</span>
                </div>
                <div class="popup-field">
                    <label>District:</label>
                    <span>${properties.district || 'N/A'}</span>
                </div>
                <div class="popup-field">
                    <label>Status:</label>
                    <span class="status-${(properties.status || '').toLowerCase()}">${properties.status || 'N/A'}</span>
                </div>
                <div class="popup-field">
                    <label>Area:</label>
                    <span>${properties.area_acres || 'N/A'} acres</span>
                </div>
                <div class="popup-field">
                    <label>Claim Type:</label>
                    <span>${properties.claim_type || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
    
    // Create and show popup
    activePopup = new mapboxgl.Popup()
        .setLngLat(feature.geometry.coordinates)
        .setHTML(popupContent)
        .addTo(map);
}

function onPotentialAreaClick(e) {
    const feature = e.features[0];
    const properties = feature.properties;
    
    // Close existing popup
    if (activePopup) {
        activePopup.remove();
    }
    
    // Create popup content
    const popupContent = `
        <div class="popup-content">
            <div class="popup-header">
                <h4 class="popup-title">${properties.name || 'Potential Area'}</h4>
                <span class="popup-type">Potential</span>
            </div>
            <div class="popup-body">
                <div class="popup-field">
                    <label>District:</label>
                    <span>${properties.district || 'N/A'}</span>
                </div>
                <div class="popup-field">
                    <label>Priority Score:</label>
                    <span>${properties.priority_score || 'N/A'}</span>
                </div>
                <div class="popup-field">
                    <label>Est. Beneficiaries:</label>
                    <span>${properties.estimated_beneficiaries || 'N/A'}</span>
                </div>
                <div class="popup-field">
                    <label>Tribal Households:</label>
                    <span>${properties.tribal_households || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
    
    // Create and show popup
    activePopup = new mapboxgl.Popup()
        .setLngLat(feature.geometry.coordinates)
        .setHTML(popupContent)
        .addTo(map);
}

function generateForestCoverGeoJSON() {
    // Generate mock forest cover data for districts
    const districts = [
        { name: 'Angul', coords: [85.1018, 20.8480], forest_percent: 35.2 },
        { name: 'Balasore', coords: [86.9335, 21.4934], forest_percent: 12.8 },
        { name: 'Bargarh', coords: [83.6190, 21.3347], forest_percent: 18.5 },
        { name: 'Bhadrak', coords: [86.5118, 21.0543], forest_percent: 8.2 },
        { name: 'Bolangir', coords: [83.4420, 20.7117], forest_percent: 28.7 }
    ];
    
    return {
        type: 'FeatureCollection',
        features: districts.map(district => ({
            type: 'Feature',
            properties: {
                name: district.name,
                forest_percent: district.forest_percent
            },
            geometry: {
                type: 'Polygon',
                coordinates: [generateDistrictBounds(district.coords)]
            }
        }))
    };
}

function generateDistrictBounds(center) {
    const offset = 0.5; // Approximate district size
    return [
        [center[0] - offset, center[1] - offset],
        [center[0] + offset, center[1] - offset],
        [center[0] + offset, center[1] + offset],
        [center[0] - offset, center[1] + offset],
        [center[0] - offset, center[1] - offset]
    ];
}

// Filter functions
function applyFilters() {
    const district = document.getElementById('districtFilter').value;
    const claimType = document.getElementById('claimTypeFilter').value;
    const status = document.getElementById('statusFilter').value;
    const communityType = document.getElementById('communityTypeFilter').value;
    
    currentFilters = { district, claimType, status, communityType };
    
    // Filter beneficiaries data
    let filteredData = beneficiariesData.filter(beneficiary => {
        if (district && beneficiary.district !== district) return false;
        if (claimType && beneficiary.claim_type !== claimType) return false;
        if (status && beneficiary.status !== status) return false;
        if (communityType && beneficiary.community_type !== communityType) return false;
        return true;
    });
    
    // Update beneficiaries layer
    updateBeneficiariesLayer(filteredData);
    updateStatistics(filteredData);
    
    console.log(`Applied filters. Showing ${filteredData.length} of ${beneficiariesData.length} beneficiaries.`);
}

function clearFilters() {
    // Clear filter inputs
    document.getElementById('districtFilter').value = '';
    document.getElementById('claimTypeFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('communityTypeFilter').value = '';
    
    currentFilters = {};
    
    // Reset to show all data
    updateBeneficiariesLayer(beneficiariesData);
    updateStatistics(beneficiariesData);
    
    console.log('Filters cleared. Showing all data.');
}

function updateBeneficiariesLayer(data) {
    const geojsonData = {
        type: 'FeatureCollection',
        features: data.map(beneficiary => ({
            type: 'Feature',
            properties: {
                ...beneficiary,
                type: 'beneficiary'
            },
            geometry: {
                type: 'Point',
                coordinates: beneficiary.coordinates ? 
                    [beneficiary.coordinates.lng, beneficiary.coordinates.lat] :
                    [84.9 + (Math.random() - 0.5) * 2, 20.9 + (Math.random() - 0.5) * 2]
            }
        }))
    };
    
    if (map.getSource('beneficiaries')) {
        map.getSource('beneficiaries').setData(geojsonData);
    }
}

function updateStatistics(data = beneficiariesData) {
    // Update statistics panel
    document.getElementById('totalBeneficiaries').textContent = data.length.toLocaleString();
    
    const approved = data.filter(b => b.status === 'Approved').length;
    const pending = data.filter(b => b.status === 'Pending').length;
    const totalArea = data.reduce((sum, b) => sum + (parseFloat(b.area_acres) || 0), 0);
    
    document.getElementById('approvedClaims').textContent = approved.toLocaleString();
    document.getElementById('pendingClaims').textContent = pending.toLocaleString();
    document.getElementById('totalArea').textContent = Math.round(totalArea).toLocaleString();
    document.getElementById('potentialAreas').textContent = potentialAreasData.length.toLocaleString();
}

// Layer toggle functions
function toggleLayer(layerType) {
    const checkbox = document.getElementById(`${layerType}Layer`);
    const layerIds = layers[layerType];
    
    if (!layerIds) return;
    
    const visibility = checkbox.checked ? 'visible' : 'none';
    
    if (Array.isArray(layerIds)) {
        layerIds.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.setLayoutProperty(layerId, 'visibility', visibility);
            }
        });
    } else {
        if (map.getLayer(layerIds)) {
            map.setLayoutProperty(layerIds, 'visibility', visibility);
        }
    }
    
    console.log(`Layer ${layerType} ${visibility === 'visible' ? 'enabled' : 'disabled'}`);
}

// Map control functions
function zoomToFit() {
    if (beneficiariesData.length === 0) return;
    
    const bounds = new mapboxgl.LngLatBounds();
    
    beneficiariesData.forEach(beneficiary => {
        if (beneficiary.coordinates) {
            bounds.extend([beneficiary.coordinates.lng, beneficiary.coordinates.lat]);
        }
    });
    
    map.fitBounds(bounds, { padding: 50 });
}

function resetView() {
    map.easeTo({
        center: [84.9, 20.9],
        zoom: 7,
        duration: 1000
    });
}

function toggleFullscreen() {
    if (map.isFullscreen()) {
        map.exitFullscreen();
    } else {
        map.enterFullscreen();
    }
}

// Search function
function performMapSearch() {
    const query = document.getElementById('mapSearch').value.trim().toLowerCase();
    
    if (!query) {
        showAlert('Please enter a search term', 'warning');
        return;
    }
    
    // Search in beneficiaries data
    const results = beneficiariesData.filter(beneficiary => 
        (beneficiary.name && beneficiary.name.toLowerCase().includes(query)) ||
        (beneficiary.village && beneficiary.village.toLowerCase().includes(query)) ||
        (beneficiary.district && beneficiary.district.toLowerCase().includes(query)) ||
        (beneficiary.survey_number && beneficiary.survey_number.toLowerCase().includes(query))
    );
    
    if (results.length === 0) {
        showAlert('No results found', 'info');
        return;
    }
    
    // Show results on map
    if (results.length === 1) {
        // Single result - zoom to it
        const result = results[0];
        if (result.coordinates) {
            map.easeTo({
                center: [result.coordinates.lng, result.coordinates.lat],
                zoom: 12,
                duration: 1000
            });
            
            // Show popup after zoom
            setTimeout(() => {
                onBeneficiaryClick({
                    features: [{
                        properties: result,
                        geometry: {
                            coordinates: [result.coordinates.lng, result.coordinates.lat]
                        }
                    }]
                });
            }, 1000);
        }
    } else {
        // Multiple results - fit bounds
        const bounds = new mapboxgl.LngLatBounds();
        results.forEach(result => {
            if (result.coordinates) {
                bounds.extend([result.coordinates.lng, result.coordinates.lat]);
            }
        });
        map.fitBounds(bounds, { padding: 50 });
        showAlert(`Found ${results.length} results`, 'success');
    }
    
    // Clear search box
    document.getElementById('mapSearch').value = '';
}

// Sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function toggleLegend() {
    const legendPanel = document.getElementById('legendPanel');
    legendPanel.style.display = legendPanel.style.display === 'none' ? 'block' : 'none';
}

function toggleFilters() {
    const filtersPanel = document.getElementById('filtersPanel');
    filtersPanel.style.display = filtersPanel.style.display === 'none' ? 'block' : 'none';
}

// Info panel functions
function closeInfoPanel() {
    const infoPanel = document.getElementById('infoPanel');
    infoPanel.classList.remove('active');
}

// Event handlers
function onMapClick(e) {
    // Close any open popups when clicking on empty areas
    const features = map.queryRenderedFeatures(e.point);
    if (features.length === 0 && activePopup) {
        activePopup.remove();
        activePopup = null;
    }
}

function onMapMouseMove(e) {
    // Could add hover effects here
}

// Utility functions
function showLoadingIndicator(message = 'Loading...') {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.style.display = 'block';
        const messageElement = indicator.querySelector('span');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function showMapError(message) {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div class="map-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Map Loading Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh"></i> Retry
                </button>
            </div>
        `;
    }
}

function showAlert(message, type = 'info') {
    // Reuse the alert function from main.js
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const mapSearch = document.getElementById('mapSearch');
    if (mapSearch) {
        mapSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performMapSearch();
            }
        });
    }
    
    // Panel toggles
    document.querySelectorAll('.panel-header').forEach(header => {
        header.addEventListener('click', function() {
            const panel = this.parentElement;
            const content = panel.querySelector('.panel-content');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                this.classList.add('expanded');
            } else {
                content.style.display = 'none';
                this.classList.remove('expanded');
            }
        });
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    console.log('Atlas application initialized');
});