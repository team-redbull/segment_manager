// Global state
let currentFilter = 'all';
let currentSite = '';
let currentSearchQuery = '';
let isOnline = true;
let allSites = []; // All configured sites

// Export Functions - Make explicitly global
window.exportData = async function exportData(format) {
    try {
        let endpoint = '';
        let filename = '';

        if (format === 'csv') {
            endpoint = '/export/segments/csv';
            filename = 'segments.csv';
        } else if (format === 'excel') {
            endpoint = '/export/segments/excel';
            filename = 'segments.xlsx';
        }

        // Add current filter parameters
        const params = new URLSearchParams();

        if (currentFilter === 'available') {
            params.append('allocated', 'false');
        } else if (currentFilter === 'allocated') {
            params.append('allocated', 'true');
        }

        if (currentSite) {
            params.append('site', currentSite);
        }

        const queryString = params.toString();
        const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

        const response = await fetch(`/api${fullEndpoint}`);

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showSuccess(`${format.toUpperCase()} export completed`);
        } else {
            const error = await response.json();
            showError(error.detail || 'Export failed');
        }
    } catch (error) {
        console.error('Export error:', error);
        showError('Export failed. Please try again.');
    }
};

window.exportStats = async function exportStats(format) {
    try {
        const response = await fetch('/api/export/stats/csv');

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'site_statistics.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showSuccess('Statistics export completed');
        } else {
            const error = await response.json();
            showError(error.detail || 'Export failed');
        }
    } catch (error) {
        console.error('Export stats error:', error);
        showError('Export failed. Please try again.');
    }
};

// Utility functions
function showError(message) {
    const banner = document.getElementById('errorBanner');
    banner.textContent = message;
    banner.style.display = 'block';
    setTimeout(() => {
        banner.style.display = 'none';
    }, 5000);
}

function showVlanIdImmutableError(errorDetail) {
    const message = `
        🚫 VLAN ID Cannot Be Changed

        Current VLAN ID: ${errorDetail.current_vlan_id}
        Attempted VLAN ID: ${errorDetail.attempted_vlan_id}

        💡 Solution: Create a new segment with the desired VLAN ID and delete the old one if needed.
    `.trim();

    const banner = document.getElementById('errorBanner');
    banner.innerHTML = message.replace(/\n/g, '<br>');
    banner.style.display = 'block';
    banner.style.padding = '15px';
    banner.style.fontSize = '14px';
    banner.style.lineHeight = '1.4';

    setTimeout(() => {
        banner.style.display = 'none';
        banner.style.padding = '';
        banner.style.fontSize = '';
        banner.style.lineHeight = '';
    }, 8000);
}

function showSuccess(message) {
    const banner = document.getElementById('successBanner');
    banner.textContent = message;
    banner.style.display = 'block';
    setTimeout(() => {
        banner.style.display = 'none';
    }, 5000);
}

function updateConnectionStatus(online) {
    isOnline = online;
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    if (online) {
        dot.classList.remove('offline');
        text.textContent = 'Connected';
    } else {
        dot.classList.add('offline');
        text.textContent = 'Offline';
    }
}

