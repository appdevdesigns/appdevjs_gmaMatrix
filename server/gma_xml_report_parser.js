var util = require('util');
var stringify = util.inspect;
var jsdom = require(__appdevPath + '/server/node_modules/jsdom/lib/jsdom.js');

// jQuery source code to be used within jsdom
var jquerySrc = fs.readFileSync(__appdevPath + '/web/scripts/jquery.min.js').toString();

/**
 * Takes the XML output from the GMA Advanced Report webservice:
 *     - byReportingInterval
 *     - showTotalColumn: false
 * And asynchronously delivers an object with the parsed results.
 * Results format is {
 *     orgName: 'organization name as specified',
 *     title: "Organization name from the XML",
 *     intervals: [ 'Jan 2012', 'Feb 2012', ... ],
 *     measurements: {
 *         "Mass Exposure": [ 1, 234, 567, ... ],
 *         "Following Up": [ 3, 456, 78, ... ],
 *         ...
 *     }
 * }
 *
 * @param {String} orgName
 * @param {String} xmlData
 * @param {Function} next
 * @return {Deferred}
 */
var parseSheet = function(orgName, xmlData, next) 
{
    var dfd = AD.jQuery.Deferred();
    dfd
        .then(next)
        .fail(function(err) { 
            next && next(err); 
        });
    
    // Use jsdom to parse the XML
    jsdom.env({
        html: xmlData, 
        src: [jquerySrc],
        done: function(err, window) {
            if (err) {
                dfd.reject(err);
                return;
            }
            
            // This is the jQuery within the jsdom context
            var $ = window.$;
            // This will contain the parsed numeric data that is returned
            var parsedData = {
                "orgName": orgName,
                "title": "",
                "intervals": [],
                "measurements": {
                /*
                    "Mass Exposure": [ 1, 234, 567, ... ],
                    "Following Up": [ 3, 456, 78, ... ],
                    ...
                */
                }
            };
            
            var $allSheets = $("Worksheet[ss\\:name]");
            var $sheet = null;
            
            // If no org name given, then just use the final worksheet in 
            // the XML document.
            if (!orgName) {
                $sheet = $allSheets.last();
                orgName = $sheet.attr('ss:name')
            }
            // Or find the worksheet that matches the organization name.
            else {
                var sheetNames = [];
                $allSheets.each(function() {
                    var sheetName = $(this).attr('ss:name');
                    sheetNames.push( sheetName );
                    
                    if (sheetName && sheetName.match(orgName)) {
                        $sheet = $(this);
                        return;
                    }
                });
                if (!$sheet) {
                    dfd.reject(new Error("Matching worksheet [" + orgName + "] not found among " + stringify(sheetNames) ));
                    return;
                }
            }
            
            // Sheet title
            var $rows = $sheet.find('Table Row');
            var $title = $rows.find("Cell[ss\\:styleid='s21'] Data");
            parsedData.title = $title.text();
            
            // Interval headers
            var $dateRow = $rows.has("Cell[ss\\:styleid='s27'] Data").first();
            $dateRow.find('Cell Data').each(function(index) {
                if (index == 0) return; // the first cell is blank
                parsedData.intervals.push( $(this).text() );
            });
            
            // Strategy header
            var $cellHeaders = $rows.find("Cell[ss\\:styleid='s23'] Data");
            $cellHeaders.each(function() {
                // currently not used
            });
            
            // Measurements
            var $measurementRows = $rows.has("Cell[ss\\:styleid='s33']")
                                        .add( $rows.has("Cell[ss\\:styleid='s34']") );
            $measurementRows.each(function() {
                var measurementName = '';
                var $cells = $(this).find('Cell');
                $cells.each(function(index) {
                    var value = $(this).find('Data').text();
                    if (index == 0) {
                        measurementName = value;
                        parsedData.measurements[measurementName] = [];
                    } else {
                        parsedData.measurements[measurementName].push(value);
                    }
                });
            });
            
            // Deliver the parsed data
            dfd.resolve(parsedData);
            return;
        }
    });
    
    return dfd;
}
exports.parseSheet = parseSheet;
