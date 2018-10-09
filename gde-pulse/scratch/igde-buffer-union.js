var iGDE_v053 = ee.FeatureCollection("projects/igde-work/igde-data/i02_IndicatorsofGDE_Vegetation_v0_5_3_updated_macroclasses"),
    all_well = ee.FeatureCollection("projects/igde-work/igde-data/GDEpulse2018_point_GW_well_8022018");
    
    var sa = ee.FeatureCollection('projects/igde-work/igde-data/GDEpulse2018_iGDE_V1_20180802_joined_annual_depth_macro_veg')
var sa2 =  ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018');
print(sa.size(),sa2.size())

// Map.addLayer(sa,{color:'red'},'original')
Map.addLayer(sa2,{color:'blue'},'new')
var studyArea = ee.Feature(ee.FeatureCollection('TIGER/2016/States')
            .filter(ee.Filter.eq('NAME','California'))
            .first())
            .convexHull(10000)
            .buffer(10000)
            .geometry();
Map.addLayer(studyArea,{},'convexHull',false)
sa = sa.map(function(f){return f.buffer(20000,1000)}).union(1000);
sa2 = sa2.map(function(f){return f.buffer(20000,1000)}).union(1000);
print(sa.size())
// Map.addLayer(sa,{color:'red'},'original')
// Map.addLayer(sa2,{color:'blue'},'new')
// iGDE_v053: original iGDE database polygons with vegetation and macrovegetation class
var empty = ee.Image().byte();
var outline = empty.paint({featureCollection: iGDE_v053, color: 3, width: 1});
Map.addLayer(outline, {palette: 'be231b'}, "iGDE_original_TNC_5_03_2018", false)

//all_Wells : all USGS well data from California n = 42,000
Map.addLayer(all_well, {palette: '0000FF'}, "USGS wells CA", false)

var output = ee.FeatureCollection('projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping');
Map.addLayer(output)
Export.table.toAsset(sa, 'Export','projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping')