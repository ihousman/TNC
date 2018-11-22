//Module imports
var getImageLib = require('users/USFS_GTAC/modules:getImagesLib.js');
var dLib = require('users/USFS_GTAC/modules:changeDetectionLib.js');
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
dLib.getExistingChangeData();


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
var failedExports = ['Export-Full-Dataset-1992_2500_2999', 'Export-Full-Dataset-1992_3000_3499', 'Export-Full-Dataset-1994_1000_1499', 'Export-Full-Dataset-1994_5500_5620', 'Export-Full-Dataset-1995_500_999', 'Export-Full-Dataset-1997_1000_1499', 'Export-Full-Dataset-1997_3500_3999', 'Export-Full-Dataset-1997_4500_4999', 'Export-Full-Dataset-1998_2000_2499', 'Export-Full-Dataset-1998_2500_2999', 'Export-Full-Dataset-1998_4500_4999', 'Export-Full-Dataset-1998_6000_6129', 'Export-Full-Dataset-1999_2000_2499', 'Export-Full-Dataset-1999_3000_3499', 'Export-Full-Dataset-1999_3500_3999', 'Export-Full-Dataset-2000_1000_1499', 'Export-Full-Dataset-2000_1500_1999', 'Export-Full-Dataset-2000_2500_2999', 'Export-Full-Dataset-2001_1000_1499', 'Export-Full-Dataset-2001_1500_1999', 'Export-Full-Dataset-2001_4000_4499', 'Export-Full-Dataset-2001_5000_5499', 'Export-Full-Dataset-2003_1500_1999', 'Export-Full-Dataset-2004_1500_1999', 'Export-Full-Dataset-2004_4500_4999', 'Export-Full-Dataset-2004_5500_5999', 'Export-Full-Dataset-2005_1000_1499', 'Export-Full-Dataset-2005_1500_1999', 'Export-Full-Dataset-2006_1500_1999', 'Export-Full-Dataset-2006_5500_5999', 'Export-Full-Dataset-2007_1500_1999', 'Export-Full-Dataset-2007_4000_4499', 'Export-Full-Dataset-2007_7000_7499', 'Export-Full-Dataset-2008_1500_1999', 'Export-Full-Dataset-2008_3500_3999', 'Export-Full-Dataset-2008_5500_5999', 'Export-Full-Dataset-2009_1000_1499', 'Export-Full-Dataset-2009_4500_4999', 'Export-Full-Dataset-2009_5500_5999', 'Export-Full-Dataset-2010_4000_4499', 'Export-Full-Dataset-2010_6000_6499', 'Export-Full-Dataset-2011_2000_2499', 'Export-Full-Dataset-2011_9000_9499', 'Export-Full-Dataset-2012_1500_1999', 'Export-Full-Dataset-2012_2000_2499', 'Export-Full-Dataset-2012_3000_3499', 'Export-Full-Dataset-2012_7500_7999', 'Export-Full-Dataset-2013_1500_1999', 'Export-Full-Dataset-2013_2000_2499', 'Export-Full-Dataset-2013_3000_3499', 'Export-Full-Dataset-2013_4500_4999', 'Export-Full-Dataset-2014_1500_1999', 'Export-Full-Dataset-2014_2000_2499', 'Export-Full-Dataset-2014_3500_3999', 'Export-Full-Dataset-2014_4000_4499', 'Export-Full-Dataset-2014_7500_7999', 'Export-Full-Dataset-2014_8000_8499', 'Export-Full-Dataset-2014_8500_8999', 'Export-Full-Dataset-2015_1500_1999', 'Export-Full-Dataset-2015_2500_2999', 'Export-Full-Dataset-2015_6500_6999', 'Export-Full-Dataset-2016_6000_6499', 'Export-Full-Dataset-2016_6500_6999', 'Export-Full-Dataset-2016_7000_7499', 'Export-Full-Dataset-2017_2000_2499', 'Export-Full-Dataset-2017_2500_2999', 'Export-Full-Dataset-2018_0_499', 'Export-Full-Dataset-1992_0_1999', 'Export-Full-Dataset-1993_0_1999', 'Export-Full-Dataset-1994_0_1999', 'Export-Full-Dataset-1994_2000_3999', 'Export-Full-Dataset-1995_0_1999', 'Export-Full-Dataset-1995_2000_3999', 'Export-Full-Dataset-1996_0_1999', 'Export-Full-Dataset-1996_2000_3999', 'Export-Full-Dataset-1997_0_1999', 'Export-Full-Dataset-2003_2000_3999', 'Export-Full-Dataset-1997_2000_3999', 'Export-Full-Dataset-1997_4000_5965', 'Export-Full-Dataset-1998_0_1999', 'Export-Full-Dataset-2001_4000_5714', 'Export-Full-Dataset-1998_2000_3999', 'Export-Full-Dataset-1998_4000_5999', 'Export-Full-Dataset-1999_0_1999', 'Export-Full-Dataset-1999_2000_3999', 'Export-Full-Dataset-2000_0_1999', 'Export-Full-Dataset-2001_0_1999', 'Export-Full-Dataset-2001_2000_3999', 'Export-Full-Dataset-2002_0_1999', 'Export-Full-Dataset-2002_2000_3999', 'Export-Full-Dataset-2003_0_1999', 'Export-Full-Dataset-2004_0_1999', 'Export-Full-Dataset-2004_2000_3999', 'Export-Full-Dataset-2004_4000_5999', 'Export-Full-Dataset-2005_0_1999', 'Export-Full-Dataset-2006_0_1999', 'Export-Full-Dataset-2006_2000_3999', 'Export-Full-Dataset-2006_6000_7541', 'Export-Full-Dataset-2007_0_1999', 'Export-Full-Dataset-2007_2000_3999', 'Export-Full-Dataset-2007_4000_5999', 'Export-Full-Dataset-2007_6000_7574', 'Export-Full-Dataset-2008_0_1999', 'Export-Full-Dataset-2008_2000_3999', 'Export-Full-Dataset-2009_0_1999', 'Export-Full-Dataset-2009_6000_7752', 'Export-Full-Dataset-2010_0_1999', 'Export-Full-Dataset-2012_6000_7999', 'Export-Full-Dataset-2011_0_1999', 'Export-Full-Dataset-2011_2000_3999', 'Export-Full-Dataset-2011_6000_7999', 'Export-Full-Dataset-2011_8000_9703', 'Export-Full-Dataset-2012_0_1999', 'Export-Full-Dataset-2012_2000_3999', 'Export-Full-Dataset-2012_4000_5999', 'Export-Full-Dataset-2012_8000_9991', 'Export-Full-Dataset-2013_0_1999', 'Export-Full-Dataset-2013_2000_3999', 'Export-Full-Dataset-2013_4000_5999', 'Export-Full-Dataset-2013_8000_9732', 'Export-Full-Dataset-2014_0_1999', 'Export-Full-Dataset-2014_2000_3999', 'Export-Full-Dataset-2014_4000_5999', 'Export-Full-Dataset-2014_8000_9908', 'Export-Full-Dataset-2015_0_1999', 'Export-Full-Dataset-2015_2000_3999', 'Export-Full-Dataset-2016_0_1999', 'Export-Full-Dataset-2016_4000_5999', 'Export-Full-Dataset-2016_6000_7999', 'Export-Full-Dataset-2017_0_1999', 'Export-Full-Dataset-2017_2000_3999', 'Export-Full-Dataset-2017_4000_5999', 'Export-Full-Dataset-2018_0_540']
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
// var igdeCount = 15419;//igdes.size().getInfo();
// var igdesL = igdes.toList(10000000,0);

