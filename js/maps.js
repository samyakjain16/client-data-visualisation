// Maps Module
class MapsManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.polylines = [];
        this.infoWindows = [];
    }

    // Initialize Google Map
    initializeMap() {
        if (!window.google || !window.google.maps) {
            console.warn('Google Maps API not loaded');
            return false;
        }

        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.warn('Map container not found');
            return false;
        }

        // Map options
        const mapOptions = {
            center: { lat: -25.2744, lng: 133.7751 }, // Center of Australia
            zoom: 5,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
                {
                    featureType: 'water',
                    elementType: 'geometry',
                    stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
                },
                {
                    featureType: 'landscape',
                    elementType: 'geometry',
                    stylers: [{ color: '#f5f5f5' }, { lightness: 20 }]
                }
            ],
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            },
            streetViewControl: false,
            fullscreenControl: true,
            fullscreenControlOptions: {
                position: google.maps.ControlPosition.TOP_LEFT
            }
        };

        this.map = new google.maps.Map(mapContainer, mapOptions);
        return true;
    }

    // Clear all map elements
    clearMap() {
        // Clear markers
        this.markers.forEach(marker => {
            marker.setMap(null);
        });
        this.markers = [];

        // Clear polylines
        this.polylines.forEach(polyline => {
            polyline.setMap(null);
        });
        this.polylines = [];

        // Clear info windows
        this.infoWindows.forEach(infoWindow => {
            infoWindow.close();
        });
        this.infoWindows = [];
    }

    // Update map with new data
    updateMap(data) {
        if (!this.map) {
            if (!this.initializeMap()) {
                return;
            }
        }

        this.clearMap();

        if (!data || data.length === 0) {
            return;
        }

        // Add markers and polylines for each client
        data.forEach((client, index) => {
            this.addClientToMap(client, index);
        });

        // Adjust map bounds to fit all markers
        this.fitMapToMarkers();
    }

    // Add a single client's data to the map
    addClientToMap(client, index) {
        // Skip clients that shouldn't be displayed on map
        if (client.mapDisplayType === 'skip') {
            return;
        }

        // Add client marker
        if (client.clientCoords && client.hasClientLocation) {
            let iconUrl, markerColor;
            
            // Determine marker color based on data completeness
            if (client.mapDisplayType === 'client-only') {
                // Red marker for clients without property location
                iconUrl = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
                markerColor = '#ef4444';
            } else {
                // Blue marker for complete data
                iconUrl = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
                markerColor = '#3b82f6';
            }
            
            const clientMarker = this.createMarker(
                client.clientCoords,
                client.name,
                'Client',
                markerColor,
                this.createClientInfoContent(client),
                iconUrl
            );
            this.markers.push(clientMarker);
        }

        // Add property marker and connection line (only if both locations exist)
        if (client.mapDisplayType === 'both' && client.propertyCoords && client.hasPropertyLocation) {
            const propertyMarker = this.createMarker(
                client.propertyCoords,
                client.name,
                'Property',
                '#f59e0b',
                this.createPropertyInfoContent(client),
                'http://maps.google.com/mapfiles/ms/icons/orange-dot.png'
            );
            this.markers.push(propertyMarker);

            // Add connection line
            if (client.clientCoords) {
                this.addConnectionLine(client.clientCoords, client.propertyCoords, client);
            }
        }
    }

    // Create a marker
    createMarker(position, title, type, color, infoContent, iconUrl) {
        const marker = new google.maps.Marker({
            position: position,
            map: this.map,
            title: `${title} - ${type}`,
            icon: {
                url: iconUrl,
                scaledSize: new google.maps.Size(32, 32)
            },
            animation: google.maps.Animation.DROP
        });

        // Create info window
        const infoWindow = new google.maps.InfoWindow({
            content: infoContent,
            maxWidth: 300
        });

        this.infoWindows.push(infoWindow);

        // Add click listener
        marker.addListener('click', () => {
            // Close all other info windows
            this.infoWindows.forEach(window => window.close());
            infoWindow.open(this.map, marker);
        });

        return marker;
    }

    // Create client info window content
    createClientInfoContent(client) {
        return `
            <div class="p-2">
                <h3 class="font-semibold text-lg text-gray-800 mb-2">
                    👤 ${client.name}
                </h3>
                <div class="space-y-1 text-sm">
                    ${client.hasClientLocation ? `
                        <div class="flex items-center">
                            <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            <strong>Address:</strong> ${client.clientAddress}
                        </div>
                        <div class="flex items-center">
                            <span class="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                            <strong>State:</strong> ${client.clientState}
                        </div>
                    ` : `
                        <div class="flex items-center">
                            <span class="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            <strong>Address:</strong> <em>Not provided</em>
                        </div>
                    `}
                    <div class="flex items-center">
                        <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <strong>Service:</strong> ${client.serviceType}
                    </div>
                    ${!client.hasPropertyLocation ? `
                        <div class="flex items-center">
                            <span class="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                            <strong>Property:</strong> <em>Location not specified</em>
                        </div>
                    ` : ''}
                    ${client.email ? `
                        <div class="flex items-center">
                            <span class="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                            <strong>Email:</strong> ${client.email}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Create property info window content
    createPropertyInfoContent(client) {
        return `
            <div class="p-2">
                <h3 class="font-semibold text-lg text-gray-800 mb-2">
                    🏠 ${client.name}'s Property
                </h3>
                <div class="space-y-1 text-sm">
                    <div class="flex items-center">
                        <span class="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                        <strong>Property:</strong> ${client.propertyAddress}
                    </div>
                    <div class="flex items-center">
                        <span class="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        <strong>State:</strong> ${client.propertyState}
                    </div>
                    <div class="flex items-center">
                        <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <strong>Service:</strong> ${client.serviceType}
                    </div>
                    ${client.isInterstate ? `
                        <div class="flex items-center">
                            <span class="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            <strong>Interstate Investment</strong>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Add connection line between client and property
    addConnectionLine(clientCoords, propertyCoords, client) {
        const lineColor = client.isInterstate ? '#ef4444' : '#10b981'; // Red for interstate, green for same state
        const lineOpacity = client.isInterstate ? 0.8 : 0.6;

        const polyline = new google.maps.Polyline({
            path: [clientCoords, propertyCoords],
            geodesic: true,
            strokeColor: lineColor,
            strokeOpacity: lineOpacity,
            strokeWeight: client.isInterstate ? 3 : 2,
            icons: [{
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 3,
                    fillColor: lineColor,
                    fillOpacity: 1,
                    strokeWeight: 1
                },
                offset: '100%'
            }]
        });

        polyline.setMap(this.map);
        this.polylines.push(polyline);

        // Add click listener for polyline
        polyline.addListener('click', (event) => {
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="p-2 text-sm">
                        <strong>${client.name}</strong><br>
                        ${client.isInterstate ? 
                            `<span class="text-red-600">Interstate Investment</span><br>` : 
                            `<span class="text-green-600">Same State Investment</span><br>`
                        }
                        ${client.clientState} → ${client.propertyState}
                    </div>
                `,
                position: event.latLng
            });
            
            // Close all other info windows
            this.infoWindows.forEach(window => window.close());
            infoWindow.open(this.map);
            this.infoWindows.push(infoWindow);
        });
    }

    // Fit map to show all markers
    fitMapToMarkers() {
        if (this.markers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        this.markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });

        this.map.fitBounds(bounds);

        // Ensure minimum zoom level
        google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
            if (this.map.getZoom() > 10) {
                this.map.setZoom(10);
            }
        });
    }

    // Add legend to map
    addLegend() {
        const legend = document.createElement('div');
        legend.innerHTML = `
            <div style="background: white; padding: 10px; margin: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-family: Arial, sans-serif;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Legend</h4>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" style="width: 20px; height: 20px; margin-right: 8px;">
                    <span style="font-size: 12px;">Client (Complete Data)</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <img src="http://maps.google.com/mapfiles/ms/icons/red-dot.png" style="width: 20px; height: 20px; margin-right: 8px;">
                    <span style="font-size: 12px;">Client (No Property Location)</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <img src="http://maps.google.com/mapfiles/ms/icons/orange-dot.png" style="width: 20px; height: 20px; margin-right: 8px;">
                    <span style="font-size: 12px;">Property Location</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <div style="width: 20px; height: 2px; background: #10b981; margin-right: 8px;"></div>
                    <span style="font-size: 12px;">Same State</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="width: 20px; height: 2px; background: #ef4444; margin-right: 8px;"></div>
                    <span style="font-size: 12px;">Interstate</span>
                </div>
            </div>
        `;

        this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(legend);
    }
}

// Global map initialization callback
function initMap() {
    window.mapsManager = new MapsManager();
    window.mapsManager.initializeMap();
    window.mapsManager.addLegend();
    
    // Trigger map update if data is already loaded
    if (window.currentData) {
        window.mapsManager.updateMap(window.currentData);
    }
}

// Create global instance (will be replaced when Google Maps loads)
window.mapsManager = new MapsManager();