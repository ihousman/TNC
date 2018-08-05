/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = /* color: #98ff00 */ee.Geometry.Polygon(
        [[[-107.88010335430403, 37.74944967250176],
          [-104.41965417436563, 37.91850622749146],
          [-105.360767292844, 39.25236887854654],
          [-107.57914696634225, 39.18649132261251]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
//Module imports
var getImageLib = require('users/USFS_GTAC/modules:getImagesLib.js');
////////////////////////////////////////////////////////////////////////////////
// Define user parameters:

// 1. Specify study area: Study area
// Can specify a country, provide a fusion table  or asset table (must add 
// .geometry() after it), or draw a polygon and make studyArea = drawnPolygon
var rio = ee.FeatureCollection('users/ianhousman/RIO/Rio_Grande_NF_Boundary_10kBuffer_albers_diss').geometry();
var fnf = ee.FeatureCollection('projects/USFS/LCMS-NFS/R1/FNF/FNF_GNP_Merge_Admin_BND_1k').geometry();
var bt = ee.FeatureCollection('projects/USFS/LCMS-NFS/R4/BT/BT_LCMS_ProjectArea_5km').geometry();
var studyArea = geometry;

// 2. Update the startJulian and endJulian variables to indicate your seasonal 
// constraints. This supports wrapping for tropics and southern hemisphere.
// startJulian: Starting Julian date 
// endJulian: Ending Julian date
var startJulian = 190;
var endJulian = 250; 

// 3. Specify start and end years for all analyses
// More than a 3 year span should be provided for time series methods to work 
// well. If using Fmask as the cloud/cloud shadow masking method, this does not 
// matter
var startYear = 2010;
var endYear = 2018;

// 4. Specify an annual buffer to include imagery from the same season 
// timeframe from the prior and following year. timeBuffer = 1 will result 
// in a 3 year moving window
var timebuffer = 1;

// 5. Specify the weights to be used for the moving window created by timeBuffer
//For example- if timeBuffer is 1, that is a 3 year moving window
//If the center year is 2000, then the years are 1999,2000, and 2001
//In order to overweight the center year, you could specify the weights as
//[1,5,1] which would duplicate the center year 5 times and increase its weight for
//the compositing method
var weights = [1,5,1];


// 6. Set up Names for the export
var outputName = 'Medoid-Landsat';

// 7. Provide location composites will be exported to
//This should be an asset folder, or more ideally, an asset imageCollection
var exportPathRoot = 'users/ianhousman/test';

// 8. Choose medoid or median compositing method. 
// Median tends to be smoother, while medoid retains 
// single date of observation across all bands
// If not exporting indices with composites to save space, medoid should be used
var compositingMethod = 'medoid';

// 9. Choose Top of Atmospheric (TOA) or Surface Reflectance (SR) 
// Specify TOA or SR
// Current implementation does not support Fmask for TOA
var toaOrSR = 'TOA';

// 10. Choose whether to include Landat 7
// Generally only included when data are limited
var includeSLCOffL7 = false;

//11. Whether to defringe L5
//Landsat 5 data has fringes on the edges that can introduce anomalies into 
//the analysis.  This method removes them, but is somewhat computationally expensive
var defringeL5 = false;

// 12. Choose cloud/cloud shadow masking method
// Choices are a series of booleans for cloudScore, TDOM, and elements of Fmask
//Fmask masking options will run fastest since they're precomputed
//CloudScore runs pretty quickly, but does look at the time series to find areas that 
//always have a high cloudScore to reduce comission errors- this takes some time
//and needs a longer time series (>5 years or so)
//TDOM also looks at the time series and will need a longer time series
var applyCloudScore = true;
var applyFmaskCloudMask = false;

var applyTDOM = true;
var applyFmaskCloudShadowMask = false;

var applyFmaskSnowMask = false;

// 13. Cloud and cloud shadow masking parameters.
// If cloudScoreTDOM is chosen
// cloudScoreThresh: If using the cloudScoreTDOMShift method-Threshold for cloud 
//    masking (lower number masks more clouds.  Between 10 and 30 generally 
//    works best)
var cloudScoreThresh = 20;

// Percentile of cloud score to pull from time series to represent a minimum for 
// the cloud score over time for a given pixel. Reduces comission errors over 
// cool bright surfaces. Generally between 5 and 10 works well. 0 generally is a
// bit noisy
var cloudScorePctl = 10; 

// zScoreThresh: Threshold for cloud shadow masking- lower number masks out 
//    less. Between -0.8 and -1.2 generally works well
var zScoreThresh = -1;

// shadowSumThresh: Sum of IR bands to include as shadows within TDOM and the 
//    shadow shift method (lower number masks out less)
var shadowSumThresh = 0.35;

// contractPixels: The radius of the number of pixels to contract (negative 
//    buffer) clouds and cloud shadows by. Intended to eliminate smaller cloud 
//    patches that are likely errors
// (1.5 results in a -1 pixel buffer)(0.5 results in a -0 pixel buffer)
// (1.5 or 2.5 generally is sufficient)
var contractPixels = 1.5; 

// dilatePixels: The radius of the number of pixels to dilate (buffer) clouds 
//    and cloud shadows by. Intended to include edges of clouds/cloud shadows 
//    that are often missed
// (1.5 results in a 1 pixel buffer)(0.5 results in a 0 pixel buffer)
// (2.5 or 3.5 generally is sufficient)
var dilatePixels = 2.5;

// 14. correctIllumination: Choose if you want to correct the illumination using
// Sun-Canopy-Sensor+C correction. Additionally, choose the scale at which the
// correction is calculated in meters.
var correctIllumination = false;
var correctScale = 250;

//15. Export params
var crs = 'EPSG:5070';
var transform = [30,0,-2361915.0,0,-30,3177735.0];//Specify transform if scale is null and snapping to known grid is needed
var scale = null;//Specify scale if transform is null
///////////////////////////////////////////////////////////////////////
// End user parameters
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Start function calls
// Prepare dates
//Wrap the dates if needed
if (startJulian > endJulian) {
  endJulian = endJulian + 365;
}
var startDate = ee.Date.fromYMD(startYear,1,1).advance(startJulian-1,'day');
var endDate = ee.Date.fromYMD(endYear,1,1).advance(endJulian-1,'day');
print('Start and end dates:', startDate, endDate);

//Do some error checking
toaOrSR = toaOrSR.toUpperCase();
if(toaOrSR === 'TOA'){
    applyFmaskCloudMask = false;

    applyFmaskCloudShadowMask = false;

    applyFmaskSnowMask = false;
  }
////////////////////////////////////////////////////////////////////////////////
// Get Landsat image collection
var ls = getImageLib.getImageCollection(studyArea,startDate,endDate,startJulian,endJulian,
  toaOrSR,includeSLCOffL7,defringeL5);

// Apply relevant cloud masking methods
if(applyCloudScore){
  print('Applying cloudScore');
  ls = getImageLib.applyCloudScoreAlgorithm(ls,getImageLib.landsatCloudScore,cloudScoreThresh,cloudScorePctl,contractPixels,dilatePixels); 
  
}

if(applyFmaskCloudMask){
  print('Applying Fmask cloud mask');
  ls = ls.map(function(img){return getImageLib.cFmask(img,'cloud')});
}

if(applyTDOM){
  print('Applying TDOM');
  //Find and mask out dark outliers
  ls = getImageLib.simpleTDOM2(ls,zScoreThresh,shadowSumThresh,contractPixels,dilatePixels);
}
if(applyFmaskCloudShadowMask){
  print('Applying Fmask shadow mask');
  ls = ls.map(function(img){return getImageLib.cFmask(img,'shadow')});
}
if(applyFmaskSnowMask){
  print('Applying Fmask snow mask');
  ls = ls.map(function(img){return getImageLib.cFmask(img,'snow')});
}



// Add zenith and azimuth
if (correctIllumination){
  ls = ls.map(function(img){
    return getImageLib.addZenithAzimuth(img,toaOrSR);
  });
}

// Add common indices- can use addIndices for comprehensive indices 
//or simpleAddIndices for only common indices
ls = ls.map(getImageLib.simpleAddIndices);

// Create composite time series
var ts = getImageLib.compositeTimeSeries(ls,startYear,endYear,startJulian,endJulian,timebuffer,weights,compositingMethod);

var f = ee.Image(ts.first());
Map.addLayer(f,getImageLib.vizParamsFalse,'First-non-illuminated',false);

// Correct illumination
if (correctIllumination){
  print('Correcting illumination');
  ts = ts.map(getImageLib.illuminationCondition)
    .map(function(img){
      return getImageLib.illuminationCorrection(img, correctScale,studyArea);
    });
  var f = ee.Image(ts.first());
  Map.addLayer(f,getImageLib.vizParamsFalse,'First-illuminated',false);
}


// Export composite collection
var exportBands = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2', 'temp'];
getImageLib.exportCollection(exportPathRoot,outputName,studyArea,crs,transform,scale,
ts,startYear,endYear,startJulian,endJulian,compositingMethod,timebuffer,exportBands,toaOrSR,weights,
              applyCloudScore, applyFmaskCloudMask,applyTDOM,applyFmaskCloudShadowMask,applyFmaskSnowMask,includeSLCOffL7,correctIllumination);

////////////////////////////////////////////////////////////////////////////////
// Load the study region, with a blue outline.
// Create an empty image into which to paint the features, cast to byte.
// Paint all the polygon edges with the same number and width, display.
var empty = ee.Image().byte();
var outline = empty.paint({
  featureCollection: studyArea,
  color: 1,
  width: 3
});
Map.addLayer(outline, {palette: '0000FF'}, "Study Area", false);
// Map.centerObject(studyArea, 6);
