var log = AD.Util.Log;
var logDump = AD.Util.LogDump;
var $ = AD.jQuery;

var _strategyLookup = {
/*
    "SLM": 1234,
    "LLM": 2345,
    ...
*/    
};

/**
 * Takes a GMA strategy name and finds the matching strategyID.
 * Async. Used only by the getGraphData service.
 *
 * Can only be used after user is already authenticated with GMA.
 *
 * Currently, the only GMA web service that returns strategyID
 * values is Advanced Report Options. It is a bit slow and returns
 * all sorts of things we don't need. But there is no alternative.
 * 
 * @param {HttpRequest} req
 *     This needs to contain the user's GMA CAS cookie.
 * @param {Integer} nodeID
 * @param {String} strategyName
 * @param {Integer} languageID
 *     (Optional) The languageId value of the language that the strategy name
 *     is specified in. If not given, then the logged-in user's default GMA
 *     language will be used.
 * @return {Deferred}
 */
var getStrategyID = function(req, nodeID, strategyName, languageID) {
    var dfd = $.Deferred();
    
    if (_strategyLookup[ strategyName ]) {
        // If we already looked this strategy name up before, then
        // just return the previous result immediately.
        dfd.resolve( _strategyLookup[strategyName] );
    }
    else {
        var langOption = '';
        if (typeof languageID == 'number') {
            langOption = '&languageId=' + languageID;
        }
        
        // GMA Web Service 4.7.1 Advanced Report Options
        AD.Comm.HTTP.request({
            method: 'GET',
            url: AD.GMA.baseURL + '?q=en/gmaservices/gma_advancedReport/' 
                    + nodeID + '/options'
                    + langOption,
            jar: req.session['gmaClient-jar']
        })
        .then(function(res) {
            if (!res || !res.success || res.success == 'false') {
                dfd.reject(new Error("GMA web service unsuccessful"));
                return;
            }
            else {
                var strategyList = res.data.strategySelection;

                // Take the array of objects returned by the GMA web service, 
                // and convert that into a simple reverse lookup.
                for (var i=0; i<strategyList.length; i++) {
                    for (var id in strategyList[i]) {
                        var name = strategyList[i][id];
                        _strategyLookup[ name ] = id;
                    }
                }
                
                // Try to look it up now
                var strategyID = _strategyLookup[strategyName];
                if (strategyID) {
                    dfd.resolve(strategyID);
                } else {
                    //console.log(_strategyLookup);
                    dfd.reject(new Error("No match found for strategy [" + strategyName + "]"));
                }
                return;
            }
        })
        .fail(function() {
            dfd.reject(new Error("GMA web service failed unexpectedly"));
        });
    }
    
    return dfd;
}


module.exports = getStrategyID;
