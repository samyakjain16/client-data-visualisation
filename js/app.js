// Main Application
class Dashboard {
    constructor() {
        this.currentYear = null;
        this.currentData = null;
        this.currentAnalytics = null;
        this.isLoading = false;
        
        this.initializeEventListeners();
        this.showInitialState();
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Year selector
        const yearSelector = document.getElementById('yearSelector');
        if (yearSelector) {
            yearSelector.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadYear(e.target.value);
                } else {
                    this.showInitialState();
                }
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (this.currentYear) {
                    this.refreshData();
                }
            });
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (window.chartsManager) {
                    window.chartsManager.filterTable(e.target.value);
                }
            });
        }

        // Export functionality
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (this.currentData && this.currentYear && window.chartsManager) {
                    window.chartsManager.exportData(this.currentData, this.currentYear);
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + R for refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && this.currentYear) {
                e.preventDefault();
                this.refreshData();
            }
            
            // Ctrl/Cmd + E for export
            if ((e.ctrlKey || e.metaKey) && e.key === 'e' && this.currentData) {
                e.preventDefault();
                document.getElementById('exportBtn').click();
            }
        });
    }

    // Show initial state
    showInitialState() {
        this.hideError();
        this.hideLoading();
        
        if (window.chartsManager) {
            window.chartsManager.toggleSections(false);
        }
        
        // Show welcome message
        this.showWelcomeMessage();
    }

    // Show welcome message
    showWelcomeMessage() {
        const container = document.querySelector('.max-w-7xl');
        const existingWelcome = document.getElementById('welcomeMessage');
        
        if (existingWelcome) {
            existingWelcome.remove();
        }

        const welcomeDiv = document.createElement('div');
        welcomeDiv.id = 'welcomeMessage';
        welcomeDiv.className = 'bg-white rounded-lg shadow-sm p-8 text-center';
        welcomeDiv.innerHTML = `
            <div class="text-6xl mb-4">📊</div>
            <h2 class="text-2xl font-semibold text-gray-800 mb-4">Welcome to Client Property Dashboard</h2>
            <p class="text-gray-600 mb-6">Select a year from the dropdown above to view client and property data visualization.</p>
            <div class="text-sm text-gray-500">
                <p>Available features:</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div class="p-3 bg-gray-50 rounded">
                        <div class="text-2xl mb-2">🗺️</div>
                        <div class="font-medium">Interactive Maps</div>
                        <div class="text-xs">Visualize client and property locations</div>
                    </div>
                    <div class="p-3 bg-gray-50 rounded">
                        <div class="text-2xl mb-2">📈</div>
                        <div class="font-medium">Analytics Charts</div>
                        <div class="text-xs">Regional and service type analysis</div>
                    </div>
                    <div class="p-3 bg-gray-50 rounded">
                        <div class="text-2xl mb-2">💡</div>
                        <div class="font-medium">Business Insights</div>
                        <div class="text-xs">Automated trend analysis</div>
                    </div>
                </div>
            </div>
        `;

        // Insert after header
        const header = container.querySelector('.bg-white.rounded-lg.shadow-sm');
        header.parentNode.insertBefore(welcomeDiv, header.nextSibling);
    }

    // Remove welcome message
    removeWelcomeMessage() {
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
    }

    // Load data for specific year or all years
    async loadYear(year) {
        if (this.isLoading) return;
        
        this.currentYear = year;
        this.showLoading();
        this.hideError();
        this.removeWelcomeMessage();

        try {
            // Load data
            const data = await window.dataLoader.loadYearData(year);
            
            // Store current data globally for maps
            window.currentData = data;
            this.currentData = data;
            
            // Generate analytics
            if (year === 'all') {
                this.currentAnalytics = window.dataLoader.generateAnalytics(data.combined);
            } else {
                this.currentAnalytics = window.dataLoader.generateAnalytics(data);
            }
            
            // Update UI
            this.updateDashboard(data, this.currentAnalytics);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading year data:', error);
            this.showError(`Failed to load data for ${year}: ${error.message}`);
            this.hideLoading();
        }
    }

    // Refresh current data
    async refreshData() {
        if (!this.currentYear || this.isLoading) return;

        // Clear cache for current year
        if (window.dataLoader.cache.has(this.currentYear)) {
            window.dataLoader.cache.delete(this.currentYear);
        }

        // Show refresh animation
        const refreshIcon = document.getElementById('refreshIcon');
        if (refreshIcon) {
            refreshIcon.style.animation = 'spin 1s linear infinite';
        }

        await this.loadYear(this.currentYear);

        // Stop refresh animation
        if (refreshIcon) {
            refreshIcon.style.animation = '';
        }
    }

    // Update dashboard with new data
    updateDashboard(data, analytics) {
        if (!window.chartsManager) return;
        
        // Show all sections
        window.chartsManager.toggleSections(true);
        
        // Update stats cards
        window.chartsManager.updateStatsCards(analytics);
        
        // Update charts
        window.chartsManager.createRegionalChart(analytics);
        window.chartsManager.createServiceChart(analytics);
        
        // Update insights
        window.chartsManager.updateInsights(analytics.insights);
        
        // Update data table (handles both single year and combined data)
        window.chartsManager.updateDataTable(data);
        
        // Update map (handles both single year and multi-year)
        if (window.mapsManager) {
            window.mapsManager.updateMap(data);
        }

        // Update page title
        const yearText = this.currentYear === 'all' ? 'All Years' : this.currentYear;
        document.title = `Client Property Dashboard - ${yearText}`;
    }

    // Show loading state
    showLoading() {
        this.isLoading = true;
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }

        // Disable controls
        const yearSelector = document.getElementById('yearSelector');
        const refreshBtn = document.getElementById('refreshBtn');
        if (yearSelector) yearSelector.disabled = true;
        if (refreshBtn) refreshBtn.disabled = true;
    }

    // Hide loading state
    hideLoading() {
        this.isLoading = false;
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.classList.add('hidden');
        }

        // Enable controls
        const yearSelector = document.getElementById('yearSelector');
        const refreshBtn = document.getElementById('refreshBtn');
        if (yearSelector) yearSelector.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }

    // Show error state
    showError(message) {
        const errorState = document.getElementById('errorState');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorState && errorMessage) {
            errorMessage.textContent = message;
            errorState.classList.remove('hidden');
        }

        // Hide other sections
        if (window.chartsManager) {
            window.chartsManager.toggleSections(false);
        }
    }

    // Hide error state
    hideError() {
        const errorState = document.getElementById('errorState');
        if (errorState) {
            errorState.classList.add('hidden');
        }
    }

    // Get dashboard status
    getStatus() {
        return {
            currentYear: this.currentYear,
            hasData: !!this.currentData,
            dataCount: this.currentData ? this.currentData.length : 0,
            isLoading: this.isLoading,
            cacheSize: window.dataLoader ? window.dataLoader.cache.size : 0
        };
    }

    // Clear all data and reset
    reset() {
        this.currentYear = null;
        this.currentData = null;
        this.currentAnalytics = null;
        window.currentData = null;
        
        // Reset UI
        const yearSelector = document.getElementById('yearSelector');
        if (yearSelector) {
            yearSelector.value = '';
        }
        
        // Clear charts
        if (window.chartsManager) {
            window.chartsManager.destroyAllCharts();
            window.chartsManager.toggleSections(false);
        }
        
        // Clear map
        if (window.mapsManager) {
            window.mapsManager.clearMap();
        }
        
        // Clear cache if requested
        if (window.dataLoader) {
            window.dataLoader.clearCache();
        }
        
        this.showInitialState();
    }
}

