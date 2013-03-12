var log = AD.Util.Log;
var logDump = AD.Util.LogDump;
var $ = AD.jQuery;

// This contains info about the GMA language codes
var gmaSysInfo = require('../data/gmaSysInfo.js');

// GMA measurements can only be recognized by matching their English names.
// So we need to have the GMA `languageId` for English.
var langEN = gmaSysInfo.languageMap['en'];

/**
 * Parser for the GMA advanced report XML
 */
var parseXML = require('./gma_xml_report_parser.js').parseSheet;

/**
 * Use a strategy (MCC) name to find out its strategy ID in GMA.
 */
var getStrategyID = require('./gma_strategy_id.js');



/**
 * This service fetches measurement values of an organization over several 
 * reporting intervals.
 *
 * @param {HttpRequest} req
 *      This needs to contain the user's GMA CAS cookie jar.
 * @param {Integer} nodeID
 *      The organization ID values.
 * @param {String} strategyName
 *      The name of the strategy/MCC exactly as it appears in GMA.
 *      Optionally, you may specify this as an {Integer} if you already know
 *      the exact strategy_id value.
 * @param {String} startDate
 *      YYYYMMDD
 * @param {String} endDate
 *      YYYYMMDD
 * @param {Array} measurements
 *      An array of measurement_id values.
 * @param {Integer} languageID
 *      (Optional) -1 for English. 
 *      Default is to use the user's default GMA language.
 * @return {Deferred}
 */
var getGraphData = function(req, nodeID, strategyName, startDate, endDate, measurements, languageID) {
    var dfd = $.Deferred();

    // This is the JSON options object to be sent to GMA
    var serviceOptions = {
        dateRange: {
            fixed: {
                from: startDate,
                to: endDate
            }
        },
        reportFormat: { 
            byReportingInterval: {
                showTotalColumn: false,
                granularity: 2 // monthly
            }
        },
        organizationSelection: [ nodeID ],
        strategySelection: [/* to be determined */],
        measurementSelection: {
            calculatedList: [],
            numericList: measurements
        }
    };

    
    if (!languageID) {
        langOption = '';
    }
    else if (languageID == -1) {
        langOption = '&languageId=' + langEN;
    }
    else {
        langOption = '&languageId=' + languageID;
    }
    
    // Parse the strategy name/ID
    if (typeof strategyName == 'number') {
        // Strategy ID was given directly.
        var strategyID = strategyName;
        var strategyDFD = $.Deferred();
        strategyDFD.resolve(strategyID);
    }
    else {
        // Strategy name given, but not the ID.
        // Look it up first.
        var strategyDFD = getStrategyID(req, nodeID, strategyName);
    }
    
    // The strategy ID is needed by the web service to produce the graph 
    // data.
    strategyDFD.then(function(strategyID) {
        serviceOptions.strategySelection = [strategyID];
        
        log(req, 'gmaAdvancedReport Service Options:');
        log(req, serviceOptions);
    
        // GMA Web Service 4.7.2 Advanced Report Generate
        AD.Comm.HTTP.request({
            method: 'POST',
            url: AD.GMA.baseURL + '?q=en/gmaservices/gma_advancedReport/' + nodeID 
                   + '/generate' + langOption,
            jar: req.session['gmaClient-jar'],
            json: serviceOptions
        })
        .then(function(res) {
            // Unrecognized JSON response
            if (!res) {
                log(req, res);
                dfd.reject(new Error("Unrecognized JSON response from GMA"));
                return;
            }
            // Valid JSON response that tells us the request failed
            if (!res.success || res.success == 'false') {
                // `success` == false
                log(req, 'gmaAdvanceReport failed');
                log(req, res);
                dfd.reject(new Error("gmaAdvanceReport failed"));
                return;
            }
            // Sometimes gmaAdvancedReport returns no data
            if (!res.data) {
                log(req, 'gmaAdvancedReport returned no data');
                log(res);
                dfd.reject(new Error("GMA returned no data"));
                return;
            }
            
            // Successful request response. Parse it now.
            parseXML(null, res.data)
                .then(function(parsedData) {
                    dfd.resolve(parsedData);
                })
                .fail(function(err) {
                    log(req, 'gmaAdvancedReport parse error');
                    log(req, res.data);
                    log(req, err);
                    dfd.reject(new Error("XML parse error"));
                });
            return;
        })
        .fail(function(err) {
            // Badly formed results
            log(req, err);
            dfd.reject(err);
        });
    
    }); // end of strategyDFD.then()
    
    // Could not get the strategy ID from GMA
    strategyDFD.fail(function(err) {
        log(req, "Could not obtain strategy_id from GMA");
        log(req, err);
        dfd.reject(err);
    });
    
    return dfd;
}


module.exports = getGraphData;
