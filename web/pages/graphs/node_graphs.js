
////
//// gmaMatrix graphs page
////



var graphsPage = new AD.App.Interface({
    pathPage: __dirname,
    //pathCSS: __dirname+'/css',
    themePageStyle: 'empty',
    listWidgets: [ 
// AppRAD: WIDGET DEPENDENCY // 
        'appdev_list_languagepicker'
                 ]
    });
module.exports = graphsPage;   

graphsPage.registerDependency([
    '/theme/default/css/style.css'
]);

var util = require('util');
var stringify = util.inspect;
var log = AD.Util.Log;
var logDump = AD.Util.LogDump;


////
//// Page Routes
////

var app = graphsPage.app;


