/**
 * Maps the local site's language codes into the GMA site's languageId values.
 *
 * This may need to be changed depending on the specific GMA site being used.
 */
exports.languageMap = {
    'en': 1,
    'zh-hans': 2,
    'ko': 3
};

/**
 * This determines which GMA server we will be fetching our data from.
 */
//exports.baseURL = 'https://www.globalopsccci.org/gma41demo13/';
exports.baseURL = 'https://globalopsccci.org/gma41demo13/';