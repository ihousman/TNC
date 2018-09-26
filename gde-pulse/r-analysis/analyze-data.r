library(corrplot)
library(randomForest)
library(varSelRF)
library(stringr)
######################################
#Set up workspace
load("C:/TNC-analysis/RData")
wd = 'C:/TNC-analysis/'
setwd(wd)

#Set parameters
ntree = 100


#Define strata fields
strataFields = c('All','Level1_For','Level2_For','Level3_For','Level4_Div',  'Macrogroup','VEGETATION','wDepth_str','q_maxMean')

######################################
#Read in tables
tables = list.files(wd,pattern = '*.csv$',include.dirs = TRUE)
allData = lapply(tables,function(table){read.csv(table)})
allData = do.call(rbind,allData)
allData = na.omit(allData)

#If only one table, use this option
# allData = na.omit(read.csv(tables))

######################################
#Filter table
allDataSample = allData#[sample(length(allData[,1]),1000),]

predictors =  names(allDataSample)[grepl('D0_|D1_',names(allDataSample))]

independents =  predictors[grep('D0_Depth.To.Groundwater|D1_Depth.To.Groundwater',predictors,invert = TRUE)]

predictorsTable = allDataSample[,predictors]

dep0 = predictorsTable$D0_Depth.To.Groundwater
dep1 = predictorsTable$D1_Depth.To.Groundwater
ind = predictorsTable[independents]
######################################
######################################
#Use randomForest to see how well variables work together to predict depth to groundwater

rfD0 = randomForest(ind, dep0,  ntree=ntree,importance = TRUE)
vbOutName = 'RF_Var_Imp_All_Variables_D0'
png(paste0(vbOutName,'.png'),height = 1500,width = 1000)
varImpPlot(rfD0,n.var=length(ind[1,]),main = paste0('RF Var Imp All Variables D0'))
dev.off()

rfD1 = randomForest(ind, dep1,  ntree=ntree,importance = TRUE)
vbOutName = 'RF_Var_Imp_All_Variables_D1'
png(paste0(vbOutName,'.png'),height = 1500,width = 1000)
varImpPlot(rfD1,n.var=length(ind[1,]),main = paste0('RF Var Imp All Variables D1'))
dev.off()
######################################
#Conduct pair-wise correlation analysis
#Strata test

#Add strata field constant for all covers
allData$All = as.factor('Covers')


outTable2 = c()

for(strataField in strataFields){
  #Set up strata
  strata = eval(parse(text=paste0('allData$',strataField)))
  classes = levels(strata)
  
  #Iterate across strata within give nfield
  for(class in classes){
    
    #Filter out data
    isThatClass = strata == class
    n = sum(isThatClass)
    allDataClassStrata = allData[isThatClass,]
    predictorsTableClassStrata =  allDataClassStrata[,predictors]
    print(c(strataField,class,n))
    
    #Create correlation matrix
    corMatrix = cor(predictorsTableClassStrata)#,dgw)
    
    #Plot cor matrix 
    if(n>2){
      if(str_detect(class,'1.C.3. Temperate Flooded and Swamp Forest')){class = '1.C.3. Temperate Flooded and Swamp Forest'}
      class = str_replace(class,'/',' ')

      png(paste0(strataField,'_',class,'_Corr_plot.png'),width = 2000,height = 2000)
      corrplot(corMatrix,method = 'ellipse',type = 'lower')#,order = 'FPC')
      mtext(paste0(strataField,' ',class,' n = ',n),  line=-0.5, cex=2)
      dev.off()
    }
    
    #Add depth rows from matrix to outTable
    names = names(data.frame(corMatrix))
    wanted = grepl('Depth',names)
    wantedI = seq(1,length(names))[wanted]
    
    corLines = corMatrix[wantedI,]
    corLines = cbind(n,corLines)
    corNames = lapply(rownames(corLines),function(n){paste0(strataField,'_',class,'_',n)})
    rownames(corLines) = corNames
    outTable = rbind(outTable,corLines)
    
    
    dep0ClassStrata = predictorsTableClassStrata$D0_Depth.To.Groundwater
    dep1ClassStrata = predictorsTableClassStrata$D1_Depth.To.Groundwater
    # indClassStrata = predictorsTableClassStrata[independents]
    # 
    # rfD0ClassStrata = randomForest(indClassStrata, dep0ClassStrata,  ntree=ntree,importance = TRUE)
    # vbOutName = paste0('RF_Var_Imp_D0_',strataField,'_',class)
    # png(paste0(vbOutName,'.png'),height = 1500,width = 1000)
    # varImpPlot(rfD0ClassStrata,n.var=length(indClassStrata[1,]),main = paste0('RF Var Imp D0 ',strataField,' ',class, ' n=',n))
    # dev.off()
    # 
    # rfD1ClassStrata = randomForest(indClassStrata, dep1ClassStrata,  ntree=ntree,importance = TRUE)
    # vbOutName = paste0('RF_Var_Imp_D1_',strataField,'_',class)
    # png(paste0(vbOutName,'.png'),height = 1500,width = 1000)
    # varImpPlot(rfD1ClassStrata,n.var=length(indClassStrata[1,]),main = paste0('RF Var Imp D1 ',strataField,' ',class, ' n=',n))
    # dev.off()
  }
  
}

