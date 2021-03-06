/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-122.5614899897987, 39.17664376185983],
          [-122.3582429194862, 38.444708512738714],
          [-120.5454987788612, 38.397367776330576],
          [-120.8311433101112, 39.240489425285]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
//Wrapper for running harmonic regression across a moving window of years

//Module imports
var getImageLib = require('users/ianhousman/TNC:gde-pulse/modules/getImagesLib.js');
var dLib = require('users/ianhousman/TNC:gde-pulse/modules/changeDetectionLib.js');
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Define user parameters:

// 1. Specify study area: Study area
// Can specify a country, provide a fusion table  or asset table (must add 
// .geometry() after it), or draw a polygon and make studyArea = drawnPolygon
var sa = ee.FeatureCollection('projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping').geometry();
// sa = sa.intersection(geometry);

var studyArea =sa.bounds();
// 2. Update the startJulian and endJulian variables to indicate your seasonal 
// constraints. This supports wrapping for tropics and southern hemisphere.
// startJulian: Starting Julian date 
// endJulian: Ending Julian date
var startJulian = 1;
var endJulian = 365; 

// 3. Specify start and end years for all analyses
// More than a 3 year span should be provided for time series methods to work 
// well. If using Fmask as the cloud/cloud shadow masking method, this does not 
// matter
var startYear = 2018;
var endYear = 2020;

// 4. Specify an annual buffer to include imagery from the same season 
// timeframe from the prior and following year. timeBuffer = 1 will result 
// in a 3 year moving window
var timebuffer = 1;


// 7. Choose Top of Atmospheric (TOA) or Surface Reflectance (SR) 
// Specify TOA or SR
// Current implementation does not support Fmask for TOA
var toaOrSR = 'SR';

// 8. Choose whether to include Landat 7
// Generally only included when data are limited
var includeSLCOffL7 = false;

//9. Whether to defringe L5
//Landsat 5 data has fringes on the edges that can introduce anomalies into 
//the analysis.  This method removes them, but is somewhat computationally expensive
var defringeL5 = true;

// 10. Choose cloud/cloud shadow masking method
// Choices are a series of booleans for cloudScore, TDOM, and elements of Fmask
//Fmask masking options will run fastest since they're precomputed
//CloudScore runs pretty quickly, but does look at the time series to find areas that 
//always have a high cloudScore to reduce comission errors- this takes some time
//and needs a longer time series (>5 years or so)
//TDOM also looks at the time series and will need a longer time series
var applyCloudScore = false;
var applyFmaskCloudMask = true;

var applyTDOM = false;
var applyFmaskCloudShadowMask = true;

var applyFmaskSnowMask = true;

// 11. Cloud and cloud shadow masking parameters.
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

// 12. correctIllumination: Choose if you want to correct the illumination using
// Sun-Canopy-Sensor+C correction. Additionally, choose the scale at which the
// correction is calculated in meters.
var correctIllumination = false;
var correctScale = 250;//Choose a scale to reduce on- 250 generally works well

//13. Export params
//Whether to export composites
var exportComposites = false;

//Set up Names for the export
var outputName = 'Harmonic_Coefficients_';

//Provide location composites will be exported to
//This should be an asset folder, or more ideally, an asset imageCollection
var exportPathRoot = 'projects/igde-work/raster-data/harmonic-coefficients-collection';

// var exportPathRoot = 'projects/USFS/LCMS-NFS/R4/BT/Base-Learners/Base-Learners-Collection';
//CRS- must be provided.  
//Common crs codes: Web mercator is EPSG:4326, USGS Albers is EPSG:5070, 
//WGS84 UTM N hemisphere is EPSG:326+ zone number (zone 12 N would be EPSG:32612) and S hemisphere is EPSG:327+ zone number
var crs = 'EPSG:5070';

//Specify transform if scale is null and snapping to known grid is needed
var transform = [30,0,-2361915.0,0,-30,3177735.0];

//Specify scale if transform is null
var scale = null;


////////////////////////////////////////////////
//Harmonic regression parameters

//Which harmonics to include
//Is a list of numbers of the n PI per year
//Typical assumption of 1 cycle/yr would be [2]
//If trying to overfit, or expected bimodal phenology try adding a higher frequency as well
//ex. [2,4]
var whichHarmonics = [2];

