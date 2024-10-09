let map;
let cityMarker = null;
let markers = [];
let userMarker;
let allShops = []; // Store all the shops fetched from the API


const apiUrl = 'https://55f4-101-2-189-175.ngrok-free.app/api';

function initMap() {
    const defaultLocation = { lat: 7.8731, lng: 80.7718 }; // Coordinates of Sri Lanka
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: defaultLocation
    });
}
function clearMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null); // Remove the marker from the map
    }
    markers = []; // Clear the markers array
}


// Live location indicator 
async function getLocation() {
    navigator.geolocation.getCurrentPosition(
        async function (position) {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            map.setCenter(userLocation);
            clearMarkers();
            // Add a marker for the user's location
            if (userMarker) userMarker.setMap(null);
            userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                title: "You are here!",
                icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" // Green marker for user
            });
            markers.push(userMarker);
            
            // Fetch the closest cities and display shops from those cities
            await findAndMarkClosestCities(userLocation.lat, userLocation.lng);
        },
        function () {
            handleLocationError(true, map.getCenter());
        }
    );
}

// Function to calculate the distance between two coordinates.
function calculateDistance(lon1, lat1, lon2, lat2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Radius of the Earth in km

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}



async function findAndMarkClosestCities(lat, lng) {
    try {
        const response = await axios.get(`${apiUrl}/cities`);
        console.log("Cities API response:", response.data); // Log the entire response data
        const cities = response.data;

        // Ensure cities is an array
        if (!Array.isArray(cities)) {
            console.error("Received data is not an array:", cities);
            throw new Error("Cities data is not an array");
        }

        let closestCities = []; // Array to store the closest cities
        let closestDistances = []; // Array to store the distances

        cities.forEach(city => {
            const distance = calculateDistance(city.latitude, city.longitude, lat, lng);

            // Push the city and distance to their respective arrays
            closestCities.push(city);
            closestDistances.push(distance);
        });

        // Sort the cities based on distance
        const sortedCities = closestCities.map((city, index) => ({
            city,
            distance: closestDistances[index]
        })).sort((a, b) => a.distance - b.distance);

        // Fetch shops for the closest cities
        const closestCityNames = sortedCities.slice(0, 2).map(item => item.city.city); // Get the names of the two closest cities

        if (closestCityNames.length > 0) {
            await fetchShopsForCities(closestCityNames); // Send the array of city names to the function
        } else {
            document.getElementById('shops').innerHTML = "<p>No nearby cities found.</p>";
        }
    } catch (error) {
        console.error("Error fetching cities:", error);
    }
}

// Update fetchShopsForCities to accept an array of cities
async function fetchShopsForCities(cities) {
    let output = '';

    navigator.geolocation.getCurrentPosition(async function (position) {
        const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        allShops = []; // Reset the global shop array

        // Loop through each city and fetch shops
        for (const city of cities) {
            try {
                const response = await axios.get(`https://8ff0-101-2-187-249.ngrok-free.app/api/shops/${city}`);
                const shops = response.data;

                if (shops.length === 0) {
                    output += `<p>No shops found for ${city}.</p>`;
                } else {
                    output += `<h2>Shops in ${city}:</h2>`;
                    shops.forEach(shop => {
                        allShops.push(shop);
                        const distance = calculateDistance(userLocation.lng, userLocation.lat, shop.longitude, shop.latitide);
                        const googleMapsLink = `https://maps.google.com/?q=${shop.latitide},${shop.longitude}`;

                        output += createShopCard(shop, googleMapsLink);

                        // Place a marker for each shop on the map based on type
                        const shopLatLng = { lat: shop.latitide, lng: shop.longitude };
                        let markerIcon = "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"; // Default marker

                        if (shop.type1 === "tyre") {
                            markerIcon = "http://maps.google.com/mapfiles/ms/icons/green-dot.png"; // Green for tyre shops
                        } else if (shop.type1 === "garage") {
                            markerIcon = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"; // Blue for garages
                        }

                        new google.maps.Marker({
                            position: shopLatLng,
                            map: map,
                            title: shop.name,
                            icon: markerIcon
                        });
                    });
                }
            } catch (error) {
                console.error(`Error fetching shops for city: ${city}`, error);
                output += `<p>Error fetching shops for ${city}.</p>`;
            }
        }

        document.getElementById('shops').innerHTML += output; // Append the output
    });
}



