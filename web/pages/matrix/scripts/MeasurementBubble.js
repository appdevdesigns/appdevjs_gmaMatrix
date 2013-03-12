var makeLabel = function(text) {
    return text;
}

/**
 * @class MeasurementBubble
 *
 * A measurement bubble is a box containing a question, and some form controls 
 * to answer the question with.
 */
$.Class("MeasurementBubble",
// static methods / properties
{
    // Change these properties to affect behaviour of all bubbles
    autoScrolling: true,
    scrollBack: false,
    
    // Change this to set the staging area where questions will be displayed 
    // at first.
    stagingArea: '#col-questions .content',
    
    // Array for tracking all bubble instances
    registry: [],
    
    /**
     * @static
     * @function reset
     * Remove all existing question bubbles from the page.
     *
     * @param {Boolean} [doClearRegistry]
     *      If set to TRUE, then the array tracking all the bubble instances
     *      will be cleared. Meaning that all existing bubbles are destroyed.
     *      By default, the bubbles are only hidden but not destroyed.
     */
    reset: function(doClearRegistry)
    {
        // Hide all existing question bubbles on the page
        for (var i=0; i<MeasurementBubble.registry.length; i++) {
            MeasurementBubble.registry[i].$bubble.find('.definition').show();
            MeasurementBubble.registry[i].$bubble.find('button.active').removeClass('active');
            MeasurementBubble.registry[i].$bubble.hide();
        }

        // Clear the registry if requested
        if (doClearRegistry) {
            MeasurementBubble.registry = [];
        }
    },
    
    /**
     * @static
     * @function go
     *
     * Activates the first question bubble.
     */
    go: function()
    {
        MeasurementBubble.registry[0] && MeasurementBubble.registry[0].activate();
    },

    /**
     * @static
     * @function create
     *
     * Generate the DOM elements that make up this question bubble.
     * Used internally.
     * @param {Object} bubbleData
     * @return {jQuery}
     */
    create: function(bubbleData) 
    {
        var title = makeLabel(bubbleData['title']);
    
        var html = '';
        html += '<div class="bubble-container">';
        html += '<div class="question-bubble well">';
        html += '<h3 class="navbar-inner">' + title + '</h3>';
        // Add all the questions
        for (var i=0; i<bubbleData.questions.length; i++) {
            var questionData = bubbleData.questions[i];
            if (!questionData.params) {
                questionData.params = {};
            }
            questionData.params['decimals'] = questionData.params.decimals || 0;
            questionData.params['min'] = questionData.params.min || 0;
            questionData.params['name'] = questionData.name || 
                bubbleData['title'].replace(/\W+/g, '') + i;
            questionData.params['value'] = questionData.value;
            
            html += '<div class="question">';
            if (questionData['text'] && questionData['text'].length) {
                html += '<p>';
                html += makeLabel( questionData['text'] );
                html += '</p>'
            }
            html += '<fieldset>';
            html += '<input type="number" ';
            if (questionData.params) {
                for (var paramKey in questionData.params) {
                    var paramValue = questionData.params[paramKey];
                    html += paramKey + ' = "' + paramValue + '" ';
                }
            }
            html += '/>';
            //html += '<button class="btn"><i class="icon-ok"></i></button>';
            html += '</fieldset>';
            html += '</div>';
        }
        html += '</div>'; // end of question-bubble div
        
        // Add the definition DIV
        html +=
            '<div class="definition">' +
            '<h3>' + title + '</h3>';
        if (bubbleData.questions.length == 1) {
            html += ' (<i>measurementId: ' + bubbleData.questions[0]['measurementId'] +')</i>'; 
            html += '<p>';
            html += makeLabel( bubbleData.questions[0]['definition'] );
            html += '</p>';
        } else {
            html += '<dl>';
            for (var i=0; i<bubbleData.questions.length; i++) {
                html += '<dt>';
                html += makeLabel( bubbleData.questions[i]['text'] );
                html += ' (<i>measurementId: ' + bubbleData.questions[i]['measurementId'] +')</i>'; 
                html +='</dt><dd>';
                html += makeLabel( bubbleData.questions[i]['definition'] );
                html += '</dd>';
            }
            html += '</dl>';
        }
        html += '</div>'; // end of definition div
        
        html += '</div>'; // end of bubble-container div
        
        // Create the actual DOM elements
        var $bubble = $(html);
        // Activate the KendoUI numeric textboxes
        for (var i=0; i<bubbleData.questions.length; i++) {
            var name = bubbleData.questions[i]['name'];
            var $textbox = $bubble.find("input[name='" + name + "']")
            $textbox.kendoNumericTextBox({
                decimals: 0,
                format: '0',
                downArrowText: '',
                upArrowText: ''
            });
            bubbleData.questions[i]['widget'] = $textbox.data('kendoNumericTextBox');
        }
        
        // Init the button behaviour
        $bubble.find('button').on('click', function() {
            $(this).addClass('active');
        });
        
        return $bubble;
    }
    
},
// instance methods
{
    /**
     * @function init
     */
    init: function(data) 
    {
        this.autoScrolling = MeasurementBubble.autoScrolling;
        this.scrollBack = MeasurementBubble.scrollBack;

        this.data = data;
        this.designatedArea = '#'+data['section']+'-'+data['column'];
        
        // Create the bubble
        this.$bubble = MeasurementBubble.create(data);
        
        // Add this bubble instance to the master registry
        this.index = MeasurementBubble.registry.length;
        MeasurementBubble.registry.push(this);
    },
    
    /**
     * @function place
     *
     * Places the question bubble in a given location or in its designated
     * area.
     *
     * @param {String} where
     *     (optional) CSS selector string. 
     *     Omit `where` to place the bubble in the designated area.
     * @param {Function} callback
     *     (optional)
     */
    place: function(where, callback)
    {
        if (typeof where == 'function') {
            callback = where;
        }
        
        var self = this;

        // Place in a specified location
        if (typeof where == 'string') {
            var $dest = $(where);
            // Move the bubble the destination
            $dest.append(this.$bubble);
            
            callback && callback();
        } 
        // or place in its designated area
        else {
            this.$bubble.find("input:text").each(function() {
                if (this.value == '') {
                    this.value = 0;
                }
            });
        
            var $dest = $(this.designatedArea);
            var sourceOffset = this.$bubble.offset();

            // This controls how long to wait before scrolling back.
            // Value is calculated below, based on the initial scrolling distance.
            var scrollbackDelay;
            
            // Hide the definition DIV
            this.$bubble.find('.definition').hide();
            
            // Create a temp placeholder to get the target's absolute position,
            // and to occupy the bubble's destination space during the
            // animation.
            var $tmp = $('<div class="bubble-container"></div>');
            if (this.data.section == 'prayer') {
                // Hard-coded special case
                this.autoScrolling = false;
                $tmp.css({
                    width: this.$bubble.width()+'px'
                });
            } else {
                $tmp.css({
                    width: 'auto',
                    height: this.$bubble.outerHeight()+'px'
                });
            }
            $tmp.appendTo($dest);
            var targetOffset = $tmp.offset();
            var targetWidth = $tmp.width();

            // Change to absolute positioning
            this.$bubble.css({
                position: 'absolute',
                top: sourceOffset.top,
                left: sourceOffset.left,
                width: this.$bubble.width()+'px'
            });
            
            if (this.autoScrolling) {
                // Scroll the browser page
                // (happens in parallel with the bubble's position change)
                var $body = $('html, body'); // "html" works for Firefox, "body" works for Safari
                var $window = $(window);
                var oldScrollTop = $body.scrollTop();
                var targetY = targetOffset.top + this.$bubble.height() + 100;
                var currentY = $window.innerHeight() - $body.scrollTop();
                
                if (targetY > currentY) {
                    // Scroll
                    $body.animate({
                        scrollTop: targetOffset.top - $window.innerHeight() + this.$bubble.outerHeight() + 100
                    });
                    // Calculate delay before scrolling back
                    scrollbackDelay = parseInt(targetY / currentY * 450);
                } else {
                    // No scrolling needed
                    this.scrollBack = false;
                }
            }
            
            // Animate position change
            this.$bubble.animate({
                top: targetOffset.top,
                left: targetOffset.left,
                width: targetWidth
            }, {
                duration: 'normal',
                // After animation switch back to static positioning
                complete: function() {
                    self.$bubble.css({
                        position: '', //'static',
                        top: '',
                        left: '',
                        width: '' //'auto'
                    });
                    
                    // Replace the 'tmp' placeholder with actual bubble
                    $tmp.before(self.$bubble);
                    $tmp.remove();
                        
                    // Scroll back and execute optional callback after completion
                    if (this.scrollBack) {
                        setTimeout(function() {
                            $body.animate({ scrollTop: oldScrollTop }, 'slow')
                            callback && callback();
                        }, scrollbackDelay);
                    } else {
                        callback && callback();
                    }
                    
                }
            });
        }
    },
    
    /**
     * @function setCustomResponse
     *
     * Set the optional custom response function. This function will be called
     * after the user answers the questions in this bubble.
     */
    setCustomResponse: function(responseFn)
    {
        this._customResponse = responseFn;
    },
    
    /**
     * @function customRespone
     *
     * Executes the custom response function if present.
     * @return {Boolean}
     */
    customResponse: function()
    {
        if (typeof this._customResponse == 'function') {
            this._customResponse();
            return true;
        } else {
            return false;
        }
    },

    /**
     * @function activate
     *
     * Reveal this question bubble, and prime it to reveal the next one when 
     * the questions are answered.
     */
    activate: function()
    {
        var self = this;
        
        // Place bubble in staging area
        //this.place( MeasurementBubble.stagingArea );

        // Place bubble in the designated area
        self.place(self.designatedArea, function() {
            // After placing...
            
            // Extract the definition markup
            var $definition = self.$bubble.find('.definition').clone();
            $definition.find('h3').remove();
            
            // Init the "popover" plugin that displays the 
            // question definition when you mouse over.
            self.$bubble.popover({
                placement: 'right',
                trigger: 'hover',
                title: null,
                content: $definition.html()
                //makeLabel( self.data.definition )
            });
            
            // Finish.
            if (!self.customResponse()) {
                // By default just activate the next bubble if no custom 
                // response has been set.
                self.activateNext();
            }
        });
        this.$bubble.show();

        /*
        // Set bubble's completion behaviour
        this.$bubble.find('fieldset button').on('click.checkPayload', function() {
            // Allow all other 'click' event handlers to run first
            setTimeout(function() {
                // Check if all questions have been answered
                var numQuestions = self.$bubble.find('fieldset').length;
                var numAnswers = self.$bubble.find('fieldset button.active').length;
                if (numQuestions == numAnswers) {
                    self.$bubble.find('fieldset button').off('click.checkPayload');
                    
                    //// Questions have been answered
    
                    // Place bubble in designated area
                    self.place(function() {
                        // After placing...
                        
                        // Extract the definition markup
                        var $definition = self.$bubble.find('.definition').clone();
                        $definition.find('h3').remove();
                        
                        // Init the "popover" plugin that displays the 
                        // question definition when you mouse over.
                        self.$bubble.popover({
                            placement: 'right',
                            trigger: 'hover',
                            title: null,
                            content: $definition.html()
                            //makeLabel( self.data.definition )
                        });
                        
                        // Finish.
                        if (!self.customResponse()) {
                            // By default just activate the next bubble if no custom 
                            // response has been set.
                            self.activateNext();
                        }
                    });
    
                }
            }, 0);
        });
        */
    },
    
    /**
     * @function activateNext
     */
    activateNext: function()
    {
        var nextBubble = MeasurementBubble.registry[this.index+1];
        if (nextBubble) {
            // Reveal the next bubble
            nextBubble.activate();
        }
    },
    
    /**
     * @function getMeasurementsByID
     *
     * Builds an array of measurements that are collected by this bubble 
     * instance. Only measurements that have a `measurementId` will be
     * included.
     *
     * @return {Object}
     */
    getMeasurementsByID: function()
    {
        var measurements = {};
        
        for (var i=0; i<this.data.questions.length; i++) {
            var id = this.data.questions[i]['measurementId'];
            var widget = this.data.questions[i].widget;
            if (id) {
                measurements[id] = widget.value();
            }
        }
        
        return measurements;
    },
    
    /**
     * @function getMeasurementsByName
     *
     * Builds an array of measurements that are collected by this bubble 
     * instance. Only measurements that have a `name` will be
     * included.
     *
     * @return {Object}
     */
    getMeasurementsByName: function()
    {
        var measurements = {};
        
        for (var i=0; i<this.data.questions.length; i++) {
            var name = this.data.questions[i]['name'];
            var value = this.data.questions[i].widget.value();
            if (name) {
                measurements[name] = value;
            }
        }
        
        return measurements;
    }
    
    
}); // end of MeasurementBubble class