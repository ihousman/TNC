//Module imports
var getImageLib = require('users/USFS_GTAC/modules:getImagesLib.js');
var dLib = require('users/USFS_GTAC/modules:changeDetectionLib.js');
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
dLib.getExistingChangeData();
// Define user parameters:

// 1. Specify study area: Study area
// Can specify a country, provide a fusion table  or asset table (must add 
// .geometry() after it), or draw a polygon and make studyArea = drawnPolygon
var sa = ee.FeatureCollection('projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping').geometry();
var igdes = ee.FeatureCollection('projects/igde-work/igde-data/GDEpulse2018_iGDE_V1_20180802_joined_annual_depth_macro_veg');

var lt = ee.ImageCollection('projects/igde-work/raster-data/LANDTRENDR-collection')
        .map(function(img){return dLib.multBands(img,1,0.0001)});
var harmonics = ee.ImageCollection('projects/igde-work/raster-data/harmonic-coefficients-collection');
harmonics = harmonics.map(function(img){
  var yr = ee.Number.parse(img.id().split('_').get(2)).add(1);
  return ee.Image(dLib.multBands(img,1,0.001)).set({'system:time_start':ee.Date.fromYMD(yr,6,1).millis(),
                  'modelLength':3,'noDependents':9})
})
var zTrend =ee.ImageCollection('projects/igde-work/raster-data/z-score-trend-collection');

var z = zTrend.select(['.*_Z']);
var trend = zTrend.select(['.*._slope'])
print(trend)

var pap = harmonics
    .map(getImageLib.getPhaseAmplitudePeak);

var amplitudes = pap.select(['.*_amplitude']);
var phases = pap.select(['.*_phase']);
var peakJulians = pap.select(['.*peakJulianDay']);
 
    
//Set up the years to filter on- this is hard-coded since its set up oddly
var years = ee.List.sequence(1985,2018);
//Reformat the igdes to have a unique feature per year
var igdeyr = years.getInfo().map(function(yz){
  var fieldName ='Depth'+ yz.toString();
  // var t = f.select([fieldName], ['AvgAnnD'])
  //         .map(function(ft){return ft.set('year',yz)});
  var t = igdes.select([fieldName], ['AvgAnnD']);
  var depth = t.reduceToImage(['AvgAnnD'], ee.Reducer.first());
  var tID = igdes.select(['ORIG_FID']).reduceToImage(['ORIG_FID'], ee.Reducer.first());
  t = depth;
  t = t.updateMask(t.select([0]).lt(1000))
      .divide(100)
      .addBands(tID.int64())
      .rename(['Depth-To-Groundwater-divided-by-one-hundred','ORIG_FID'])
      .set('system:time_start',ee.Date.fromYMD(yz,6,1).millis())
  return t;
});
igdeyr = ee.ImageCollection(igdeyr);

var joined = getImageLib.joinCollections(igdeyr,lt.select(['.*_NBR','.*_SAVI','.*EVI']))
Map.addLayer(joined.select([0,2,3,4]),{},'joined',false)
// Map.addLayer(peakJulians.select(['NBR.*']),{'min':0,'max':365},'peakJulians',false);
// Map.addLayer(lt.select(['.*_NBR']),{},'Landtrendr Fitted Values',false);
// Map.addLayer(zTrend.select(['NBR.*']),{},'z and trend values',false);
// Map.addLayer(harmonics,{},'harmonic coeffs',false);
Map.addLayer(igdes)

