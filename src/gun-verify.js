const Gun = require('gun/gun');

/**
 * Verify the origin
 * 
 * @param  {RegExp|Array|String|Fucntion} allowed   The allowed origins
 * @param  {String}              origin    String representation of the request URL
 * @return {Boolean}             Whether or not the origin is valid
 */
const verifyOrigin = function(allowed, origin) {
    let isValid = false;
    if (allowed instanceof RegExp) {
        isValid = allowed.test(origin);
    } else if (allowed instanceof Array) {
        isValid = allowed.indexOf(origin) !== -1;
    } else if (allowed instanceof Function) {
        isValid = allowed(origin);
    } else {
        isValid = allowed === origin;
    }
    return isValid;
};

/**
 * Verify the authentication header
 *
 * @todo  make this callback based
 * 
 * @param  {Function|String} check       Check option passed in
 * @param  {string}          authHeader  The auth head
 * @return {Boolean}         Whether or not the auth header is valid
 */
const verifyAuth = function(check, authHeader) {
    let isValid = false;
    if (check instanceof Function) {
        isValid = check(authHeader);
    } else {
        isValid = check === authHeader;
    }
    return isValid;
};

Gun.on('opt', function(context) {
    let {ws} = context.opt;
    ws = ws || {};

    /**
     *  verify when instantiating Gun can contain the following keys:
     *      allowOrigins: Array|RegExp|String
     *      auth:         String|Function
     *      check:        Function
     */
    let {verify} = context.opt;
    if (!verify) {
        throw new Error('`verify` is a required to initialize gun-verify');
    }

    if (ws.verifyClient && !verify.override) {
        throw Error('Cannot override existing verifyClient option in `ws` configuration.');
    }

    ws.verifyClient = (info, callback) => {

        // 0. Verify security
        if (verify.requireSecure && !info.secure) {
            callback(false, 400, 'Insecure connection');
            return;
        }

        // 1. Verify request origin
        if (verify.allowOrigins && !verifyOrigin(verify.allowOrigins, info.origin)) {
            callback(false, 400, 'Origin forbidden');
            return;
        }

        // 2. Check authentication header
        if (verify.auth) {

            // Get the header defined by the user
            // Or use authorization by default
            let header = (verify.authHeader)
                            ? info.req.headers[verify.authHeader]
                                : info.req.headers.authorization;

            // Check the header against the verification function
            if (!header || !verifyAuth(verify.auth, header)) {
                callback(false, 400, 'Forbidden');
                return;
            }
        }

        // 3. Callback
        let errorCallback = (validState, errorCode, message) => {
            callback(false, errorCode, message);
        };
        let successCallback = () => {
            callback(true);
        };

        // If no verification check is provided, simply return true
        // at this point.
        if (!verify.check) {
            callback(true);
            return;
        }

        // This can return a value; alternatively, this can use the
        // callback functionality
        let isValid = verify.check(info, successCallback, errorCallback); 

        // Check returned a response, pass this to the callback
        // If not, assume the user will call
        if (typeof isValid !== 'undefined') {
            if (typeof isValid === 'boolean') {
                if (isValid === true) {
                    successCallback();
                } else {
                    errorCallback(400);
                }
            }
        }          
    };
    context.opt.ws = ws;

    // Pass to next plugins
    this.to.next(context);
});

module.exports = Gun;
