var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018_v2');

var years = ee.List.sequence(1985,2018).getInfo();
var fields = years.map(function(yr){return 'Depth'+yr.toString()});
print(fields);
// var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDEveg053_Landsat_dissolved_8022018_1000m_Depth_gwell_macro_veg_final_gt5yr_lt30ft');
var igdesC = years.map(function(yr){
  var field = 'Depth' + yr.toString();
  var img = igdes.reduceToImage([field],ee.Reducer.first());
  img = img.updateMask(img.neq(-999))
  img = img.set('system:time_start',ee.Date.fromYMD(yr,6,1).millis());
  return img
});
var c 
igdesC = ee.ImageCollection(igdesC)
Map.addLayer(igdesC)