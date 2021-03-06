//Module imports
var getImageLib = require('users/ianhousman/TNC:gde-pulse/modules/getImagesLib.js');
var dLib = require('users/ianhousman/TNC:gde-pulse/modules/changeDetectionLib.js');
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
dLib.getExistingChangeData();

//Define some functions for adding strings to band names
function addPrefixToImageBandNames(i,prefix){
  var bandNames = i.bandNames();
	var outBandNames = bandNames.map(function(i){return ee.String(prefix).cat(i)});
	return i.select(bandNames,outBandNames);
}
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
var failedExports =['Export-Full-Dataset-1985_0_999', 'Export-Full-Dataset-1985_1000_1999', 'Export-Full-Dataset-1985_2000_2999', 'Export-Full-Dataset-1985_3000_3999', 'Export-Full-Dataset-1985_4000_4033']
// 1. Specify study area: Study area
// Can specify a country, provide a fusion table  or asset table (must add 
// .geometry() after it), or draw a polygon and make studyArea = drawnPolygon
var sa = ee.FeatureCollection('projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping').geometry();

var crs = 'EPSG:5070';

//Specify transform if scale is null and snapping to known grid is needed
var transform = [30,0,-2361915.0,0,-30,3177735.0];

//Specify scale if transform is null
var scale = null;

//Which bands to extract
var indexNames = ['NBR','NDMI','NDVI','SAVI','EVI','brightness','greenness','wetness','tcAngleBG'];
var indexNamesComposites = ['NBR','NDMI','NDVI','SAVI','EVI','brightness','greenness','wetness','tcAngleBG','NIRv'];

var indexEndWildcards = indexNames.map(function(bn){return '.*'+bn});
var indexStartWildcards = indexNames.map(function(bn){return bn +'.*'});

var analysisYears = ee.List.sequence(1985,2018);
var exportYears = ee.List.sequence(1985,2018);

//Which igde polygons
// var igdes = ee.FeatureCollection('projects/igde-work/igde-data/GDEpulse2018_iGDE_V1_20180802_joined_annual_depth_macro_veg');
// var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018_v2');
var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018');
print(igdes.size());
// var igdeCount = 15419;//igdes.size().getInfo();
// var igdesL = igdes.toList(10000000,0);

//Define how many igdes to extract at once- reduce to increase stability
var howMany = 1000;

//////////////////////////////////////////////////////////////////////////////////////
//Bring in composites
// var composites = ee.ImageCollection('projects/igde-work/raster-data/composite-collection')
//         .sort('system:time_start')
//         .map(function(img){return dLib.multBands(img,1,0.0001)})
//         .map(getImageLib.simpleAddIndices)
//         .map(getImageLib.getTasseledCap)
//         .map(getImageLib.simpleAddTCAngles)
//         .map(getImageLib.addSAVIandEVI)
//         .select(indexNamesComposites);
        
//Bring in Landtrendr outputs
var lt = ee.ImageCollection('projects/igde-work/raster-data/LANDTRENDR-collection')
        .select(indexEndWildcards)
        .map(function(img){return dLib.multBands(img,1,0.0001)});

//Bring in harmonics
// var harmonics = ee.ImageCollection('projects/igde-work/raster-data/harmonic-coefficients-collection');

//Bring in z and trend
// var zTrend =ee.ImageCollection('projects/igde-work/raster-data/z-score-trend-collection');

//Bring in DAYMET
// var daymet = ee.ImageCollection('projects/igde-work/raster-data/DAYMET-Collection');

//Add prefix to DAYMET
// daymet = addPrefixToCollectionBandNames(daymet,'dymt_');

//Separate z and trend and rescale them to their raw value
// var z = zTrend.select(['.*_Z'])
//   .map(function(img){return dLib.multBands(img,1,0.1)});
// var trend = zTrend.select(['.*._slope'])
//   .map(function(img){return dLib.multBands(img,1,0.0001)});

//Join them back together
// zTrend = getImageLib.joinCollections(z,trend,false);

//Seperate two date periods z-score was processed for and set to same date
// var zTrend1 = zTrend.filter(ee.Filter.calendarRange(121,185))
//         .map(function(img){
//           var y = ee.Date(img.get('system:time_start')).get('year');
//           return img.set('system:time_start',ee.Date.fromYMD(y,6,1).millis());
//         });
// var zTrend2 = zTrend.filter(ee.Filter.calendarRange(185,249))
//         .map(function(img){
//           var y = ee.Date(img.get('system:time_start')).get('year');
//           return img.set('system:time_start',ee.Date.fromYMD(y,6,1).millis());
//         });

//Add ending to band names to denote which period
// zTrend1 = addSuffixToCollectionBandNames(zTrend1,'_121_185');
// zTrend2 = addSuffixToCollectionBandNames(zTrend2,'_185_249');

