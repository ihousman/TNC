/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var eeBoundsPoly = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-123.23710937499999, 36.711100456320416],
          [-118.66679687499999, 32.29497859165153],
          [-114.53593749999999, 32.146267499165525],
          [-113.65703124999999, 34.060348900863126],
          [-119.36992187499999, 41.9418805699862],
          [-124.73124999999999, 42.00722213878955]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/

function simpleAddIndices(in_image){
    in_image = in_image.addBands(in_image.normalizedDifference(['nir', 'red']).select([0],['NDVI']));
    in_image = in_image.addBands(in_image.normalizedDifference(['nir', 'swir2']).select([0],['NBR']));
    in_image = in_image.addBands(in_image.normalizedDifference(['nir', 'swir1']).select([0],['NDMI']));
    in_image = in_image.addBands(in_image.normalizedDifference(['green', 'swir1']).select([0],['NDSI']));
  
    return in_image;
}
///////////////////////////////////////////////////////////////////////////////
// Function to compute the Tasseled Cap transformation and return an image
// with the following bands added: ['brightness', 'greenness', 'wetness', 
// 'fourth', 'fifth', 'sixth']
function getTasseledCap(image) {
 
  var bands = ee.List(['blue','green','red','nir','swir1','swir2']);
  // // Kauth-Thomas coefficients for Thematic Mapper data
  // var coefficients = ee.Array([
  //   [0.3037, 0.2793, 0.4743, 0.5585, 0.5082, 0.1863],
  //   [-0.2848, -0.2435, -0.5436, 0.7243, 0.0840, -0.1800],
  //   [0.1509, 0.1973, 0.3279, 0.3406, -0.7112, -0.4572],
  //   [-0.8242, 0.0849, 0.4392, -0.0580, 0.2012, -0.2768],
  //   [-0.3280, 0.0549, 0.1075, 0.1855, -0.4357, 0.8085],
  //   [0.1084, -0.9022, 0.4120, 0.0573, -0.0251, 0.0238]
  // ]);
  
  //Crist 1985 coeffs - TOA refl (http://www.gis.usu.edu/~doug/RS5750/assign/OLD/RSE(17)-301.pdf)
  var coefficients = ee.Array([[0.2043, 0.4158, 0.5524, 0.5741, 0.3124, 0.2303],
                    [-0.1603, -0.2819, -0.4934, 0.7940, -0.0002, -0.1446],
                    [0.0315, 0.2021, 0.3102, 0.1594, -0.6806, -0.6109]
                   //  [-0.2117, -0.0284, 0.1302, -0.1007, 0.6529, -0.7078],
                   //  [-0.8669, -0.1835, 0.3856, 0.0408, -0.1132, 0.2272],
                   // [0.3677, -0.8200, 0.4354, 0.0518, -0.0066, -0.0104]
                   ]);
  // Make an Array Image, with a 1-D Array per pixel.
  var arrayImage1D = image.select(bands).toArray();
  
  // Make an Array Image with a 2-D Array per pixel, 6x1.
  var arrayImage2D = arrayImage1D.toArray(1);
  
  var componentsImage = ee.Image(coefficients)
    .matrixMultiply(arrayImage2D)
    // Get rid of the extra dimensions.
    .arrayProject([0])
    // Get a multi-band image with TC-named bands.
    .arrayFlatten(
      [['brightness', 'greenness', 'wetness']])
    .float();
  
  return image.addBands(componentsImage);
}

///////////////////////////////////////////////////////////////////////////////
// Function to add Tasseled Cap angles and distances to an image.
// Assumes image has bands: 'brightness', 'greenness', and 'wetness'.

