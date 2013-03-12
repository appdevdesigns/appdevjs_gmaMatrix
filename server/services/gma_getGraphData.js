
var util = require('util');
var sys = require('sys');
var stringify = util.inspect || sys.inspect;
var $ = AD.jQuery;
var log = AD.Util.Log;
var logDump = AD.Util.LogDump;

var gmaMatrixGraphData = new AD.App.Service({});
module.exports = gmaMatrixGraphData;

/**
 * Initialize the gmaClient cookie jar with the user's CAS credentials.
 */
var authenticate = require('../gma_authenticate.js');

/**
 * The main routine that fetches the data from GMA is here.
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


gmaMatrixGraphData.setup = function(app) {

	/**
	 * This service fetches measurement values of an organization over several 
	 * reporting intervals.
	 *
	 * Parameters to be specified:
	 *     organization_id - One value only
	 *     strategy_id - One value only, not needed if strategy_name is given
	 *     strategy_name - One value only, not needed if strategy_id is given
	 *     measurement_id - One or more values, separated by commas
	 *     date_from - YYYYMMDD
	 *     date_to - YYYYMMDD
	 */
	app.get('/service/gmaMatrix/nodeGraphData', [authenticate], function(req, res, next) {

	    // Specify the date so that we only get reports whose interval 
	    // includes the specified dates.
        var dateFrom = req.param('date_from');
        var dateTo = req.param('date_to');
        
        // Parse the given organization IDs into an array
        var orgIDs = parseCommaParam( req.param('organization_id') );
        if (!orgIDs.length) {
            AD.Comm.Service.sendError(req, res, { errorMSG: "organization_id is required" }, 200);
            log(req, 'no organization ID given');
            logDump(req);
            return;
        }
        var nodeID = orgIDs[0];
        
        // Parse the given measurement IDs into an array
        var measurementIDs = parseCommaParam( req.param('measurement_id') );
        
        // Parse the strategy names/IDs
        // (there should be only one)
        var strategyIDs = parseCommaParam( req.param('strategy_id') );
        var strategyNames = parseCommaParam( req.param('strategy_name') );
        
        // The getGraphData() function can take either name or ID
        var strategy = strategyIDs[0] || strategyNames[0];
        
        getGraphData(req, nodeID, strategy, dateFrom, dateTo, measurementIDs)
        .then(function(graphData) {
            logDump(req);
            AD.Comm.Service.sendSuccess(req, res, graphData);
        })
        .fail(function(err) {
            logDump(req, err);
            AD.Comm.Service.sendError(req, res, err, 200);
        });
                
	});

}