# install.packages(c('corrplot','randomForest','stringr' , 'caret'))
# library(Boruta)
library(corrplot)
library(randomForest)
# library(varSelRF)
library(stringr)
library(caret)
library(doParallel)
library(egg)
library(ranger)
######################################
#Set up workspace
# load("C:/TNC-analysis/RData")
wd = 'C:/TNC/analysis/outputs_boot1'
# load("C:/scratch/_RData.gz")
# wd = 'C:/scratch'
setwd(wd)

outputs_folder = 'outputs_boot1'
#Set parameters
ntree = 500

#Number of variable names to keep for rf model
topN = 20

#Define strata fields
# strataFields = c('All','Level1_For','Level2_For','Level3_For','Level4_Div',  'Macrogroup','VEGETATION','wDepth_str','q_maxMean')
strataFields = c('All','Level1_For','Level2_For','Level3_For','Level4_Div',  'Macrogroup','huc8','Biome_c','Depth_Str','ecoregion','iGDE_distQuantiles','minMaxQuantiles')
 # strataFields = c('Level3_For','Level4_Div',  'Macrogroup')
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
# 
# allData = na.omit(allData)

# save.image("analysis_data.RData")
load("C:/TNC/analysis/analysis_data.RData")
#Add strata field constant for all covers
allData$All = as.factor('Covers')

allData$minMax = allData$AnnDepth_2 - allData$AnnDepth_1
allData$minMaxQuantiles = qfun(allData$minMax,4)

allData$iGDE_distQuantiles = qfun(allData$iGDE_dist_,4)



#Get rid of dgw outliers and values < 0
nsd = 4
minDGW = -20
m = mean(allData$D0_Depth.To.Groundwater)
stdDev = sd(allData$D0_Depth.To.Groundwater)
maxDepth = m+(stdDev*nsd)
goodData  = allData$D0_Depth.To.Groundwater < maxDepth & allData$D0_Depth.To.Groundwater >= minDGW
allDataWOOutliers = allData[goodData,]

hist(allDataWOOutliers$D0_Depth.To.Groundwater)
#If only one table, use this option
# allData = na.omit(read.csv(tables))

######################################
#Filter table
allDataSample = allDataWOOutliers#[sample(length(allData[,1]),1000),]

predictors =  names(allDataSample)[grepl('D0_|D1_',names(allDataSample))]

independents =  predictors[grep('D0_Depth.To.Groundwater|D1_Depth.To.Groundwater',predictors,invert = TRUE)]

predictorsTable = allDataSample[,predictors]

dep0 = predictorsTable$D0_Depth.To.Groundwater
dep1 = predictorsTable$D1_Depth.To.Groundwater
ind = predictorsTable[independents]
######################################
######################################
#Use randomForest to see how well variables work together to predict depth to groundwater

# rfD0 = randomForest(ind, dep0,  ntree=ntree,importance = TRUE)
# vbOutName = 'RF_Var_Imp_All_Variables_D0'
# png(paste0(vbOutName,'.png'),height = 2000,width = 1000)
# varImpPlot(rfD0,n.var=length(ind[1,]),main = paste0('RF Var Imp All Variables D0'))
# dev.off()
# 
# rfD1 = randomForest(ind, dep1,  ntree=ntree,importance = TRUE)
# vbOutName = 'RF_Var_Imp_All_Variables_D1'
# png(paste0(vbOutName,'.png'),height = 2000,width = 1000)
# varImpPlot(rfD1,n.var=length(ind[1,]),main = paste0('RF Var Imp All Variables D1'))
# dev.off()
######################################
#Conduct pair-wise correlation analysis
#Strata test




