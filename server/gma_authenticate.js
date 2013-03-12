var util = require('util');
var stringify = util.inspect;
var log = AD.Util.Log;
var logDump = AD.Util.LogDump;

/**
 * Initialize the gmaClient cookie jar with the user's CAS credentials.
 */
var authenticate = function(req, res, next) 
{
    // If cookie jar already present in session, that means we
    // are already CAS authenticated on the GMA site.
    if (req.session['gmaClient-jar']) {
        // The session can only store basic objects, and loses class prototype
        // properties. Work around that by re-instantiating new CookieJar 
        // and Cookie objects.
        if (typeof req.session['gmaClient-jar'].get != 'function') {
            var oldJar = req.session['gmaClient-jar'];
            var newJar = AD.Comm.HTTP.jar();
            for (var i=0; i<oldJar.cookies.length; i++) {
                var oldCookie = oldJar.cookies[i];
                var newCookie = AD.Comm.HTTP.cookie(oldCookie.str);
                newJar.add(newCookie);
            }
            req.session['gmaClient-jar'] = newJar;
        }
        log(req, 'Re-using GMA cookie jar');
        return next();
    }
    
    // Create cookie jar
    req.session['gmaClient-jar'] = AD.Comm.HTTP.jar();
    log(req, 'Creating new GMA cookie jar');
    log(req, 'Using CAS proxy for authentication');
    
    // Fetch the GMA Drupal "node" page.
    // This is not a web service. We do this to initialize our cookie jar 
    // so that future requests to GMA will be authenticated.
    
    AD.Comm.HTTP.casProxyRequest(
        req.session['CAS-PGTIOU'],
        {
            url: AD.GMA.baseURL + '?q=en/node&destination=node',
            //url: AD.GMA.baseURL + '?q=en/node',
            jar: req.session['gmaClient-jar']
        },
        function(data) {
            if (data.match('CAS Authentication failed')) {
                log(req,'GMA authenticated failed');
                logDump(req, data);
                AD.Comm.Service.sendError(req, res, { errorMSG: "CAS authentication failed with GMA server" });
            } else {
                log(req, 'Authenticated with GMA');
                next();
            }
        },
        function(err) {
        	AD.Comm.Service.sendError(req, res, {
        	   errorMSG: "Problem communicating with the GMA server",
        	   data: err
        	});
        	log(req, 'Problem communicating with the GMA server');
        	logDump(req, err);
        }
    );
}

module.exports = authenticate;
