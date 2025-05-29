// Data Loader Module
class DataLoader {
    constructor() {
        this.cache = new Map();
        this.geocodeCache = this.loadGeocodeCache();
        this.fallbackCoords = {
            'NSW': { lat: -33.8688, lng: 151.2093 },
            'QLD': { lat: -27.4698, lng: 153.0251 },
            'VIC': { lat: -37.8136, lng: 144.9631 },
            'SA': { lat: -34.9285, lng: 138.6007 },
            'WA': { lat: -31.9505, lng: 115.8605 },
            'TAS': { lat: -42.8821, lng: 147.3272 },
            'NT': { lat: -12.4634, lng: 130.8456 },
            'ACT': { lat: -35.2809, lng: 149.1300 },
            'Singapore': { lat: 1.3521, lng: 103.8198 },
            'Dubai': { lat: 25.2048, lng: 55.2708 },
            'Unknown': { lat: -25.2744, lng: 133.7751 }
        };
    }

    // Load geocode cache from localStorage
    loadGeocodeCache() {
        try {
            const cached = localStorage.getItem('geocodeCache');
            return cached ? new Map(JSON.parse(cached)) : new Map();
        } catch (error) {
            console.warn('Failed to load geocode cache:', error);
            return new Map();
        }
    }

    // Save geocode cache to localStorage
    saveGeocodeCache() {
        try {
            localStorage.setItem('geocodeCache', JSON.stringify([...this.geocodeCache]));
        } catch (error) {
            console.warn('Failed to save geocode cache:', error);
        }
    }

    // Load data for specific year or all years
    async loadYearData(year) {
        if (year === 'all') {
            return await this.loadAllYearsData();
        }
        
        if (this.cache.has(year)) {
            return this.cache.get(year);
        }

        try {
            const response = await fetch(`data/${year}.csv`);
            if (!response.ok) {
                throw new Error(`Failed to load ${year}.csv: ${response.statusText}`);
            }

            const csvText = await response.text();
            const parsed = await this.parseCSV(csvText);
            const processed = await this.processData(parsed, year);
            
            this.cache.set(year, processed);
            return processed;
        } catch (error) {
            console.error(`Error loading data for ${year}:`, error);
            throw error;
        }
    }

    // Load and combine all years data
    async loadAllYearsData() {
        const years = ['2022', '2023', '2024', '2025'];
        const allData = {
            combined: [],
            byYear: {}
        };

        const loadPromises = years.map(async (year) => {
            try {
                const yearData = await this.loadYearData(year);
                allData.byYear[year] = yearData;
                // Add year property to each record for combined data
                const dataWithYear = yearData.map(record => ({...record, year: year}));
                allData.combined.push(...dataWithYear);
                return { year, data: yearData, success: true };
            } catch (error) {
                console.warn(`Failed to load ${year}:`, error.message);
                allData.byYear[year] = [];
                return { year, data: [], success: false, error: error.message };
            }
        });

        const results = await Promise.all(loadPromises);
        
        // Log loading results
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success);
        
        console.log(`Loaded ${successful}/${years.length} years successfully`);
        if (failed.length > 0) {
            console.warn('Failed to load:', failed.map(f => `${f.year}: ${f.error}`));
        }

