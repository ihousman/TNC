#Install packages if not already done
#install.packages(c('corrplot','randomForest','stringr' , 'caret','ranger','doParallel','lmodel2'))
#Bring in packages
library(corrplot)
library(randomForest)
library(stringr)
library(caret)
library(doParallel)
# library(egg)
library(ranger)
library(lmodel2)
######################################
#Set up workspace
# load("C:/TNC-analysis/RData")
wd = 'C:/TNC/tables_dec_rework'
wdAnalysis =  'C:/TNC/analysis3_dec_rework/'
setwd(wdAnalysis)
load("C:/TNC/test.RData")
# wd = 'C:/scratch'
# setwd(wd)

#Set parameters
ntree = 500#Number of trees in the RF models
nBoot = 100#Number of bootstrap iterations for LM models

#Number of variable names to keep for rf model
topN = 20

#Define strata fields
strataFields = c('All','Level1_For','Level2_For','Level3_For','Level4_Div',  'Macrogroup','huc8','Biome_c','Depth_Str','ecoregion','iGDE_distQuantiles','minMaxQuantiles')

#Define which fields are available statewide
strataFieldsForMonitoring = c('All','Level1_For','Level2_For','Level3_For','Level4_Div',  'Macrogroup','huc8','Biome_c','ecoregion')


######################################
######################################
######################################
# function to get quantiles
#Taken from https://stackoverflow.com/questions/15561976/quantiles-by-factor-levels-in-r
qfun <- function(x, q = 5) {
  quantile <- cut(x, breaks = quantile(x, probs = 0:q/q), 
                  include.lowest = TRUE, labels = 1:q)
  quantile
}

#Function to pull p from lm
#Pulled from: https://stackoverflow.com/questions/5587676/pull-out-p-values-and-r-squared-from-a-linear-regression
lmp <- function (modelobject) {
  if (class(modelobject) != "lm") stop("Not an object of class 'lm' ")
  f <- summary(modelobject)$fstatistic
  p <- pf(f[1],f[2],f[3],lower.tail=F)
  attributes(p) <- NULL
  return(p)
}
######################################
#Read in tables
# tables = list.files(wd,pattern = '*.csv$',include.dirs = TRUE)
# allData = mclapply(tables,function(table){print(table);read.csv(table)})
# allData = do.call(rbind,allData)
allData = na.omit(allData)

#If data are already read in, load saved .RData file
# save.image("analysis_data.RData")
# load("C:/TNC/tables/analysis_data.RData")

#Set up some of the strata fields that are not already in the tables
#Add strata field constant for all covers
allData$All = as.factor('Covers')

#Compute the minMax Quantiles
allData$minMax = allData$AnnDepth_2 - allData$AnnDepth_1
allData$minMaxQuantiles = qfun(allData$minMax,4)

#Compute the distance quantiles
allData$iGDE_distQuantiles = qfun(allData$iGDE_dist_,4)


#There are some low value outliers for depth to gw
#This removes values < nsd
#Get rid of dgw outliers and values < minDGW
nsd = 4
minDGW = -20

#Set the number of times the model 2 regression is run. This is useful if using non-parametric approach for confidence/t test, but slows things down a lot
nperm = 1

#Find the mean and sdd of the dgw
m = mean(allData$D0_Depth.To.Groundwater)
stdDev = sd(allData$D0_Depth.To.Groundwater)
maxDepth = m+(stdDev*nsd)

#Filter out bad data
goodData  = allData$D0_Depth.To.Groundwater < maxDepth & allData$D0_Depth.To.Groundwater >= minDGW
allDataWOOutliers = allData[goodData,]

#Check results to ensure outliers are gone
hist(allDataWOOutliers$D0_Depth.To.Groundwater)
#If only one table, use this option
# allData = na.omit(read.csv(tables))

######################################
#Filter table
allDataSample = allDataWOOutliers#[sample(length(allData[,1]),1000),]

#Find all predictor variables and dependents
predictors =  names(allDataSample)[grepl('D0_|D1_',names(allDataSample))]
predictorsTable = allDataSample[,predictors]

#Find all independent predictors only
independents =  predictors[grep('D0_Depth.To.Groundwater|D1_Depth.To.Groundwater',predictors,invert = TRUE)]


#Pull out the dependents and independents
dep0 = predictorsTable$D0_Depth.To.Groundwater
dep1 = predictorsTable$D1_Depth.To.Groundwater
ind = predictorsTable[independents]

