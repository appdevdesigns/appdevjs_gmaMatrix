/**
 * This is the meta data file for the GMA Matrix Dashboard view.
 *
 * The most important things are the question `name` properties. These will be 
 * matched with the English GMA measurement names. Because there is no other 
 * way to identify a measurement in GMA.
 */
module.exports = {

    "Mass Exposures": {
        row: "win",
        col: "faith",
        measurements: {
            "all": [
                "Mass Exposure",
                "Mass Exposures"
            ]
        }
    },

    "Personal Exposures": {
        row: "win",
        col: "faith",
        measurements: {
            "Staff": [
                // SLM
                "Gospel Conversations (Staff)",
                // LLM
                "Influentials Engaged",
                // GCM
                "Gospel Conversations",
            ],
            "Disciples": [
                "Gospel Conversations (Non-Staff)",
            ]
        }
    },

    "Presenting the Gospel": {
        row: "win",
        col: "faith",
        measurements: {
            "Staff": [
                "Gospel Presentations (Staff)",
                "Gospel Presentations",
            ],
            "Disciples": [
                "Gospel Presentations (Non-Staff)",
            ]
        }
    },
    
    "Following Up": {
        row: "build",
        col: "faith",
        measurements: {
            "Staff": [
                "Following Up (Staff)",
                "Following Up"
            ],
            "Disciple": [
                "Following Up (Non-Staff)"
            ]
        }
    },

    "Holy Spirit Presentations": {
        row: "build",
        col: "faith",
        measurements: {
            "Staff": [
                "HS Presentations (Staff)",
                "HS  Presentations (Staff)",
                "HS Presentations"
            ],
            "Disciple": [
                "HS Presentations (Non-Staff)",
                "HS  Presentations (Non-Staff)"
            ]
        }
    },

    "Training for Action": {
        row: "send",
        col: "faith",
        measurements: {
            "all": [
                "Train for Action"
            ]
        }
    },

    "Training for Action": {
        row: "send",
        col: "faith",
        measurements: {
            "all": [
                "Train for Action"
            ]
        }
    },

    "Sending Lifetime Laborers": {
        row: "send",
        col: "faith",
        measurements: {
            "all": [
                "Challenging Lifetime Laborers"
            ]
        }
    },
    
    "Developing Local Resources": {
        row: "send",
        col: "faith",
        measurements: {
            "all": [
                "Challenged to Develop Local Resources"
            ]
        }
    },
    
    "Mass Decisions": {
        row: "win",
        col: "fruits",
        measurements: {
            "all": [
                "Mass Decisions"
            ]
        }
    },

    "New Believers": {
        row: "win",
        col: "fruits",
        measurements: {
            "Staff": [
                "Presentation Decisions (Staff)"
            ],
            "Disciples": [
                "Presentation Decisions (Non-Staff)"
            ]
        }
    },
    
    "Engaged Disciples": {
        row: "build",
        col: "fruits",
        measurements: {
            "all": [
                "Engaged Disciples"
            ]
        }
    },
    
    "Multiplying Disciples": {
        row: "send",
        col: "fruits",
        measurements: {
            "all": [
                "Multiplying Disciples"
            ]
        }
    },
    
    "Locally Generated Resources": {
        row: "send",
        col: "fruits",
        measurements: {
            "New Staff": [
                "New Staff",
            ],
            "LTLs": [
                "New Lifetime Laborers",
            ],
            "Local Givers": [
                "People Giving Resources",
            ]
        }
    },
    
    "Movement": {
        row: "send",
        col: "outcome",
        totalType: "final",
        measurements: {
            "all": [
                "Number of Movements"
            ]
        }
    }

};
