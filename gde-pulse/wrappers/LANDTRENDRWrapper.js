/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-122.03399043160425, 39.69289674376742],
          [-122.02712397652613, 39.64612112618452],
          [-121.9045577533816, 39.65405142583059],
          [-121.92069392281519, 39.70372725596056]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
//Wrapper for LANDTRENDR across an annual time series
//Supports multiple bands and/or indices
//Returns the raw LANDTRENDR output, a fitted time series and
//a thresholded year, magnitude, and duration of greatest disturbance

//Module imports
// var getImageLib = require('users/ianhousman/TNC:gde-pulse/modules/getImagesLib.js');
// var dLib = require('users/ianhousman/TNC:gde-pulse/modules/changeDetectionLib.js');
var getImagesLib = require('users/USFS_GTAC/modules:getImagesLib.js');
var dLib = require('users/USFS_GTAC/modules:changeDetectionLib.js');
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
dLib.getExistingChangeData();
// Define user parameters:

// 1. Specify study area: Study area
// Can specify a country, provide a fusion table  or asset table (must add 
// .geometry() after it), or draw a polygon and make studyArea = drawnPolygon
var sa = ee.FeatureCollection('projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping').geometry();
var studyArea =sa.bounds();

//Set up Names for the export
var outputName = 'LT_';

//Provide location composites will be exported to
//This should be an asset folder, or more ideally, an asset imageCollection
var exportPathRoot = 'projects/igde-work/raster-data/LANDTRENDR-collection-stack-format';

// var exportPathRoot = 'projects/USFS/LCMS-NFS/R4/BT/Base-Learners/Base-Learners-Collection';
//CRS- must be provided.  
//Common crs codes: Web mercator is EPSG:4326, USGS Albers is EPSG:5070, 
//WGS84 UTM N hemisphere is EPSG:326+ zone number (zone 12 N would be EPSG:32612) and S hemisphere is EPSG:327+ zone number
var crs = 'EPSG:5070';

//Specify transform if scale is null and snapping to known grid is needed
var transform = [30,0,-2361915.0,0,-30,3177735.0];

//Specify scale if transform is null
var scale = null;
//List of bands or indices to iterate across
//Typically a list of spectral bands or computed indices
//Can include: 'blue','green','red','nir','swir1','swir2'
//'NBR','NDVI','wetness','greenness','brightness','tcAngleBG'
// var indexList = ee.List(['nir','swir1']);
var indexList = ['blue','green','red','nir','swir1','swir2','NBR','NDMI','NDVI','SAVI','EVI','brightness','greenness','wetness','tcAngleBG'];
indexList = ['NBR']
//The corresponding direction of forest loss for the given band/index specified above in indexList
var ltDirection =[1,-1,1,-1,1,1,-1,-1,-1,-1,-1,-1,-1,-1,-1];


//Define landtrendr params
var run_params = { 
  maxSegments:            6,
  spikeThreshold:         0.9,
  vertexCountOvershoot:   3,
  preventOneYearRecovery: true,
  recoveryThreshold:      0.25,
  pvalThreshold:          0.05,
  bestModelProportion:    0.75,
  minObservationsNeeded:  6
};

//Define disturbance mapping filter parameters 
var treeLoss1  = 0.1;      //0.15 works well delta filter for 1 year duration disturbance, <= will not be included as disturbance - units are in units of segIndex defined in the following function definition
var treeLoss20 = 0.2;      //0.2 works well delta filter for 20 year duration disturbance, <= will not be included as disturbance - units are in units of segIndex defined in the following function definition
var preVal     = 0.01;      //0.2 works well. Set close to 0 if all pixels are wanted pre-disturbance value threshold - values below the provided threshold will exclude disturbance for those pixels - units are in units of segIndex defined in the following function definition
var mmu        = 0;       // minimum mapping unit for disturbance patches - units of pixels

var distParams = {
    tree_loss1: treeLoss1,
    tree_loss20: treeLoss20,  
    pre_val: preVal           
  };
  

//End params
///////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//Call on master wrapper function to get Landat scenes and composites

//Separate into scenes and composites for subsequent analysis
var composites = ee.ImageCollection('projects/igde-work/raster-data/composite-collection')
        .sort('system:time_start')
        .map(function(img){return dLib.multBands(img,1,0.0001)})
        .map(getImagesLib.simpleAddIndices)
        .map(getImagesLib.getTasseledCap)
        .map(getImagesLib.simpleAddTCAngles)
        .map(getImagesLib.addSAVIandEVI)
        .map(function(img){return img.clip(sa)});
var startYear = ee.Date(composites.first().get('system:time_start')).get('year');
var endYear = ee.Date(composites.sort('system:time_start',false).first().get('system:time_start')).get('year');


