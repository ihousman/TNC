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

var lt = ee.ImageCollection('projects/igde-work/raster-data/LANDTRENDR-collection');
var harmonics = ee.ImageCollection('projects/igde-work/raster-data/harmonic-coefficients-collection');
harmonics = harmonics.map(function(img){
  var yr = ee.Number.parse(img.id().split('_').get(2)).add(1);
  return ee.Image(dLib.multBands(img,1,0.001)).float().set({'system:time_start':ee.Date.fromYMD(yr,6,1).millis(),
                  'modelLength':3,'noDependents':9})
})
var zTrend =ee.ImageCollection('projects/igde-work/raster-data/z-score-trend-collection');




var pap = harmonics
    .map(getImageLib.getPhaseAmplitudePeak);

var amplitudes = pap.select(['.*_amplitude']);
var phases = pap.select(['.*_phase']);
var peakJulians = pap.select(['.*peakJulianDay']);
    
 
Map.addLayer(peakJulians.select(['NBR.*']),{'min':0,'max':365},'peakJulians',false);
Map.addLayer(lt,{},'Landtrendr Fitted Values',false);
Map.addLayer(zTrend,{},'z and trend values',false);
Map.addLayer(harmonics,{},'harmonic coeffs',false);
Map.addLayer(igdes)