        return allData;
    }

    // Parse CSV using PapaParse
    parseCSV(csvText) {
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim().replace(/^"|"$/g, ''),
                transform: value => value ? value.trim().replace(/^"|"$/g, '') : '',
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.warn('CSV parsing warnings:', results.errors);
                    }
                    resolve(results.data);
                },
                error: reject
            });
        });
    }

    // Process and clean the raw CSV data
    async processData(rawData, year = null) {
        const cleanedData = rawData
            .filter(row => row.Name && row.Name.trim())
            .map(row => {
                const hasClientAddress = row.Address && row.Address.trim() && row.Address !== 'No address in contract';
                const hasPropertyAddress = row['Property Purchased'] && row['Property Purchased'].trim();
                
                return {
                    name: row.Name?.trim() || 'Unknown',
                    clientAddress: hasClientAddress ? this.cleanAddress(row.Address) : '',
                    propertyAddress: hasPropertyAddress ? this.cleanAddress(row['Property Purchased']) : '',
                    serviceType: row['Type of Service']?.trim() || 'Unknown',
                    dateSigned: row['Date Signed']?.trim() || '',
                    datePurchase: row['Date of Purchase']?.trim() || '',
                    email: row.Email?.trim() || '',
                    notes: row.Notes?.trim() || '',
                    clientState: hasClientAddress ? this.extractState(row.Address) : 'Unknown',
                    propertyState: hasPropertyAddress ? this.extractState(row['Property Purchased']) : 'Unknown',
                    hasClientLocation: hasClientAddress,
                    hasPropertyLocation: hasPropertyAddress,
                    // Determine map display status
                    mapDisplayType: this.determineMapDisplayType(hasClientAddress, hasPropertyAddress),
                    year: year // Add year information
                };
            });

        // Add geocoding
        const geocodedData = await this.addGeocoding(cleanedData);
        
        return geocodedData;
    }

    // Determine how this client should be displayed on the map
    determineMapDisplayType(hasClientAddress, hasPropertyAddress) {
        if (hasClientAddress && hasPropertyAddress) {
            return 'both'; // Show both pins and connection line
        } else if (hasClientAddress && !hasPropertyAddress) {
            return 'client-only'; // Show only client pin (red color)
        } else if (!hasClientAddress && hasPropertyAddress) {
            return 'skip'; // Skip from map entirely
        } else {
            return 'skip'; // No location data at all
        }
    }

    // Clean and format addresses
    cleanAddress(address) {
        if (!address) return '';
        return address.trim()
            .replace(/\n/g, ', ')
            .replace(/,\s*,/g, ',')
            .replace(/,\s*$/, '');
    }

    // Extract state/country from address
    extractState(address) {
        if (!address) return 'Unknown';
        
        const stateMap = {
            'NSW': 'NSW',
            'QLD': 'QLD', 
            'VIC': 'VIC',
            'SA': 'SA',
            'WA': 'WA',
            'TAS': 'TAS',
            'NT': 'NT',
            'ACT': 'ACT'
        };

        // Check for Australian states
        for (const [key, value] of Object.entries(stateMap)) {
            if (address.toUpperCase().includes(key)) {
                return value;
            }
        }

        // Check for international locations
        if (address.toLowerCase().includes('singapore')) return 'Singapore';
        if (address.toLowerCase().includes('dubai')) return 'Dubai';
        
        return 'Unknown';
    }

    // Add geocoding to data
    async addGeocoding(data) {
        const geocodedData = [];
        
        for (const row of data) {
            let clientCoords = null;
            let propertyCoords = null;
            
            // Only geocode if we have the address
            if (row.hasClientLocation && row.clientAddress) {
                clientCoords = await this.geocodeAddress(row.clientAddress) || 
                              this.fallbackCoords[row.clientState] || 
                              this.fallbackCoords['Unknown'];
            }
            
            if (row.hasPropertyLocation && row.propertyAddress) {
                propertyCoords = await this.geocodeAddress(row.propertyAddress) || 
                               this.fallbackCoords[row.propertyState] || 
                               this.fallbackCoords['Unknown'];
            }

            geocodedData.push({
                ...row,
                clientCoords,
                propertyCoords,
                isInterstate: row.clientState !== 'Unknown' && row.propertyState !== 'Unknown' && 
                             row.clientState !== row.propertyState
            });
        }

        return geocodedData;
    }

    // Geocode address with caching
    async geocodeAddress(address) {
        if (!address || !window.google) return null;

        // Check cache first
        const cacheKey = address.toLowerCase();
        if (this.geocodeCache.has(cacheKey)) {
            return this.geocodeCache.get(cacheKey);
        }

        try {
            const geocoder = new google.maps.Geocoder();
            const result = await new Promise((resolve, reject) => {
                geocoder.geocode({ address }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const location = results[0].geometry.location;
                        resolve({ lat: location.lat(), lng: location.lng() });
                    } else {
                        resolve(null);
                    }
                });
            });

            // Cache the result
            this.geocodeCache.set(cacheKey, result);
            this.saveGeocodeCache();
            
            return result;
        } catch (error) {
            console.warn('Geocoding failed for:', address, error);
            return null;
        }
    }

    // Generate analytics from processed data
    generateAnalytics(data) {
        const analytics = {
            totalClients: data.length,
            totalProperties: data.filter(d => d.propertyAddress).length,
            interstateSales: data.filter(d => d.isInterstate).length,
            serviceTypes: {},
            regionStats: {},
            insights: []
        };

        // Service type distribution
        data.forEach(row => {
            analytics.serviceTypes[row.serviceType] = (analytics.serviceTypes[row.serviceType] || 0) + 1;
        });

        // Regional statistics
        data.forEach(row => {
            // Client regions
            if (!analytics.regionStats[row.clientState]) {
                analytics.regionStats[row.clientState] = { clients: 0, properties: 0 };
            }
            analytics.regionStats[row.clientState].clients++;

            // Property regions
            if (row.propertyState && row.propertyState !== 'Unknown') {
                if (!analytics.regionStats[row.propertyState]) {
                    analytics.regionStats[row.propertyState] = { clients: 0, properties: 0 };
                }
                analytics.regionStats[row.propertyState].properties++;
            }
        });

        // Find top region
        const topRegion = Object.entries(analytics.regionStats)
            .sort(([,a], [,b]) => (b.clients + b.properties) - (a.clients + a.properties))[0];
        analytics.topRegion = topRegion ? topRegion[0] : 'N/A';

        // Generate insights
        analytics.insights = this.generateInsights(data, analytics);

        return analytics;
    }

    // Generate business insights
    generateInsights(data, analytics) {
        const insights = [];

        // Interstate investment trend
        const interstateRate = (analytics.interstateSales / analytics.totalProperties * 100).toFixed(1);
        if (interstateRate > 30) {
            insights.push({
                type: 'info',
                title: 'Strong Interstate Investment',
                message: `${interstateRate}% of clients are investing outside their home state, indicating strong cross-state investment appetite.`
            });
        }

        // Regional concentration
        const nswClients = analytics.regionStats['NSW']?.clients || 0;
        const qldProperties = analytics.regionStats['QLD']?.properties || 0;
        
        if (nswClients > 0 && qldProperties > 0) {
            insights.push({
                type: 'positive',
                title: 'NSW to QLD Investment Flow',
                message: `Strong trend of NSW clients (${nswClients}) investing in QLD properties (${qldProperties}), likely driven by affordability and growth potential.`
            });
        }

        // Service type concentration
        const investmentCount = analytics.serviceTypes['Investment'] || 0;
        const investmentRate = (investmentCount / analytics.totalClients * 100).toFixed(1);
        
        if (investmentRate > 70) {
            insights.push({
                type: 'positive',
                title: 'Investment-Focused Client Base',
                message: `${investmentRate}% of clients are investors, showing strong investment property demand.`
            });
        }

        // International clients
        const internationalClients = data.filter(d => 
            d.clientState === 'Singapore' || d.clientState === 'Dubai'
        ).length;
        
        if (internationalClients > 0) {
            insights.push({
                type: 'info',
                title: 'International Client Interest',
                message: `${internationalClients} international clients demonstrate global appeal of Australian property market.`
            });
        }

        return insights;
    }

    // Clear all caches
    clearCache() {
        this.cache.clear();
        this.geocodeCache.clear();
        localStorage.removeItem('geocodeCache');
    }
}

// Create global instance
window.dataLoader = new DataLoader();