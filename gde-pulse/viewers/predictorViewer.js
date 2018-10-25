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
function addSuffixToCollectionBandNames(c,suffix){
  var bandNames = ee.Image(c.first()).bandNames();
	var outBandNames = bandNames.map(function(i){return ee.String(i).cat(suffix)});
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
var indexNamesComposites = ['NBR','NDMI','NDVI','SAVI','EVI','brightness','greenness','wetness','tcAngleBG','NIRv'];

var indexEndWildcards = indexNames.map(function(bn){return '.*'+bn});
var indexStartWildcards = indexNames.map(function(bn){return bn +'.*'});

// var igdes = ee.FeatureCollection('projects/igde-work/igde-data/GDEpulse2018_iGDE_V1_20180802_joined_annual_depth_macro_veg');
var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018_v2');
print(igdes.size())
var igdeCount = 15419;//igdes.size().getInfo();
var igdesL = igdes.toList(10000000,0);

var howMany = 1000;
var composites = ee.ImageCollection('projects/igde-work/raster-data/composite-collection')
        .sort('system:time_start')
        .map(function(img){return dLib.multBands(img,1,0.0001)})
        .map(getImageLib.simpleAddIndices)
        .map(getImageLib.getTasseledCap)
        .map(getImageLib.simpleAddTCAngles)
        .map(getImageLib.addSAVIandEVI)
        .select(indexNamesComposites);
        

var lt = ee.ImageCollection('projects/igde-work/raster-data/LANDTRENDR-collection')
        .select(indexEndWildcards)
        .map(function(img){return dLib.multBands(img,1,0.0001)});


var harmonics = ee.ImageCollection('projects/igde-work/raster-data/harmonic-coefficients-collection');

var zTrend =ee.ImageCollection('projects/igde-work/raster-data/z-score-trend-collection');

var daymet = ee.ImageCollection('projects/igde-work/raster-data/DAYMET-Collection');
daymet = addPrefixToCollectionBandNames(daymet,'dymt_');
var z = zTrend.select(['.*_Z'])
  .map(function(img){return dLib.multBands(img,1,0.1)});
var trend = zTrend.select(['.*._slope'])
  .map(function(img){return dLib.multBands(img,1,0.0001)});

zTrend = getImageLib.joinCollections(z,trend,false);
var zTrend1 = zTrend.filter(ee.Filter.calendarRange(121,185))
        .map(function(img){
          var y = ee.Date(img.get('system:time_start')).get('year');
          return img.set('system:time_start',ee.Date.fromYMD(y,6,1).millis())
        })
var zTrend2 = zTrend.filter(ee.Filter.calendarRange(185,249))
        .map(function(img){
          var y = ee.Date(img.get('system:time_start')).get('year');
          return img.set('system:time_start',ee.Date.fromYMD(y,6,1).millis())
        })
zTrend1 = addSuffixToCollectionBandNames(zTrend1,'_121_185');
zTrend2 = addSuffixToCollectionBandNames(zTrend2,'_185_249');

zTrend = getImageLib.joinCollections(zTrend1,zTrend2,false)


var pap = harmonics
    .map(function(img){return dLib.multBands(img,1,0.001)})
    .map(getImageLib.getPhaseAmplitudePeak)
    .select(['.*_phase','.*_amplitude','.*peakJulianDay','.*AUC'])

//     // .map(function(img){return dLib.multBands(img,1,[1,1,1/365.0])});
var amplitudes = pap.select(['.*_amplitude']);
var phases = pap.select(['.*_phase']);
var peakJulians = pap.select(['.*peakJulianDay'])
Map.addLayer(peakJulians)
    
//Set up the years to filter on- this is hard-coded since its set up oddly
var years = ee.List.sequence(1985,2018);
//Reformat the igdes to have a unique feature per year
var igdeyr = years.getInfo().map(function(yz){
  var fieldName ='Depth'+ yz.toString();
 
  // var yzPadded = pad(yz-1985, 2);
  
  // var fieldName = 'AnnDept_'+ yzPadded;
  // print(fieldName)
  // var t = f.select([fieldName], ['AvgAnnD'])
  //         .map(function(ft){return ft.set('year',yz)});
  var t = igdes.select([fieldName], ['AvgAnnD']);
  var depth = t.reduceToImage(['AvgAnnD'], ee.Reducer.first());
  var tID = igdes.select(['ORIG_FID']).reduceToImage(['ORIG_FID'], ee.Reducer.first());
  t = depth;
  t = t.updateMask(t.select([0]).neq(-999))
      // .divide(100)
      // .addBands(tID.int64())
      .rename(['Depth-To-Groundwater'])
      .set('system:time_start',ee.Date.fromYMD(yz,6,1).millis())
  return t;
});
igdeyr = ee.ImageCollection(igdeyr);


var joinedRaw = getImageLib.joinCollections(igdeyr,composites)
joinedRaw = getImageLib.joinCollections(joinedRaw,lt)
// joined = getImageLib.joinCollections(joined,zTrend)
joinedRaw = getImageLib.joinCollections(joinedRaw,pap)
joinedRaw =getImageLib.joinCollections(joinedRaw,daymet)
var joinedRawForSlope = addPrefixToCollectionBandNames(joinedRaw,'D1_');
joinedRaw = addPrefixToCollectionBandNames(joinedRaw,'D0_')
zTrend = addPrefixToCollectionBandNames(zTrend,'D1_')

// igdes = igdes.limit(50);
var out = ee.List.sequence(1992,1993).getInfo().map(function(yr){
  var yro = yr;
  yr = ee.Number(yr);
  
   var fieldName ='Depth'+ yro.toString();
 
  
  var igdesT = igdes.filter(ee.Filter.neq(fieldName, -999));
  var itdesTL = igdesT.toList(100000);

    var rawPre = ee.Image(joinedRawForSlope.filter(ee.Filter.calendarRange(yr.subtract(1),yr.subtract(1),'year')).first());
    var rawPost = ee.Image(joinedRawForSlope.filter(ee.Filter.calendarRange(yr,yr,'year')).first());
    
    var raw = ee.Image(joinedRaw.filter(ee.Filter.calendarRange(yr,yr,'year')).first());
    
    var rawZTrend = ee.Image(zTrend.filter(ee.Filter.calendarRange(yr,yr,'year')).first());
    var rawD = rawPost.subtract(rawPre);
    
   
    
    var forExtraction = raw.addBands(rawD).addBands(rawZTrend);
  ee.List.sequence(0,igdeCount,howMany).getInfo().map(function(i){
    var startI = i;
    var endI = i+howMany
    if(endI > igdeCount){endI = igdeCount}
    var igdesTLT = igdesTL.slice(startI,endI)
    var outName = 'Export-Full-Dataset-'+yro.toString() + '_'+startI.toString() + '_' + (endI-1).toString();
    print(outName)
    var outTable = forExtraction.reduceRegions(ee.FeatureCollection(igdesTLT), ee.Reducer.mean(), scale, crs, transform, 1);
    outTable = outTable.map(function(f){return f.set('A_Year',yr)})
    Export.table.toDrive(outTable, outName, 'TNC-GDEPulse-GEE-Export-Tables')
  
//     var outAsset = 'projects/igde-work/tables/' + outName;
//     Export.table.toAsset(outTable, outName, outAsset)
//     // print(outAsset)
  })
 
//   // return outTable

});

// out = ee.FeatureCollection(out).flatten()

// Export.table.toDrive(out, 'Export-test-full', 'TNC-GDEPulse-GEE-Export-Tables')
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



// runTaskList();

// confirmAll();