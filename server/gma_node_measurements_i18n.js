var log = AD.Util.Log;
var logDump = AD.Util.LogDump;
var $ = AD.jQuery;

// This contains info about the GMA language codes
var gmaSysInfo = require('../data/gmaSysInfo.js');

// GMA measurements can only be recognized by matching their English names.
// So we need to have the GMA `languageId` for English.
var langEN = gmaSysInfo.languageMap['en'];

// This fetches the node measurements in one language.
var getNodeMeasurements = require('./gma_node_measurements.js');


/**
 * This fetches the list of numeric measurement of an organization, in both the
 * user's default GMA language as well as English.
 *
 * English is needed because the GMA measurements can only be identified by the
 * system through their English names.
 *
 * The user's default GMA language may or may not be English. There is currently
 * no GMA web service available that can tell us what the default is.
 *
 * @param {HttpRequest} req
 *      This needs to contain the user's GMA CAS cookie jar.
 * @param {Integer} nodeID
 *      The organization ID value.
 * @return {Deferred}
 */
var getNodeMeasurementsI18N = function(req, nodeID) {
    var dfd = $.Deferred();
    
    // Fetch the measurement info from two languages in parallel
    $.when( getNodeMeasurements(req, nodeID, -1), getNodeMeasurements(req, nodeID) )
    .then(function(measurementsEN, measurementsDefault) {
        
        var measurementsI18N = {
            // Straight up data
            "en": {
            /*
                "SLM": {
                    1234: "Measurement Name Abcde",
                    ...
                }
            */
            },
            "default": {
            /*
                "[ko]SLM": {
                    1234: "[ko]Measurement Node Abcde",
                    ...
                }
            */
            },
            // Translation mapping
            "strategyTrans": {
            /*
                "SLM": "[ko]SLM",
                "LLM": "[ko]LLM",
                ...
            */
            },
            "measurementTrans": {
            /*
                "Measurement Node Abcde": "[ko]Measurement Node Abcde",
                ...
            */
            },
            "measurementsByID": {
            /*
                1234: {
                    "en": "Measurement Node Abcde",
                    "default": "[ko]Measurement Node Abcde"
                },
                ...
            */
            },
            "measurementsByName": {
            /*
                "Measurement Node Abcde": 1234,
                ...
            */
            }
        }
            
        // English
        measurementsI18N['en'] = measurementsEN;
        var mccEN = [];
        for (var mcc in measurementsEN) {
            mccEN.push(mcc);
            for (var id in measurementsEN[mcc]) {
                var measurementName = measurementsEN[mcc][id];
                measurementsI18N['measurementsByID'][id] = {
                    "en": measurementName
                }
                measurementsI18N['measurementsByName'][measurementName] = id;
            }
        }
        // Default lang
        measurementsI18N['default'] = measurementsDefault;
        var mccDefault = [];
        for (var mcc in measurementsDefault) {
            mccDefault.push(mcc);
            for (var id in measurementsDefault[mcc]) {
                var measurementName = measurementsDefault[mcc][id];
                measurementsI18N['measurementsByID'][id]['default'] = measurementName;
            }
        }
        // Combine the two results
        for (var i=0; i<mccEN.length; i++) {
            var nameEN = mccEN[i];
            var nameDefault = mccDefault[i];
            measurementsI18N['strategyTrans'][nameEN] = nameDefault;
        }
        for (var i=0; i<measurementsI18N['measurementsByID'].length; i++) {
            var measurement = measurementsI18N['measurementsByID'][i];
            var nameEN = measurement['en'];
            var nameDefault = measurement['default'];
            measurementsI18N['measurementTrans'][nameEN] = nameDefault;
        }
        
        dfd.resolve(measurementsI18N);
    
    })
    .fail(function(err1, err2) {
        log(req, err1, err2);
        dfd.reject(err1, err2);
    });
    
    return dfd;
}


module.exports = getNodeMeasurementsI18N;