//search function.
async function getAllShops() {
    try {
        const response = await fetch(" https://8ff0-101-2-187-249.ngrok-free.app/api/shops");
        const shops = await response.json();
        return shops;
    } catch (error) {
        console.error("Error fetching shops:", error);
        return [];
    }
    
}

// Async function to fetch shops for a specific city
async function fetchShops() {
    const city = document.getElementById('city').value;
    clearMarkers();


    try {
        const response = await axios.get(` https://8ff0-101-2-187-249.ngrok-free.app/api/shops/${city}`);
        const shops = response.data;

        if (shops.length === 0) {
            document.getElementById('shops').innerHTML = "<p>No shops found for this city.</p>";
            return;
        }

        allShops = shops; // Store the fetched shops for filtering

        let output = '';
        shops.forEach(shop => {
            const shopLatLng = { lat: shop.latitide, lng: shop.longitude }; // Corrected spelling
            const googleMapsLink = `https://maps.google.com/?q=${shop.latitide},${shop.longitude}`;
            output += `
                <div class="shop-card">
                    <h3>${shop.name}</h3>
                    <p>${shop.city}</p>
                    <p>WhatsApp: <a href="${shop.whatsapp}">Connect</a></p>
                    <p>Local:<a href="tel:${shop.local}">Call Now</a></p>
                    <p>Navigate Me:<a href="${googleMapsLink}" target="_blank">Navigate Me</a></p> 
                </div>
            `;

            // Place markers based on shop type
            if (shop.type1 === "tyre") {
                // Green marker for tyre shops
                new google.maps.Marker({
                    position: shopLatLng,
                    map: map,
                    title: shop.name,
                    icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                });
            } else if (shop.type1 === "garage") {
                // Blue marker for garage shops
                new google.maps.Marker({
                    position: shopLatLng,
                    map: map,
                    title: shop.name,
                    icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                });
            } else {
                // Default marker for other shops
                new google.maps.Marker({
                    position: shopLatLng,
                    map: map,
                    title: shop.name,
                    icon: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                });
            }
        });

        document.getElementById('shops').innerHTML = output;
    } catch (error) {
        console.error('Error fetching shops:', error);
        document.getElementById('shops').innerHTML = "<p></p>";
    }
}

// Function to filter shops
function filterShops(type) {
    let filteredShops = [];

    // Filter the shops based on the selected type
    if (type === "all") {
        filteredShops = allShops; // Show all shops
    } else {
        filteredShops = allShops.filter(shop => shop.type1 === type); // Filter shops by type (garage/tyre)
    }


    // Get the user's current position for distance calculation and display filtered shops
    navigator.geolocation.getCurrentPosition(async function (position) {
        const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        // Update the UI with filtered shops
        let output = '';
        filteredShops.forEach(shop => {
            const googleMapsLink = `https://maps.google.com/?q=${shop.latitide},${shop.longitude}`;
            const distance = calculateDistance(userLocation.lng, userLocation.lat, shop.longitude, shop.latitide); // Calculate distance for each shop

            output += createShopCard(shop, googleMapsLink);

            // Add markers based on shop type
            const shopLatLng = { lat: shop.latitide, lng: shop.longitude };
            let markerIcon = "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"; // Default marker

            if (shop.type1 === "tyre") {
                markerIcon = "http://maps.google.com/mapfiles/ms/icons/green-dot.png"; // Green for tyre shops
            } else if (shop.type1 === "garage") {
                markerIcon = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"; // Blue for garages
            }

            const marker = new google.maps.Marker({
                position: shopLatLng,
                map: map,
                title: shop.name,
                icon: markerIcon
            });
            markers.push(marker);
        });

        document.getElementById('shops').innerHTML = output;
    });
}

// Function to create a shop card for displaying in the UI
function createShopCard(shop,  googleMapsLink) {
    return `
        <div class="shop-card">
            <h3>${shop.name}</h3>
            <p>${shop.city}</p>
            <p>WhatsApp: <a href="${shop.whatsapp}">Connect</a></p>
            <p>Local: <a href="tel:${shop.local}">Call Now</a></p>
            <p>Navigate Me: <a href="${googleMapsLink}" target="_blank">Navigate Me</a></p>
        </div>
    `;
}

// Adding event listeners to filter buttons
document.getElementById("all").addEventListener('click', function () {
    filterShops("all");
});

document.getElementById("garage").addEventListener('click', function () {
    filterShops("garage");
});

document.getElementById("Tyre_houses").addEventListener('click', function () {
    filterShops("tyre");
});

// Initialize the map when the window loads
window.onload = initMap;