// Utility functions
const utils = {
    // Format numbers with commas
    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    },

    // Format percentage
    formatPercentage(num, decimals = 1) {
        return `${num.toFixed(decimals)}%`;
    },

    // Debounce function calls
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
        
        const bgColors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        toast.className += ` ${bgColors[type]} text-white`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
        });
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    },

    // Download text as file
    downloadTextFile(filename, text) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
};

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    utils.showToast('An unexpected error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    utils.showToast('Failed to load data. Please check your connection and try again.', 'error');
});

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Client Property Dashboard...');
    
    // Create global dashboard instance
    window.dashboard = new Dashboard();
    
    // Add utility functions to global scope
    window.utils = utils;
    
    // Development helpers (remove in production)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.dev = {
            loadSampleData: () => {
                // Load sample data for development
                const sampleData = [
                    {
                        name: "John Smith",
                        clientAddress: "123 Test St, Sydney NSW 2000",
                        propertyAddress: "456 Investment Ave, Brisbane QLD 4000",
                        serviceType: "Investment",
                        clientState: "NSW",
                        propertyState: "QLD",
                        clientCoords: { lat: -33.8688, lng: 151.2093 },
                        propertyCoords: { lat: -27.4698, lng: 153.0251 },
                        isInterstate: true,
                        dateSigned: "01-Jan",
                        datePurchase: "15-Feb",
                        email: "john@example.com"
                    }
                ];
                
                window.currentData = sampleData;
                const analytics = window.dataLoader.generateAnalytics(sampleData);
                window.dashboard.currentData = sampleData;
                window.dashboard.currentAnalytics = analytics;
                window.dashboard.currentYear = '2025';
                window.dashboard.updateDashboard(sampleData, analytics);
            },
            
            getStatus: () => window.dashboard.getStatus(),
            reset: () => window.dashboard.reset(),
            clearCache: () => window.dataLoader.clearCache()
        };
        
        console.log('Development mode active. Use window.dev for debugging.');
    }
    
    console.log('Dashboard initialized successfully!');
});