#Find unique polygon ids
ids = unique(allDataWOOutliers$POLYGON_ID)
######################################
#Functions for Phase II
#Calculate rmse with a given linear model
getRMSE = function(lm,coeffs){
  coeffs = as.numeric(coeffs)
  predicted = (lm$x - coeffs[2])/coeffs[1] 
  rmse = (sqrt(mean(lm$x - predicted)^2))
  return(rmse)
}
#Extract rmses at various confidence intervals and different linear models 
getRMSES = function(lm){
  ols_coeffs = lm$regression.results[1,][c(2,3)]
  ma_coeffs = lm$regression.results[2,][c(2,3)]
  sma_coeffs = lm$regression.results[3,][c(2,3)]
  
  ols_25_coeffs = lm$confidence.intervals[1,][c(2,4)]
  ols_975_coeffs = lm$confidence.intervals[1,][c(3,5)]
  
  ma_25_coeffs = lm$confidence.intervals[2,][c(2,4)]
  ma_975_coeffs = lm$confidence.intervals[2,][c(3,5)]
  
  sma_25_coeffs = lm$confidence.intervals[3,][c(2,4)]
  sma_975_coeffs = lm$confidence.intervals[3,][c(3,5)]
  
  ols_rmse = getRMSE(lm,ols_coeffs)
  ma_rmse = getRMSE(lm,ma_coeffs)
  sma_rmse = getRMSE(lm,sma_coeffs)
  
  
  ols_25_rmse = getRMSE(lm,ols_25_coeffs)
  ma_25_rmse = getRMSE(lm,ma_25_coeffs)
  sma_25_rmse = getRMSE(lm,sma_25_coeffs)
  
  ols_975_rmse = getRMSE(lm,ols_975_coeffs)
  ma_975_rmse = getRMSE(lm,ma_975_coeffs)
  sma_975_rmse = getRMSE(lm,sma_975_coeffs)
  
    
  return(c(ols_rmse,ma_rmse,sma_rmse,ols_25_rmse,ma_25_rmse,sma_25_rmse,ols_975_rmse,ma_975_rmse,sma_975_rmse))
  
}
#Fit model for a given set of variables
applyBase = function(id,dep,ind,base,varName,whichD,nperm=1){
  #Set up the independent
  ind = eval(parse(text=paste0('ind$',varName)))
  
  #Compute the linear model using lmodel2
  lm =  lmodel2(ind~dep, nperm=nperm,range.y = 'interval',range.x = 'interval')
  
  #Compute the number of observations (years for each well for a given polygon id)
  n = length(ind)
  
  #Get the rmses
  rmses = getRMSES(lm)
  
  #Create a xy scatter plot if R2 > 0.6
  if(lm$rsquare > 0.6  ){
    pngName = paste0(id,'_',varName,'_',base,'.png')
    png(pngName)
    plot(lm,'MA',xlab = 'Depth to GW',ylab = paste0(d0Var,'_',base),main =paste0('ID: ',id, ' n:',n,' R2:', format(round(lm$rsquare , 4), nsmall = 4),' P:', format(round(lm$P.param , 4), nsmall = 4)))
    dev.off()
  }
  
  
  #Create the entry for the output table
  outLine = c(id,varName,whichD,base, nperm,n,lm$rsquare,lm$P.param,rmses,lm$regression.results$Intercept,lm$regression.results$Slope,lm$regression.results$"P-perm (1-tailed)",lm$confidence.intervals$"2.5%-Intercept",lm$confidence.intervals$"97.5%-Intercept",lm$confidence.intervals$"2.5%-Slope",lm$confidence.intervals$"97.5%-Slope")
  # t =  rbind(outTable,outLine)
  # assign("outTable", t, envir = .GlobalEnv)
  return(outLine)
}

