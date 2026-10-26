const fs = require('node:fs');
const cities = require('../src/lib/data/destinations.json');
const coordinates = cities.map(({ id, name, country, flag, iata, lat, lon, timeZone, countryCode }) => ({ id, name, country, flag, iata, lat, lon, timeZone, countryCode }));
fs.writeFileSync('data/cities_coords.json', JSON.stringify(coordinates, null, 2) + '\n');
console.log('Total matched:', coordinates.length);
