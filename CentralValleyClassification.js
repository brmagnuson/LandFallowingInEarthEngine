/**
 * Created by BonnieRose on 11/23/15.
 */

///////////////
// Prepare data
///////////////

// Use these bands for prediction.
var bands2010 = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'];
var bands2015 = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B10', 'B11'];

// Create median-pixel composites for the summers of 2010 and 2015 from Landsat 5 & 8.
var vizParams2010 = {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3};
var vizParams2015 = {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3};
var summer2010 = ee.ImageCollection('LANDSAT/LT5_L1T_TOA')
	.filterDate('2010-06-01', '2010-08-30')
	.select(bands2010);
var summer2015 = ee.ImageCollection('LANDSAT/LC8_L1T_TOA')
	.filterDate('2015-06-01', '2015-08-30')
	.select(bands2015);

var median2010 = summer2010.median();
var median2015 = summer2015.median();

// Get boundary of Central Valley
var centralValley = ee.FeatureCollection('ft:1h46ENpEp8vO3pOe1EqeF1sZLEDhSVMxbu8pHAoU4', 'geometry');

// Clip Landsat composite by California state boundary.
var clipped2010 = median2010.clip(centralValley);
var clipped2015 = median2015.clip(centralValley);

// Import training data.
// 0: BuiltUp, 1: Water, 2: BareSoil, 3: Vegetation
var polygons2010 = ee.FeatureCollection('ft:1_HZ7IEagQdZvXpnIlmIRk1W_jcqffc0NN3wDUFw3', 'geometry');
var polygons2015 = ee.FeatureCollection('ft:1scXL_EoS1dsU2x87pgU2LWgFG9wpwI5WSibgGiwU', 'geometry');

// Assign random numbers in preparation for a test/train split that will maintain class proportions.
// var builtUp = polygons.filterMetadata('Class', 'equals', 0);
// var water = polygons.filterMetadata('Class', 'equals', 1);
// var bareSoil = polygons.filterMetadata('Class', 'equals', 2);
// var vegetation = polygons.filterMetadata('Class', 'equals', 3);
// var classes = [builtUp, water, bareSoil, vegetation];
// for (var i = 0; i < classes.length; i++) {
//   classes[i] = classes[i].randomColumn('random', 1001);
// }
// print(classes);
polygons2010 = polygons2010.randomColumn('random', 2015);
polygons2015 = polygons2015.randomColumn('random', 2015);

// Join the Class & random values with all pixels in each polygon in the training datasets.
// (Landsat 5 & 8 spatial res: 30 m)
var regionsOfInterest2010 = clipped2010.sampleRegions({
	collection: polygons2010,
	properties: ['Class', 'random'],
	scale: 30
});
var regionsOfInterest2015 = clipped2015.sampleRegions({
	collection: polygons2015,
	properties: ['Class', 'random'],
	scale: 30
});

// Split into training and testing ROIs.
var training2010 = regionsOfInterest2010.filterMetadata('random', 'less_than', 0.7);
var testing2010 = regionsOfInterest2010.filterMetadata('random', 'not_less_than', 0.7);
var training2015 = regionsOfInterest2015.filterMetadata('random', 'less_than', 0.7);
var testing2015 = regionsOfInterest2015.filterMetadata('random', 'not_less_than', 0.7);

/////////////////
// Classification
/////////////////

// var classifier2010 = ee.Classifier.naiveBayes();
// var classifier2010 = ee.Classifier.svm();
var classifier2010 = ee.Classifier.randomForest({
	numberOfTrees: 10,
});
var classifier2015 = ee.Classifier.randomForest({
	numberOfTrees: 10,
});

// Test the classifiers' accuracy. (data, y, X)
var trainingClassifier2010 = classifier2010.train(training2010, 'Class', bands2010);
var validation2010 = testing2010.classify(trainingClassifier2010);
var errorMatrix2010 = validation2010.errorMatrix('Class', 'classification');
print('2010 Error Matrix:', errorMatrix2010);
print('2010 Total accuracy:', errorMatrix2010.accuracy());
print('2010 Consumer\'s accuracy (rows):', errorMatrix2010.consumersAccuracy());
print('2010 Producer\'s accuracy (columns):', errorMatrix2010.producersAccuracy());

var trainingClassifier2015 = classifier2015.train(training2015, 'Class', bands2015);
var validation2015 = testing2015.classify(trainingClassifier2015);
var errorMatrix2015 = validation2015.errorMatrix('Class', 'classification');
print('2015 Error Matrix:', errorMatrix2015);
print('2015 Total accuracy:', errorMatrix2015.accuracy());
print('2015 Consumer\'s accuracy (rows):', errorMatrix2015.consumersAccuracy());
print('2015 Producer\'s accuracy (columns):', errorMatrix2015.producersAccuracy());

// Retrain the classifiers using the full dataset.
var fullClassifier2010 = classifier2010.train(regionsOfInterest2010, 'Class', bands2010);
var fullClassifier2015 = classifier2015.train(regionsOfInterest2015, 'Class', bands2015);

// Classify the images.
var classified2010 = clipped2010.classify(fullClassifier2010);
var classified2015 = clipped2015.classify(fullClassifier2015);

// Create a palette to display the classes.
var palette =['c9c0bf', '435ebf', 'EEE8AA',
	'006400'];

//////////////////////////
// Calculate fallowed land
//////////////////////////

// I define fallowed land as land converted from vegetation (3) to bare soil (2).
var fallowedBinary = classified2010.eq(3).and(classified2015.eq(2));

// Calculate fallowed area by pixel (0 if pixel was not fallowed)
var areaImageSqM = ee.Image.pixelArea()
	.clip(centralValley);
var areaImageSqKm = areaImageSqM.multiply(0.000001);
var fallowedArea = fallowedBinary.multiply(areaImageSqKm);

// Calculate total fallowed area in square kilometers. 200 meters is the arbitrary spatial
// resolution at which we're performing the computation because apparently it needed one.
var totalFallowedArea = fallowedArea.reduceRegion({reducer: ee.Reducer.sum(),
	geometry: centralValley,
	scale: 200});
print('Total fallowed area, sq km:', totalFallowedArea);

// Display.
// Map.addLayer(clipped2015, vizParams);
// Map.addLayer(classified2010, {min: 0, max: 3, palette: palette});
// Map.addLayer(classified2015, {min: 0, max: 3, palette: palette});
Map.addLayer(fallowedArea);
Map.setCenter(-120.959, 37.571, 7);


