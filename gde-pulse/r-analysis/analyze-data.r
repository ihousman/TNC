library(corrplot)
library(randomForest)
library(varSelRF)
######################################
#Set up workspace
wd = 'D:/scratch'
setwd(wd)

#Set parameters
ntree = 100

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
allDataSample = allData[sample(length(allData[,1]),1000),]

predictors =  names(allDataSample)[grepl('D0_|D1_',names(allDataSample))]

independents =  predictors[grep('D0_Depth.To.Groundwater|D1_Depth.To.Groundwater',predictors,invert = TRUE)]

predictorsTable = allDataSample[,predictors]

dep0 = predictorsTable$D0_Depth.To.Groundwater
dep1 = predictorsTable$D1_Depth.To.Groundwater
ind = predictorsTable[independents]
######################################
#Conduct pair-wise correlation analysis
corMatrix = cor(predictorsTable)#,dgw)
png('Corr_plot.png',width = 2000,height = 2000)

corrplot(corMatrix,method = 'ellipse',type = 'lower')#,order = 'FPC')
dev.off()
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

selD1 <- varSelRF(ind, dep1, ntree = ntree, ntreeIterat = ntree,
                vars.drop.frac = 0.2,verbose = TRUE,recompute.var.imp = FALSE)

