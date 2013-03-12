var log = AD.Util.Log;
var logDump = AD.Util.LogDump;
var $ = AD.jQuery;

// This contains info about the GMA language codes
var gmaSysInfo = require('../data/gmaSysInfo.js');

// GMA measurements can only be recognized by matching their English names.
// So we need to have the GMA `languageId` for English.
var langEN = gmaSysInfo.languageMap['en'];


/**
 * This fetches the list of numeric measurement of an organization.
 *
 * @param {HttpRequest} req
 *      This needs to contain the user's GMA CAS cookie jar.
 * @param {Integer} nodeID
 *      The organization ID value.
 * @param {Integer} langID
 *      Optional. 
 *      0 or null means let GMA use the user's default language.
 *      > 0 means use the specified language_id value.
 *      < 0 means use English, which is needed for the standardized LMI names.
 * @return {Deferred}
 */
var getNodeMeasurements = function(req, nodeID, langID) {
    var dfd = $.Deferred();

    var langOption;
    if (!langID) {
        langOption = '';
    } 
    else if (langID > 0) {
        langOption = '&languageId=' + langID;
    }
    else {
        langOption = '&languageId=' + langEN;
    }

    // GMA web service 4.1.5 Node Get Measurements
    AD.Comm.HTTP.request({
       method: 'GET',
       jar: req.session['gmaClient-jar'],
       url: AD.GMA.baseURL + '?q=en/gmaservices/gma_node/' 
                + nodeID + '/measurements/numeric'
                + langOption
    })
    .then(function(nodeData) {
        //log(req, nodeData);
        var measurements = {
        /*
            'SLM': {
                1234: 'Measurement Name Abcde',
                ...
            },
            'LLM': { ... },
            ...
        */
        };
        if (nodeData.success) {
        
            // Re-organize the node data results into a simpler
            // associative measurements lookup.
            for (var i=0; i<nodeData.data.numericMeasurements.length; i++) {
                var mccItem = nodeData.data.numericMeasurements[i];
                for (var mccName in mccItem) {
                    if (!measurements[mccName]) {
                        measurements[mccName] = {};
                    }
                    var mccMeasurements = mccItem[mccName];
                    for (var j=0; j<mccMeasurements.length; j++) {
                        var measurementID = mccMeasurements[j]['measurementId'];
                        var measurementName = mccMeasurements[j]['measurementName'];
                        measurements[mccName][measurementID] = measurementName;
                    }
                }
            }
            // Return results
            log(req, 'Node data delivered successfully');
            dfd.resolve(measurements);
        }
        else {
            // Request returned valid results. But `success` == false
            log(req, 'Node data could not be fetched');
            log(req, nodeData);
            dfd.reject(new Error("gma_node was not successful"));
        }
        
    })
    .fail(function(err, err) {
        // Request returned badly formed results
        log(req, 'Node data response was badly formed');
        dfd.reject(err);
    });
    
    return dfd;
}


module.exports = getNodeMeasurements;