#Write out the master r value table
write.csv(outTable,'R-Values-By-Strata.csv')

#Filter out table for finding variables with highest r values
outTableFiltered = outTable[outTable[,1] > 5,]
ns = outTableFiltered[,1]
outTableFiltered = outTableFiltered[,independents]
rns = rownames(outTableFiltered)


#Iterate across each stratum to find variable with highest r2
maxR2Table = c()
maxR2TableSimple = c()
for(i in seq(1,length(rns))){
  r = outTableFiltered[i,]
  n = ns[i]
  if(n > 2){
    r2 = r*r
    minR2 = min(r2)
    maxR2 = max(r2)
    
    r2Min = r2[r2== minR2]
    r2Max = r2[r2== maxR2]
    
    tops = quantile(r2,c(0.5))
    r2Tops = sort(r2[r2 >= tops])
    repStrata = as.vector(rep(rns[i],length(r2Tops)))
    repN = as.vector(rep(n,length(r2Tops)))
    
    simpleT = cbind(repStrata,names(r2Tops),repN,r2Tops)
    maxR2Table = rbind(maxR2Table,c(rns[i],n,names(r2Tops),as.vector(r2Tops)))
    maxR2TableSimple = rbind(maxR2TableSimple,simpleT)
  }
  
}
nTops = length(r2Tops)
topsVarsNames = lapply(seq(nTops,1),function(i){paste0('Top R2 Var Name ',i)})
topsValuesNames = lapply(seq(nTops,1),function(i){paste0('Top R2 Value ',i)})

maxR2Table  = data.frame(maxR2Table)
maxR2TableSimple  = data.frame(maxR2TableSimple)
names(maxR2Table) = c('Strata','N',topsVarsNames,topsValuesNames)
names(maxR2TableSimple) = c('Strata','Pred','N','R2')

write.csv(maxR2Table,'Top-10pctl-R2-Variables-By-Strata.csv')

# maxR2TableSimpleT = maxR2TableSimple[seq(10),]

maxR2TableSimple$R2 = as.numeric(as.vector(maxR2TableSimple$R2))
detach(maxR2TableSimple)
attach(maxR2TableSimple)
maxR2TableSimpleT = maxR2TableSimple[order(-R2),]
detach(maxR2TableSimple)
maxR2TableSimpleT = maxR2TableSimpleT[seq(100),]

png('test_boxplot_strata.png',width = 3000,height = 1500)
boxplot(as.numeric(R2)~Strata,data = maxR2TableSimpleT)
dev.off()

png('test_boxplot_pred.png',width = 3000,height = 1500)
boxplot(as.numeric(R2)~Pred,data = maxR2TableSimpleT)
dev.off()