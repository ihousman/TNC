//Module imports
var getImageLib = require('users/USFS_GTAC/modules:getImagesLib.js');
var dLib = require('users/USFS_GTAC/modules:changeDetectionLib.js');
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
dLib.getExistingChangeData();

function addPrefixToCollectionBandNames(c,prefix){
  var bandNames = ee.Image(c.first()).bandNames();
	var outBandNames = bandNames.map(function(i){return ee.String(prefix).cat(i)});
	return c.select(bandNames,outBandNames);
}
// Define user parameters:

// 1. Specify study area: Study area
// Can specify a country, provide a fusion table  or asset table (must add 
// .geometry() after it), or draw a polygon and make studyArea = drawnPolygon
var sa = ee.FeatureCollection('projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping').geometry();

var crs = 'EPSG:5070';

//Specify transform if scale is null and snapping to known grid is needed
var transform = [30,0,-2361915.0,0,-30,3177735.0];

//Specify scale if transform is null
var scale = null;

var indexNames = ['NBR','NDMI','NDVI','SAVI','EVI','brightness','greenness','wetness','tcAngleBG'];
var indexEndWildcards = indexNames.map(function(bn){return '.*'+bn});
var indexStartWildcards = indexNames.map(function(bn){return bn +'.*'});

var igdes = ee.FeatureCollection('projects/igde-work/igde-data/GDEpulse2018_iGDE_V1_20180802_joined_annual_depth_macro_veg');

var composites = ee.ImageCollection('projects/igde-work/raster-data/composite-collection')
        .sort('system:time_start')
        .map(function(img){return dLib.multBands(img,1,0.0001)})
        .map(getImageLib.simpleAddIndices)
        .map(getImageLib.getTasseledCap)
        .map(getImageLib.simpleAddTCAngles)
        .map(getImageLib.addSAVIandEVI)
        .select(indexNames)
        

var lt = ee.ImageCollection('projects/igde-work/raster-data/LANDTRENDR-collection')
        .select(indexEndWildcards)
        .map(function(img){return dLib.multBands(img,1,0.0001)});


var harmonics = ee.ImageCollection('projects/igde-work/raster-data/harmonic-coefficients-collection');

// var zTrend =ee.ImageCollection('projects/igde-work/raster-data/z-score-trend-collection');
// zTrend = zTrend.filter(ee.Filter.calendarRange(185,249))
//         .map(function(img){
//           var y = ee.Date(img.get('system:time_start')).get('year');
//           return img.set('system:time_start',ee.Date.fromYMD(y,6,1).millis())
//         })
// var z = zTrend.select(['.*_Z'])
//   .map(function(img){return dLib.multBands(img,1,0.1)});
// var trend = zTrend.select(['.*._slope'])
//   .map(function(img){return dLib.multBands(img,1,0.0001)});

var pap = harmonics
    .map(getImageLib.getPhaseAmplitudePeak)
    .select(['.*_phase','.*_amplitude','.*peakJulianDay'])

//     // .map(function(img){return dLib.multBands(img,1,[1,1,1/365.0])});
var amplitudes = pap.select(['.*_amplitude']);
var phases = pap.select(['.*_phase']);
var peakJulians = pap.select(['.*peakJulianDay'])
Map.addLayer(peakJulians)
    
// //Set up the years to filter on- this is hard-coded since its set up oddly
// var years = ee.List.sequence(1985,2018);
// //Reformat the igdes to have a unique feature per year
// var igdeyr = years.getInfo().map(function(yz){
//   var fieldName ='Depth'+ yz.toString();
//   // var t = f.select([fieldName], ['AvgAnnD'])
//   //         .map(function(ft){return ft.set('year',yz)});
//   var t = igdes.select([fieldName], ['AvgAnnD']);
//   var depth = t.reduceToImage(['AvgAnnD'], ee.Reducer.first());
//   var tID = igdes.select(['ORIG_FID']).reduceToImage(['ORIG_FID'], ee.Reducer.first());
//   t = depth;
//   t = t.updateMask(t.select([0]).lt(1000))
//       .divide(100)
//       .addBands(tID.int64())
//       .rename(['Depth-To-Groundwater-divided-by-one-hundred','ORIG_FID'])
//       .set('system:time_start',ee.Date.fromYMD(yz,6,1).millis())
//   return t;
// });
// igdeyr = ee.ImageCollection(igdeyr);

// var bandName = 'wetness';
// var joined = getImageLib.joinCollections(igdeyr,lt)
// joined = getImageLib.joinCollections(joined,trend)
// joined = getImageLib.joinCollections(joined,z)
// joined = getImageLib.joinCollections(joined,pap)

// var bns = ee.Image(joined.first()).bandNames()
// var bnsOut = bns.map(function(bn){return ee.String('A_').cat(bn)})
// joined = joined.select(bns,bnsOut)
// print('j',joined)
// print(igdes.size())
// igdes = igdes.limit(50);
// var out = ee.List.sequence(1991,2018).map(function(yr){
//   var img = ee.Image(joined.filter(ee.Filter.calendarRange(yr,yr,'year')).first());
//   var outTable = img.reduceRegions(igdes, ee.Reducer.mean(), scale, crs, transform, 1);
//   outTable = outTable.map(function(f){return f.set('A_Year',yr)})
//   return outTable

// });
// out = ee.FeatureCollection(out).flatten()

// Export.table.toDrive(out, 'Export-test-small', 'TNC-GDEPulse-GEE-Export-Tables')
// joined = joined.map(function(img){
//   var out = img.reduceConnectedComponents(ee.Reducer.mean(), 'A_ORIG_FID', 1000);
//   // out = out.addBands(img.select([0,1,2]))
//   out = out.copyProperties(img,['system:time_start']);
//   return out;
  
// })
// Map.addLayer(joined,{},'joined',false)
// // Map.addLayer(peakJulians.select(['NBR.*']),{'min':0,'max':365},'peakJulians',false);
// // Map.addLayer(lt.select(['.*_NBR']),{},'Landtrendr Fitted Values',false);
// // Map.addLayer(zTrend.select(['NBR.*']),{},'z and trend values',false);
// // Map.addLayer(harmonics,{},'harmonic coeffs',false);
// Map.addLayer(igdes)

