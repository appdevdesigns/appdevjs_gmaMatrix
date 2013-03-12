////
//// GMA Matrix Module
////

var log = AD.Util.Log;
var $ = AD.jQuery;
var sysInfo = require(__dirname + '/data/gmaSysInfo.js');

var gmaMatrixModule = new AD.App.Module({
    nameModule: 'gmaMatrix',
    pathModule: __dirname,
    
    });
    
gmaMatrixModule.createRoutes();
var mI = gmaMatrixModule.initialize();  // mI == Module Initialization Done
$.when(mI).then(function(){
    // do any post initialization setup instructions here.
    // by the time you get here, all module resources are loaded.
});

// This determines which GMA server we will be fetching our data from.
AD.GMA = {
    baseURL: sysInfo.baseURL
};

module.exports = gmaMatrixModule;

var app = gmaMatrixModule.app;


/*
////
//// setup any gmaMatrix specific routes here
////

### If you want to override the default Route Handling then
### remove gmaMatrixModule.createRoutes(); and uncomment this section.  
### Make your changes here:

////
//// On any /gmaClient/* route, we make sure our Client Models are loaded:
//// 
app.get('/init/gmaClient/*', function(req, res, next) {

        log(req,' init/' + gmaMatrixModule.nameModule + '/*  : adding model dependencies.');

        AD.App.Page.addJavascripts( req, gmaMatrixModule.moduleScripts );
        AD.App.Page.addJavascripts( req, gmaMatrixModule.listModelPaths );

        next();
});





////
//// Return any Module defined resources
////
app.get('/gmaClient/data/:resourcePath', function(req, res, next) {

    log(req,' /' + gmaMatrixModule.nameModule + '/data/ being processed.');

    var parts = req.url.split('/'+gmaMatrixModule.nameModule+'/');
    var urlParts = parts[1].split('?');
    var path = urlParts[0]; // without any additional params

    res.sendfile( gmaMatrixModule.pathModule+'/'+path);
});







### If you want to change/prevent any of the automatic directory 
### scanning, then remove the gmaMatrixModule.initialize()  and 
### uncomment these lines :




//// 
//// Scan any sub interfaces to gather their routes
////

gmaMatrixModule.loadInterfaces();



////
//// The Model objects 
////
//// Load the Server side model objects to handle incoming model actions.
////

gmaMatrixModule.loadModels();
exports.listModels=gmaMatrixModule.listModels;


////
//// 
//// Load the shared scripts that need to be used on each interface.

gmaMatrixModule.loadModuleScripts();



//// Load the services associated with this Module.
gmaMatrixModule.loadServices();



//// Load any shared CSS files defined by this Module.
gmaMatrixModule.loadModuleCSS();

*/