Map.addLayer(ee.Image(composites.first()),getImagesLib.vizParamsFalse,'comp')
////////////////////////////////////////////////////////////
//Landtrendr code

var exportNamePrefix = 'LT_Stack_' ;
indexList.map(function(indexName){
  print('Running LandTrendr for '+indexName)

  var ltStack = ee.Image(dLib.LANDTRENDRVertStack(composites, indexName, run_params, startYear, endYear));
  print('ltStack',ltStack)
  ltStack = ee.Image(dLib.LT_VT_vertStack_multBands(ltStack, 'landtrendr', 10000));
  ltStack = ltStack.int16();
  Map.addLayer(ltStack, {}, indexName+' Stack', false);
  
  // Export as Image
  var exportName = exportNamePrefix + indexName + '_' + startYear.getInfo() + '-' + endYear.getInfo();
  var exportPath = exportPathRoot + '/'+ exportName;    

  //Set up proper resampling for each band
  //Be sure to change if the band names for the exported image change
  var pyrObj = {'yrs_':'mode','fit_':'mean','rmse':'mean'};   
  var outObj = {};
  ltStack.bandNames().getInfo().map(function(bandName){
    Object.keys(pyrObj).map(function(key){
      if(key == bandName.substring(0,4)){
        outObj[bandName] = pyrObj[key]; 
      }
    });
  });
  
  getImagesLib.exportToAssetWrapper2(
    ltStack,
    exportName,
    exportPath,
    outObj,
    studyArea,
    scale,
    crs,
    transform
  );
  
  // Convert to durFitMagSlope format for plotting
  var durFitMagSlope = dLib.convertStack_To_DurFitMagSlope(ltStack, 'LT');
  durFitMagSlope = durFitMagSlope.map(function(img){return dLib.LT_VT_multBands(img, 0.0001)});
  Map.addLayer(durFitMagSlope, {}, 'durFitMagSlope', false)
  
  // Add to Map
  var newImage = durFitMagSlope.select(indexName+'_LT_fitted').map(function(img){return img.reproject(crs, transform, scale)});
  Map.addLayer(newImage, {'min': -0.35, 'max': 0.35}, indexName, false);
 
  
});






// var indexListString = getImageLib.listToString(indexList,'_');
// var indexDirList = ee.List(indexList).zip(ee.List(ltDirection)).getInfo();

// //Iterate across index and direction list
// var outputCollection;
// var outputStack;
// indexDirList.map(function(indexDir){
//   var indexName = indexDir[0];
//   var distDir = indexDir[1];
//   // print(indexName,distDir);
//   var tsIndex = composites.select([indexName]);
  
//   //Run master LT wrapper
//   //Returns the raw, heuristic output, and fitted collection
//   var ltOutputs = dLib.landtrendrWrapper(tsIndex,startYear,endYear,indexName,distDir,run_params,distParams,mmu);
  
//   var ltRaw = ltOutputs[0];
//   var ltHeuristic = ltOutputs[1];
//   var ltAnnualFitted = ltOutputs[2];
  
//   //Stack the heuristic output and stack each image
//   //in fitted collection using join
//   if(outputCollection === undefined){
//     outputCollection = ltAnnualFitted;
//     outputStack = ltHeuristic;
//   }else{
//     outputCollection = getImageLib.joinCollections(outputCollection,ltAnnualFitted,false);
//     outputStack = outputStack.addBands(ltHeuristic);
    
//   }
  
// });
// Map.addLayer(outputCollection,{},'LT Fitted IndexNames',false);
// Map.addLayer(outputStack.select([0]),{'min':startYear,'max':endYear,'palette':'FF0,F00'},indexList[0] + ' LT Change Year',false);
  
// // Export each fitted year
// var years = ee.List.sequence(startYear,endYear).getInfo();

//   years.map(function(year){
//     var ltYr = ee.Image(outputCollection.filter(ee.Filter.calendarRange(year,year,'year')).first())
//     .multiply(10000).int16()
//     .set('bandsUsed',indexListString)
//     .set('system:time_start',ee.Date.fromYMD(year,6,1).millis())
//     // .clip(sa)
//   var exportName = outputName + year.toString();
//     var exportPath = exportPathRoot + '/'+ exportName;
    
//     getImageLib.exportToAssetWrapper(ltYr,exportName,exportPath,'mean',
//       studyArea,null,crs,transform);
//   });
  
// //Export thresholded stack
// var exportName = outputName + 'LT_Stack';
// var exportPath = exportPathRoot + '/'+ exportName;
    
// getImageLib.exportToAssetWrapper(outputStack,exportName,exportPath,'mean',
//       studyArea,null,crs,transform);

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