function simpleAddTCAngles(image){
  // Select brightness, greenness, and wetness bands
  var brightness = image.select(['brightness']);
  var greenness = image.select(['greenness']);
  var wetness = image.select(['wetness']);
  
  // Calculate Tasseled Cap angles and distances
  var tcAngleBG = brightness.atan2(greenness).divide(Math.PI).rename('tcAngleBG');
  // var tcAngleGW = greenness.atan2(wetness).divide(Math.PI).rename('tcAngleGW');
  // var tcAngleBW = brightness.atan2(wetness).divide(Math.PI).rename('tcAngleBW');
  // var tcDistBG = brightness.hypot(greenness).rename('tcDistBG');
  // var tcDistGW = greenness.hypot(wetness).rename('tcDistGW');
  // var tcDistBW = brightness.hypot(wetness).rename('tcDistBW');
  image = image.addBands(tcAngleBG)
  // .addBands(tcAngleGW)
  //   .addBands(tcAngleBW).addBands(tcDistBG).addBands(tcDistGW)
  //   .addBands(tcDistBW);
  return image;
}
var addYear = function(image) {
  var t = image.get('system:time_start');
  var y = ee.Date(t).get('year');
  var yimg = ee.Image(y).short().rename('year');
  var addyimg = image.addBands(yimg);//yimg.addBands(image)
  return addyimg.float() ;
};
/////////////////////////////////////////////////
//Helper function to join two collections- Source: code.earthengine.google.com
    function joinCollections(c1,c2){
      var MergeBands = function(element) {
        // A function to merge the bands together.
        // After a join, results are in 'primary' and 'secondary' properties.
        return ee.Image.cat(element.get('primary'), element.get('secondary'));
      };

      var join = ee.Join.inner();
      var filter = ee.Filter.equals('system:time_start', null, 'system:time_start');
      var joined = ee.ImageCollection(join.apply(c1, c2, filter));
     
      joined = ee.ImageCollection(joined.map(MergeBands));
      joined = joined.map(function(img){return img.mask(img.mask().and(img.reduce(ee.Reducer.min()).neq(0)))});
      return joined;
    }
//////////////////////////////////////////////////////
//////////
//Helper to multiply image
function multBands(img,distDir,by){
    var out = img.multiply(ee.Image(distDir).multiply(by));
    out  = out.copyProperties(img,['system:time_start']);
    return out;
  }
//Function for zero padding
//Taken from: https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

//Bring in igdes
// var f = ee.FeatureCollection('users/Shree1175/iGDE_5_2018_V1_joined_ndvi_annDepth')
var f = ee.FeatureCollection('projects/igde-work/igde-data/GDEpulse2018_iGDE_V1_20180802_joined_annual_depth_macro_veg')


//Set up the years to filter on- this is hard-coded since its set up oddly
var years = ee.List.sequence(1985,2018);
//Reformat the igdes to have a unique feature per year
var igdeyr = years.getInfo().map(function(yz){
  var fieldName ='Depth'+ yz.toString();
  // var t = f.select([fieldName], ['AvgAnnD'])
  //         .map(function(ft){return ft.set('year',yz)});
  var t = f.select([fieldName], ['AvgAnnD']);
  var depth = t.reduceToImage(['AvgAnnD'], ee.Reducer.first());
  var tID = f.select(['ORIG_FID']).reduceToImage(['ORIG_FID'], ee.Reducer.first());
  t = depth;
  t = t.updateMask(t.select([0]).lt(1000))
      .divide(100)
      .addBands(tID.int64())
      .rename(['Depth-To-Groundwater-divided-by-one-hundred','ORIG_FID'])
      .set('system:time_start',ee.Date.fromYMD(yz,6,1).millis())
  return t;
});
igdeyr = ee.ImageCollection(igdeyr);
var startYear = 1985;
var endYear = 2018;

var ts = ee.ImageCollection('projects/igde-work/raster-data/composite-collection');
var ts = ts
        .map(function(img){return multBands(img,1,0.0001)})
        .map(simpleAddIndices)
        .map(getTasseledCap)
        .map(simpleAddTCAngles)
        .map(addYear)
var joined = joinCollections(ts.select(['NDVI','NBR']),igdeyr) ;
joined = joined.map(function(img){
  var out = img.reduceConnectedComponents(ee.Reducer.mean(), 'ORIG_FID', 256);
  // out = out.addBands(img.select([0,1,2]))
  out = out.copyProperties(img,['system:time_start']);
  return out;
  
})
Map.addLayer(joined,{'min':0,'max':0.5},'igde depth to gw (divided by 100)',false);


