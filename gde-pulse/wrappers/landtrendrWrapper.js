//Module imports
var getImageLib = require('users/ianhousman/TNC:gde-pulse/modules/getImagesLib.js');
var dLib = require('users/ianhousman/TNC:gde-pulse/modules/changeDetectionLib.js');
///////////////////////////////////////////////////////////////////////////////
dLib.getExistingChangeData();

// Define study area
var studyAreaName = 'CA'
var studyArea = ee.Feature(ee.FeatureCollection('TIGER/2016/States')
            .filter(ee.Filter.eq('NAME','California'))
            .first())
            .convexHull(10000)
            .buffer(10000)
            .geometry();

var studyAreaBounds = studyArea.bounds();
var outputBaseFolder = 'projects/igde-work/raster-data/LANDTRENDR-collection'
var startYear = 1983;
var endYear = 2019;
var timebuffer = 1;
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
var indexList = ee.List(['blue','green','red','nir','swir1','swir2','NDMI','NBR','NDVI','wetness','greenness','brightness','tcAngleBG']);
var indexListString = getImageLib.listToString(indexList.getInfo(),'_');

//The corresponding direction of forest loss for the given band/index specified above in indexList
// var ltDirection = ee.List([-1,    1]);
var ltDirection =ee.List([1,-1,1,-1,    1,      1,   -1, -1,    -1,   -1,           -1,        1,          -1]);

var composites = ee.ImageCollection('projects/igde-work/raster-data/composite-collection')
        .map(function(img){return dLib.multBands(img,1,0.0001)})
        .map(getImageLib.simpleAddIndices)
        .map(getImageLib.getTasseledCap)
        .map(getImageLib.simpleAddTCAngles);

////////////////////////////////////////////////////////////
//Landtrendr code
var indexDirList = indexList.zip(ltDirection).getInfo();

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
var mmu        = 15;       //15 minimum mapping unit for disturbance patches - units of pixels

var distParams = {
    tree_loss1: treeLoss1,
    tree_loss20: treeLoss20,  
    pre_val: preVal           
  };
  

var outputCollection;
indexDirList.map(function(indexDir){
  var indexName = indexDir[0];
  var distDir = indexDir[1];
  print(indexName,distDir)
  var tsIndex = composites.select([indexName]);

  var ltOutputs = dLib.landtrendrWrapper(tsIndex,startYear+timebuffer,endYear-timebuffer,indexName,distDir,run_params,distParams,mmu);

  var ltAnnualFitted = ltOutputs[2];
  
  if(outputCollection === undefined){
    outputCollection = ltAnnualFitted
  }else{
    outputCollection = getImageLib.joinCollections(outputCollection,ltAnnualFitted,false);
  }
  
});

Map.addLayer(outputCollection)

var years = ee.List.sequence(startYear+timebuffer,endYear-timebuffer).getInfo();

  years.map(function(year){
    var ltYr = ee.Image(outputCollection.filter(ee.Filter.calendarRange(year,year,'year')).first())
    .multiply(10000).int16()
    .set('bandsUsed',indexListString)
    .set('system:time_start',ee.Date.fromYMD(year,6,1).millis());
 
  var exportName = 'LT-Fit_' + year.toString();
    var exportPath = outputBaseFolder + '/LANDTRENDR-Collection/'+ exportName;
    
    getImageLib.exportToAssetWrapper(ltYr,exportName,exportPath,'mean',
      studyArea,null,crs,transform);
  });