# 
# outTable = c()
# 
# for(strataField in strataFields[7:7]){
#   #Set up strata
#   strata = eval(parse(text=paste0('allData$',strataField)))
#   classes = levels(strata)
#   
#   #Iterate across strata within give nfield
#   for(class in classes[1:1]){
#     
#     #Filter out data
#     isThatClass = strata == class
#     n = sum(isThatClass)
#     allDataClassStrata = allData[isThatClass,]
#     predictorsTableClassStrata =  allDataClassStrata[,predictors]
#     print(c(strataField,class,n))
#     
#     #Create correlation matrix
#     corMatrix = cor(predictorsTableClassStrata)#,dgw)
#     
#     #Plot cor matrix 
#     if(n>2){
#       if(str_detect(class,'1.C.3. Temperate Flooded and Swamp Forest')){class = '1.C.3. Temperate Flooded and Swamp Forest'}
#       class = str_replace(class,'/',' ')
#       
#       png(paste0(strataField,'_',class,'_Corr_plot.png'),width = 2000,height = 2000)
#       corrplot(corMatrix,method = 'ellipse',type = 'lower')#,order = 'FPC')
#       mtext(paste0(strataField,' ',class,' n = ',n),  line=-0.5, cex=2)
#       dev.off()
#     }
#     
#     #Add depth rows from matrix to outTable
#     names = names(data.frame(corMatrix))
#     wanted = grepl('Depth',names)
#     wantedI = seq(1,length(names))[wanted]
#     
#     corLines = corMatrix[wantedI,]
#     corLines = cbind(n,corLines)
#     corNames = lapply(rownames(corLines),function(n){paste0(strataField,'_',class,'_',n)})
#     rownames(corLines) = corNames
#     outTable = rbind(outTable,corLines)
#     
#     
#     
#   }
#   
# }
# 
# #Write out the master r value table
# write.csv(outTable,'R-Values-By-Strata.csv')
# 
# #Filter out table for finding variables with highest r values
# outTableFiltered = outTable[outTable[,1] > 5,]
# ns = outTableFiltered[,1]
# outTableFiltered = outTableFiltered[,independents]
# rns = rownames(outTableFiltered)
# 
# 
# #Iterate across each stratum to find variable with highest r2
# maxR2Table = c()
# maxR2TableSimple = c()
# for(i in seq(1,length(rns))){
#   r = outTableFiltered[i,]
#   n = ns[i]
#   if(n > 2){
#     r2 = r*r
#     minR2 = min(r2)
#     maxR2 = max(r2)
#     
#     r2Min = r2[r2== minR2]
#     r2Max = r2[r2== maxR2]
#     
#     tops = quantile(r2,c(0.5))
#     r2Tops = sort(r2[r2 >= tops])
#     
#     maxR2Table = rbind(maxR2Table,c(rns[i],n,names(r2Tops),r2Tops))
#     maxR2TableSimple = rbind(maxR2TableSimple,c(rns[i],r2Tops))
#   }
#   
# }
# nTops = length(r2Tops)
# topsVarsNames = lapply(seq(nTops,1),function(i){paste0('Top R2 Var Name ',i)})
# topsValuesNames = lapply(seq(nTops,1),function(i){paste0('Top R2 Value ',i)})
# 
# maxR2Table  = data.frame(maxR2Table)
# maxR2TableSimple  = data.frame(maxR2TableSimple)
# names(maxR2Table) = c('Strata','N',topsVarsNames,topsValuesNames)
# names(maxR2TableSimple) = c('Strata',topsValuesNames)
# 
# write.csv(maxR2Table,'Top-10pctl-R2-Variables-By-Strata.csv')
# 
# 
# t = outTable#[seq(1,5),]
# t = t[,independents]
# t = t*t
# rns = rownames(t)
# 
# png('test_boxplot.png',width = 3000,height = 1500)
# boxplot(t~rns)
# dev.off()