async function fetchAPI(endpoint, options = {}) {
    try {
        console.log('Fetching API:', endpoint);
        const response = await fetch(`/api${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        console.log('API response status:', response.status);
        updateConnectionStatus(true);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));

            // Handle Pydantic validation errors (detail is an array)
            if (Array.isArray(error.detail)) {
                const messages = error.detail.map(err => err.msg || err.message || 'Validation error').join('; ');
                throw new Error(messages);
            }

            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('API response data:', result);
        return result;
    } catch (error) {
        console.error('API fetch error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            updateConnectionStatus(false);
            throw new Error('Connection lost. Please check your network.');
        }
        throw error;
    }
}

async function loadSites() {
    try {
        console.log('Loading sites...');
        const data = await fetchAPI('/sites');
        console.log('Sites data received:', data);
        const sites = data.sites;
        allSites = sites;

        const siteFilterSelect = document.getElementById('siteFilter');

        siteFilterSelect.innerHTML = '<option value="">All Sites</option>';

        sites.forEach(site => {
            siteFilterSelect.innerHTML += `<option value="${site}">${site}</option>`;
        });

        console.log('Sites loaded successfully:', sites);
    } catch (error) {
        console.error('Failed to load sites:', error);
        showError('Failed to load sites: ' + error.message);
    }
}

async function loadStats() {
    try {
        const stats = await fetchAPI('/stats');
        const container = document.getElementById('statsGrid');

        if (stats.length === 0) {
            container.innerHTML = '<div class="stat-card"><h3>No sites configured</h3></div>';
            return;
        }

        container.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <h3>${stat.site}</h3>
                <div class="stat-item">
                    <span>Total Segments:</span>
                    <strong>${stat.total_segments}</strong>
                </div>
                <div class="stat-item">
                    <span>Allocated:</span>
                    <strong>${stat.allocated}</strong>
                </div>
                <div class="stat-item">
                    <span>Available:</span>
                    <strong style="color: ${stat.available > 0 ? '#48bb78' : '#f56565'}">${stat.available}</strong>
                </div>
                <div class="stat-item">
                    <span>Utilization:</span>
                    <strong>${stat.utilization}%</strong>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${stat.utilization}%"></div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadSegments() {
    try {
        let endpoint = '/segments';
        const params = new URLSearchParams();

        // If there's a search query, use search endpoint
        if (currentSearchQuery.trim()) {
            endpoint = '/segments/search';
            params.append('q', currentSearchQuery.trim());
        }

        if (currentFilter === 'available') {
            params.append('allocated', 'false');
        } else if (currentFilter === 'allocated') {
            params.append('allocated', 'true');
        }

        if (currentSite) {
            params.append('site', currentSite);
        }

        const queryString = params.toString();
        if (queryString) {
            endpoint += '?' + queryString;
        }

        const segments = await fetchAPI(endpoint);
        const container = document.getElementById('segmentsList');

        if (segments.length === 0) {
            container.innerHTML = '<tr><td colspan="7" class="empty-state">No segments found</td></tr>';
            return;
        }

        container.innerHTML = segments.map(segment => {
            const isAllocated = segment.cluster_name && !segment.released;
            return `
                <tr>
                    <td>${segment.site}</td>
                    <td><strong>${segment.vlan_id}</strong></td>
                    <td><code>${segment.epg_name}</code></td>
                    <td><code>${segment.segment}</code></td>
                    <td>${segment.dhcp ? 'Yes' : 'No'}</td>
                    <td>${segment.cluster_name || '-'}</td>
                    <td>
                        <span class="badge ${isAllocated ? 'allocated' : 'available'}">
                            ${isAllocated ? 'Allocated' : 'Available'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load segments:', error);
        document.getElementById('segmentsList').innerHTML =
            '<tr><td colspan="7" class="empty-state">Failed to load segments</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const filter = e.target.getAttribute('data-filter');
            currentFilter = filter;

            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            loadSegments();
        });
    });

    // Site filter
    document.getElementById('siteFilter').addEventListener('change', (e) => {
        currentSite = e.target.value;
        loadSegments();
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;

        if (query.trim()) {
            clearSearch.classList.add('visible');
        } else {
            clearSearch.classList.remove('visible');
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchQuery = query;
            loadSegments();
        }, 300);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchTimeout);
            currentSearchQuery = e.target.value;
            loadSegments();
        }
    });

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearch.classList.remove('visible');
        loadSegments();
    });

    // Initialize application
    async function init() {
        try {
            console.log('Initializing application...');
            await loadSites();
            console.log('Sites loaded, loading stats and segments...');
            await Promise.all([loadStats(), loadSegments()]);
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize:', error);
            showError('Failed to load initial data. Please refresh the page.');
        }
    }

    init();

    // Auto-refresh data every 30 seconds
    setInterval(() => {
        if (isOnline) {
            loadStats();
            loadSegments();
        }
    }, 30000);

    // Check connection status
    setInterval(async () => {
        try {
            await fetchAPI('/health');
            updateConnectionStatus(true);
        } catch {
            updateConnectionStatus(false);
        }
    }, 10000);
});