#Wrapper function to process a polygon id
processID = function(id){
 outTable = c()
  # registerDoParallel(cores=8)
  # outTableFinal <- foreach(ids, .combine=rbind) %dopar% {
  
  #Pull out the rows for the given id
  t = subset(allData, POLYGON_ID==id) 
  
  #Pull out Landtrendr, Depth to gw, and harmonic variables
  t = t[,names(t)[grepl('D0_|D1_',names(t))]]
  t = t[,names(t)[grepl('LT_Fitted|Depth|_AUC|_phase|_amplitude|peakJulianDay',names(t))]]
  
  #If there are >= 20 obs for the id, process it
  if(length(t[,1]) >= 20){
    print(id)
    print(match(id,ids))
    
    #Separate out the depth to gw and the pairwise depth to gw
    depD0T = t$D0_Depth.To.Groundwater
    depD1T = t$D1_Depth.To.Groundwater
    
    
    #Set up the independents and different transformations- many were not used
    indT = t[,names(t)[grepl('D0_|D1_',names(t))]]
    indT = predict(preProcess(indT,method = c('range')),indT)
    
    # indT_exp_pt1 = indT^0.1#predict(preProcess(indT^0.1,method = c('range')),indT^0.1)
    
    indT_exp_pt5 = predict(preProcess(indT^0.5,method = c('range')),indT^0.5)
    
    indT_exp_2 = predict(preProcess(indT^2,method = c('range')),indT^2)
    
    # indT_exp_3 = indT^3#predict(preProcess(indT^3,method = c('range')),indT^3)
    
    # indT_sin = sin(indT)#predict(preProcess(sin(indT),method = c('range')),sin(indT))
    
    # indT_cos = cos(indT)#predict(preProcess(cos(indT),method = c('range')),cos(indT))
    
    # indT_tan = tan(indT)#predict(preProcess(tan(indT),method = c('range')),tan(indT))
    
    # indT_log = predict(preProcess(log(indT),method = c('range')),log(indT*10))
    
    
    
    #In the end filtered down to only include Landtrendr for independents
    dVars = names(t)[grepl('LT_Fitted',names(t))]#[grepl('LT_Fitted|_AUC|_phase|_amplitude|peakJulianDay',names(t))]
    d0Vars = dVars[grepl('D0_',dVars)]
    d1Vars = dVars[grepl('D1_',dVars)]
    
    #Iterate across each d0 variable transformation and get result
    for(d0Var in d0Vars){
      # print(d0Var)
      
      outTable = rbind(outTable,applyBase(id,depD0T,indT,'Raw',d0Var,'D0',nperm))
      outTable = rbind(outTable,applyBase(id,depD0T,indT_exp_pt5,'exp_pt5',d0Var,'D0',nperm))
      # outTable = rbind(outTable,applyBase(id,depD0T,indT_exp_pt1,'exp_pt1',d0Var,'D0',nperm))
      outTable = rbind(outTable,applyBase(id,depD0T,indT_exp_2,'exp_2',d0Var,'D0',nperm))
      # outTable = rbind(outTable,applyBase(id,depD0T,indT_exp_3,'exp_3',d0Var,'D0',nperm))
      # outTable = rbind(outTable,applyBase(id,depD0T,indT_sin,'sin',d0Var,'D0',nperm))
      # outTable = rbind(outTable,applyBase(id,depD0T,indT_cos,'cos',d0Var,'D0',nperm))
      # outTable = rbind(outTable,applyBase(id,depD0T,indT_tan,'tan',d0Var,'D0',nperm))
      
    }
    #Iterate across each d1 variable transformation and get result
    for(d1Var in d1Vars){
      # print(d1Var)
      
      outTable = rbind(outTable,applyBase(id,depD1T,indT,'Raw',d1Var,'D1',nperm))
      outTable = rbind(outTable,applyBase(id,depD1T,indT_exp_pt5,'exp_pt5',d1Var,'D1',nperm))
      # outTable = rbind(outTable,applyBase(id,depD1T,indT_exp_pt1,'exp_pt1',d1Var,'D1',nperm))
      outTable = rbind(outTable,applyBase(id,depD1T,indT_exp_2,'exp_2',d1Var,'D1',nperm))
      # outTable = rbind(outTable,applyBase(id,depD1T,indT_exp_3,'exp_3',d1Var,'D1',nperm))
      # outTable = rbind(outTable,applyBase(id,depD1T,indT_sin,'sin',d1Var,'D1',nperm))
      # outTable = rbind(outTable,applyBase(id,depD1T,indT_cos,'cos',d1Var,'D1',nperm))
      # outTable = rbind(outTable,applyBase(id,depD1T,indT_tan,'tan',d1Var,'D1',nperm))
      
    }
  }
  return(outTable)
}
#Higher level wrapper to batch process polygon ids that is used in the multi-threading method below
processIDs = function(idsT){
  startID = idsT[1]
  endID = idsT[length(idsT)]

  outName = paste0(startID,'_',endID,'_iGDE_LM_Results_Table.csv')
  outTable = foreach(id= idsT,.combine =rbind)%dopar%{data.frame(processID(id))}
  outTable = data.frame(outTable)
  
  outTableFactors = outTable[,1:6]
  outTableNumbers = outTable[,7:45]
  outTableNumbers <- lapply(outTableNumbers, function(x) as.numeric(as.character(x)))
  
  outTableFixed = data.frame(cbind(outTableFactors,outTableNumbers))
  nms = c('ID','Variable_Name','WhichD','Base_Function','Nperm','N','Rsq','P','OLS_RMSE','MA_RMSE','SMA_RMSE','OLS_25_RMSE','MA_25_RMSE','SMA_25_RMSE','OLS_975_RMSE','MA_975_RMSE','SMA_975_RMSE','OLS_Intercept','MA_Intercept','SMA_Intercept','RMA_Intercept','OLS_Slope','MA_Slope','SMA_Slope','RMA_Slope','OLS_P','MA_P','SMA_P','RMA_P','OLS_Intercept_2.5','MA_Intercept_2.5','SMA_Intercept_2.5','RMA_Intercept_2.5','OLS_Intercept_97.5','MA_Intercept_97.5','SMA_Intercept_97.5','RMA_Intercept_97.5','OLS_Slope_2.5','MA_Slope_2.5','SMA_Slope_2.5','RMA_Slope_2.5','OLS_Slope_97.5','MA_Slope_97.5','SMA_Slope_97.5','RMA_Slope_97.5')
  
  names(outTableFixed) = nms
  write.csv(outTableFixed,outName,row.names = F)
  
  
  outTableGood = outTableFixed[outTableFixed$Rsq > 0.8,]
  
  
  
}
#Method for summarizing
summarizeByVB = function(vb){
  print(vb)
  var = as.character(vb[1])
  b = as.character(vb[2])
 
  # 
  t = outTableFixed[outTableFixed$Variable_Name == var ,]
  t = t[t$Base_Function == b ,]
 
  qp = c(0,0.05,0.25,0.5,0.75,0.95,1)
  rsqQ = quantile(t$Rsq,qp)
  names(rsqQ) = sapply(names(rsqQ),function(i){paste0('Rsq ',i)})
  
  ols_rmseQ = quantile(t$OLS_RMSE,qp)
  names(ols_rmseQ) = sapply(names(ols_rmseQ),function(i){paste0('OLS RMSE ',i)})
  
  ma_rmseQ = quantile(t$MA_RMSE,qp)
  names(ma_rmseQ) = sapply(names(ma_rmseQ),function(i){paste0('MA RMSE ',i)})
  
  sma_rmseQ = quantile(t$SMA_RMSE,qp)
  names(sma_rmseQ) = sapply(names(sma_rmseQ),function(i){paste0('SMA RMSE ',i)})
  namesFirst = c('Variable_Name','Base_Function')
  first = c(var,b)
  names(first) = namesFirst
  
  
  outHist = paste0(var,'_',b,'_R2_Hist.png')
  png(outHist)
  hist(t$Rsq,main = paste0(var, ' ',b, ' R2 Hist'),xlab = parse(text='R^2'))
  abline(v = mean(t$Rsq),col = 'red')
  abline(v = median(t$Rsq),col = 'blue')
  # text(mean(t$Rsq),-0,"Mean",srt=0.2,pos=3)
  # text(median(t$Rsq),500,"Median",srt=0.2,pos=3)
  dev.off()
  return(c(first,rsqQ,ols_rmseQ,ma_rmseQ,sma_rmseQ))
  
}
#Function to summarize final table
summarizeTable = function(outTableFixed){
  vars = as.vector(unique(outTableFixed$Variable_Name))
  bases =  as.vector(unique(outTableFixed$Base_Function))
 
  vbs = t((expand.grid(vars,bases)))
  
  bestVars = foreach(vb = vbs,.combine = rbind)%do%{summarizeByVB(vb)}
  write.csv(bestVars,'Best_Variables_Summary_iGDE_LM_Results_Table.csv',row.names = F)
  
}

