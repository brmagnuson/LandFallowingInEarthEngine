# Calculating Fallowed Land in Google Earth Engine

The scripts in this repo show how I used Google Earth Engine to estimate the total area of land fallowed in California's Central Valley in 2015 relative to 2010 as an attempt to see what impact the ongoing drought has had on agriculture. The following shows how I approached the project and could be used as a detailed tutorial for someone interested in using Google Earth Engine for a similar project.


## Table of Contents

- [Introduction](#intro)
- [Setting Up Google Earth Engine](#gee)
- [Setting Up Data](#data)
- [Approach 1: Classification](#classification)
- [Approach 2: NDVI Difference](#ndvi)
- [Results](#results)
- [Sources](#bib)


<a name="intro"></a>
## Introduction

As 2015 comes to a close, California is still unquestionably in a [severe drought](http://californiawaterblog.com/2015/09/23/the-banality-of-californias-1200-year-drought/), although estimates of exactly how rare (and therefore how severe) range from 1 in 15 years drought to 1 in 1200 years (Griffin and Anchukaitis 2014). Whether this is the drought to end all droughts or not, it has certainly had an impact on agriculture. With far less water available for irrigation, farmers with insufficient flows have had to make tough decisions. They can pay for water either by pumping groundwater or by buying water from someone willing to sell theirs, or they can fallow their fields, leaving them bare of crops.

The Central Valley is California's largest agricultural area and highly dependent on irrigation, so looking at how it's doing gives a good picture of how California agriculture is doing. If you look at satellite photos of California's Central Valley in 2010 and 2015, things seem browner. But exactly how much browner? I was curious how much land had been fallowed this year relative to 2010, before the drought kicked into gear, and wanted to try out a few remote sensing approaches to answer this question. [Google Earth Engine](https://earthengine.google.com/), which describes itself as "a planetary-scale platform for Earth science data and analysis," made it relatively straightforward to pull together the necessary data and try out two different ways of estimating fallowed land.

My two methods of doing a simple estimation of fallowed land were: 

1. Performing a basic land cover classification for both years using a random forest model to classify pixels, and then considering pixels that had converted from vegetation in 2010 to bare soil in 2015 to be fallowed.
2. Finding the Normalized Difference Vegetation Index (NDVI) for each pixel as an estimate of greenness and photosynthetic activity, and considering pixels with NDVIs that had decreased substantially from 2010 to 2015 to be fallowed land.

I'll go over the details of how I did all this in the following sections.


<a name="gee"></a>
## Setting Up Google Earth Engine

[Google Earth Engine](https://earthengine.google.com/faq/) is a tool for analyzing geospatial information. It stores global satellite imagery from the past 40+ years in an organized fashion, facilitating large-scale data analysis. It's a [cloud-based platform](https://developers.google.com/earth-engine/) that uses Google's computational infrastructure for parallel processing, so it can process geospatial data much faster than an ordinary personal computer. You can use Earth Engine either through the [Explorer](https://explorer.earthengine.google.com/#workspace) (a high-level point-and-click-only GUI) or through the [Playground](https://code.earthengine.google.com/) (a more low-level IDE for writing custom scripts), and it has APIs for JavaScript and Python. Google Earth Engine is currently in beta (as of December 2015), so to access its features, you must fill out the form at [https://earthengine.google.com/signup/](https://earthengine.google.com/signup/) and be accepted as an Earth Engine Tester (which is not guaranteed). Its use is free for research, education, and nonprofit usage.

Once I'd been accepted as a beta tester, I was able to log in and use the Earth Engine Playground. Never having worked in Javascript before, I followed [one of the tutorials](https://developers.google.com/earth-engine/tutorials) in the Earth Engine JavaScript API documentation to figure out the basics, and then I skimmed through the sections relevant to my interests in the main [guide](https://developers.google.com/earth-engine/) to get started: Images, Image Collections, Features, and Feature Collections. Later I found the rest of the documentation helpful as I started to get into issues of mapping, reducing, and data import/export in answering the agricultural land fallowing question.

Google Earth Engine has two fundamental geographic data structures types that you should be familiar with:
 
 1. [**Images**](https://developers.google.com/earth-engine/image_overview): This is how Google Earth Engine represents raster data types. They are composed of bands (each with its own name, data type, pixel resolution, and projection) and a dictionary of properties storing image metadata. Multiple images (covering multiple areas and/or the same area over time) can be grouped together into an ImageCollection.
 2. [**Features**](https://developers.google.com/earth-engine/features): This is how Earth Engine represents vector data types. They are composed of a geometry and a dictionary of other properties of interest. Features can be grouped into a FeatureCollection.
 
Since Earth Engine is still in beta, there are not billions of [stackoverflow.com](http://stackoverflow.com/) questions and answers to help solve problems once you start trying to use it. Instead, there is a Google group called [Google Earth Engine Developers](https://groups.google.com/forum/#!forum/google-earth-engine-developers) which is full of discussion of how to do different processes. As a beta tester, I had access to this group and found it to be a very valuable resource when I had a question not covered in the basic documentation.


<a name="data"></a>
## Setting Up Data


<a name="central-valley"></a>
###### California's Central Valley

To figure out what land had been fallowed in the Central Valley in 2015 relative to 2010, the first thing I needed was to know what exactly counted as California's Central Valley. There are various sources one could use to delineate the border of the Central Valley, each likely with slightly different definitions of where that border was that would give you slightly different answers of how much land has been fallowed. I chose to use the region that the [California Gap Analysis Project](http://www.biogeog.ucsb.edu/projects/gap/gap_data_reg.html) at UC Santa Barbara defined as the Great Central Valley. I downloaded the Central Valley land cover coverage, which consists of planar-enforced polygons specifying land cover and land use across the region as of 1998, and then I used ArcMap to dissolve all the polygons into one giant polygon, the outline of which would give me the border of the Central Valley, and saved this as a KML file (using WGS 84 as the datum).

KML files can be imported into a Google Fusion Table, which can then be imported into Earth Engine as a FeatureCollection using the Fusion Table's id like so in my script:

```javascript
var centralValley = ee.FeatureCollection('ft:1h46ENpEp8vO3pOe1EqeF1sZLEDhSVMxbu8pHAoU4', 'geometry');
```

(Specific instructions on the import process [here](https://developers.google.com/earth-engine/importing).)


<a name="landsat"></a>
###### Landsat Imagery

Next I needed satellite imagery of the area. Google Earth Engine has both raw and processed data from all the Landsat satellites available as ImageCollections. Ideally, I would have used Landsat 7 Surface Reflectance data, because it is available from January 1, 1999, to the present day, meaning it includes all the dates of interest to me in one, apples-to-apples data set. However, Landsat 7 commonly has white striping across sections of its imagery because of the [failure of the Scan Line Corrector](http://landsat.usgs.gov/products_slcoffbackground.php) in 2003. For example, the below image shows a composite July 2010 Landsat 7 photo of the Merced, California, area.

![Merced, 2010](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/L7%20white%20stripes.png "Merced, CA, 2010")

Approximately 22% of any given Landsat 7 image is lost because of the SLC failure, and since I'm interested in calculating area of specific pixels, I wanted to use complete imagery (USGS 2015). So instead, I used Landsat 5 data (available from January 1, 1984, to May 5, 2012) for 2010 and Landsat 8 data (available from April 11, 2013, to the present day) for 2015. Since these are different satellites that collect slightly different bands of the electromagnetic spectrum, I would have to treat each of them separately when I did my analysis. Surface reflectance as calculated by the LEDAPS algorithm isn't readily available in Earth Engine for Landsat 8 data, so instead I used the USGS orthorectified, top-of-atmosphere reflectance ImageCollections for Landsat 5 and Landsat 8. These images have been converted from the raw data of thermal bands to brightness temperature (reflectance) for each band.

I loaded my imagery using the following code, selecting the June-August date range to get images for the summers of 2010 and 2015:
 
```javascript
// Use these bands for analysis.
var bands2010 = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'];
var bands2015 = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B10', 'B11'];
```
 
```javascript
// Create median-pixel composites for the summers of 2010 and 2015 from Landsat 5 & 8.
var summer2010 = ee.ImageCollection('LANDSAT/LT5_L1T_TOA')
  .filterDate('2010-06-01', '2010-08-30')
  .select(bands2010);
var summer2015 = ee.ImageCollection('LANDSAT/LC8_L1T_TOA')
  .filterDate('2015-06-01', '2015-08-30')
  .select(bands2015);
```

[Landsat 5 and Landsat 8](http://landsat.usgs.gov/band_designations_landsat_satellites.php) number their bands differently and have different bands available, so I have to select their bands appropriately. For Landsat 5, the visible spectrum is Bands 1 through 3, near-infrared is Bands 4 and 5, and mid-infrared is Band 7. For Landsat 8, the visible spectrum is Bands 2 through 4, near-infrared is Band 5, short-wave infrared is Bands 6 and 7, and thermal infrared is Bands 10 and 11. I only select these bands rather than the full range of available bands, because these are the bands I want to use in my analysis.

Any one satellite image may have various problems that can obscure the surface--a cloudy day, a plume of smoke--so creating a composite image can help give a better picture. By default, Earth Engine creates the composite [using the most recent pixel](https://developers.google.com/earth-engine/tutorial_api_04) in each case, but telling Earth Engine to choose the median value in the stack of possible pixel values can usually remove clouds, as long as you have enough images in the collection. Clouds have a high reflectance value, and shadows have a low reflectance value, so picking the median should give you a relatively cloudless composite image. Since I have Landsat images for June, July, and August of each year and Landsat satellites take pictures of the same location about every two weeks, I had multiple possible images to put together. I create my median-pixel composite like so:

```javascript
var median2010 = summer2010.median();
var median2015 = summer2015.median();
```

<a name="clipping"></a>
###### Clipping Imagery

Now that I have my two pieces of data--the Central Valley and Landsat imagery--I can clip the median-pixel Landsat images by the Central Valley and work with just my area of interest:

```javascript
// Clip Landsat composite by California state boundary.
var clipped2010 = median2010.clip(centralValley);
var clipped2015 = median2015.clip(centralValley);
```

I can then display my images to take a look at what we're working with.

```javascript
var vizParams2010 = {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3};
Map.addLayer(clipped2010, vizParams2010);
Map.setCenter(-120.959, 37.571, 7);
```

```javascript
var vizParams2015 = {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3};
Map.addLayer(clipped2015, vizParams2015);
Map.setCenter(-120.959, 37.571, 7);
```

I've put the results of these two pieces of code together for easy comparison. Voilà, California's Central Valley! There is still agriculture in 2015, of course, but the green patches are shrinking and a little less intense. The southern half of the Central Valley in particular seems to have fewer green patches and more brown.

![2010 vs 2015](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/ClippedComparison.png "2010 vs 2015")


<a name="classification"></a>
## Approach 1: Classification

One approach to estimating the total area of fallowed land is to perform a supervised classification of four basic land cover types for 2010 and 2015. Then, consider land that has converted from vegetation to bare soil as fallowed. This section explains how to do this in Google Earth Engine.


###### Regions of Interest

The process of classification involves two pieces: a classification algorithm and data that you can use to train it. For land cover classification, our data is usually satellite imagery. Satellites record reflectance across multiple regions of the electromagnetic spectrum, and different types of land cover have different spectral signatures. For example, the below image shows the spectral signature curves for each of four pixels from a Landsat 8 image of the Sacramento Valley. I chose those pixels to be representative of four different types: urban areas, water, vegetation, and bare soil. You can see how they differ, particularly beyond the visible region of the electromagnetic spectrum:

![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/SpectralSignatures.png "Spectral Signatures")

The classification algorithm can learn what each of these four categories tend to look like across the different spectral regions our bands cover based on training pixels. Then it can be shown new pixels that we haven't already classified and tell us which category the unknown pixels most likely belong in, according to what it's already seen.

Now that I had images of the Central Valley, I needed to create training data that would teach my classification algorithm what urban areas, water, vegetation, and bare soil looked like. Training data in remote sensing land cover classification problems is usually referred to as "regions of interest." Handily, Earth Engine makes it fairly easy to draw FeatureCollections using the polygon drawing tool in the upper left of the map in the Playground.
 
![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/GeometryDrawing.png "Geometry Drawing")

In a separate script, I displayed my map in a false-color composite using the near-infrared, red, and green bands. This makes vegetated areas display as bright red, which can make the differences between vegetated areas and bare soil stand out more easily than using a natural-color composite.

```javascript
var vizParams = {bands: ['B4', 'B3', 'B2'], min: 0, max: 3500};
Map.addLayer(clipped2010, vizParams);
```

![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/2010FalseColor.png "2010 False color composite")

I drew one FeatureCollection for each class, giving it both a numeric class (since that's what Earth Engine will need later on during the classification process) and a descriptive label for my own reference. For example:

![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/ConfigureGeomImport.png "Configuring Import")

Earth Engine imports any geometries, Features, or FeatureCollections you draw at the top of your script, so they are there to work with and they show up on your map. Below is a picture of my 2010 map with my 2010 regions of interest displayed on top. I drew 30 polygons for each land cover class, meaning 120 polygons in total. (This was time-consuming.) I tried to distribute them around the entire valley, since a given land cover class might differ more in different geographic areas and to give my classifier varied training data to make it more robust.

![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/2010ROIs.png "2010 Regions of Interest")

With my FeatureCollections for each class drawn, I merged them into a single FeatureCollection of all my regions of interest. I exported this FeatureCollection to Google Drive as a KML file, which ([as you'll remember from above](#central-valley)) can be imported into a Google Fusion Table and then into Earth Engine. That way I could run the region of interest creation process as one script and import it into my classification script at a later time, rather than doing everything at once in one very long script. (One hiccup in this process was that the fusion table I created had a column named "system:index", which caused a problem when I tried to import it into a new script, because apparently Earth Engine wants to assign the system:index property itself each time you import something. My workaround was to rename the column to "oldID" to prevent the error.)

```javascript
var regionsOfInterest = builtUp.merge(water).merge(bareSoil).merge(vegetation);
Export.table(regionsOfInterest, 'exportRegionsOfInterest', {driveFileNamePrefix: 'regionsOfInterest2010',
                                                            fileFormat: 'KML'});
```

I repeated this process for 2015. Since I used Landsat 8 rather than Landsat 5 for 2015, I needed to train a classifier that worked for Landsat 8 specifically, so I also needed another set of training regions of interest. After that long process, I had all my training data and could import it into my classification script.

```javascript
// Import training data.
// 0: BuiltUp, 1: Water, 2: BareSoil, 3: Vegetation
var polygons2010 = ee.FeatureCollection('ft:1_HZ7IEagQdZvXpnIlmIRk1W_jcqffc0NN3wDUFw3', 'geometry');
var polygons2015 = ee.FeatureCollection('ft:1scXL_EoS1dsU2x87pgU2LWgFG9wpwI5WSibgGiwU', 'geometry');
```


###### Training a Classifier

Earth Engine has support for a number of different classification algorithms, including random forests, naive Bayes, and support vector machines. I chose to use the random forest algorithm to classify my pixels; it doesn't make assumptions about the distribution of data and it often performs very well compared to many other classifiers. (If you're interested in the details of how a random forest classification works, [Liaw and Wiener](http://www.bios.unc.edu/~dzeng/BIOS740/randomforest.pdf) (2002) gives a nice overview.) I created a classifier for each year because of their different satellite imagery:

```javascript
var classifier2010 = ee.Classifier.randomForest({
	numberOfTrees: 10,
});
var classifier2015 = ee.Classifier.randomForest({
	numberOfTrees: 10,
});
```

To train my classifiers, I would feed in each year's regions of interest. This process really had three steps: joining the regions of interest with the band data from Landsat imagery for each pixel, doing a test/train split to assess my classifiers' accuracies, and then training the classifier on the full data set.

Step 1: Join the regions of interest with the band data from Landsat imagery for each pixel.

```javascript
// Assign random numbers in preparation for a test/train split that will maintain class proportions.
var seed = 2015;
polygons2010 = polygons2010.randomColumn('random', seed);
polygons2015 = polygons2015.randomColumn('random', seed);
```

```javascript
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
```

Step 2: Do a 30/70 test/train split using the random numbers I generated in Step 1 and assess each classifier's accuracy.

```javascript
// Split into training and testing ROIs.
var training2010 = regionsOfInterest2010.filterMetadata('random', 'less_than', 0.7);
var testing2010 = regionsOfInterest2010.filterMetadata('random', 'not_less_than', 0.7);
var training2015 = regionsOfInterest2015.filterMetadata('random', 'less_than', 0.7);
var testing2015 = regionsOfInterest2015.filterMetadata('random', 'not_less_than', 0.7);
```

```javascript
// Test the classifiers' accuracy. (data, y, X)
var trainingClassifier2010 = classifier2010.train(training2010, 'Class', bands2010);
var validation2010 = testing2010.classify(trainingClassifier2010);
var errorMatrix2010 = validation2010.errorMatrix('Class', 'classification');
```
```javascript
var trainingClassifier2015 = classifier2015.train(training2015, 'Class', bands2015);
var validation2015 = testing2015.classify(trainingClassifier2015);
var errorMatrix2015 = validation2015.errorMatrix('Class', 'classification');
```

The classifiers seemed to perform well, with a 97.8% total accuracy for 2010 and a 97.0% total accuracy for 2015. I made confusion matrices for each year:

Here's 2010:

 2010                     | Urban    | Water   | Bare Soil | Vegetation | *Consumer's Accuracy*
---                       | ---:     | ---:    | ---:      | ---:       | ---:
**Urban**                 | 2007     | 170     | 126       | 72         | *85.5%*   
**Water**                 | 0        | 6015    | 0         | 0          | *100.0%*
**Bare Soil**             | 38       | 0       | 7895      | 0          | *99.5%* 
**Vegetation**            | 1        | 0       | 0         | 2576       | *99.96%* 
_**Producer's Accuracy**_ | *98.1%*  | *97.3%* | *98.4%*   | *97.3%*    | _**97.8%**_


And here's 2015:

 2015                     | Urban    | Water    | Bare Soil | Vegetation | *Consumer's Accuracy*
---                       | ---:     | ---:     | ---:      | ---:       | ---:
**Urban**                 | 1372     | 0        | 1622      | 27         | *45.4*   
**Water**                 | 0        | 6541     | 0         | 0          | *100.0%*
**Bare Soil**             | 34       | 0        | 43766     | 0          | *99.9%* 
**Vegetation**            | 0        | 0        | 69        | 4549       | *98.5%* 
_**Producer's Accuracy**_ | *97.6%*  | *100.0%* | *96.3%*   | *99.4%*    | _**97.0%**_

My 2015 classifier is classifying built-up, urban areas as bare soil far too often. This could make the classification's estimation of fallowed land too high, since land classified as vegetated in 2010 and bare soil in 2015 will be treated as fallowed. However, since the 2010 classifier has a very high accuracy rate for vegetation, I suspect that most of the 2015 pixels misclassified as urban won't get picked up when I test for the vegetation-to-bare-soil conversion. Given this, I decided it was not worth the effort to draw better training regions of interest and moved on to Step 3.

Step 3: Train the classifier on the full data set.

```javascript
// Retrain the classifiers using the full dataset.
var fullClassifier2010 = classifier2010.train(regionsOfInterest2010, 'Class', bands2010);
var fullClassifier2015 = classifier2015.train(regionsOfInterest2015, 'Class', bands2015);
```
```javascript
// Classify the images.
var classified2010 = clipped2010.classify(fullClassifier2010);
var classified2015 = clipped2015.classify(fullClassifier2015);
```

Now I could take a look and see what my classifiers had predicted for each year.

```javascript
// Create a palette to display the classes.
var palette =['c9c0bf', '435ebf', 'EEE8AA', '006400'];
Map.addLayer(classified2010, {min: 0, max: 3, palette: palette});
Map.addLayer(classified2015, {min: 0, max: 3, palette: palette});
Map.setCenter(-120.959, 37.571, 7);
```

![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/ClassificationComparison.png "2010 vs 2015 Classification")

Suspiciously, 2015 actually looks like it has *more* vegetation than 2010, even though I had fairly low rates of errors of commission and omission for vegetation for both years! Given more time, this would be very worth looking into. Most likely, fixing the problem would involve better training data than something I drew by hand one afternoon. This could also be caused by the slightly different band definitions for Landsat 5 and Landsat 8 or Landsat 8 having more bands available. But for purposes of exploring this topic, I decided this was something to note and moved on.


###### Finding Fallowed Land

As mentioned previously, I considered land that had been classified as vegetation in 2010 and as bare soil in 2015 to be fallowed land. The below code gave each pixel a 1 if it met this fallowing condition and 0 otherwise. Fallowed land shows up as white pixels in the below image, while everything else shows up as black pixels.

```javascript
// I define fallowed land as land converted from vegetation (3) to bare soil (2).
var fallowedBinary = classified2010.eq(3).and(classified2015.eq(2));
Map.addLayer(fallowedBinary);
```

![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/ClassificationBinary.png "Classification Binary")


###### Calculating Area

I created a new Image where the value of each pixel was its area in square meters using the ee.Image.pixelArea() function. I converted this to square kilometers so the numbers would be more understandable, producing `areaImageSqKm` as a new Image. Earth Engine allows you to multiply Images, in which case pixel 1 in Image A is multiplied by pixel 1 in Image B to produce the value of pixel 1 in Image C, and so on. Since the value of each non-fallowed pixel in my `fallowedBinary` Image was 0, multiplying `fallowedBinary` by `areaImageSqKm` gave me a new image, `fallowedArea`, where each pixel's value was its area in square kilometers if it had been fallowed and zero otherwise.

```javascript
// Calculate fallowed area by pixel (0 if pixel was not fallowed)
var areaImageSqM = ee.Image.pixelArea()
	.clip(centralValley);
var areaImageSqKm = areaImageSqM.multiply(0.000001);
var fallowedArea = fallowedBinary.multiply(areaImageSqKm);
```

Now I could sum all the pixels in `fallowedArea` using a Reducer to get the total fallowed area. To make this work, I performed the computation at a 200-meter spatial resolution; smaller resolutions (like 30 meters, Landsat's spatial resolution) were too fine for Earth Engine's computation engine to handle and made it time out.

```javascript
// Calculate total fallowed area in square kilometers. 
var totalFallowedArea = fallowedArea.reduceRegion({reducer: ee.Reducer.sum(),
	geometry: centralValley,
	scale: 200});
print('Total fallowed area, sq km:', totalFallowedArea);
```

The end result from the classification approach: 2622 square kilometers of fallowed land. The Central Valley is 58,816 square kilometers total (at least, the region that I defined as the Central Valley is that size), and according to my classifier, 2010 vegetated area was 16,766 square kilometers. This makes my estimate of summer 2015 fallowed land to be 15.64% of what was vegetated in summer 2010 and 4.46% of all the Central Valley.


<a name="ndvi"></a>
## Approach 2: NDVI Difference

Another approach to estimating the total area of fallowed land is to see how the Normalized Difference Vegetation Index (NDVI) had changed between 2010 and 2015, considering land whose NDVI had decreased substantially to have converted from vegetation to bare soil, meaning it had been fallowed. This section explains how to do this in Google Earth Engine.


###### NDVI

NDVI is an index of plant "greenness" originally conceptualized by Deering (1978). Its ratio relates the red and near-infrared spectral bands in a way that helps detect live green plants in remote sensing data. Its formula is:

NDVI = (NIR - Red) / (NIR + Red)

Healthy vegetation absorbs most visible light that reaches it and reflects a great deal of near-infrared light. It has evolved to do this because absorbing more more infared light would overheat the plants. Dying or sparse vegetation, as well as bare soil, reflects more visible light and less near-infrared light than healthy vegetation. So a normalized measure of the difference between the amount of red reflectance and the amount of near-infrared reflectance provides an indication of whether or not healthy plants are in a pixel. The value of NDVI always ranges from -1 to +1, with the higher values indicating more or healthier vegetation. For more details, NASA's Earth Observatory provides a nice explanation [here](http://earthobservatory.nasa.gov/Features/MeasuringVegetation/measuring_vegetation_2.php).

In a new script, I used the same processes outlined above to get a [median-pixel composite image](#landsat) of Landsat 5 data for the summer of 2010 and Landsat 8 data for the summer of 2015 and [clipped](#clipping) them to just the region of the Central Valley. Then I created a function that would calculate NDVI for every pixel in an image using Earth Engine's Image.normalizedDifference() method.

```javascript
// This function gets NDVI from any imagery with red and NIR bands.
var getNDVI = function(image, redBand, nirBand) {
  return image.normalizedDifference([nirBand, redBand]);
};
```

I used this function to calculate NDVI for my satellite images and displayed them. Darker areas have lower NDVIs, and lighter areas have higher NDVIs (and thus more vegetation).

```javascript
// Find NDVI
var ndvi2010 = getNDVI(clipped2010, 'B3', 'B4');
var ndvi2015 = getNDVI(clipped2015, 'B4', 'B5');
Map.addLayer(ndvi2010);
Map.addLayer(ndvi2015);
```

![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/NDVIComparison.png "NDVI Comparison")

It so happens that water always has a negative NDVI because it absorbs *more* near-infrared light than red. Since I knew I wouldn't be interested in areas that had been water in 2010, I masked those out of my NDVI Images.

```javascript
// Create a land layer so that we can mask out known water areas.
var land = ndvi2010.gt(0);
```
```javascript
// Mask ndvi to just the land areas.
ndvi2010 = ndvi2010.mask(land);
ndvi2015 = ndvi2015.mask(land);
```

This prevented water areas from showing up in my calculations by accident.


###### Calculating NDVI Difference

I wanted to see where NDVI had decreased substantially to try to estimate fallowed land area, so subtracting 2010 NDVI from 2015 NDVI for each pixel would give me a picture of where there had been decreases in NDVI.

```javascript
// Find the difference in NDVI. Result is positive if NDVI increased, negative if it decreased.
var ndviDifference = ndvi2015.subtract(ndvi2010);
```

I displayed my image as red where there had been a decrease in NDVI and green where there had been an increase.

```javascript
// Map NDVI difference
var ndviParams = {palette: 'FF0000, 000000, 00FF00', min: -0.5, max: 0.5};
Map.addLayer(ndviDifference, ndviParams);
```

![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/NDVIDifference.png "NDVI Difference")


###### Setting a Threshold to Find Fallowed Land

I had decided to consider pixels in which NDVI had decreased substantially from 2010 to 2015 as fallowed land for my exploration, but what should I count as a substantial decrease? I plotted a histogram of all non-negative (non-water) NDVI values for 2010 to see if there were any patterns in the data.

```javascript
// Histogram of 2010 NDVI.
var options = {
  title: 'Central Valley NDVI Histogram',
  fontSize: 20,
  hAxis: {title: 'NDVI'},
  vAxis: {title: 'count'},
  series: {
    0: {color: 'blue'}}
};
var histogram = Chart.image.histogram(ndvi2010, centralValley, 100)
    .setSeriesNames(['NDVI'])
    .setOptions(options);
print(histogram);
```

![alt text](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/NDVIHistogram.png "NDVI Histogram")

I had been hoping for a clear bimodal distribution: one hump for bare soil and one hump for healthy vegetation, with urban areas fairly evenly distributed across the possible spectrum. Unfortunately, this did not materialize. There is a clear hump where bare soil values centered around 0.2 , but vegetation seems to be fairly evenly distributed across the higher possible NDVI values, although there is a very slight hump at 0.6.

Without a clear sign of what NDVI values for vegetated fields tended to be, I decided to try a few different possible thresholds for what constituted a substantial decline to get a general picture: -0.2, -0.3, and -0.4. I tried each value in the first line of the following snippet of code.

```javascript
// Calculate fallowed area by pixel (0 if pixel was not fallowed)
var fallowed = ndviDifference.lt(-0.2);
var areaImageSqM = ee.Image.pixelArea()
            .clip(centralValley);
var areaImageSqKm = areaImageSqM.multiply(0.000001);
var fallowedArea = fallowed.multiply(areaImageSqKm);
var totalFallowedArea = fallowedArea.reduceRegion(ee.Reducer.sum(), centralValley, 90);
print(totalFallowedArea);
```

This gave me a spectrum of results, with the amount of total fallowed land decreasing as the threshold for consideration as fallowed land grew larger in magnitude.

Threshold | Resulting Estimated Fallowed Area (sq km)
:---:       | :---:
-0.2      | 5200
-0.3      | 3418 
-0.4      | 2223


<a name="results"></a>
## Results

###### Classification vs. NDVI Difference

To review, the classification approach estimated 2622 square kilometers of fallowed land, while the NDVI difference approach estimated 2223 to 5200 square kilometers, depending on how strictly I set the threshold. While these estimates do not precisely match, they seem to be reasonably in the same neighborhood. I think the -0.3 or -0.4 NDVI difference thresholds are more likely to be closer to the truth: a decline of 0.2 could simply be due to stressed vegetation or a different type of vegetation, and the probability of this being the case decreases as the threshold becomes stricter. The average of the estimates resulting from the two stricter thresholds is 2820.5 square kilometers, which is quite close to the classification approach's estimate. So as a very provisional figure, it is likely safe to say that the amount of fallowed land in California's Central Valley was around 2000 to 3500 square kilometers in the summer of 2015.




###### Additional Considerations

Keep in mind, some land was likely regularly fallowed rather than fallowed due to drought, since farmers often let their fields rest to allow the soil time to recuperate. So these numbers likely are higher than the acreage specifically fallowed due to drought.

One way to set a firmer threshold for the NDVI approach would be to use the method proposed by [Thenkabail, Gamage, and Smakhtin](http://www.iwmi.cgiar.org/Publications/IWMI_Research_Reports/PDF/pub085/RR85.pdf) (2004). Rather than a simple difference of two years, they propose finding the average NDVI value of a pixel over a longer time span of years (18 years in their example) and using the year of interest's deviation from this mean as an indication of below-normal vegetation condition/health. Extending this method by using a threshold set by that pixel's standard deviation would make for a more rigorous estimate of fallowing using the NDVI approach. (It still involves choosing a threshold somewhat arbitrarily, but it would at least be a more informed choice.)

As a final note, much of California's Central Valley actually experiences two growing seasons, so redoing this analysis for the winter months could also be interesting.

<a name="bib"></a>
### Sources

California Gap Analysis. "Land-cover for California." 1998. Biogeography Lab, University of California, Santa Barbara.

Deering, DW. *Rangeland reflectance characteristics measured by aircraft and spacecraft sensors*. PhD Dissertation. Texas A&M University, 1978.

Google Earth Engine Team. "Google Earth Engine: A planetary-scale geospatial analysis platform." 2015. https://earthengine.google.com

Griffin, D and KJ Anchukaitis. “How unusual is the 2012–2014 California drought?” *Geophysical Research Letters* 41 (2014): 9017–9023.

Liaw, A and M Wiener. "Classification and Regression by randomForest." *R News* 2.3 (2002): 18-22.

Lund, J. "The banality of California's '1200-year' drought." *California WaterBlog*. September 23, 2015.

Thenkabail, PS, MSDN Gamage, and VU Smakhtin. *The use of remote sensing data for drought assessment and monitoring in Southwest Asia*. Vol. 85. International Water Management Institute, 2004.

U.S. Geological Survey. "SLC-off Products: Background." 2015. http://landsat.usgs.gov/products_slcoffbackground.php

Weier, J and D Herring. "Measuring Vegetation (NDVI & EVI)." Earth Observatory, NASA. August 30, 2000. http://earthobservatory.nasa.gov/Features/MeasuringVegetation/measuring_vegetation_2.php
