/**
 * This is a widget for selecting the date range,
 * node, strategy.
 *
 * It is only ever used with the /page/gmaMatrix/dashboard page,
 * and it relies on HTML page elements found there.
 */

(function() {

    AD.Controller.extend('dashboardSelectionWidget', {
        
        init: function(el, options) {
            
            this.callback = options.callback;
            
            // Loading indicator
            this.$loading = this.element.find('.loading');
            
            // This keeps track of which panel is currently visible
            this.subPanels = [];
            this.panelIndex = 0;
            
            // Initialize page elements
            this.element.modal({
                keyboard: false
            });
            this.initWizard();
        },
        
        initWizard: function() {
            var self = this;
            var dfd = this.loadNodeList();
            
            // Scan for panels in the widget HTML
            this.element.find('.modal-body').children('div').each(function() {
                var $panel = $(this);
                // Register each panel in the array
                self.subPanels.push($panel);
            });
            
            // Prepare the date selectors
            var $datepickers = $('#date-start, #date-end');
            $datepickers.kendoDatePicker({
                format: "yyyy-MM-dd"
            });
            $('#choose-date-range button').on('click', function() {
                var isValid = true;
                // Do this when the "OK" button is clicked
                $datepickers.each(function(index) {
                    var datepickerWidget = $(this).data('kendoDatePicker');
                    datepickerWidget.close();
                    
                    // Get value and convert to Ymd strings
                    var dateObj = datepickerWidget.value();
                    if (dateObj) {
                        var selectedDate = dateObj.getFullYear()
                            + String(dateObj.getMonth()+1).replace(/^(.)$/, '0$1')
                            + String(dateObj.getDate()).replace(/^(.)$/, '0$1');
                        $(this).data('date-value', selectedDate);
                    
                        // Lock in the dates once the OK button has been clicked
                        //datepickerWidget.enable(false);
                    } else {
                        isValid = false;
                    }
                });
                
                if (isValid) {
                    self.switchPanel(dfd);
                }
            });
            
            // Prepare the node list 
            $('select#node-list').on('change', function() {
                var nodeID = this.value;
                if (nodeID > 0) {
                    var dfd = self.loadMeasurementList(nodeID);
                    self.switchPanel(dfd);
                }
            });
            
            // Prepare the MCC list
            $('select#mcc-list').on('change', function() {
                
                // Gather form data
                var strategyName = this.value;
                var dateFrom = $('#date-start').data('date-value');
                var dateEnd = $('#date-end').data('date-value');
                var nodeID = $('select#node-list').val();
                
                self.animateLoading(true);
                
                // After the MCC is selected, execute the callback to
                // deliver the chosen options.
                self.callback({
                    // Callbacks
                    success: function() { self.success() },
                    failure: function(err) { self.failure(err) },
                    // Data fields
                    dateFrom: dateFrom,
                    dateTo: dateEnd,
                    orgID: nodeID,
                    strategyName: strategyName
                });
            });
            
            
            // Show the selection dialog
            self.show();
            self.switchPanel(0);
        },
        
        loadNodeList: function() {
            var dfd = $.Deferred();
            var self = this;
            var $nodeList = $('select#node-list');
            $nodeList.find('options').not(':first').remove();

            this.animateLoading(true);
            AD.ServiceJSON.request({
                method: 'GET',
                url: '/service/gmaClient/userNodes',
                success: function(res) {
                    var nodes = res.data;
                    for (var nodeID in nodes) {
                        var nodeName = nodes[nodeID];
                        $nodeList.append('<option value="' + nodeID + '">' + nodeName + '</option>');
                    }
                    $nodeList.append('<option value="1423">TESTING</option>');
                    dfd.resolve();
                },
                failure: function(err) {
                    dfd.reject(err);
                },
                complete: function() {
                    self.animateLoading(false);
                }
            });
            
            return dfd;
        },
        
        loadMeasurementList: function(nodeID) {
            var dfd = $.Deferred();
            var self = this;
            this.animateLoading(true);

            var $mccList = $('select#mcc-list');
            $mccList.find('options').not(':first').remove();

            var $measurementList = $('#measurement-list');
            $measurementList.find('.measurement-item').remove();

            AD.ServiceJSON.request({
                method: 'GET',
                url: '/service/gmaClient/nodeMeasurements/' + nodeID,
                success: function(res) {
                    var data = res.data;
                    for (var mccName in data) {
                        // Populate the MCC list
                        $mccList.append(
                            '<option value="' 
                            + encodeURIComponent(mccName) 
                            + '" >' + mccName + '</option>'
                        );
                    }
                    dfd.resolve();
                },
                failure: function(err) {
                    dfd.reject(err);
                },
                complete: function() {
                    self.animateLoading(false);
                }
            });
            
            return dfd;
        },

        success: function() {
            this.animateLoading(false);
            this.hide();
        },
        
        failure: function(err) {
            this.animateLoading(false);
            AD.alert(
                err.errorMSG
                || err.message
                || err.errorMessage
            );
            this.hide();
        },
        
        animateLoading: function(doShow) {
            if (doShow) {
                this.$loading.show();
            } else {
                this.$loading.hide();
            }
        },
        
        /**
         * @param {Integer} index
         *     Optional. You can specify the exact panel to switch to.
         *     Default is to advance to the next panel after the currently
         *     visible one. Specifying any negative index will switch to the
         *     panel directly before the current one.
         * @param {Deferred} dfd
         *     Optional. You can specify a jQuery Deferred object. The current
         *     panel will still be switched away from immediately. But the
         *     target panel will only be revealed when the dfd has resolved.
         */
        switchPanel: function(index, dfd) {
            var newIndex;
            var oldIndex = this.panelIndex;
            var self = this;

            if (typeof index != 'number') {
                // Default is to advance to the next panel
                newIndex = this.panelIndex + 1;
            }
            else if (index < 0) {
                // Negative index means move back one panel
                newIndex = this.panelIndex - 1;
            }
            else {
                // Non-negative index means switch directly to specified panel
                newIndex = parseInt(index);
            }
            
            // In case `dfd` is the sole argument
            if (typeof dfd == 'undefined' && typeof index == 'object' && index.then) {
                dfd = index;
            }

            if (this.subPanels[newIndex]) {
                this.panelIndex = newIndex;
                // Hide all sub panels
                this.element.find('.sub-panel').hide();
                
                if (!dfd) {
                    // Show the specified sub panel immediately
                    this.subPanels[newIndex].fadeIn();
                }
                else {
                    dfd
                        // Show the specified panel only after DFD resolves
                        .then(function() {
                            self.subPanels[newIndex].fadeIn();
                        })
                        // Revert back to old panel if DFD fails
                        .fail(function(err) {
                            self.panelIndex = oldIndex;
                            self.subPanels[oldIndex].fadeIn();
                        })
                }
            }
        },
        
        hide: function() {
            this.element.modal('hide');
        },
        
        show: function() {
            this.element.modal('show');
        },
        
        reset: function() {
            // Clear the date picker boxes
            this.element.find('input:text')
                .val('')
                .each(function() {
                    var dp = $(this).data('kendoDatePicker');
                    if (dp) {
                        dp.value('');
                        dp.enable(true);
                    }
                });
            
            // Clear the drop down list options
            this.element.find('#choose-mcc select option').not(':first').remove();
            this.element.find('select option:selected').removeAttr('selected');
            // Switch to the first sub panel
            this.switchPanel(0);
        }
    
    });


})();