#Set up cluster for multi threading
cl <- makeCluster(7)

#Bring in packages
clusterEvalQ(cl, library(corrplot))
clusterEvalQ(cl,library(randomForest))
clusterEvalQ(cl,library(stringr))
clusterEvalQ(cl,library(caret))
clusterEvalQ(cl,library(doParallel))

clusterEvalQ(cl,library(ranger))
clusterEvalQ(cl,library(lmodel2))
registerDoParallel(cl)

#Process all the ids
outTable = foreach(id= ids,.combine =rbind)%dopar%{data.frame(processID(id))}

stopCluster()

#Write out complete results table
outTable = data.frame(outTable)
# c(id,varName,whichD,base, nperm,n,lm$rsquare,lm$P.param,rmses,lm$regression.results$Intercept,lm$regression.results$Slope,lm$regression.results$"P-perm (1-tailed)",lm$confidence.intervals$"2.5%-Intercept",lm$confidence.intervals$"97.5%-Intercept",lm$confidence.intervals$"2.5%-Slope",lm$confidence.intervals$"97.5%-Slope")
# (ols_rmse,ma_rmse,sma_rmse,ols_25_rmse,ma_25_rmse,sma_25_rmse,ols_975_rmse,ma_975_rmse,sma_975_rmse))
names(outTable) = c('ID','Variable_Name','WhichD','Base_Function','Nperm','N','Rsq','P','OLS_RMSE','MA_RMSE','SMA_RMSE','OLS_RMSE_25','MA_RMSE_25','SMA_RMSE_25','OLS_RMSE_975','MA_RMSE_975','SMA_RMSE_975','OLS_Intercept','MA_Intercept','SMA_Intercept','RMA_Intercept','OLS_Slope','MA_Slope','SMA_Slope','RMA_Slope','OLS_P','MA_P','SMA_P','RMA_P','OLS_Intercept_2.5','MA_Intercept_2.5','SMA_Intercept_2.5','RMA_Intercept_2.5','OLS_Intercept_97.5','MA_Intercept_97.5','SMA_Intercept_97.5','RMA_Intercept_97.5','OLS_Slope_2.5','MA_Slope_2.5','SMA_Slope_2.5','RMA_Slope_2.5','OLS_Slope_97.5','MA_Slope_97.5','SMA_Slope_97.5','RMA_Slope_97.5')
write.csv(outTable,'iGDE_LM_Results_Table_Dec_2019_Rework.csv',row.names = F)
# outTableFixed =outTable
# summarizeTable(outTableFixed)

#Do some post-processing
#Apply 0.5 R2 threshold
t =outTable[as.numeric(as.character(outTable$Rsq))>0.6,]
#t =outTable[as.vector(outTable$Rsq)>0.6,]
#Find how many were above the threshold
n = length(as.vector(unique(t$ID)))

#Look at obs count by id
byID = t %>%group_by(ID) %>%summarize(n())
names(byID) = c('Column_Name','Count')
byID$Column = 'By_ID'
#write.csv(byID,'iGDE_LM_Results_Table_Dec_2019_Rework_Summary_ID_Counts.csv',row.names = F)