var howMany = 500;
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

function getPairDiff(c,year){
  var cT1  = ee.Image(c.filter(ee.Filter.calendarRange(year-1,year-1,'year')).first());
  var cT2  = ee.Image(c.filter(ee.Filter.calendarRange(year,year,'year')).first());
  
  var cSlpT  =cT2.subtract(cT1).float();
  
  return [addPrefixToImageBandNames(cT2,'D0_'),addPrefixToImageBandNames(cSlpT,'D1_')];
}

function getYr(year){
  var igdeyrPair = getPairDiff(igdeyr,year);
  var compPair = getPairDiff(composites,year);
  var ltPair = getPairDiff(lt,year);
  var papPair = getPairDiff(pap,year);
  var daymetPair = getPairDiff(daymet,year);
  var zPair = getPairDiff(zTrend,year);
  var out = igdeyrPair[0].addBands(compPair[0]).addBands(ltPair[0]).addBands(papPair[0]).addBands(daymetPair[0])
            .addBands(igdeyrPair[1]).addBands(compPair[1]).addBands(ltPair[1]).addBands(papPair[1]).addBands(daymetPair[1]).addBands(zPair[1])

  return out;
}
var t = getYr(2000);
Map.addLayer(t,{},'t')
// var joinedRaw = getImageLib.joinCollections(igdeyr,composites)
// joinedRaw = getImageLib.joinCollections(joinedRaw,lt)
// // joined = getImageLib.joinCollections(joined,zTrend)
// joinedRaw = getImageLib.joinCollections(joinedRaw,pap)
// joinedRaw =getImageLib.joinCollections(joinedRaw,daymet)
// var joinedRawForSlope = addPrefixToCollectionBandNames(joinedRaw,'D1_');
// joinedRaw = addPrefixToCollectionBandNames(joinedRaw,'D0_')
// zTrend = addPrefixToCollectionBandNames(zTrend,'D1_')

