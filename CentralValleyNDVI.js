/**
 * Created by BonnieRose on 11/23/15.
 */

///////////////
// Prepare data
///////////////

// Parameters
var ndviParams = {palette: 'FF0000, 000000, 00FF00', min: -0.5, max: 0.5};
var vizParams2010 = {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3};
var vizParams2015 = {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3};
var bands2010 = ['B1', 'B2', 'B3', 'B4'];
var bands2015 = ['B2', 'B3', 'B4', 'B5'];

// Define Central Valley region
var centralValley = ee.FeatureCollection('ft:1h46ENpEp8vO3pOe1EqeF1sZLEDhSVMxbu8pHAoU4', 'geometry');

// Get median-pixel composite for the summers of 2010 and 2015 from Landsat 5 & 8.
var summer2010 = ee.ImageCollection('LEDAPS/LT5_L1T_SR')
	.filterDate('2010-06-01', '2010-08-30')
	.select(bands2010);
var summer2015 = ee.ImageCollection('LANDSAT/LC8_L1T_TOA')
	.filterDate('2015-06-01', '2015-08-30')
	.select(bands2015);

var median2010 = summer2010.median();
var median2015 = summer2015.median();

// Clip Landsat composite by California state boundary.
var clipped2010 = median2010.clip(centralValley);
var clipped2015 = median2015.clip(centralValley);

/////////////////
// Calculate NDVI
/////////////////

// This function gets NDVI from Landsat 5 imagery.
var getNDVIL5 = function(image) {
	return image.normalizedDifference(['B4', 'B3']);
};
// This function gets NDVI from Landsat 8 imagery.
var getNDVIL8 = function(image) {
	return image.normalizedDifference(['B5', 'B4']);
};

// Find NDVI
var ndvi2010 = getNDVIL5(clipped2010);
var ndvi2015 = getNDVIL8(clipped2015);
Map.addLayer(ndvi2010);
Map.addLayer(ndvi2015);

// Find the difference in NDVI. Result is positive if NDVI increased, negative if it decreased.
var ndviDifference = ndvi2015.subtract(ndvi2010);

// Map NDVI difference
Map.addLayer(ndviDifference, ndviParams);

// Calculate fallowed area by pixel (0 if pixel was not fallowed)
var fallowed = ndviDifference.lt(-0.1);
var areaImageSqM = ee.Image.pixelArea()
	.clip(centralValley);
var areaImageSqKm = areaImageSqM.multiply(0.000001);
var fallowedArea = fallowed.multiply(areaImageSqKm);

// Calculate total fallowed area in square kilometers. 30 meters is Landsat 5 & 8's spatial resolution,
// but reduceRegion apparently can't handle that much for this area. Smallest it could handle:
var totalFallowedArea = fallowedArea.reduceRegion(ee.Reducer.sum(), centralValley, 90);
print(totalFallowedArea);

// Map
Map.addLayer(fallowedArea, {'min': 0, 'max': 0.013});


