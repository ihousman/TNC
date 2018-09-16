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
var zTrend =ee.ImageCollection('projects/igde-work/raster-data/z-score-trend-collection');

Map.addLayer(lt)
Map.addLayer(zTrend)

Map.addLayer(igdes)

