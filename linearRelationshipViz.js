var getImageLib = require('users/ianhousman/TNC:gde-pulse/modules/getImagesLib.js');
var dLib = require('users/USFS_GTAC/modules:changeDetectionLib.js');

var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018_v2');

var years = ee.List.sequence(1985,2018).getInfo();
var igdesC = years.map(function(yr){
  yr = ee.Number(yr);
  var field = ee.String('Depth').cat(ee.String(yr));
  var img = igdes.reduceToImage([field],ee.Reducer.first());
  img = img.updateMask(img.neq(-999)).rename(['Depth_to_gw']).multiply(-1);
  img = img.set('system:time_start',ee.Date.fromYMD(yr,6,1).millis());
  return img;
});
var ltC =ee.ImageCollection('projects/igde-work/raster-data/LANDTRENDR-collection');
ltC = ltC.map(function(img){return dLib.multBands(img,1,0.001)}).select(['.*NDMI']);

igdesC = ee.ImageCollection.fromImages(igdesC);

var joined = getImageLib.joinCollections(ltC,igdesC);
joined = joined.map(function(img){
  var c = ee.Image(1);
  return c.addBands(img).copyProperties(img,['system:time_start']);
});

var fit = joined.reduce(ee.Reducer.linearRegression(2,1));
var model = fit.select(['coefficients']).arrayProject([0]).arrayFlatten([['intercept','slope']]);
var predicted = joined.map(function(img){
  var pred = img.select([1]).multiply(model.select(['slope'])).add(model.select(['intercept'])).rename(['Depth_to_gw_pred']);
  return img.addBands(pred).select([1,2,3]);
});
var r2 = dLib.getR2(joined,model,[2],[0,1]);
Map.addLayer(r2)
Map.addLayer(predicted,{},'Fitted Time Series',false);

var error = fit.select(['residuals']).arrayFlatten([['error']]);

Map.addLayer(error.abs(),{min:0,max:10,'palette':'00F,F00'},'Residual');