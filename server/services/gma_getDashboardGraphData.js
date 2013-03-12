
var util = require('util');
var sys = require('sys');
var stringify = util.inspect || sys.inspect;
var $ = AD.jQuery;
var log = AD.Util.Log;
var logDump = AD.Util.LogDump;

var gmaMatrixDashboardGraphData = new AD.App.Service({});
module.exports = gmaMatrixDashboardGraphData;

/**
 * Meta-data for Dashboard measurements.
 */
var dashboardMetaData = require('../../data/dashboard.js');

// Compile all the names of the measurements that will be used in 
// the Dashboard into a single flat array.
var dashboardMeasurements = [];
for (var groupName in dashboardMetaData) {
    var group = dashboardMetaData[groupName];
    for (var sectionName in group['measurements']) {
        for (var i=0; i<group['measurements'][sectionName].length; i++) {
            var measurementName = group['measurements'][sectionName][i];
            dashboardMeasurements.push(measurementName);
        }
    }
}

/**
 * Initialize the gmaClient cookie jar with the user's CAS credentials.
 */
var authenticate = require('../gma_authenticate.js');

/**
 * The routine that fetches a node's list of measurements.
 */
var getNodeMeasurementsI18N = require('../gma_node_measurements_i18n.js');

/**
 * The main routine that fetches the data from GMA.
 */
var getGraphData = require('../gma_graph_data.js');

/**
 * Converts a comma-separated parameter into an array.
 */
var parseCommaParam = function(param) {
    var result;
    if (param) {
        result = param.split(',');
    } 
    else {
        result = [];
    }
    return result;
}


gmaMatrixDashboardGraphData.setup = function(app) {

	/**
	 * This service fetches measurement values of an organization over several 
	 * reporting intervals. The measurements fetched are the ones found in the
	 * Dashboard page.
	 *
	 * Parameters to be specified:
	 *     organization_id - One value only
	 *     strategy_name - One value only
	 *     date_from - YYYYMMDD
	 *     date_to - YYYYMMDD
	 */
	app.get('/service/gmaMatrix/nodeDashboardData', [authenticate], function(req, res, next) {

	    // Specify the date so that we only get reports whose interval 
	    // includes the specified dates.
        var dateFrom = req.param('date_from');
        var dateTo = req.param('date_to');
        
        // Parse the given organization IDs into an array
        var orgIDs = parseCommaParam( req.param('organization_id') );
        if (!orgIDs.length) {
            AD.Comm.Service.sendError(req, res, { errorMSG: "organization_id is required" });
            log(req, 'no organization ID given');
            logDump(req);
            return;
        }
        var nodeID = orgIDs[0];
        
        // Parse the strategy names/IDs
        // (there should be only one)
        var strategyIDs = parseCommaParam( req.param('strategy_id') );
        var strategyNames = parseCommaParam( req.param('strategy_name') );
        
        // The getGraphData() function can take either name or ID
        var strategy = strategyIDs[0] || strategyNames[0];
        
        // Get the node's measurements in English & the user's default language
        getNodeMeasurementsI18N(req, nodeID)
        .then(function(measurementsI18N) {
        
            //log(req, measurementsI18N);
            
            // Determine which of the current node's measurements can be 
            // used in the Dashboard.
            var measurementIDs = [];
            for (var name in measurementsI18N['measurementsByName']) {
                var measurementID = measurementsI18N['measurementsByName'][name];
                if (dashboardMeasurements.indexOf(name) >= 0) {
                    measurementIDs.push( measurementID );
                }
            }
            
            // Some GMA nodes may have zero measurements that can be used with 
            // the Dashboard page. Abort in that case.
            if (measurementIDs.length == 0) {
                logDump(req, "The requested GMA node has no measurements compatible with the Dashboard");
                AD.Comm.Service.sendError(req, res, {
                    message: "This node has no measurements that can be used with the Dashboard."
                }, 200);
                return;
            }
            
            // Fetch the measurement values
            getGraphData(req, nodeID, strategy, dateFrom, dateTo, measurementIDs, -1)
            .then(function(graphData) {
                
                var xData = graphData['intervals'];
                var yData = graphData['measurements'];

                // Clone the meta data object
                var dashboardData = $.extend(true, {}, dashboardMetaData);

                // Create a "data" sub-object for each group (i.e. Exposures, Training for Action, etc.)
                /*
                    dashboardData = {
                        "xAxis": ["Jan", "Feb", ...],
                        "Exposures": {
                            row: "win",
                            col: "faith",
                            measurements: {
                                "Staff": [
                                    "Gospel Conversations",
                                    ...
                                ]
                            },
                            // ---- THIS IS THE "DATA" SUB-OBJECT ----
                            data: {
                                "Staff": {
                                    "Gospel Conversations": [3, 2, 3, 5, 7, ...],
                                    ...
                                }
                            }
                        },
                        "Training for Action": {
                            ...
                        },
                        ...
                    }
                */
                for (var groupName in dashboardData) {
                    // Create "data" object within each group
                    dashboardData[groupName]['data'] = {};
                    for (sectionName in dashboardData[groupName]['measurements']) {
                        // Copy the "measurement" sections to "data"
                        dashboardData[groupName]['data'][sectionName] = {};
                        for (var i=0; i<dashboardData[groupName]['measurements'][sectionName].length; i++) {
                            var measurementName = dashboardData[groupName]['measurements'][sectionName][i];
                            // Populate "data" with actual data
                            if (yData[measurementName] && !$.isEmptyObject(yData[measurementName])) {
                                dashboardData[groupName]['data'][sectionName][measurementName] = yData[measurementName];
                            }
                        }
                        if ($.isEmptyObject(dashboardData[groupName]['data'][sectionName])) {
                            delete dashboardData[groupName]['data'][sectionName];
                        }
                    }
                }

                // Include the x-Axis values
                dashboardData['xAxis'] = xData;

                log(req, dashboardData);

                logDump(req);
                AD.Comm.Service.sendSuccess(req, res, dashboardData);
            })
            .fail(function(err) {
                logDump(req, err);
                AD.Comm.Service.sendError(req, res, err, 200);
            });

        })
        .fail(function(err) {
            logDump(req, err);
            AD.Comm.Service.sendError(req, res, err, 200);
        });
        
	});

}