getLMStats = function(m){
  r2 = format(round(m$results$Rsquared , 4), nsmall = 4)
  r2SD = format(round(m$results$RsquaredSD , 2), nsmall = 2)
  
  rmse = format(round(m$results$RMSE, 2), nsmall = 2)
  rmseSD = format(round(m$results$RMSESD, 2), nsmall = 2)
  return(c(r2,r2SD,rmse,rmseSD))
}
getLMPlot = function(m,labWord){
  # m = lmD1
  # labWord = ' Change in'
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
    labs(title = paste('LM Strata Field:',strataField,' Stratum:',class), subtitle = paste0('N:',n,' Bootstrap N:',bootTotal,' R2:',r2,'\u00b1',r2SD,' RMSE:',rmse,'\u00b1',rmseSD))+
    scale_fill_distiller(palette= "Spectral", direction=-1) +
    geom_abline(slope = 1,intercept = 0,linetype = 2)+
    geom_abline(slope = 1,intercept = 1*m$results$RMSE,linetype = 4)+
    geom_abline(slope = 1,intercept = -1*m$results$RMSE,linetype = 4)
  
}
getRFStats = function(m){
  r2 = format(round( m$r.squared , 4), nsmall = 4)
  
  rmse = sqrt(mean((m$obs-m$predictions)^2))
  rmse =as.numeric(format(round(rmse,2),nsmall = 2))
  return(c(r2,rmse))
}
getRFPlot = function(m,labWord){
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
    labs(title = paste('RF Strata Field:',strataField,' Stratum:',class), subtitle = paste0('N:',n,' R2:',r2,' RMSE:',rmse))+
    scale_fill_distiller(palette= "Spectral", direction=-1) +
    geom_abline(slope = 1,intercept = 0,linetype = 2)+
    geom_abline(slope = 1,intercept = 1*rmse,linetype = 4)+
    geom_abline(slope = 1,intercept = -1*rmse,linetype = 4)
  return(p)
}

