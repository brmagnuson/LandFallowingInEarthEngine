# Land Fallowing in Google Earth Engine

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

Google Earth Engine is a [tool](https://earthengine.google.com/faq/) for analyzing geospatial information. It stores global satellite imagery from the past 40+ years in an organized fashion, facilitating large-scale data analysis. It's a [cloud-based platform](https://developers.google.com/earth-engine/) that uses Google's computational infrastructure for parallel processing, so it can process geospatial data much faster than an ordinary laptop. You can use Google Earth Engine either through the [Explorer](https://explorer.earthengine.google.com/#workspace) (a GUI) or through the [Playground](https://code.earthengine.google.com/) (a web-based IDE), and it has APIs for JavaScript and Python. Google Earth Engine is currently in beta (as of December 2015), so to access its features, you must fill out the form at [https://earthengine.google.com/signup/](https://earthengine.google.com/signup/) and be accepted as an Earth Engine Tester (which is not guaranteed). Its use is free for research, education, and nonprofit usage.

Once I'd been accepted as a beta tester, I was able to log in and use the Google Earth Engine Playground. Never having worked in Javascript before, I followed one of the [tutorials](https://developers.google.com/earth-engine/tutorials) in the Google Earth Engine JavaScript API documentation to figure out the basics, and then I skimmed through the sections relevant to my interests in the main [guide](https://developers.google.com/earth-engine/) to get started: Images, Image Collections, Features, and Feature Collections. Later I found the rest of the documentation helpful as I started to get into issues of mapping, reducing, and data import/export in answering the agricultural land fallowing question.

Google Earth Engine has two fundamental geographic data structures types that you should be familiar with:
 
 1. [**Images**](https://developers.google.com/earth-engine/image_overview): This is how Google Earth Engine represents raster data types. They are composed of bands (each with its own name, data type, pixel resolution, and projection) and a dictionary of properties storing image metadata. Multiple images (covering multiple areas and/or the same area over time) can be grouped together into an ImageCollection.
 2. [**Features**](https://developers.google.com/earth-engine/features): This is how Google Earth Engine represents vector data types. They are composed of a geometry and a dictionary of other properties of interest. Features can be grouped into a FeatureCollection.

<a name="data"></a>
## Setting Up Data

To figure out what land had been fallowed in the Central Valley in 2015 relative to 2010, the first thing I needed was to know what exactly counted as California's Central Valley. There are various sources one could use to delineate the border of the Central Valley, each likely with slightly different definitions of where that border was that would give you slightly different answers of how much land has been fallowed. I chose to use the region that the [California Gap Analysis Project](http://www.biogeog.ucsb.edu/projects/gap/gap_data_reg.html) at UC Santa Barbara defined as the Great Central Valley. I downloaded the Central Valley land cover coverage, which consists of planar-enforced polygons specifying land cover and land use across the region as of 1998, and then I used ArcMap to dissolve all the polygons into one giant polygon, the outline of which would give me the border of the Central Valley, and saved this as a KML file (using  WGS 84 as the datum).

KML files can be imported into a Google Fusion Table, which can then be imported into Google Earth Engine as a FeatureCollection using the Fusion Table's id (specific instructions [here](https://developers.google.com/earth-engine/importing)) like so in my script:

`var centralValley = ee.FeatureCollection('ft:1h46ENpEp8vO3pOe1EqeF1sZLEDhSVMxbu8pHAoU4', 'geometry');`

Next I needed satellite imagery of the area. Google Earth Engine has both raw and processed data from all the Landsat satellites available as ImageCollections. Ideally, I would have used Landsat 7 Surface Reflectance data, because it is available from January 1, 1999, to the present day, meaning it includes all the dates of interest to me in one, apples-to-apples data set. However, Landsat 7 commonly has white striping across sections of its imagery because of the failure of the [Scan Line Corrector](http://landsat.usgs.gov/products_slcoffbackground.php) in 2003. For example, the below image shows a composite July 2010 Landsat 7 photo of the Merced, California, area.



Approximately 22% of any given Landsat 7 image is lost because of the SLC failure, and since I'm interested in calculating area of specific pixels, I wanted to use complete imagery (USGS 2015). So instead, I used Landsat 5 data (available from January 1, 1984, to May 5, 2012) for 2010 and Landsat 8 data (available from April 11, 2013, to the present day) for 2015. Since these are different satellites that collect slightly different bands, I would have to treat each of them separately when I did my analysis.

<a name="classification"></a>
## Approach 1: Classification

<a name="ndvi"></a>
## Approach 2: NDVI Difference

<a name="results"></a>
## Results

<a name="bib"></a>
### Sources

California Gap Analysis, 1998. "Land-cover for California." Biogeography Lab, University of California, Santa Barbara.

Google Earth Engine Team, 2015. "Google Earth Engine: A planetary-scale geospatial analysis platform." https://earthengine.google.com

Griffin D and Anchukaitis KJ, 2014. “How unusual is the 2012–2014 California drought?” *Geophys. Res. Lett.*, 41, 9017–9023, doi:10.1002/2014GL062433

Lund J. "The banality of California's '1200-year' drought." *California WaterBlog*. September 23, 2015.

U.S. Geological Survey, 2015. "SLC-off Products: Background." http://landsat.usgs.gov/products_slcoffbackground.php