#Summarize by D0 vs D1 counts
whichD = t %>%group_by(WhichD) %>%summarize(n())
names(whichD) = c('Column_Name','Count')
whichD$Column = 'whichD'


#Summarize by the basis function counts
base_function = t %>%group_by(Base_Function) %>%summarize(n())
names(base_function) = c('Column_Name','Count')
base_function$Column = 'Base_Function'

#Summarize by variable counts
variable_name = t %>%group_by(Variable_Name) %>%summarize(n())
names(variable_name) = c('Column_Name','Count')
variable_name$Column = 'VariableName'

#Set up summary table and write it out
summary_table = rbind(whichD,base_function,variable_name,byID)
write.csv(summary_table,'iGDE_LM_Results_Table_Dec_2019_Rework_Summary_Counts.csv',row.names = F)
counts = allDataWOOutliers %>%group_by(POLYGON_ID) %>%summarize(n())
######################################
#Phase 1 code
#Function for pulling stats from LM
getLMStats = function(m){
  r2 = format(round(m$results$Rsquared , 4), nsmall = 4)
  r2SD = format(round(m$results$RsquaredSD , 2), nsmall = 2)
  
  rmse = format(round(m$results$RMSE, 2), nsmall = 2)
  rmseSD = format(round(m$results$RMSESD, 2), nsmall = 2)
  return(c(r2,r2SD,rmse,rmseSD))
}
#Function for creating plot from LM
getLMPlot = function(m,labWord){
  
  r2 = format(round(m$results$Rsquared , 4), nsmall = 4)
  r2SD = format(round(m$results$RsquaredSD , 2), nsmall = 2)
  
  rmse = format(round(m$results$RMSE, 2), nsmall = 2)
  rmseSD = format(round(m$results$RMSESD, 2), nsmall = 2)
  
  bootTotal = length(m$pred$pred)
  
  p = ggplot(m$pred, aes(x=obs, y=pred) ) +
    geom_bin2d(bins = as.integer(100)) +
    theme_bw()+
    theme(text = element_text(size=16))+
    xlab(paste0('Observed',labWord,' Depth to GW'))+
    ylab(paste0('Predicted ',labWord,' Depth to GW'))+
    labs(title = paste('LM Strata Field:',strataField,' Stratum:',class), subtitle = paste0('No Strata N:',n,' Bootstrap N:',bootTotal,' R2:',r2,'\u00b1',r2SD,' RMSE:',rmse,'\u00b1',rmseSD))+
    scale_fill_distiller(palette= "Spectral", direction=-1) +
    geom_abline(slope = 1,intercept = 0,linetype = 2)
    # geom_abline(slope = 1,intercept = 1*m$results$RMSE,linetype = 4)+
    # geom_abline(slope = 1,intercept = -1*m$results$RMSE,linetype = 4)
  
}
#Function to pull stats from RF model
getRFStats = function(m){
  r2 = format(round( m$r.squared , 4), nsmall = 4)
  
  rmse = sqrt(mean((m$obs-m$predictions)^2))
  rmse =as.numeric(format(round(rmse,2),nsmall = 2))
  return(c(r2,rmse))
}
#Function to plot RF
getRFPlot = function(m,labWord,wStrata){
  # m = rfD1
  r2 = format(round( m$r.squared , 4), nsmall = 4)
  
  rmse = sqrt(mean((m$obs-m$predictions)^2))
  rmse =as.numeric(format(round(rmse,2),nsmall = 2))
  mP = data.frame(cbind(m$obs,m$predictions))
  
  names(mP) = c('obs','pred')
  
  # labWord = ' Change in'
  p = ggplot(mP,aes(x=obs, y=pred) ) +
    geom_bin2d(bins = as.integer(50)) +
    theme_bw()+
    theme(text = element_text(size=16))+
    xlab(paste0('Observed',labWord,' Depth to GW'))+
    ylab(paste0('Predicted ',labWord,' Depth to GW'))+
    labs(title = paste('RF Strata Field:',strataField,' Stratum:',class), subtitle = paste0(wStrata,' N:',n,' R2:',r2,' RMSE:',rmse))+
    scale_fill_distiller(palette= "Spectral", direction=-1) +
    geom_abline(slope = 1,intercept = 0,linetype = 2)
    # geom_abline(slope = 1,intercept = 1*rmse,linetype = 4)+
    # geom_abline(slope = 1,intercept = -1*rmse,linetype = 4)
  return(p)
}
#Function to get var importance as a sorted flattened string list
getImpStr = function(m,topN){
  
  importance = data.frame(sort(m$variable.importance,decreasing = T))
  importance$rns = rownames(importance)
  names(importance) = c('Decrease_Impurity','Variable_Name')
  
  impF = with(importance[1:topN,], paste0(Variable_Name,' ',format(round(Decrease_Impurity, 2), nsmall = 2)))
  return(impF)
}
#Function to get importance plot from ranger model object
getImpPlot= function(m,strataField,class,d,wStrata){
  importance = data.frame(sort(m$variable.importance,decreasing = T))
  importance$rns = rownames(importance)
  names(importance) = c('Decrease_Impurity','Variable_Name')
  
  r2 = format(round( m$r.squared , 4), nsmall = 4)
  
  rmse = sqrt(mean((m$obs-m$predictions)^2))
  rmse =as.numeric(format(round(rmse,2),nsmall = 2))
  
  p = ggplot(importance,aes(x = reorder(Variable_Name,Decrease_Impurity),y=Decrease_Impurity))+
    geom_bar(stat="identity")+ 
    coord_flip()+ labs(y = 'Decrease_Impurity', x ='Predictor')+
    theme_bw()+
    labs(title = paste(d,' RF Strata Field:',strataField,' Stratum:',class),subtitle = paste0(wStrata,' N:',n,' R2:',r2,' RMSE:',rmse))
  return(p)
}
######################################################################
#Start of actual analysis

