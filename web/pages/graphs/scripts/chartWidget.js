/**
 * This is a widget that renders graphs based on GMA data.
 * The data is assumed to follow the format of 
 * the /service/gmaMatrix/nodeGraphData service.
 */

(function() {

    AD.Controller.extend('chartWidget', {
        
        init: function(el, data) {
        
            this.data = data;
            this.chartTitle = this.data.title;
            this.charts = [];
            
            this.parseData();
            this.renderCharts();
        },
        
        parseData: function() {
            
            var data = this.data;
            var xAxis = data.intervals;
            
            for (var measurementName in data.measurements) {
                var yAxis = data.measurements[measurementName];
                var chart = {
                    name: measurementName,
                    points: [],
                    xChart: null // placeholder
                };
                for (var i=0; i<xAxis.length; i++) {
                    chart.points.push({ 
                        'x': xAxis[i], 
                        'y': parseInt(yAxis[i]) || 0
                    });
                }
                this.charts.push( chart );
            }
            
        },
        
        renderCharts: function() {
            // Overall title for all charts
            this.element.append('<h2>' + this.chartTitle + '</h2>');
        
            for (var i=0; i<this.charts.length; i++) {
                // Create a unique(?) ID based on the org name and measurement name
                var chartID = (this.chartTitle + this.charts[i].name).replace(/[^\w\d]/g, '_');
                
                // Chart container & header
                var $container = $('<div class="gmaChart"></div>');
                $container.append('<h3>' + this.charts[i].name + '</h3>');
                $container.append('<figure id="' + chartID + '"></figure>');
                
                // Prepare chart options & data
                var graphData = {
                    xScale: 'time',
                    yScale: 'linear',
                    type: 'line-dotted',
                    main: [
                        {
                            className: '.' + chartID,
                            data: this.charts[i].points
                        }
                    ]
                }
                var graphOpts = {
                    yMin: 0,
                    dataFormatX: function(x) {
                        return d3.time.format('%b %Y').parse(x);
                    },
                    tickFormatX: function(x) {
                        return '';
                        return d3.time.format('%d %b')(x);
                    },
                    //tickHintX: this.charts[i].points.length + 2,

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
                };
                
                // Append the graph container to the page element
                this.element.append($container);

                // Init the xChart object to complete the render
                this.charts[i].xChart = new xChart('undocumentedUselessValue', graphData, '#' + chartID, graphOpts);
                
            }
            this.element.append('<div style="float:none; clear:both; height:1px;"></div>');
        },
        
        destroy: function() {
            this.element.empty();
        }
        
    
    });


})();