# Land Fallowing in Google Earth Engine

The scripts in this repo show how I used Google Earth Engine to estimate the total area of land fallowed in California's Central Valley in 2015 relative to 2010 as an attempt to see what impact the ongoing drought has had on agriculture. The following shows how I approached the project and could be used as a tutorial for someone interested in using Google Earth Engine for a similar project.

## Table of Contents

- [Introduction](#intro)
- Setting Up Google Earth Engine
- Setting Up Data
- Approach 1: Classification
- Approach 2: NDVI Difference
- Results
- Further Reading

<a name="intro"></a>
## Introduction

As 2015 comes to a close, California is still unquestionably in a severe [drought](http://californiawaterblog.com/2015/09/23/the-banality-of-californias-1200-year-drought/), although estimates of exactly how rare (and therefore how serious compared to other droughts that could happen) range from 1 in 15 years drought to 1 in 1200 years (Griffin and Anchukaitis 2014). Whether this is the drought to end all droughts or not, it has certainly had an impact on agriculture: with far less water available for irrigation, farmers with insufficient flows have had to make the decision whether to pay for water (either by pumping groundwater or by buying water from someone willing to sell theirs) or to fallow their fields, leaving them bare of crops.

The Central Valley is California's largest agricultural area and highly dependent on irrigation, so looking at how it's doing gives a good picture of how California agriculture is doing. If you look at satellite photos of California's Central Valley in 2010 and 2015, things clearly seem browner. But exactly how much browner? I was curious how much land had been fallowed this year relative to 2010, before the drought kicked into gear, and wanted to try out a few remote sensing approaches to answer this question. [Google Earth Engine](https://earthengine.google.com/), which describes itself as "a planetary-scale platform for Earth science data and analysis," made it relatively straightforward to pull together the necessary data and try out two different ways of estimating fallowed land.

My two methods of doing a simple estimation of fallowed land were: 

1. Performing a basic land cover classification for both years using a random forest model based on training data I'd specified, and then considering land that had converted from vegetation to bare soil to be fallowed.
2. Finding the Normalized Difference Vegetation Index (NDVI) for each pixel as an estimate of greenness and photosynthetic activity, and considering pixels with NDVIs that had decreased substantially from 2010 to 2015 to be fallowed land.

I'll go over the details of how I did all this in the subsequent sections.




## Setting Up Google Earth Engine

## Setting Up Data

## Approach 1: Classification

## Approach 2: NDVI Difference

## Results

### Further reading

Griffin D and Anchukaitis KJ. (2014). “How unusual is the 2012–2014 California drought?” *Geophys. Res. Lett.*, 41, 9017–9023, doi:10.1002/2014GL062433

Lund J. "The banality of California's '1200-year' drought." *California WaterBlog*. September 23, 2015.