#Set up output table
outTableMult = c()
registerDoParallel(cores = 8)

#Iterate across each stratum
for(strataField in strataFields){
  #Set up strata
  strata = as.factor(eval(parse(text=paste0('allDataWOOutliers$',strataField))))
  classes = levels(strata)
  
  #Iterate across strata within give nfield
  for(class in classes){
    
    #Filter out data
    isThatClass = strata == class
    n = sum(isThatClass)
    
    #Only analyze if n > 20
    if(n>20){
      #Clean up name of class to exclude certain characters
      if(str_detect(class,'1.C.3. Temperate Flooded and Swamp Forest')){class = '1.C.3. Temperate Flooded and Swamp Forest'}
      class = str_replace(class,'/','_')
      class = str_replace(class,':','_')
      class = str_replace(class,'>','_greater_than_')
      class = str_replace(class,'<','_less_than_')
      
      #Filter data for just that class
      allDataClassStrata = allDataWOOutliers[isThatClass,]
      
      #Filter just predictors
      predictorsTableClassStrata =  allDataClassStrata[,predictors]
      
      #Pull all the strata fields
      strataClassStrata = allDataClassStrata[,strataFields]
      
      #Pull just the strata fields that are statewide
      strataClassStrataForMonitoring = allDataClassStrata[,strataFieldsForMonitoring]
      
      #Let user know what's being analyzed
      print(c(strataField,class,n))
      
      #Pull just the independents
      indClassStrata = predictorsTableClassStrata[independents]
      
      #Use the findCorrelation function from caret to reduce co-linearity
      corMat<-  cor(indClassStrata)
      indNoCor <- findCorrelation(corMat, cutoff = .9)
      indClassStrataNoCor <- indClassStrata[,-indNoCor]
      
      #Pull the predictors for both D0 and D1 (since all are used, they're the same)
      predictorsTableClassStrataD0 =  indClassStrataNoCor#predictorsTableClassStrata[grep('D1_Depth.To.Groundwater',predictors,invert = TRUE)]
      predictorsTableClassStrataD1 =  indClassStrataNoCor#predictorsTableClassStrata[grep('predictorsTableClassStrataD0',predictors,invert = TRUE)]
      
      #Add the dependent back on
      predictorsTableClassStrataD0$D0_Depth.To.Groundwater = predictorsTableClassStrata$D0_Depth.To.Groundwater
      predictorsTableClassStrataD1$D1_Depth.To.Groundwater = predictorsTableClassStrata$D1_Depth.To.Groundwater
      
      #Append all the strata and the statewide strata for D0 and then D1
      predictorsTableClassStrataD0_W_All_Strata = cbind(predictorsTableClassStrataD0,strataClassStrata)
      predictorsTableClassStrataD0_W_Monitoring_Strata = cbind(predictorsTableClassStrataD0,strataClassStrataForMonitoring)
      
      predictorsTableClassStrataD1_W_All_Strata = cbind(predictorsTableClassStrataD1,strataClassStrata)
      predictorsTableClassStrataD1_W_Monitoring_Strata = cbind(predictorsTableClassStrataD1,strataClassStrataForMonitoring)
      
      #Add the dependent back in
      dep0ClassStrata = predictorsTableClassStrata$D0_Depth.To.Groundwater
      dep1ClassStrata = predictorsTableClassStrata$D1_Depth.To.Groundwater
      
      #Set up trainControl object
      train_control <- trainControl(method="boot", number=nBoot,savePredictions = T)
      #Train the lm models
      print('Fitting LM D0')
      lmD0 <- train(D0_Depth.To.Groundwater~., preProcess = c("center", "scale"),data=predictorsTableClassStrataD0, trControl=train_control, method="lm")
      print('Fitting LM D1')
      lmD1 <- train(D1_Depth.To.Groundwater~., preProcess = c("center", "scale"),data=predictorsTableClassStrataD1, trControl=train_control, method="lm")
      
      #Pull the relevant info from the LM models
      lmP0 = getLMPlot(lmD0,'')
      lmP1 = getLMPlot(lmD1,' Change in')
      lmStats0 = getLMStats(lmD0)
      lmStats1 = getLMStats(lmD1)
      
      #Clean the LM models
      rm('lmD0','lmD1')
      
      #Fit the RF models wo strata
      print('Fitting RF D0')
      rfD0 = ranger(D0_Depth.To.Groundwater~., data=predictorsTableClassStrataD0,num.trees = ntree,num.threads = 8,importance = 'impurity')
      print('Fitting RF D1')
      rfD1 = ranger(D1_Depth.To.Groundwater~., data=predictorsTableClassStrataD1,num.trees = ntree,num.threads = 8,importance = 'impurity')
      
      #Add the dependents for xy scatter plotting
      rfD0$obs = dep0ClassStrata
      rfD1$obs = dep1ClassStrata
      
      #Get scatter plots
      rfP0 = getRFPlot(rfD0,'','No Strata')
      rfP1 = getRFPlot(rfD1,' Change in','No Strata')
      
      #Get var imp plots
      rfVarImp0 = getImpPlot(rfD0,strataField,class,'D0','No Strata')
      rfVarImp1 = getImpPlot(rfD1,strataField,class,'D1','No Strata')
      
      #Get stats
      rfStats0 = getRFStats(rfD0)
      rfStats1 = getRFStats(rfD1)
      
      #Get var imp for output table
      rfImp0 = getImpStr(rfD0,topN)
      rfImp1 = getImpStr(rfD1,topN)
      
      #Clean models out
      rm('rfD0','rfD1')
      
      #Repeat the same process for predictors w/ all strata
      print('Fitting RF w All Strata D0')
      rfD0_w_All_Strata = ranger(D0_Depth.To.Groundwater~., data=predictorsTableClassStrataD0_W_All_Strata,num.trees = ntree,num.threads = 8,importance = 'impurity')
      print('Fitting RF w All Strata D1')
      rfD1_w_All_Strata = ranger(D1_Depth.To.Groundwater~., data=predictorsTableClassStrataD1_W_All_Strata,num.trees = ntree,num.threads = 8,importance = 'impurity')
      
      rfD0_w_All_Strata$obs = dep0ClassStrata
      rfD1_w_All_Strata$obs = dep1ClassStrata
      
      
      rfP0_w_All_Strata = getRFPlot(rfD0_w_All_Strata,'','All Strata')
      rfP1_w_All_Strata = getRFPlot(rfD1_w_All_Strata,' Change in','All Strata')
      
      rfVarImp0_w_All_Strata = getImpPlot(rfD0_w_All_Strata,strataField,class,'D0','All Strata')
      rfVarImp1_w_All_Strata = getImpPlot(rfD1_w_All_Strata,strataField,class,'D1','All Strata')
      
      rfStats0_w_All_Strata = getRFStats(rfD0_w_All_Strata)
      rfStats1_w_All_Strata = getRFStats(rfD1_w_All_Strata)
      
      rfImp0_w_All_Strata = getImpStr(rfD0_w_All_Strata,topN)
      rfImp1_w_All_Strata = getImpStr(rfD1_w_All_Strata,topN)
      
      
      rm('rfD0_w_All_Strata','rfD1_w_All_Strata')
      
      #Repeat process with statewide strata
      print('Fitting RF w Monitoring Strata D0')
      rfD0_w_Monitoring_Strata = ranger(D0_Depth.To.Groundwater~., data=predictorsTableClassStrataD0_W_Monitoring_Strata,num.trees = ntree,num.threads = 8,importance = 'impurity')
      print('Fitting RF w Monitoring Strata D1')
      rfD1_w_Monitoring_Strata = ranger(D1_Depth.To.Groundwater~., data=predictorsTableClassStrataD1_W_Monitoring_Strata,num.trees = ntree,num.threads = 8,importance = 'impurity')
      
      rfD0_w_Monitoring_Strata$obs = dep0ClassStrata
      rfD1_w_Monitoring_Strata$obs = dep1ClassStrata
      
      
      
      rfP0_w_Monitoring_Strata = getRFPlot(rfD0_w_Monitoring_Strata,'','Monitoring Strata')
      rfP1_w_Monitoring_Strata = getRFPlot(rfD1_w_Monitoring_Strata,' Change in','Monitoring Strata')
      
      
      
      rfVarImp0_w_Monitoring_Strata = getImpPlot(rfD0_w_Monitoring_Strata,strataField,class,'D0','Monitoring Strata')
      rfVarImp1_w_Monitoring_Strata = getImpPlot(rfD1_w_Monitoring_Strata,strataField,class,'D1','Monitoring Strata')
      
      rfStats0_w_Monitoring_Strata = getRFStats(rfD0_w_Monitoring_Strata)
      rfStats1_w_Monitoring_Strata = getRFStats(rfD1_w_Monitoring_Strata)
      
      rfImp0_w_Monitoring_Strata = getImpStr(rfD0_w_Monitoring_Strata,topN)
      rfImp1_w_Monitoring_Strata = getImpStr(rfD1_w_Monitoring_Strata,topN)
      
      rm('rfD0_w_Monitoring_Strata','rfD1_w_Monitoring_Strata')
      
      
      #Set up xy scatter plot
      plotName = paste0(strataField,'_',class,'_RF_LM_Boot_Actual_vs_Predicted.png')
      png(plotName,width = 1500,height = 600*4)
      grid.arrange( lmP0,lmP1,rfP0,rfP1,rfP0_w_All_Strata,rfP1_w_All_Strata,rfP0_w_Monitoring_Strata,rfP1_w_Monitoring_Strata, nrow = 4)
      dev.off()
      
      #Set up var imp plot
      plotName = paste0(strataField,'_',class,'_RF_Var_Imp.png')
      png(plotName,width = 1500,height = 1200*3)
      grid.arrange( rfVarImp0,rfVarImp1, rfVarImp0_w_All_Strata,rfVarImp1_w_All_Strata,rfVarImp0_w_Monitoring_Strata,rfVarImp1_w_Monitoring_Strata
,nrow = 3)
      dev.off()
      
      
      
      
     
      
      
      #Create line for table
      outLineD0 = c(paste0(strataField,class),strataField,class,'D0',n,ntree,nBoot,lmStats0[1],rfStats0[1],rfStats0_w_All_Strata[1],rfStats0_w_Monitoring_Strata[1], lmStats0[3],rfStats0[2],rfStats0_w_All_Strata[2],rfStats0_w_Monitoring_Strata[2],lmStats0[2],lmStats0[4],rfImp0,rfImp0_w_All_Strata,rfImp0_w_Monitoring_Strata)
      outLineD1 = c(paste0(strataField,class),strataField,class,'D1',n,ntree,nBoot,lmStats1[1],rfStats1[1],rfStats1_w_All_Strata[1],rfStats1_w_Monitoring_Strata[1], lmStats1[3],rfStats1[2],rfStats1_w_All_Strata[2],rfStats1_w_Monitoring_Strata[2],lmStats1[2],lmStats1[4],rfImp1,rfImp1_w_All_Strata,rfImp1_w_Monitoring_Strata)
      outTableMult = rbind(outTableMult,outLineD0,outLineD1)
      
      #Save table in case something goes wrong
      save(outTableMult,file ='outTableMult')

    }
  }
}

