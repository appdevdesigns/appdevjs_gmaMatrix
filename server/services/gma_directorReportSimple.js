
var util = require('util');
var sys = require('sys');
var stringify = util.inspect || sys.inspect;
var $ = AD.jQuery;
var log = AD.Util.Log;
var logDump = AD.Util.LogDump;

var gmaClientDirectorReportSimple = new AD.App.Service({});
module.exports = gmaClientDirectorReportSimple;

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


gmaClientDirectorReportSimple.setup = function(app) {

	/**
	 * This service fetches the list of director reports that the user can submit.
	 * It also adds an entry into the `reportNodeLookup` object.
	 */
	app.get('/service/gmaClient/directorReportSimple', [authenticate], function(req, res, next) {
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
	    
	    // GMA Web Service 4.4.1 Own Director Report Search
	    AD.Comm.HTTP.request({
	        method: 'POST',
	        url: AD.GMA.baseURL + '?q=en/gmaservices/gma_directorReport/searchOwn',
	        jar: req.session['gmaClient-jar'],
	        json: {
                    dateWithin: selectedDate,
                    //submitted: "false",
                    //languageId: langID
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
	                       "nodeName": nodeName,
	                       "period": period,
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
	                AD.Comm.Service.sendError(req, res, { errorMSG: "Unable to get the list of your reports from GMA" }, 200);
	                return;
	            }
	        })
	        .fail(function(err) {
	            // Badly formed results
	            logDump(req, err);
	            AD.Comm.Service.sendError(req, res, err, 200);
	        })
	});

    
    
	/**
	 * Service that fetches all the measurements associated with a given report.
	 * The data is returned in this format, in the user's default GMA language:
	 * {
	 *     "strategy_name_1": { 
     *         "measurement_name_1": { "id": 123, "value": 200 },
     *         "measurement_name_2": { ... },
     *         ...
     *     },
     *     "strategy_name_2": { ... },
     *     ...
	 * }
	 *
	 */
	app.get('/service/gmaClient/directorReportSimple/:reportID', [authenticate], function(req, res, next)
	{
	    var reportID = req.params['reportID'];
	    var nodeID = reportNodeLookup[reportID]; // <-- see above service

	    //// Fetch these in parallel
        
        // GMA web service 4.4.3 Director Report Retrieve
	    var getReport = AD.Comm.HTTP.request({
	        method: 'GET',
	        jar: req.session['gmaClient-jar'],
	        url: AD.GMA.baseURL + '?q=en/gmaservices/gma_directorReport/' + reportID + '/numeric'
	    });
	    // GMA web service 4.1.5 Node Get Measurements
        var getNode = AD.Comm.HTTP.request({
           method: 'GET',
           jar: req.session['gmaClient-jar'],
           url: AD.GMA.baseURL + '?q=en/gmaservices/gma_node/' + nodeID + '/measurements/numeric'
        });
        
        $.when(getReport, getNode)
	    .then(function(reportData, nodeData) {
            var measurementNames = {
            /*
                1234: "measurement ABCD",
                ...
            */
            };
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
	        if (reportData.success) {
	            // Combine GMA report data with the measurement names.
	            // (The GMA web service for fetching a report will give you the
	            //  measurement ID, but not the measurement name.)
	            var measurements = {
	            /*
	                'SLM': {
	                    "measurement_1_name": { "id": 123, "value": 200 },
	                    "measurement_2_name": { "id": 234, "value": 150 },
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
                            var measurementID = mccMeasurements[k]['measurementId'];
                            var value = mccMeasurements[k]['measurementValue'];
                            var name = String(measurementNames[measurementID]).trim();
                            if (typeof mccName == 'string') {
                                mccName = mccName.trim();
                            }
                            if (!measurements[mccName]) {
                                measurements[mccName] = {};
                            }
                            measurements[mccName][name] = {
                                id: measurementID,
                                value: value
                            };
                        }
                    }
	            }

	            // Return results
	            AD.Comm.Service.sendSuccess(req, res, measurements);
                logDump(req, 'Director report list delivered successfully');
	        }
	        else {
	            // Request returned valid results. But `success` == false
	            AD.Comm.Service.sendError(req, res, { errorMSG: 'gma_directorReport was not successful' }, 200);
                log(req, 'Director report list could not be fetched');
                logDump(req, reportData);
	        }
	        
	    })
	    .fail(function(err, err) {
	        // Request returned badly formed results
	        AD.Comm.service.sendError(req, res, err, 200);
            log(req, 'Director report data was badly formed');
	        logDump(req, err);
	    });
	    
	});

}