// igdes = igdes.limit(50);

// var out = ee.List.sequence(1992,1992).getInfo().map(function(yr){
//   var yro = yr;
//   yr = ee.Number(yr);
  
//   var fieldName ='Depth'+ yro.toString();
 
  
//   var igdesT = igdes.filter(ee.Filter.neq(fieldName, -999)).limit(10);
//   var igdesTL = igdesT.toList(100000);

//     // var rawPre = ee.Image(joinedRawForSlope.filter(ee.Filter.calendarRange(yr.subtract(1),yr.subtract(1),'year')).first());
//     // var rawPost = ee.Image(joinedRawForSlope.filter(ee.Filter.calendarRange(yr,yr,'year')).first());
    
//     // var raw = ee.Image(joinedRaw.filter(ee.Filter.calendarRange(yr,yr,'year')).first());
    
//     // var rawZTrend = ee.Image(zTrend.filter(ee.Filter.calendarRange(yr,yr,'year')).first());
//     // var rawD = rawPost.subtract(rawPre);
    
   
    
//     var forExtraction = getYr(yr)//raw.addBands(rawD).addBands(rawZTrend);
//     var igdeCount = igdesT.size().getInfo();
//     print(yro,igdeCount)
//   ee.List.sequence(0,igdeCount,howMany).getInfo().map(function(i){
//     var startI = i;
//     var endI = i+howMany
//     if(endI > igdeCount){endI = igdeCount}
//     var igdesTLT = igdesTL.slice(startI,endI)
//     var outName = 'Export-Full-Dataset-'+yro.toString() + '_'+startI.toString() + '_' + (endI-1).toString();
//     // print(outName)
//     // if(failedExports.indexOf(outName)>-1){
//       var outTable = forExtraction.reduceRegions(ee.FeatureCollection(igdesTLT), ee.Reducer.mean(), scale, crs, transform, 1);
//     outTable = outTable.map(function(f){return f.set('A_Year',yr)})
//     // Export.table.toDrive(outTable, outName, 'TNC-GDEPulse-GEE-Export-Tables')
//     print('ot',outTable)
//     var outAsset = 'projects/igde-work/tables/' + outName;
//     Export.table.toAsset(outTable, outName, outAsset)
// //     // print(outAsset)
//     // }
    
//   })
 
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