#Write out table  
outTableMult = data.frame(outTableMult)
namesOutTableMult = c('Name','Strata','Class','D','N_iGDEs','N_RF_Trees','N_LM_Boot','LM_RSQ','RF_RSQ_No_Strata','RF_RSQ_All_Strata','RF_RSQ_Monitoring_Strata','LM_RMSE','RF_RMSE_No_Strata','RF_RMSE_All_Strata','RF_RMSE_Monitoring_Strata','LM_RSQ_SD','LM_RMSE_SD',lapply(seq(topN),function(i){paste0('No Strata RF Top ',i)}),lapply(seq(topN),function(i){paste0('All Strata RF Top ',i)}),lapply(seq(topN),function(i){paste0('Monitoring Strata RF Top ',i)}))
names(outTableMult) = namesOutTableMult
write.csv(outTableMult,'Mult_Linear_Regression_RF_Regression.csv')

####################################
#Summarize results

#Which fields to compute a weighted average for
summaryFields = c('LM_RSQ','RF_RSQ_No_Strata','RF_RSQ_All_Strata','RF_RSQ_Monitoring_Strata','LM_RMSE','RF_RMSE_No_Strata','RF_RMSE_All_Strata','RF_RMSE_Monitoring_Strata')

#Split into d0 and d2
otD0 = outTableMult[outTableMult$D == 'D0',]
otD1 = outTableMult[outTableMult$D == 'D1',]

