var $ = AD.jQuery;

/**
 * Fetch the user's GMA user info.
 *
 * @return {Deferred}
 */
var gmaUser = function(req)
{
    var dfd = $.Deferred();
    
    AD.Comm.HTTP.request({
        url: AD.GMA.baseURL + '?q=en/gmaservices/gma_user&type=current',
        jar: req.session['gmaClient-jar']
    })
    .then(function(res) {
        if (res.success) {
            // res.data == {
            //  renId: 123,
            //  GUID: "abcd...",
            //  preferredName: "jim bob"
            // }

            //// Cache results in the user's session
            //req.session['gmaClient-user'] = res.data;

            dfd.resolve(res.data);
        }
        else {
            // `success` == false
            dfd.reject(new Error('gmaUser failed'));
        }
    })
    .fail(function(err) {
        // Badly formed results
        dfd.reject(err);
    });

    return dfd;
}
module.exports = gmaUser;