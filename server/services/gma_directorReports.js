
var util = require('util');
var sys = require('sys');
var stringify = util.inspect || sys.inspect;
var $ = AD.jQuery;
var log = AD.Util.Log;
var logDump = AD.Util.LogDump;

var gmaClientDirectorReport = new AD.App.Service({});
module.exports = gmaClientDirectorReport;

// This contains info about the GMA language codes
var gmaSysInfo = require('../../data/gmaSysInfo.js');

// GMA measurements can only be recognized by matching their English names.
// So we need to have the GMA `languageId` for English.
var langEN = gmaSysInfo.languageMap['en'];

/**
 * Initialize the gmaClient cookie jar with the user's CAS credentials.
 */
var authenticate = require('../gma_authenticate.js');


var reportNodeLookup = {
/*
    "reportID_123": "nodeID_456",
    "reportID_124": "nodeID_567",
    ...
*/
};


gmaClientDirectorReport.setup = function(app) {

	/**
	 * This service fetches the list of director reports that the user can submit.
	 * It also adds an entry into the `reportNodeLookup` object.
	 */
	app.get('/service/gmaClient/directorReport', [authenticate], function(req, res, next) {
	    // Specify the date so that we only get reports whose interval 
	    // includes the specified date.
        var selectedDate = req.param('date');
        if (!selectedDate) {
            // If no date specified, use today
            var now = new Date();
            selectedDate = now.getFullYear()  // yyyy
               + String(now.getMonth()+1).replace(/^(.)$/, '0$1') // mm
               + String(now.getDate()).replace(/^(.)$/, '0$1'); // dd
        }
        log(req, 'Fetching reports that overlap: ' + selectedDate);

	    if (req.session['gmaClient-reportsList']) {
	        var reports = req.session['gmaClient-reportsList'][selectedDate];
	        if (reports) {
                AD.Comm.Service.sendSuccess(req, res, reports);
                logDump(req, 'Director reports retrieved from session cache');
                return;
            }
	    }
	    
	    // Get the user's language
	    var langCode = req.aRAD.viewer.languageKey;
	    var langID = gmaSysInfo.languageMap[langCode];
	    log(req, 'Language: ' + langID + ' - ' + langCode);
        
	    // GMA Web Service 4.4.1 Own Director Report Search
	    AD.Comm.HTTP.request({
	        method: 'POST',
	        url: AD.GMA.baseURL + '?q=en/gmaservices/gma_directorReport/searchOwn',
	        jar: req.session['gmaClient-jar'],
	        json: {
                    dateWithin: selectedDate,
                    //submitted: "false",
                    languageId: langID
            }
	    })
	        .then(function(data) {
	            if (data.success) {
	            
	                if (!data.data.directorReports) {
	                   // This user has no GMA reports, so no measurements can be 
	                   // read or submitted
	                   AD.Comm.Service.sendError(req, res, {
	                       errorID: 9001,
	                       errorMSG: "Sorry, there are no GMA reports currently available for you."
	                   });
               	       logDump(req, 'No director reports found for this user');
	                   return;
	                }
	                
	                // This will be used as the reports drop down list
	                var reports = {};
	                for (var i=0; i<data.data.directorReports.length; i++) {
	                    var reportID = data.data.directorReports[i]['directorReportId'];
                        var nodeID = data.data.directorReports[i]['node']['nodeId'];
	                    var nodeName = data.data.directorReports[i]['node']['shortName'];
	                    var period = data.data.directorReports[i]['startDate'] 
	                            + ' - '
	                            + data.data.directorReports[i]['endDate'];
	                    reports[reportID] = {
	                       "nodeID": nodeID,
	                       "reportName": nodeName + ' (' + period + ')'
	                   };
                        
                       // Store this nodeID/reportID in the lookup object
	                   reportNodeLookup[reportID] = nodeID;
	                }
	                
	                // Cache results in the user's session
	                if (!req.session['gmaClient-reportsList']) {
	                   req.session['gmaClient-reportsList'] = {};
	                }
	                req.session['gmaClient-reportsList'][selectedDate] = reports;

	                AD.Comm.Service.sendSuccess(req, res, reports);
	                logDump(req);
	                return;

	            }
	            else {
	                // `success` == false
	                log(req, 'gmaReports failed');
	                logDump(req, data);
	                AD.Comm.Service.sendError(req, res, { errorMSG: "Unable to get the list of your reports from GMA" });
	                return;
	            }
	        })
	        .fail(function(err) {
	            // Badly formed results
	            logDump(req, err);
	            AD.Comm.Service.sendError(req, res, err);
	        })
	});

    
	/**
	 * Service that fetches all the measurements associated with a given report.
	 */
	app.get('/service/gmaClient/directorReport/:reportID', [authenticate], function(req, res, next)
	{
	    var reportID = req.params['reportID'];
	    var nodeID = reportNodeLookup[reportID]; // <-- see above service

	    // Get the user's language
	    var langCode = req.aRAD.viewer.languageKey;
	    var langID = gmaSysInfo.languageMap[langCode];
	    log(req, 'Language: ' + langID + ' - ' + langCode);
        
        //// Testing
	    //langID = 2;
	    
	    //// Fetch these in parallel
        
        // GMA web service 4.4.3 Director Report Retrieve
	    var getReport = AD.Comm.HTTP.request({
	        method: 'GET',
	        jar: req.session['gmaClient-jar'],
	        url: AD.GMA.baseURL + '?q=en/gmaservices/gma_directorReport/' + reportID + '/numeric'
	    });
	    // GMA web service 4.1.5 Node Get Measurements (in English)
        var getNode = AD.Comm.HTTP.request({
           method: 'GET',
           jar: req.session['gmaClient-jar'],
           url: AD.GMA.baseURL + '?q=en/gmaservices/gma_node/' + nodeID + '/measurements/numeric'
        	           + '&languageId=' + langEN
        });
	    // GMA web service 4.1.5 Node Get Measurements (Translation)
        var getNodeTrans;
        if (langID != langEN) {
            getNodeTrans = AD.Comm.HTTP.request({
               method: 'GET',
               jar: req.session['gmaClient-jar'],
               url: AD.GMA.baseURL + '?q=en/gmaservices/gma_node/' + nodeID + '/measurements/numeric'
                           + '&languageId=' + langID
            });
        } else {
            getNodeTrans = $.Deferred();
            getNodeTrans.resolve({});
        }
        
        $.when(getReport, getNode, getNodeTrans)
	    .then(function(reportData, nodeData, nodeTransData) {
            var measurementNames = {};
            var measurementNamesTrans = {};
            if (nodeData.success) {
                // Re-organize the node data results into a simple 
                // measurementNames lookup.
                for (var i=0; i<nodeData.data.numericMeasurements.length; i++) {
                    var mccItem = nodeData.data.numericMeasurements[i];
                    for (var mccName in mccItem) {
                        var mccMeasurements = mccItem[mccName];
                        for (var j=0; j<mccMeasurements.length; j++) {
                            var measurementID = mccMeasurements[j]['measurementId'];
                            var measurementName = mccMeasurements[j]['measurementName'];
                            measurementNames[measurementID] = measurementName;
                        }
                    }
                }
            }
            if (nodeTransData.success) {
                // If user's language is not English, then organize the
                // measurement name translations now.
                for (var i=0; i<nodeTransData.data.numericMeasurements.length; i++) {
                    var mccItem = nodeTransData.data.numericMeasurements[i];
                    for (var mccName in mccItem) {
                        var mccMeasurements = mccItem[mccName];
                        for (var j=0; j<mccMeasurements.length; j++) {
                            var measurementID = mccMeasurements[j]['measurementId'];
                            var measurementName = mccMeasurements[j]['measurementName'];
                            measurementNamesTrans[measurementID] = measurementName;
                        }
                    }
                }
            }
	        if (reportData.success) {
	            // Re-organize GMA report data into a more useful form
	            var measurements = {
	            /*
	                'SLM': {
	                    "measurement_1_name": { id: 123, desc: 'hello world' },
	                    "measurement_2_name": { ... },
	                    ...
	                },
	                'LLM': { ... },
	                ...
	            */
	            };
	            for (var i=0; i<reportData.data.numericMeasurements.length; i++) {
	                var mccItem = reportData.data.numericMeasurements[i];
                    for (var mccName in mccItem) {
                        var mccMeasurements = mccItem[mccName];
                        for (var k=0; k<mccMeasurements.length; k++) {
                            var definition = ''; // <-- how to fetch this info?
                            var measurementID = mccMeasurements[k]['measurementId'];
                            var value = mccMeasurements[k]['measurementValue'];
                            var name = String(measurementNames[measurementID]).trim();
                            var nameTrans = measurementNamesTrans[measurementID];
                            if (typeof mccName == 'string') {
                                mccName = mccName.trim();
                            }
                            if (!measurements[mccName]) {
                                measurements[mccName] = {};
                            }
                            measurements[mccName][name] = {
                                id: measurementID,
                                desc: definition,
                                value: value,
                                trans: nameTrans || name
                            };
                        }
                    }
	            }
	            // Combine report measurements with the grid meta-info data
	            var metaData = require('../../data/metaData_'+langCode+'.js');
	            // Meta-data MCCs
	            for (var mccName in metaData) {
	                var mccData = metaData[mccName];
	                // Meta-data question blocks
	                for (var i=mccData.length-1; i>=0; i--) {
	                    var dataQuestions = mccData[i]['questions'];
	                    // Meta-data questions
	                    for (var j=dataQuestions.length-1; j>=0; j--) {
	                        var measurementName = dataQuestions[j]['name'].trim();
	                        if (measurements[mccName] && measurements[mccName][measurementName]) {
	                            // This question has a match in the GMA node.
	                            var gmaMeasurement = measurements[mccName][measurementName];
	                            dataQuestions[j]['measurementId'] = gmaMeasurement['id'];
	                            dataQuestions[j]['value'] = gmaMeasurement['value'];
	                            //questions[j]['definition'] = measurements[mcc][measurementName]['definition'];
	                            dataQuestions[j]['trans'] = gmaMeasurement['trans'];
	                            // Now that the data has been copied, remove it 
	                            // from the GMA results.
	                            delete measurements[mccName][measurementName];
	                        } else {
	                            // This question is not found in the GMA node,
	                            // so remove it from the final results.
	                            log(req, 'Ignoring measurement not found in GMA node: '
	                                   + '[' + mccName + '][' + dataQuestions[j]['name'] + ']');
	                            //log(req, measurements[mccName]);
	                            dataQuestions.splice(j, 1);
	                        }
	                    }
	                    if (dataQuestions.length == 0) {
	                       // This block has no questions, so remove it from the
	                       // final results.
	                       mccData.splice(i, 1);
	                    }
	                }
	            }
	            // Add all leftover measurements into the meta data object.
	            for (var mccName in measurements) {
	               if (!metaData[mccName]) {
	                   // GMA node has an MCC not found in the meta-data.
	                   metaData[mccName] = [];
	                   log(req, 'GMA node has an MCC not found in the meta-data [' + mccName + ']');
	               }
	               var mccData = measurements[mccName];
	               for (var measurementName in mccData) {
	                   var measurement = mccData[measurementName];
	                   metaData[mccName].push({
	                       section: 'extra',
	                       column: 'extra',
	                       title: measurement.trans, // <-- translated
	                       questions: [{
	                           name: measurementName,
	                           //trans: measurement.trans,
	                           text: '',
	                           definition: measurement.desc,
	                           measurementId: measurement.id,
	                           value: measurement.value,
	                           params: {}
	                       }]
	                   });
	               }
	            }
	            
	            var finalData = {
	                results: metaData
	            };
	            // Return results
	            AD.Comm.Service.sendSuccess(req, res, finalData);
                logDump(req, 'Director report list delivered successfully');
	        }
	        else {
	            // Request returned valid results. But `success` == false
	            AD.Comm.Service.sendError(req, res, { errorMSG: 'gma_directorReport was not successful' });
                log(req, 'Director report list could not be fetched');
                logDump(req, reportData);
	        }
	        
	    })
	    .fail(function(err, err) {
	        // Request returned badly formed results
	        AD.Comm.service.sendError(req, res, err);
            log(req, 'Director report data was badly formed');
	        logDump(req, err);
	    });
	    
	});

}