#Iterate through strata and summarize
summaryTable = c()
for(strata in  levels(outTableMult$Strata)) {
  print(strata)
  
  #Pull apart d0 and d1
  t0 = otD0[otD0$Strata == strata,]
  t1 = otD1[otD1$Strata == strata,]
  
  #Pull out the weights (n igde for given strata)
  weights = as.numeric(as.vector(t0$N_iGDEs))
  
  #Function for getting D0 weighted mean
  getWeightedMean0 = function(i){
    values = as.numeric(as.vector(eval(parse(text=paste0('t0$',i)))))
    out = weighted.mean(values, weights)
    return(out)
  }
  #Function for getting D1 weighted mean
  getWeightedMean1 = function(i){
    values = as.numeric(as.vector(eval(parse(text=paste0('t1$',i)))))
    out = weighted.mean(values, weights)
    return(out)
  }
  #Get the stats across the fields
  t0Stats = sapply(summaryFields,getWeightedMean0)
  t1Stats = sapply(summaryFields,getWeightedMean1)
  
  #Set up output lines
  t0Stats = c(strata,'D0',t0Stats)
  t1Stats = c(strata,'D1',t1Stats)
  summaryTable = rbind(summaryTable,t0Stats,t1Stats)
  
}
#Write out table
summaryTable = as.data.frame(summaryTable)
names(summaryTable) = c('Strata','D',names(summaryTable)[3:length(names(summaryTable))])
write.csv(summaryTable,'Mult_Linear_Regression_RF_Regression_Weighted_Average_Summary_Table.csv')