##########################################
#Multiple var analysis
outTableMult = c()
ntree = 500
registerDoParallel(cores = 8)
for(strataField in strataFields){
  #Set up strata
  strata = as.factor(eval(parse(text=paste0('allDataWOOutliers$',strataField))))
  classes = levels(strata)
  
  #Iterate across strata within give nfield
  for(class in classes){
    
    #Filter out data
    isThatClass = strata == class
    n = sum(isThatClass)
    
    if(n>20){
      if(str_detect(class,'1.C.3. Temperate Flooded and Swamp Forest')){class = '1.C.3. Temperate Flooded and Swamp Forest'}
      
      class = str_replace(class,'/',' ')
      class = str_replace(class,':',' ')
        allDataClassStrata = allDataWOOutliers[isThatClass,]
        
        predictorsTableClassStrata =  allDataClassStrata[,predictors]
        
        
        print(c(strataField,class,n))
        
        indClassStrata = predictorsTableClassStrata[independents]
        
        corMat<-  cor(indClassStrata)
        indNoCor <- findCorrelation(corMat, cutoff = .9)
        indClassStrataNoCor <- indClassStrata[,-indNoCor]
        
        predictorsTableClassStrataD0 =  indClassStrataNoCor#predictorsTableClassStrata[grep('D1_Depth.To.Groundwater',predictors,invert = TRUE)]
        predictorsTableClassStrataD1 =  indClassStrataNoCor#predictorsTableClassStrata[grep('predictorsTableClassStrataD0',predictors,invert = TRUE)]
        
        predictorsTableClassStrataD0$D0_Depth.To.Groundwater = predictorsTableClassStrata$D0_Depth.To.Groundwater
        predictorsTableClassStrataD1$D1_Depth.To.Groundwater = predictorsTableClassStrata$D1_Depth.To.Groundwater
        
        
        
        dep0ClassStrata = predictorsTableClassStrata$D0_Depth.To.Groundwater
        dep1ClassStrata = predictorsTableClassStrata$D1_Depth.To.Groundwater
        
        train_control <- trainControl(method="boot", number=100,savePredictions = T)
        # train the model
        lmD0 <- train(D0_Depth.To.Groundwater~., preProcess = c("center", "scale"),data=predictorsTableClassStrataD0, trControl=train_control, method="lm")
        lmD1 <- train(D1_Depth.To.Groundwater~., preProcess = c("center", "scale"),data=predictorsTableClassStrataD1, trControl=train_control, method="lm")
        
        rfD0 = ranger(D0_Depth.To.Groundwater~., data=predictorsTableClassStrataD0,num.trees = ntree,num.threads = 8,importance = 'impurity')
        rfD1 = ranger(D1_Depth.To.Groundwater~., data=predictorsTableClassStrataD1,num.trees = ntree,num.threads = 8)
        
        rfD0$obs = dep0ClassStrata
        rfD1$obs = dep1ClassStrata
        
        
        lmP0 = getLMPlot(lmD0,'')
        lmP1 = getLMPlot(lmD1,' Change in')
        
        rfP0 = getRFPlot(rfD0,'')
        rfP1 = getRFPlot(rfD1,' Change in')
        
        plotName = paste0(strataField,'_',class,'_RF_LM_Boot_Actual_vs_Predicted.png')
        png(plotName,width = 1500,height = 1200)
        grid.arrange(lmP0, lmP1, rfP0,rfP1,nrow = 2)
        dev.off()
        
        lmStats0 = getLMStats(lmD0)
        lmStats1 = getLMStats(lmD1)
        rfStats0 = getRFStats(rfD0)
        rfStats1 = getRFStats(rfD1)
        
        # # 
        # # print(lmD0P)
        outLineD0 = c(paste0(strataField,class),strataField,class,'D0',n,ntree,lmStats0[1],rfStats0[1],lmStats0[3],rfStats0[2],lmStats0[2],lmStats0[4])
        outLineD1 = c(paste0(strataField,class),strataField,class,'D1',n,ntree,lmStats1[1],rfStats1[1],lmStats1[3],rfStats1[2],lmStats1[2],lmStats1[4])
        outTableMult = rbind(outTableMult,outLineD0,outLineD1)
        
        
        
                # #Run rf on d0
        # rfD0ClassStrata = randomForest(indClassStrata, dep0ClassStrata,  ntree=ntree,importance = TRUE)
        # 
        # #Run rf on d1
        # rfD1ClassStrata = randomForest(indClassStrata, dep1ClassStrata,  ntree=ntree,importance = TRUE)
        # 
        # 
        # #Get RMSE and R2
        # d0RSQ = format(round(cor(predictorsTableClassStrata$D0_Depth.To.Groundwater, rfD0ClassStrata$predicted,use = 'pairwise.complete.obs')^2
        #                      , 4), nsmall = 4)
        # d1RSQ = format(round(cor(predictorsTableClassStrata$D1_Depth.To.Groundwater, rfD1ClassStrata$predicted,use = 'pairwise.complete.obs')^2
        #                      , 4), nsmall = 4)
        # d0RMSE = format(round(sqrt(rfD0ClassStrata$mse[ntree]), 2), nsmall = 2)
        # d1RMSE = format(round(sqrt(rfD1ClassStrata$mse[ntree]), 2), nsmall = 2)
        # 
        # #Plot var imp plots
        # vbOutName = paste0(strataField,'_',class,'_RF_Var_Imp_D0')
        # png(paste0(vbOutName,'.png'),height = 2000,width = 1200)
        # varImpPlot(rfD0ClassStrata,n.var=length(indClassStrata[1,]),main = paste0('RF Var Imp D0 ',strataField,' ',class, ' n=',n,' RSQ=',d0RSQ,' RMSE=',d0RMSE))
        # dev.off()
        # 
        # vbOutName = paste0(strataField,'_',class,'_RF_Var_Imp_D1')
        # png(paste0(vbOutName,'.png'),height = 2000,width = 1200)
        # varImpPlot(rfD1ClassStrata,n.var=length(indClassStrata[1,]),main = paste0('RF Var Imp D1 ',strataField,' ',class, ' n=',n,' RSQ=',d1RSQ,' RMSE=',d1RMSE))
        # dev.off()
        # 
        # #Get topN from var imp plots
        # d0Imp = data.frame(rfD0ClassStrata$importance)
        # d0SortedImp = d0Imp[order(-d0Imp$X.IncMSE),][seq(topN),]
        # d0SortedImp$rns = rownames(d0SortedImp)
        # d0SortedImp = with(d0SortedImp, paste0(rns,' ',format(round(X.IncMSE, 4), nsmall = 4), ' ',format(round(IncNodePurity, 4), nsmall = 4)))
        # 
        # d1Imp = data.frame(rfD1ClassStrata$importance)
        # d1SortedImp = d1Imp[order(-d1Imp$X.IncMSE),][seq(topN),]
        # d1SortedImp$rns = rownames(d1SortedImp)
        # d1SortedImp = with(d1SortedImp, paste0(rns,' ',format(round(X.IncMSE, 4), nsmall = 4), ' ',format(round(IncNodePurity, 4), nsmall = 4)))
        # 
        # 
        # #Run lm on d0
        # # predictorsTableClassStrataD0 = data.frame(scale(predictorsTableClassStrataD0))
        # # predictorsTableClassStrataD1 = data.frame(scale(predictorsTableClassStrataD1))
        # lmD0 = lm(D0_Depth.To.Groundwater~.,data =predictorsTableClassStrataD0 )
        # lmD1 = lm(D1_Depth.To.Groundwater~.,data = predictorsTableClassStrataD1)
        # 
        # 
        # lmD0Coeffs = data.frame(lmD0$coefficients)
        # lmD0Coeffs$nms = rownames(lmD0Coeffs)
        # names(lmD0Coeffs) = c('coeffs','nms')
        # lmD0Coeffs = paste(with(lmD0Coeffs,paste0(nms,'*',coeffs)),collapse = ' + ')
        # 
        # lmD1Coeffs = data.frame(lmD1$coefficients)
        # lmD1Coeffs$nms = rownames(lmD1Coeffs)
        # names(lmD1Coeffs) = c('coeffs','nms')
        # lmD1Coeffs = paste(with(lmD1Coeffs,paste0(nms,'*',coeffs)),collapse = ' + ')
        # 
        # 
        # # bD0 <- Boruta(D0_Depth.To.Groundwater~.,data = predictorsTableClassStrataD0, doTrace=2,maxRuns = 200)  # perform Bo
        # # be =  earth(D0_Depth.To.Groundwater~.,data = predictorsTableClassStrataD0,nfold = 100)
        # # impD <- calc.relimp(lmD0, type = "lmg")  # calculate relative importance scaled to 100
        # # 
        # # cfD0 <- cforest(D0_Depth.To.Groundwater~.,data = predictorsTableClassStrataD0, control=cforest_unbiased(ntree=50)) 
        # # 
        # #Get RMSE and R2
        # lmD0RMSE = format(round(sqrt(mean(lmD0$residuals^2)), 2), nsmall = 2)
        # lmD1RMSE = format(round(sqrt(mean(lmD1$residuals^2)), 2), nsmall = 2)
        # 
        # 
        # lmD0RSQ = format(round(summary(lmD0)$r.squared, 4), nsmall = 4)
        # lmD1RSQ = format(round(summary(lmD1)$r.squared, 4), nsmall = 4)
        # 
        # lmD0P = lmp(lmD0) 
        # lmD0P = format(lmD0P, nsmall = 4)
        # lmD1P = lmp(lmD1)
        # lmD1P = format(lmD1P, nsmall = 4)
        # # if(lmD0P == 'NA'){lmD0P = 0}
        # # if(lmD1P == 'NA'){lmD1P = 0}
        # # if(lmD0P < 1e-10){lmD0P= 0}else{lmD0 = format(lmD0, nsmall = 4)}
        # # if(lmD1P < 1e-10){lmD1P= 0}else{lmD1 = format(lmD1, nsmall = 4)}
        # # 
        # # print(lmD0P)
        # outLineD0 = c(paste0(strataField,class),strataField,class,'D0',n,ntree,lmD0RSQ,d0RSQ,lmD0RMSE,d0RMSE,lmD0P,d0SortedImp,lmD0Coeffs)
        # outLineD1 = c(paste0(strataField,class),strataField,class,'D1',n,ntree,lmD1RSQ,d1RSQ,lmD1RMSE,d1RMSE,lmD1P,d1SortedImp,lmD1Coeffs)
        # outTableMult = rbind(outTableMult,outLineD0,outLineD1)
        # 
        # 
        # lm0OutName = paste0(strataField,'_',class,'_LM_Actual_vs_Predicted_D0.png')
        # lm1OutName = paste0(strataField,'_',class,'_LM_Actual_vs_Predicted_D1.png')
        # 
        # rf0OutName = paste0(strataField,'_',class,'_RF_Actual_vs_Predicted_D0.png')
        # rf1OutName = paste0(strataField,'_',class,'_RF_Actual_vs_Predicted_D1.png')
        # 
        # pch = 19
        # col = rgb(0,0,0,0.1)
        # png(rf0OutName)
        # plot(predictorsTableClassStrata$D0_Depth.To.Groundwater,rfD0ClassStrata$predicted,xlab = 'Actual D0 DGW',ylab = 'Predicted D0 DGW',main = paste0('RF D0 n=',n,' RSQ=',d0RSQ,' RMSE=',d0RMSE),pch = pch,col = rgb(1,0,0,alpha=0.1) )
        # abline(0,1,lwd = 0.1,col = col)
        # dev.off()
        # 
        # png(rf1OutName)
        # plot(predictorsTableClassStrata$D1_Depth.To.Groundwater,rfD1ClassStrata$predicted,xlab = 'Actual D1 DGW',ylab = 'Predicted D1 DGW',main = paste0('RF D1 n=',n,' RSQ=',d1RSQ,' RMSE=',d1RMSE),pch = pch,col = rgb(1,0,0,alpha=0.1) )
        # abline(0,1,lwd = 0.1,col = col)
        # dev.off() 
        # 
        # png(lm0OutName)
        # plot(predictorsTableClassStrata$D0_Depth.To.Groundwater,lmD0$fitted.values,xlab = 'Actual D0 DGW',ylab = 'Predicted D0 DGW',main = paste0('LM D0 n=',n,' RSQ=',lmD0RSQ,' RMSE=',lmD0RMSE,' P=',lmD0P),pch = pch,col = rgb(1,0,0,alpha=0.1) )
        # abline(0,1,lwd = 0.1,col = col)
        # dev.off()
        # 
        # png(lm1OutName)
        # plot(predictorsTableClassStrata$D1_Depth.To.Groundwater,lmD1$fitted.values,xlab = 'Actual D1 DGW',ylab = 'Predicted D1 DGW',main = paste0('LM D1 n=',n,' RSQ=',lmD1RSQ,' RMSE=',lmD1RMSE,' P=',lmD1P),pch = pch,col = rgb(1,0,0,alpha=0.1) )
        # abline(0,1,lwd = 0.1,col = col)
        # dev.off()
        save(outTableMult,file ='outTableMult')
    }
  }
}
  
outTableMult = data.frame(outTableMult)
# namesOutTableMult = c('Name','Strata','Class','D','N iGDEs','nTrees','LM_RSQ','RF_RSQ','LM_RMSE','RF_RMSE','LM_P',lapply(seq(topN),function(i){paste0('RF Top ',i)}),'LM_Coeffs')
namesOutTableMult = c('Name','Strata','Class','D','N iGDEs','nTrees','LM_RSQ','RF_RSQ','LM_RMSE','RF_RMSE','LM_RSQ_SD','LM_RMSE_SD')
names(outTableMult) = namesOutTableMult
write.csv(outTableMult,'Mult_Linear_Regression_RF_Regression.csv')
 