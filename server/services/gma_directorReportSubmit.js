
var util = require('util');
var sys = require('sys');
var stringify = util.inspect || sys.inspect;
var $ = AD.jQuery;
var log = AD.Util.Log;
var logDump = AD.Util.LogDump;

var gmaClientDirectorReportSubmit = new AD.App.Service({});
module.exports = gmaClientDirectorReportSubmit;

// This contains info about the GMA language codes
var gmaSysInfo = require('../../data/gmaSysInfo.js');

// GMA measurements can only be recognized by matching their English names.
// So we need to have the GMA `languageId` for English.
var langEN = gmaSysInfo.languageMap['en'];

/**
 * Initialize the gmaClient cookie jar with the user's CAS credentials.
 */
var authenticate = require('../gma_authenticate.js');


gmaClientDirectorReportSubmit.setup = function(app) {

	/**
	 * Service that submits numeric measurements from a report back to GMA.
	 *
	 * The submitted data body should be in JSON format:
	 * {
	 *    <measurementId>: <measurementValue>,
	 *    ...
	 * }
	 */
	app.post('/service/gmaClient/directorReport/:reportID', [authenticate], function(req, res, next)
	{
	    var reportID = parseInt(req.params['reportID']);
        var data = req.body;
        var paramData = [];

        for (var id in data) {
            var value = parseInt(data[id]);
            paramData.push({
                measurementId: id,
                type: 'numeric',
                value: value
            });
        }
        
        // GMA web service 4.4.4 Director Report Update
        AD.Comm.HTTP.request({
            method: 'PUT',
            url: AD.GMA.baseURL + '?q=en/gmaservices/gma_directorReport/' + reportID,
 	        jar: req.session['gmaClient-jar'],
            json: paramData
        })
        .then(function(data) {
            if (data.success) {
                AD.Comm.Service.sendSuccess(req, res, {});
                logDump(req, 'Director report successfully delivered');
            } else {
                AD.Comm.Service.sendError(req, res, data);
                log(req, 'GMA server rejected our director report request');
                logDump(req, data);
            }
        })
        .fail(function(err) {
            AD.Comm.Service.sendError(req, res, err);
            logDump(req, 'Problem communicating with GMA server');
        })
    });

}