//Join them back together
// zTrend = getImageLib.joinCollections(zTrend1,zTrend2,false);

//Get phase, amplitude, peak and AUC of the harmonic functions
// var pap = harmonics
//     .map(function(img){return dLib.multBands(img,1,0.001)})
//     .map(getImageLib.getPhaseAmplitudePeak)
//     .select(['.*_phase','.*_amplitude','.*peakJulianDay','.*AUC']);

//Pull individual components out
// var amplitudes = pap.select(['.*_amplitude']);
// var phases = pap.select(['.*_phase']);
// var peakJulians = pap.select(['.*peakJulianDay']);
// Map.addLayer(peakJulians);
    


//Reformat the igdes to have a unique feature per year
var igdeyr = analysisYears.getInfo().map(function(yz){
  var fieldName ='Depth'+ yz.toString();
 
 var t = igdes.select([fieldName], ['AvgAnnD']);
  var depth = t.reduceToImage(['AvgAnnD'], ee.Reducer.first());
  var tID = igdes.select(['ORIG_FID']).reduceToImage(['ORIG_FID'], ee.Reducer.first());
  t = depth;
  t = t.updateMask(t.select([0]).neq(-999))
      // .divide(100)
      // .addBands(tID.int64())
      .rename(['Depth-To-Groundwater'])
      .set('system:time_start',ee.Date.fromYMD(yz,6,1).millis());
  return t;
});
igdeyr = ee.ImageCollection(igdeyr);

//Function for getting the pairwise differencce for a collection and a given year
function getPairDiff(c,year){
  year = ee.Number(year);
  var cT1  = ee.Image(c.filter(ee.Filter.calendarRange(year.subtract(1),year.subtract(1),'year')).first());
  var cT2  = ee.Image(c.filter(ee.Filter.calendarRange(year,year,'year')).first());
  
  var cSlpT  =cT2.subtract(cT1).float();
  // print('cslp',cT1,year)
  return [addPrefixToImageBandNames(cT2,'D0_'),addPrefixToImageBandNames(cSlpT,'D1_')];
}
//Wrapper to get all the data for a given year
function getYr(year){
  var igdeyrPair = getPairDiff(igdeyr,year);
  // var compPair = getPairDiff(composites,year);
  var ltPair = getPairDiff(lt,year);
  // var papPair = getPairDiff(pap,year);
  // var daymetPair = getPairDiff(daymet,year);
  // var zPair = getPairDiff(zTrend,year);
  var out =ee.Image(igdeyrPair[0])
  // .addBands(compPair[0])
  .addBands(ltPair[0])
  // .addBands(papPair[0]).addBands(daymetPair[0])
            .addBands(igdeyrPair[1])
            // .addBands(compPair[1])
            .addBands(ltPair[1])
            // .addBands(papPair[1]).addBands(daymetPair[1]).addBands(zPair[1]);

  return out;
}
//Final export
//Iterate across each year
var out = exportYears.getInfo().map(function(yr){
  var yro = yr;
  yr = ee.Number(yr);
  
  //Get the name of the field for DGW
  var fieldName ='Depth'+ yro.toString();
 
  //Filter out the igdes for that year
  var igdesT = igdes.filter(ee.Filter.neq(fieldName, -999));
  var igdesTL = igdesT.toList(100000);

   
  //Get the change image for extraction
  var forExtraction = ee.Image(getYr(yr));//raw.addBands(rawD).addBands(rawZTrend);
  
  //Find how many igdes there were that year
  var igdeCount = igdesT.size().getInfo();
  print(yro,igdeCount);
  
  //Iterate across each block of igdes and export them to avoid memory errors
  ee.List.sequence(0,igdeCount,howMany).getInfo().map(function(i){
    var startI = i;
    var endI = i+howMany;
    if(endI > igdeCount){endI = igdeCount}
    var igdesTLT = igdesTL.slice(startI,endI);
    var outName = 'Export-Full-Dataset-'+yro.toString() + '_'+startI.toString() + '_' + (endI-1).toString();
    // print(outName)
    if(failedExports.indexOf(outName)>-1){
      var outTable = forExtraction.reduceRegions(ee.FeatureCollection(igdesTLT), ee.Reducer.mean(), scale, crs, transform, 2);
    outTable = outTable.map(function(f){return f.set('A_Year',yr)});
    Export.table.toDrive(outTable, outName, 'TNC-GDEPulse-GEE-Export-Tables-Dec-Debugging');
    
    //For phase 2- export to asset as well
    var outAsset = 'projects/igde-work/tables/' + outName;
    // Export.table.toAsset(outTable, outName, outAsset)

    }
    
  });
 

});

//Code for starting many export tasks
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