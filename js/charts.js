// Charts Module
class ChartsManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#3b82f6',
            secondary: '#f59e0b',
            success: '#10b981',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            light: '#f8fafc',
            dark: '#1f2937'
        };
    }

    // Create regional distribution chart
    createRegionalChart(analytics) {
        const ctx = document.getElementById('regionChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.regional) {
            this.charts.regional.destroy();
        }

        // Prepare data
        const regions = Object.keys(analytics.regionStats);
        const clientData = regions.map(region => analytics.regionStats[region].clients || 0);
        const propertyData = regions.map(region => analytics.regionStats[region].properties || 0);

        const data = {
            labels: regions,
            datasets: [
                {
                    label: 'Clients',
                    data: clientData,
                    backgroundColor: this.colors.primary,
                    borderColor: this.colors.primary,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Properties',
                    data: propertyData,
                    backgroundColor: this.colors.secondary,
                    borderColor: this.colors.secondary,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    position: 'top',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Region',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Count',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        };

        this.charts.regional = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: options
        });
    }

    // Create service types chart
    createServiceChart(analytics) {
        const ctx = document.getElementById('serviceChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.service) {
            this.charts.service.destroy();
        }

        // Prepare data
        const serviceTypes = Object.keys(analytics.serviceTypes);
        const serviceCounts = Object.values(analytics.serviceTypes);
        
        // Generate colors for each service type
        const backgroundColors = serviceTypes.map((_, index) => {
            const colors = [this.colors.primary, this.colors.secondary, this.colors.success, this.colors.danger, this.colors.warning];
            return colors[index % colors.length];
        });

        const data = {
            labels: serviceTypes,
            datasets: [{
                data: serviceCounts,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color),
                borderWidth: 2,
                hoverBackgroundColor: backgroundColors.map(color => color + '80'),
                hoverBorderWidth: 3
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return ` ${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        };

        this.charts.service = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
    }

    // Update stats cards
    updateStatsCards(analytics) {
        document.getElementById('totalClients').textContent = analytics.totalClients;
        document.getElementById('totalProperties').textContent = analytics.totalProperties;
        document.getElementById('interstateSales').textContent = analytics.interstateSales;
        document.getElementById('topRegion').textContent = analytics.topRegion;
    }

    // Update insights section
    updateInsights(insights) {
        const container = document.getElementById('insightsList');
        if (!container) return;

        container.innerHTML = '';

        if (insights.length === 0) {
            container.innerHTML = '<p class="text-gray-500 italic">No specific insights available for this dataset.</p>';
            return;
        }

        insights.forEach(insight => {
            const insightDiv = document.createElement('div');
            insightDiv.className = `insight-card insight-${insight.type}`;
            insightDiv.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        ${this.getInsightIcon(insight.type)}
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-1">${insight.title}</h4>
                        <p class="text-gray-600 text-sm">${insight.message}</p>
                    </div>
                </div>
            `;
            container.appendChild(insightDiv);
        });
    }

    // Get icon for insight type
    getInsightIcon(type) {
        const icons = {
            positive: '✅',
            warning: '⚠️',
            info: 'ℹ️',
            danger: '❌'
        };
        return `<span class="text-lg">${icons[type] || 'ℹ️'}</span>`;
    }

    // Update data table
    updateDataTable(data) {
        const tbody = document.getElementById('dataTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Handle both single year data and combined data
        const tableData = data.combined ? data.combined : data;

        if (!tableData || tableData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                        No data available for the selected year(s).
                    </td>
                </tr>
            `;
            return;
        }

        tableData.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 transition-colors';
            tr.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${row.name}</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${row.hasClientLocation ? `
                        <div class="flex items-center">
                            <span class="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            ${row.clientAddress}
                            <span class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${row.clientState}</span>
                        </div>
                    ` : `
                        <div class="flex items-center">
                            <span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                            <em class="text-gray-500">Address not provided</em>
                            <span class="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Unknown</span>
                        </div>
                    `}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${row.hasPropertyLocation ? `
                        <div class="flex items-center">
                            <span class="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                            ${row.propertyAddress}
                            <span class="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">${row.propertyState}</span>
                        </div>
                    ` : `
                        <div class="flex items-center">
                            <span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                            <em class="text-gray-500">Property location not specified</em>
                        </div>
                    `}
                </td>
                <td class="px-4 py-3 text-sm">
                    <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">${row.serviceType}</span>
                </td>
                <td class="px-4 py-3 text-sm text-center">
                    ${row.isInterstate ? 
                        '<span class="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">✓ Yes</span>' : 
                        row.hasClientLocation && row.hasPropertyLocation ?
                        '<span class="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">- No</span>' :
                        '<span class="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">? Unknown</span>'
                    }
                </td>
                <td class="px-4 py-3 text-sm text-center">
                    ${row.year ? `
                        <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">${row.year}</span>
                    ` : `
                        <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">N/A</span>
                    `}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Filter table data based on search
    filterTable(searchTerm) {
        const rows = document.querySelectorAll('#dataTableBody tr');
        const lowerSearchTerm = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(lowerSearchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Export data as CSV
    exportData(data, year) {
        const headers = ['Name', 'Client Address', 'Client State', 'Property Address', 'Property State', 'Service Type', 'Interstate', 'Date Signed', 'Date of Purchase', 'Email', 'Year'];
        
        // Handle both single year data and combined data
        const exportData = data.combined ? data.combined : data;
        
        const csvData = [
            headers,
            ...exportData.map(row => [
                row.name,
                row.clientAddress || '',
                row.clientState || '',
                row.propertyAddress || '',
                row.propertyState || '',
                row.serviceType,
                row.isInterstate ? 'Yes' : 'No',
                row.dateSigned,
                row.datePurchase,
                row.email,
                row.year || year
            ])
        ];

        const csvContent = csvData.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const filename = year === 'all' ? 'client-data-all-years.csv' : `client-data-${year}.csv`;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Destroy all charts
    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    // Show/hide sections based on data availability
    toggleSections(hasData) {
        const sections = ['statsCards', 'chartsSection', 'insightsSection', 'mapSection', 'tableSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                if (hasData) {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            }
        });
    }
}

// Create global instance
window.chartsManager = new ChartsManager();