//Which bands/indices to run harmonic regression across
// var indexNames =['NDVI'];//,'NBR','NDMI','nir','swir1','swir2','tcAngleBG'];//['nir','swir1','swir2','NDMI','NDVI','NBR','tcAngleBG'];//['blue','green','red','nir','swir1','swir2','NDMI','NDVI','NBR','tcAngleBG'];
var indexNames = ['NBR','NDMI','NDVI','SAVI','EVI','brightness','greenness','wetness','tcAngleBG'];

var detrend = false;
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//Function Calls
//Get all images
var allScenes =getImageLib.getProcessedLandsatScenes(studyArea,startYear,endYear,startJulian,endJulian,
  toaOrSR,includeSLCOffL7,defringeL5,applyCloudScore,applyFmaskCloudMask,applyTDOM,
  applyFmaskCloudShadowMask,applyFmaskSnowMask,
  cloudScoreThresh,cloudScorePctl,
  zScoreThresh,shadowSumThresh,
  contractPixels,dilatePixels
  )
  
  .map(getImageLib.addSAVIandEVI);
////////////////////////////////////////////////////////////
//Iterate across each time window and fit harmonic regression model
var coeffCollection = ee.List.sequence(startYear+timebuffer,endYear-timebuffer,1).getInfo().map(function(yr){
  //Set up dates
  var startYearT = yr-timebuffer;
  var endYearT = yr+timebuffer;
  
  //Get scenes for those dates
  var allScenesT = allScenes.filter(ee.Filter.calendarRange(startYearT,endYearT,'year'));
  
  //Fit harmonic model
  var coeffsPredicted =getImageLib.getHarmonicCoefficientsAndFit(allScenesT,indexNames,whichHarmonics,detrend);
  
  //Set some properties
  var coeffs = coeffsPredicted[0]
            .set({'system:time_start':ee.Date.fromYMD(yr,6,1).millis(),
            'timebuffer':timebuffer,
            'startYearT':startYearT,
            'endYearT':endYearT,
            });
 
  //Get predicted values for visualization
  var predicted = coeffsPredicted[1];
  // Map.addLayer(predicted,{},'predicted',false);
  
  //Optionally simplify coeffs to phase, amplitude, and date of peak
  // if(whichHarmonics.indexOf(2) > -1){
  //   var pap = ee.Image(getImageLib.getPhaseAmplitudePeak(coeffs));
  //   // print(pap);
    
  //   var vals = coeffs.select(['.*_intercept']);
  //   var amplitudes = pap.select(['.*_amplitude']);
  //   var phases = pap.select(['.*_phase']);
  //   var peakJulians = pap.select(['.*peakJulianDay']);
    
  //   // Map.addLayer(pap,{},'pap',false);
  //   Map.addLayer(peakJulians,{'min':0,'max':365},'peakJulians',false);
  
    
  //   // Turn the HSV data into an RGB image and add it to the map.
  //   var seasonality = ee.Image.cat(phases.select([0]), 
  //                                   amplitudes.select([0]), 
  //                                   vals.select([0])).hsvToRgb();
  
  //   Map.addLayer(seasonality, {'min':0,'max':1}, 'Seasonality',false);
    
  // };
  
  //Export image
  var coeffsOut = coeffs
    .multiply(1000).int16().clip(sa);
   
  coeffsOut = coeffsOut.copyProperties(coeffs)
                        .copyProperties(coeffs,['system:time_start'])
   

  var outName = outputName + startYearT.toString() + '_'+ endYearT.toString();
  var outPath = exportPathRoot + '/' + outName;
  getImageLib.exportToAssetWrapper(ee.Image(coeffsOut),outName,outPath,
  'mean',studyArea,scale,crs,transform);
  return coeffs;
  
});

// coeffCollection = ee.ImageCollection(coeffCollection);
// Map.addLayer(coeffCollection);
// function runTaskList() {


//     //1. task local type-EXPORT_FEATURES awaiting-user-config

//     //2. task local type-EXPORT_IMAGE awaiting-user-config

//     var tasklist = document.getElementsByClassName('awaiting-user-config');

//     for (var i = 0; i < tasklist.length; i++)

//         tasklist[i].children[2].click();

// }

// // confirmAll();

// function confirmAll() {

//     var ok = document.getElementsByClassName('goog-buttonset-default goog-buttonset-action');

//     for (var i = 0; i < ok.length; i++)

//         ok[i].click();

// }