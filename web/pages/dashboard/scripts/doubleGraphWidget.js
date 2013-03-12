/**
 * This is a widget that renders 2 graphs together based on GMA data,
 * one on top of the other. It also displays the cumulative total
 * amounts on the right margin, and the ratio on the bottom.
 *
 * Unlike the "chartWidget", this does not create an entire set of
 * charts. Only a single widget with 2 graphs inside.
 *
 * The data is assumed to follow the format of 
 * the /service/gmaMatrix/nodeGraphData service.
 */

(function() {

    AD.Controller.extend('doubleGraphWidget', {
        
        init: function(el, options) {
        
            this.chartTitle = options.title;
            this.data = options.data;
            this.xAxis = options.xAxis;
            this.charts = {};
            
            this.element.html( this.view('/gmaMatrix/dashboard/css/doubleGraphWidget.ejs', {}) );
            this.parseData();
            this.renderCharts();
        },
        
        parseData: function() {
            
            var data = this.data['data'];
            
            for (var sectionName in data) {
                var xAxis = this.xAxis;
                var yAxis = [];
                
                // Each section has one or more measurements
                var sectionData = data[sectionName];
                for (measurementName in sectionData) {
                    
                    var measurementData = sectionData[measurementName];
                    for (var i=0; i<measurementData.length; i++) {
                        var value = parseInt(measurementData[i]) || 0;
                        if (typeof yAxis[i] == 'undefined') {
                            yAxis[i] = value;
                        }
                        else {
                            yAxis[i] += value;
                        }
                    }
                
                }
                
                var sectionChart = {
                    name: sectionName,
                    points: [],
                    max: 0,
                    last: 0,
                    total: 0,
                    totalType: data.totalType || 'sum',
                    xChart: null // placeholder
                };
                for (var i=0; i<xAxis.length; i++) {
                    sectionChart.points.push({ 
                        'x': xAxis[i], 
                        'y': yAxis[i]
                    });
                    sectionChart.last = yAxis[i];
                    sectionChart.total += yAxis[i];
                    sectionChart.max = Math.max(sectionChart.max, yAxis[i]);
                }
                this.charts[sectionName] = sectionChart;
            }
            
        },
        
        renderCharts: function() {
        
            // Overall title for all charts
            this.element.find('h3').html( this.chartTitle );
            
            // For use in calculating the ratio
            var ratio = 1;
            var first = 1;
            var second = 1;
            var grandTotal = 0;
            var max = 0;
            
            var index = 0;
            var $templateRow = this.element.find('.template-row');
            
            for (var name in this.charts) {
                var sectionData = this.charts[name];
                index += 1;
            
                // Create a unique(?) ID based on the group name and section name
                var chartID = (this.chartTitle + name).replace(/[^\w\d]/g, '_');
                
                // Create the table row for this section
                var $row = $templateRow.clone();
                $row.removeClass('template-row');
                $row.addClass('graph-row');
                $templateRow.before($row);
                
                // Find the matching DOM element for this section
                var $section = $row.find('div.graph-space');
                
                // Section header
                $section.find('h5').html(name);
                
                // Chart container
                var $container = $('<div class="gma-dashboard-chart"></div>');
                $container.append('<figure id="' + chartID + '"></figure>');
                
                // Overall Max value
                max = Math.max(max, sectionData.max);
                
                // Final value
                $section.find('.final-value').text(sectionData.last);
                
                // "Total" value
                grandTotal += sectionData.total;
                if (sectionData.totalType == 'final') {
                    $row.find('.graph-total').text(sectionData.last);
                } else {
                    $row.find('.graph-total').text(sectionData.total);
                }
                
                // Calculate ratio
                if (index == 1) {
                    first = sectionData.total;
                }
                else if (index == 2) {
                    second = sectionData.total;
                    if (first == 0 || second == 0) {
                        ratio = 0;
                    }
                    else {
                        // Ratio rounded to 2 decimal places
                        ratio = Math.round(second / first * 100) / 100;
                    }
                }
                
                // Prepare chart options & data
                var graphData = {
                    xScale: 'time',
                    yScale: 'linear',
                    type: 'line-dotted',
                    main: [
                        {
                            className: '.' + chartID,
                            data: sectionData.points
                        }
                    ]
                }
                var graphOpts = {
                    yMin: 0,
                    yMax: Math.round(max * 1.2) + 2,
                    dataFormatX: function(x) {
                        return d3.time.format('%b %Y').parse(x);
                    },
                    tickFormatX: function(x) {
                        // no x-axis labels
                        return '';
                    },
                    tickFormatY: function(y) {
                        // no y-axis labels
                        return '';
                    },
                    
                    /*
                    mouseover: function(d, i) {
                        var $point = $(this);
                        var pos = $point.offset();
                        var text = d3.time.format('%b %Y')(d.x) + ': ' + d.y;
                        
                        // Init the Bootstrap tooltip widget
                        var $tooltip = $point.data('tooltip');
                        if (!$tooltip) {
                            // Create a dummy DIV over the graph point
                            $tooltip = $('<div>');
                            $tooltip.css({
                                position: 'absolute',
                                width: '1px',
                                height: '1px',
                                top: pos.top,
                                left: pos.left + 5
                            });
                            $container.append($tooltip);
                            // Init the tooltip widget on that dummy DIV
                            $tooltip.tooltip({
                                trigger: 'manual',
                                title: text
                            });
                            $point.data('tooltip', $tooltip);
                        }
                        // Show the tooltip on mouseover
                        $tooltip.tooltip('show');
                    },

                    mouseout: function(x) {
                        var $point = $(this);
                        var $tooltip = $point.data('tooltip');
                        if ($tooltip) {
                            $tooltip.tooltip('hide');
                        }
                    }
                    */
                };
                
                // Insert the graph container
                $section.find('.graph-container').append($container);

                // Init the xChart object to complete the render
                sectionData.xChart = new xChart('undocumentedUselessValue', graphData, '#' + chartID, graphOpts);
                
            }
            
            // Hide the section titles if there is only one section
            if (index == 1) {
                this.element.find('h5').hide();
            }
            
            // Place the ratio only if there were exactly two groups
            if (index == 2) {
                var ratioText = '1 : ' + ratio;
                this.element.find('.graph-ratio').text(ratioText);
            }
            
            // Place the grand total only if there were 2 or more groups
            if (index >= 2) {
                this.element.find('.grand-total').text(grandTotal);
            }
            
            // Show "no data available" if needed
            if (index == 0) {
                this.element.find('.graph-ratio').html("<div class='alert'>No data available</div>");
            }

        },
        
        destroy: function() {
            this.element.empty();
        }
        
    
    });


})();