/**
 *  The client side setup script for the gmaMatrix main page. 
 *
 *  The job of this code is to perform all the setup steps on the existing
 *  HTML DOM items now.  Add Events, actions, etc... 
 *
 *  This file will be generated 1x by the RAD tool and then left alone.
 *  It is safe to put all your custom code here.
 */


(function() {

    var _reportCache = {
    /*
        <reportId>: {
            'SLM': [
                {
                    section: 'win',
                    column: 'faith',
                    title: 'abcd...',
                    questions: [ ... ]
                },
                ...
            ],
            ...
        },
        ...
    */
    };

    
    /**
     * Gets the collection of measurements associated with a GMA director report
     * and stores them in the _reportCache object.
     *
     * @param {Integer} reportID
     * @param {Function} [callback]
     * @return {Deferred}
     */
    var fetchReport = function(reportID, callback) {
        var dfd = $.Deferred();
        dfd.then(callback);
        
        if (_reportCache[reportID]) {
            dfd.resolve();
        }
        else {
            $('#report-selector .loading').show();
            AD.ServiceJSON.request({
                method: 'GET',
                url: '/service/gmaClient/directorReport/' + reportID,
                complete: function() {
                    $('#report-selector .loading').hide();
                },
                success: function(response) {
                    _reportCache[reportID] = response.data.results;
                    dfd.resolve();
                },
                failure: function(err) {
                    dfd.reject(err);
                }
            });
        }
        
        return dfd;
    }
    
    
    /**
     * Populate the MCC drop down list with those found in a given report.
     *
     * Should only be called after fetchReport() has populated the _reportCache.
     *
     * @param {Integer} reportID
     */
    var getMCCs = function(reportID) {
        var $mccList = $('select#mcc-list');
        $mccList.find('option').not(':first').remove();
        for (var mcc in _reportCache[reportID]) {
            $mccList.append('<option>' + mcc + '</option>');
        }
        $mccList.removeAttr('disabled');
    }


    /**
     * Initializes the Matrix page with the measurements found in
     * the given report.
     *
     * Should only be called after fetchReport() has populated the _reportCache.
     * 
     * @param {Integer} reportID
     * @param {String} mcc
     */
    var useReport = function(reportID, mcc) 
    {
        // Clear all existing questions from the page first
        reset();
        
        if (_reportCache[reportID]) {
            if (_reportCache[reportID][mcc]) {
                
                var data = _reportCache[reportID][mcc];
                
                // Order the bubbles according to their win/build/send section
                var grid = { win: [], build: [], send: [], prayer: [], outcome: [], extra: [] };
                for (var i=0; i<data.length; i++) {
                    grid[ data[i].section ].push( data[i] );
                }
                for (var i in grid) {
                    for (var j=0; j<grid[i].length; j++) {
                        // Create the bubble objects in the sorted order
                        new MeasurementBubble( grid[i][j] );
                    }
                }
                
                /*
                // Set up what will happen after the final question is answered
                var lastBubbleIndex = data.length-1;
                MeasurementBubble.registry[ lastBubbleIndex ].setCustomResponse(function() {
                    submitMeasurements(reportID);
                });
                */
                
                // Hide the report/MCC selector dialog
                $('#report-selector').modal('hide');
                // Display the first measurement bubble
                MeasurementBubble.go();
                return;
            
            }
        }
        console.log('Error: no such report [' + reportID + '/' + mcc + ']');
    }
    
    
    /**
     * Take all the measurements in the textboxes and submit them back to GMA.
     */
    var submitMeasurements = function(reportID)
    {
        var paramData = {};
        for (var i=0; i<MeasurementBubble.registry.length; i++) {
            var bubble = MeasurementBubble.registry[i];
            var bubbleMeasurements = bubble.getMeasurementsByID();
            $.extend(paramData, bubbleMeasurements);
        }
        
        $('#col-questions .submit').hide();
        $('#col-questions .submitting').show();
        
        AD.ServiceJSON.request({
            method: 'POST',
            url: '/service/gmaClient/directorReport/' + reportID,
            contentType: 'application/json', // sending format
            dataType: 'json', // receiving format
            params: JSON.stringify(paramData),
            complete: function() {
                $('#col-questions .submitting').hide();
                $('#col-questions .submit').show();
            },
            success: function(res) {
                displayOutcome();
            },
            failure: function(err) {
                AppDev.alert("Error while submitting measurements back to GMA");
                console && console.log && console.log(err);
            }
        });
    }
    
    
    /**
     * This function is called after all the questions are answered and the
     * measurements have been submitted back to GMA.
     */
    var displayOutcome = function()
    {
        // nothing yet
    }

    
    /**
     * Resets the page and discards all questions.
     * *** THIS IS NOT THOROUGHLY TESTED AND MAY BE BUGGY ***
     * *** RELOADING THE PAGE IS MUCH EASIER              ***
     * 
     * @param {Boolean} [preserveQuestions]
     *      By default all existing questions will be cleared.
     *      Set to TRUE to override and just hide them.
     */
    var reset = function(preserveQuestions) 
    {
        // Hide the Rewind button
        $('.navbar .reset').hide();
        
        //$('#outcome-heading span.questions').show()
        //$('#outcome-heading span.outcome').hide();
        $('#outcome-results').hide();
        $('#prayer-title').empty();
        $('#prayer-buttons fieldset').remove();

        MeasurementBubble.reset(!preserveQuestions);
        MeasurementBubble.go();
    };

    
    /**
     * Resets the page while preserving the currently loaded questions.
     */
    var rewind = function() 
    {
        reset(false);
    }


    var subscriptionID;
    
    ////[appRad] --  setup object definitions here:
    var gmaClientMeasurementMatrixSetup = function (topic, data) {
        
        $('#language-switcher').appdev_list_languagepicker();

        // Init and show the Report & MCC selection dialog
        $('#report-selector').modal({
            keyboard: false
        });
        $('#report-selector select').attr('disabled', 1);
        
        // Start by displaying the datepicker for the user to choose which
        // time period the GMA reports will be selected from.
        var $date = $('#reports-date');
        $date.kendoDatePicker({
            format: "yyyy-MM-dd",
            change: function(e) {
                var widget = $date.data('kendoDatePicker');
                
                // Don't allow the date to be changed again
                widget.enable(false);
                widget.close();
                
                // Get value and convert to a Ymd string
                var dateObj = widget.value();
                var selectedDate = dateObj.getFullYear()
                    + String(dateObj.getMonth()+1).replace(/^(.)$/, '0$1')
                    + String(dateObj.getDate()).replace(/^(.)$/, '0$1');

                doFetchReportList(selectedDate);
            }
        }); 
        

        // This fetches the list of GMA director reports that this user
        // can use.
        var doFetchReportList = function(selectedDate) {
            $('#report-selector .loading').show();
            AD.ServiceJSON.request({
                method: 'GET',
                url: '/service/gmaClient/directorReport?date=' + selectedDate,
                complete: function() {
                    $('#report-selector .loading').hide();
                },
                success: function(response) {
                    var $reportsList = $('select#reports-list');
                    var reports = response.data;
                    // Populate the reports droplist
                    for (var reportID in reports) {
                        $reportsList
                            .append(
                                '<option value="' + reportID + '">'
                                + reports[reportID]['reportName']
                                + '</option>'
                            )
                            .removeAttr('disabled');
                    }
                },
                failure: function(err) {
                    var message = err.errorMSG || 
                        "Sorry. There was a problem loading the data from GMA.";
                    $('#report-selector .modal-body').html(
                        '<p>' + message + '</p>'
                        + '<p>Maybe try again later on or ask your GMA admin?</p>'
                    );
                }
            });
        }
        
        
        
        // When the "Rewind" button is clicked, reset the page to a blank state
        $('.navbar .reset').on('click', rewind);
        
        // When the "Choose Report" button is clicked, show the report 
        // selection dialog.
        $('#choose-report').on('click', function() {
            $('#report-selector').modal('show');
        });
        
        // When a report is selected from the drop down list, update the MCC list.
        $('select#reports-list').on('change', function() {
            var reportID = $(this).val();
            if (reportID) {
                fetchReport(reportID)
                    .then(function() {
                        getMCCs(reportID);
                    })
                    .fail(function(err) {
                        AppDev.alert(err.errorMSG);
                    });
            }
        });
        
        // When an MCC is selected from the drop down list, begin showing the
        // question bubbles.
        $('select#mcc-list').on('change', function() {
            var reportID = $('select#reports-list').val();
            var mcc = $(this).val();
            if (reportID && mcc) {
                useReport(reportID, mcc);
            }
        });
        
        // When the "submit" button is clicked, submit the stats to GMA again
        $('#submit').on('click', function() {
            var reportID = $('select#reports-list').val();
            submitMeasurements(reportID);
        });
        
        $('#dummy-loading-indicator').hide();
        
        // When the "reselect" button is clicked, refresh the page
        // Actually, why not just use tradition button form submit instead? See the .ejs template.
        //$('#reselect').on('click', function() {
        //    var url = ''+window.location.href.replace(/\?.*/, '');
        //    window.location.assign(url);
        //});

        AD.Comm.Notification.unsubscribe(subscriptionID);
    } // end gmaClientMeasurementMatrixSetup()
    subscriptionID = AD.Comm.Notification.subscribe('ad.gmaMatrix.matrix.setup',gmaClientMeasurementMatrixSetup);
    
    
    
    
    $(document).ready(function () {
    
        //// Do you need to do something on document.ready() before the above
        //// gmaClientMeasurementMatrixSetup() script is called?
    
    
    }); // end ready()

}) ();