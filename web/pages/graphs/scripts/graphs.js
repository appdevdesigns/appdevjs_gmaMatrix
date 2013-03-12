/**
 *  The client side setup script for the gmaMatrix graphs page. 
 *
 *  The job of this code is to perform all the setup steps on the existing
 *  HTML DOM items now.  Add Events, actions, etc... 
 *
 *  This file will be generated 1x by the RAD tool and then left alone.
 *  It is safe to put all your custom code here.
 */


(function() {
    
    var subscriptionID;
    
    ////[appRad] --  setup object definitions here:
    var gmaMatrixGraphsSetup = function(topic, data) {
        
        //$('#language-switcher').appdev_list_languagepicker();
        
        var $container = $('#graphs-container');
        
        // Init the selection widget. It takes one argument: the callback
        // function that will be invoked once the user has made their selection
        $('#node-selector').selection_widget({
            callback: function(opts) {
                
                // These are the functions for telling the selection widget
                // what to do after the graphs generation has started.
                var success = opts.success;
                var failure = opts.failure;
            
                // Fetch data from GMA, parse it on the server, and
                // deliver final graph data results here.
                AD.ServiceJSON.request({
                    method: 'GET',
                    
                    url: '/service/gmaMatrix/nodeGraphData' +
                            '?date_from=' + opts.dateFrom +
                            '&date_to=' + opts.dateTo +
                            '&organization_id=' + opts.orgID +
                            '&strategy_name=' + opts.strategyName +
                            '&measurement_id=' + opts.measurementIDs ,

                    success: function(res) {
                        if (res.success) {
                            // Create graph(s) with the final data
                            $container.append('<div>'); // <-- makes resetting the graphs easier
                            $container.find('div').chart_widget(res.data);
                            success();
                        } else {
                            console.log("GMA advanced report service failed");
                            console.log(res);
                            failure("GMA advanced report service request failed");
                        }
                    },

                    failure: function(err) {
                        failure(err.message);
                    },
                    
                    complete: function() {
                        // Show the reset button after the graph generation is
                        // attempted.
                        $('button#reset').show();
                    }
                    
                });
            }
        });
        var selectorWidget = $('#node-selector').controller();
        
        // If the user accidentally dismisses the selection dialog,
        // the reset button can be used to bring it back.
        $('#node-selector').on('hide', function() {
            $('button#reset').show();
        });
        
        $('button#reset').on('click', function() {
            // Clear existing graphs
            $container.empty(); // <-- remove the inner DIV
            // Reset the selection dialog 
            selectorWidget.reset();
            selectorWidget.show();
            // Then hide the reset button
            $(this).hide();
        });
        
        $('#dummy-loading-indicator').hide();
        
        AD.Comm.Notification.unsubscribe(subscriptionID);
    }
    subscriptionID = AD.Comm.Notification.subscribe('ad.gmaMatrix.graphs.setup', gmaMatrixGraphsSetup);
    
    
    
    $(document).ready(function () {
    
        //// Do you need to do something on document.ready() before the above
        //// gmaMatrixGraphSetup() script is called?
    
    
    }); // end ready()

}) ();