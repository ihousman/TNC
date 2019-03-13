var getImageLib = require('users/ianhousman/TNC:gde-pulse/modules/getImagesLib.js');
var dLib = require('users/ianhousman/TNC:gde-pulse/modules/changeDetectionLib.js');

var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018_v2');

var years = ee.List.sequence(1985,2018).getInfo();
var fields = years.map(function(yr){return 'Depth'+yr.toString()});
print(fields);
// var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDEveg053_Landsat_dissolved_8022018_1000m_Depth_gwell_macro_veg_final_gt5yr_lt30ft');
var igdesC = years.map(function(yr){
  var field = 'Depth' + yr.toString();
  var img = igdes.reduceToImage([field],ee.Reducer.first());
  img = img.updateMask(img.neq(-999)).rename(['Depth_to_gw'])
  img = img.set('system:time_start',ee.Date.fromYMD(yr,6,1).millis());
  return img
});
var c =ee.ImageCollection('projects/igde-work/raster-data/LANDTRENDR-collection');
c = c.map(function(img){return dLib.multBands(img,1,0.0001)}).select(['.*NDMI']);

igdesC = ee.ImageCollection(igdesC)

var joined = getImageLib.joinCollections(c,igdesC)
Map.addLayer(joined)