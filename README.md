# Calculating Fallowed Land in Google Earth Engine

The scripts in this repo show how I used Google Earth Engine to estimate the total area of land fallowed in California's Central Valley in 2015 relative to 2010 as an attempt to see what impact the ongoing drought has had on agriculture. The following shows how I approached the project and could be used as a tutorial for someone interested in using Google Earth Engine for a similar project.

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

As 2015 comes to a close, California is still unquestionably in a severe [drought](http://californiawaterblog.com/2015/09/23/the-banality-of-californias-1200-year-drought/), although estimates of exactly how rare (and therefore how serious compared to other droughts that could happen) range from 1 in 15 years drought to 1 in 1200 years (Griffin and Anchukaitis 2014). Whether this is the drought to end all droughts or not, it has certainly had an impact on agriculture: with far less water available for irrigation, farmers with insufficient flows have had to make the decision whether to pay for water (either by pumping groundwater or by buying water from someone willing to sell theirs) or to fallow their fields, leaving them bare of crops.

The Central Valley is California's largest agricultural area and highly dependent on irrigation, so looking at how it's doing gives a good picture of how California agriculture is doing. If you look at satellite photos of California's Central Valley in 2010 and 2015, things clearly seem browner. But exactly how much browner? I was curious how much land had been fallowed this year relative to 2010, before the drought kicked into gear, and wanted to try out a few remote sensing approaches to answer this question. [Google Earth Engine](https://earthengine.google.com/), which describes itself as "a planetary-scale platform for Earth science data and analysis," made it relatively straightforward to pull together the necessary data and try out two different ways of estimating fallowed land.

My two methods of doing a simple estimation of fallowed land were: 

1. Performing a basic land cover classification for both years using a random forest model based on training data I'd specified, and then considering land that had converted from vegetation to bare soil to be fallowed.
2. Finding the Normalized Difference Vegetation Index (NDVI) for each pixel as an estimate of greenness and photosynthetic activity, and considering pixels with NDVIs that had decreased substantially from 2010 to 2015 to be fallowed land.

I'll go over the details of how I did all this in the subsequent sections.


<a name="gee"></a>
## Setting Up Google Earth Engine

Google Earth Engine is a [tool](https://earthengine.google.com/faq/) for analyzing geospatial information. It stores global satellite imagery from the past 40+ years in an organized fashion, facilitating large-scale data analysis. It's a [cloud-based platform](https://developers.google.com/earth-engine/) that uses Google's computational infrastructure for parallel processing, so it can process geospatial data much faster than an ordinary laptop. You can use Earth Engine either through the [Explorer](https://explorer.earthengine.google.com/#workspace) (a GUI) or through the [Playground](https://code.earthengine.google.com/) (a web-based IDE), and it has APIs for JavaScript and Python. Google Earth Engine is currently in beta (as of December 2015), so to access its features, you must fill out the form at [https://earthengine.google.com/signup/](https://earthengine.google.com/signup/) and be accepted as an Earth Engine Tester (which is not guaranteed). Its use is free for research, education, and nonprofit usage.

Once I'd been accepted as a beta tester, I was able to log in and use the Earth Engine Playground. Never having worked in Javascript before, I followed one of the [tutorials](https://developers.google.com/earth-engine/tutorials) in the Earth Engine JavaScript API documentation to figure out the basics, and then I skimmed through the sections relevant to my interests in the main [guide](https://developers.google.com/earth-engine/) to get started: Images, Image Collections, Features, and Feature Collections. Later I found the rest of the documentation helpful as I started to get into issues of mapping, reducing, and data import/export in answering the agricultural land fallowing question.

Google Earth Engine has two fundamental geographic data structures types that you should be familiar with:
 
 1. [**Images**](https://developers.google.com/earth-engine/image_overview): This is how Google Earth Engine represents raster data types. They are composed of bands (each with its own name, data type, pixel resolution, and projection) and a dictionary of properties storing image metadata. Multiple images (covering multiple areas and/or the same area over time) can be grouped together into an ImageCollection.
 2. [**Features**](https://developers.google.com/earth-engine/features): This is how Earth Engine represents vector data types. They are composed of a geometry and a dictionary of other properties of interest. Features can be grouped into a FeatureCollection.

<a name="data"></a>
## Setting Up Data

###### California's Central Valley

To figure out what land had been fallowed in the Central Valley in 2015 relative to 2010, the first thing I needed was to know what exactly counted as California's Central Valley. There are various sources one could use to delineate the border of the Central Valley, each likely with slightly different definitions of where that border was that would give you slightly different answers of how much land has been fallowed. I chose to use the region that the [California Gap Analysis Project](http://www.biogeog.ucsb.edu/projects/gap/gap_data_reg.html) at UC Santa Barbara defined as the Great Central Valley. I downloaded the Central Valley land cover coverage, which consists of planar-enforced polygons specifying land cover and land use across the region as of 1998, and then I used ArcMap to dissolve all the polygons into one giant polygon, the outline of which would give me the border of the Central Valley, and saved this as a KML file (using WGS 84 as the datum).

KML files can be imported into a Google Fusion Table, which can then be imported into Earth Engine as a FeatureCollection using the Fusion Table's id (specific instructions [here](https://developers.google.com/earth-engine/importing)) like so in my script:

```javascript
var centralValley = ee.FeatureCollection('ft:1h46ENpEp8vO3pOe1EqeF1sZLEDhSVMxbu8pHAoU4', 'geometry');
```

###### Landsat Imagery

Next I needed satellite imagery of the area. Google Earth Engine has both raw and processed data from all the Landsat satellites available as ImageCollections. Ideally, I would have used Landsat 7 Surface Reflectance data, because it is available from January 1, 1999, to the present day, meaning it includes all the dates of interest to me in one, apples-to-apples data set. However, Landsat 7 commonly has white striping across sections of its imagery because of the failure of the [Scan Line Corrector](http://landsat.usgs.gov/products_slcoffbackground.php) in 2003. For example, the below image shows a composite July 2010 Landsat 7 photo of the Merced, California, area.

![Merced, 2010](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/L7%20white%20stripes.png "Merced, CA, 2010")

Approximately 22% of any given Landsat 7 image is lost because of the SLC failure, and since I'm interested in calculating area of specific pixels, I wanted to use complete imagery (USGS 2015). So instead, I used Landsat 5 data (available from January 1, 1984, to May 5, 2012) for 2010 and Landsat 8 data (available from April 11, 2013, to the present day) for 2015. Since these are different satellites that collect slightly different bands, I would have to treat each of them separately when I did my analysis. Surface reflectance as calculated by the LEDAPS algorithm isn't readily available in Earth Engine for Landsat 8 data, so instead I used the USGS orthorectified, top-of-atmosphere reflectance ImageCollections for Landsat 5 and 8. These images have been converted from the raw data of thermal bands to brightness temperature (reflectance) for each band.

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

Landsat 5 and Landsat 8 number their [bands](http://landsat.usgs.gov/band_designations_landsat_satellites.php) differently and have different bands available, so I have to select their bands appropriately. For Landsat 5, the visible spectrum is Bands 1 through 3, near-infrared is Bands 4 and 5, and mid-infrared is Band 7. For Landsat 8, the visible spectrum is Bands 2 through 4, near-infrared is Band 5, short-wave infrared is Bands 6 and 7, and thermal infrared is bands 10 and 11. I only select these bands rather than the full range, because these are the bands I want to use in my analysis.

Any one satellite image may have various problems that can obscure the surface--a cloudy day, a plume of smoke--so creating a composite image can help give a better picture. By default, Earth Engine creates the composite using the most recent pixel in each case, but telling Earth Engine to choose the median value in the stack of possible pixel values can usually remove clouds, as long as you have enough images in the collection. Clouds have a high reflectance value, and shadows have a low reflectance value, so picking the median should give you a relatively cloudless composite image. I create my median-pixel composite like so:

```javascript
var median2010 = summer2010.median();
var median2015 = summer2015.median();
```

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

I've put the results of these two pieces of code together for easy comparison. Voilà, California's Central Valley! Clearly, 2015 is not looking quite as lush.

![2010 vs 2015](https://github.com/brmagnuson/LandFallowingInEarthEngine/blob/master/Images/ClippedComparison.png "2010 vs 2015")

<a name="classification"></a>
## Approach 1: Classification

###### Regions of Interest

###### Training a Classifier

###### Prediction

<a name="ndvi"></a>
## Approach 2: NDVI Difference

###### NDVI

###### Band Math

###### Setting a Threshold

<a name="results"></a>
## Results

###### Calculating Area

###### Classification vs. NDVI Difference

<a name="bib"></a>
### Sources

California Gap Analysis, 1998. "Land-cover for California." Biogeography Lab, University of California, Santa Barbara.

Google Earth Engine Team, 2015. "Google Earth Engine: A planetary-scale geospatial analysis platform." https://earthengine.google.com

Griffin D and Anchukaitis KJ, 2014. “How unusual is the 2012–2014 California drought?” *Geophys. Res. Lett.*, 41, 9017–9023, doi:10.1002/2014GL062433

Lund J. "The banality of California's '1200-year' drought." *California WaterBlog*. September 23, 2015.

U.S. Geological Survey, 2015. "SLC-off Products: Background." http://landsat.usgs.gov/products_slcoffbackground.php
