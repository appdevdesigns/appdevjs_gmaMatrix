
var util = require('util');
var sys = require('sys');
var stringify = util.inspect || sys.inspect;
var $ = AD.jQuery;
var log = AD.Util.Log;
var logDump = AD.Util.LogDump;

var gmaClientGetNodeData = new AD.App.Service({});
module.exports = gmaClientGetNodeData;

// This contains info about the GMA language codes
var gmaSysInfo = require('../../data/gmaSysInfo.js');

// GMA measurements can only be recognized by matching their English names.
// So we need to have the GMA `languageId` for English.
var langEN = gmaSysInfo.languageMap['en'];

/**
 * Initialize the gmaClient cookie jar with the user's CAS credentials.
 */
var authenticate = require('../gma_authenticate.js');

/**
 * Fetch a node's list of numeric measurements from GMA.
 */
var getNodeMeasurements = require('../gma_node_measurements.js');


gmaClientGetNodeData.setup = function(app) {

	/**
	 * This service fetches the list of nodes that the user has access to.
	 */
	app.get('/service/gmaClient/userNodes', [authenticate], function(req, res, next) {
        
        var renID = null;
        var nodes = {
        /*
            123: "Node name abc",
            234: "Node name def",
            ...
        */
        };
	    
	    async.series([
	        
	        // Step 1 - get the renID
            function(done) {
                // GMA Web Service 4.3.1 User List
                AD.Comm.HTTP.request({
                    method: 'GET',
                    url: AD.GMA.baseURL + '?q=en/gmaservices/gma_user&type=current',
                    jar: req.session['gmaClient-jar']
                })
                .then(function(response) {
                    if (response && response.success && response.success != 'false') {
                        renID = response.data[0]['renId'];
                        done();
                    }
                    else {
                        log(req, response);
                        done(new Error("Could not get user info from GMA"));
                    }
                })
                .fail(function(err) {
                    log(req, err);
                    done(new Error("Could not get user info from GMA [2]"));
                });
            },
            
            // Step 2 - get the node data for that renID
            function(done) {
                // Get the list of nodes the user is assigned to.
                // GMA Web Service 4.3.2 User Get Assignments
                AD.Comm.HTTP.request({
                    method: 'GET',
                    url: AD.GMA.baseURL + '?q=en/gmaservices/gma_user/' + renID + '/assignments/director',
                    jar: req.session['gmaClient-jar']
                })
                .then(function(response) {
                    if (response.success && response.data.director) {
                        var data = response.data;
                        // Build an "associative array" object 
                        // of nodeId => shortName pairs.
                        for (var i=0; i<data.director.length; i++) {
                            nodes[ data.director[i].nodeId ] = data.director[i].shortName;
                        }
                    }
                    done();
                })
                .fail(function(err) {
                    log(req, err);
                    done(new Error("Could not get user assignments from GMA"));
                });
            }
        ], 
        
        // After all steps are done
        function(err) {
            if (err) {
                // If any step had an error, it will be sent here.
                AD.Comm.Service.sendError(req, res, err, 200);
                logDump(req, err);
                return;
            }
            else {
                AD.Comm.Service.sendSuccess(req, res, nodes);
                logDump(req);
                return;
            }

        });
	    
	});

    
    
	/**
	 * Service that fetches all the numeric measurements associated with a given node.
	 */
	app.get('/service/gmaClient/nodeMeasurements/:nodeID', [authenticate], function(req, res, next)
	{
	    var nodeID = req.params['nodeID'];
	    
	    getNodeMeasurements(req, nodeID)
	    .then(function(measurements) {
            /*
                'SLM': {
                    1234: 'Measurement Name Abcde',
                    ...
                },
                'LLM': { ... },
                ...
            */
            // Return results
            AD.Comm.Service.sendSuccess(req, res, measurements);
            logDump(req);
	    })
	    .fail(function(err) {
	        AD.Comm.Service.sendError(req, res, err, 200);
	        logDump(req);
	    });
	    
	});

}