import ee
ee.Initialize()

import math,os,time
def addPrefixToCollectionBandNames(c,prefix):
	try:
		bandNames = ee.Image(c.first()).bandNames()
	except:
		bandNames = c.bandNames()
	outBandNames = bandNames.map(lambda i : ee.String(prefix).cat(i))
	return c.select(bandNames,outBandNames)

def  fillEmptyCollections(inCollection,dummyImage):                     
  dummyCollection = ee.ImageCollection([dummyImage.mask(ee.Image(0))])
  imageCount = inCollection.size();
  return ee.ImageCollection(ee.Algorithms.If(imageCount.gt(0),inCollection,dummyCollection))
def setNoData(image,noDataValue):
    m = image.mask();
    image = image.mask(ee.Image(1))
    image = image.where(m.Not(),noDataValue)
    return image

#Helper to multiply image
def multBands(img,distDir,by):
    out = img.multiply(distDir*by)
    out  = out.copyProperties(img,['system:time_start'])
    return out
def simpleAddIndices(in_image):
	in_image = in_image.addBands(in_image.normalizedDifference(['nir', 'red']).select([0],['NDVI']))
	in_image = in_image.addBands(in_image.normalizedDifference(['nir', 'swir2']).select([0],['NBR']))
	in_image = in_image.addBands(in_image.normalizedDifference(['nir', 'swir1']).select([0],['NDMI']))
	# in_image = in_image.addBands(in_image.normalizedDifference(['green', 'swir1']).select([0],['NDSI']))
  
	return in_image
def getTasseledCap(image):
     
    bands = ee.List(['blue','green','red','nir','swir1','swir2'])
     
      
    #Crist 1985 coeffs - TOA refl (http://www.gis.usu.edu/~doug/RS5750/assign/OLD/RSE(17)-301.pdf)
    coefficients = ee.Array([[0.2043, 0.4158, 0.5524, 0.5741, 0.3124, 0.2303],\
    [-0.1603, -0.2819, -0.4934, 0.7940, -0.0002, -0.1446],\
    [0.0315, 0.2021, 0.3102, 0.1594, -0.6806, -0.6109]])
    #Make an Array Image, with a 1-D Array per pixel.
    arrayImage1D = image.select(bands).toArray()
      
    #Make an Array Image with a 2-D Array per pixel, 6x1.
    arrayImage2D = arrayImage1D.toArray(1)
      
    componentsImage = ee.Image(coefficients).matrixMultiply(arrayImage2D).arrayProject([0]).arrayFlatten([['brightness', 'greenness', 'wetness']]).float()
    
    return image.addBands(componentsImage)

def simpleAddTCAngles(image):
	#Select brightness, greenness, and wetness bands
	brightness = image.select(['brightness'])
	greenness = image.select(['greenness'])
  
	#Calculate Tasseled Cap angles and distances
	tcAngleBG = brightness.atan2(greenness).divide(math.pi).rename(['tcAngleBG']);
  
	return image.addBands(tcAngleBG)



#############################
##Function to  add SAVI and EVI
def addSAVIandEVI(img):
    #Add Enhanced Vegetation Index (EVI)
    evi = img.expression(\
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {\
      'NIR': img.select('nir'),\
      'RED': img.select('red'),\
      'BLUE': img.select('blue')\
      }).float();
    img = img.addBands(evi.rename('EVI'))
  
    #Add Soil Adjust Vegetation Index (SAVI)
    #using L = 0.5;
    savi = img.expression(\
    '(NIR - RED) * (1 + 0.5)/(NIR + RED + 0.5)', {\
      'NIR': img.select('nir'),\
      'RED': img.select('red')\
      }).float()

  
  #///////////////////////////////////////////////////////////////////////////////
#  //NIRv: Badgley, G., Field, C. B., & Berry, J. A. (2017). Canopy near-infrared reflectance and terrestrial photosynthesis. Science Advances, 3, e1602244.
#  //https://www.researchgate.net/publication/315534107_Canopy_near-infrared_reflectance_and_terrestrial_photosynthesis
#  // NIRv function: ‘image’ is a 2 band stack of NDVI and NIR
#  //////////////////////////////////////////////////////////////////////////////////////////
    NIRv =  img.select(['NDVI']).subtract(0.08)\
              .multiply(img.select(['nir']))#;//.multiply(0.0001))

    img = img.addBands(savi.rename('SAVI')).addBands(NIRv.rename('NIRv'))
    return img

def joinCollections(c1,c2):
    def MergeBands(element):
        #A function to merge the bands together.
        #After a join, results are in 'primary' and 'secondary' properties.
        return ee.Image.cat(element.get('primary'), element.get('secondary'))

    join = ee.Join.inner()
    f = ee.Filter.equals('system:time_start', None, 'system:time_start')
    joined = ee.ImageCollection(join.apply(c1, c2, f))

    joined = ee.ImageCollection(joined.map(MergeBands))
#    joined = joined.map(lambda img :img.mask(img.mask().And(img.reduce(ee.Reducer.min()).neq(0))))
    return joined

def resetDate(img):
    y = ee.Date(img.get('system:time_start')).get('year')
    return img.set('system:time_start',ee.Date.fromYMD(y,6,1).millis())