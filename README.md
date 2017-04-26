# Gun-Verify

Gun Verify provides an easy layer to verify client connections to your Gun server instances.

# Installation

Yarn: `yarn add gun-verify`

NPM: `npm install gun-verify --save`

# Usage

On your Node server:

```javascript
    const Gun = require('gun');
    require('gun-verify'); // for side-effects
```

Then, when instantiating your server-side Gun instance, pass in the `verify` option:

```javascript
let gun = new Gun({
        verify: {
            // All are optional, but at least one is required

            // Reject any requests from insecure origins. Optional.
            requireSecure: true,

            // Gun-Verify will automatically check allowed
            // origins on request. See below for more options
            allowOrigins: 'https://yoururl.com',

            // Checks the authorization header. Optional.
            auth: function(authorizationHeader) {
                if (!authorized(authorizationHeader)) {
                    return false;
                }
                return true;
            },

            // Override the default authorization header
            // Requires `auth` to be set to be in effect
            authHeader: 'X-YOUR-CUSTOM-HEADER',

            // Check and validate the request. Optional.
            check: (info, success, err) => {

                // Verify the connection request
                if (!checkConnection(info)) {
                    err(400, 'Your error message here');
                    return;
                }

                // Accept the connection
                success();
            }
        }
});
```

## API

All of the options passed into `verify` are indeed options. However, if none are supplied, then gun-verify will make little sense as an addition since no verification checks will be added.

#### `requireSecure: {Boolean}`

If true, the request must have either `req.connection.authorized` or `req.connection.encrypted` to be set.

#### `allowOrigins: {String|Array|RegExp|Function}`

* __String__: origin is compared against the string for an exact match:

```javascript
allowOrigins: 'http://your-url.com',
```

* __Array__: the origin is checked against the string present in the array for an exact match:

```javascript
allowOrigins: [
    'http://your-url.com',
    'https://your-staging-url.com'
],
```

* __RegExp__: the origin tested against the RegExp using `RegExp.test`:

```javascript
allowOrigins: /^(optionalsubdomain\.)?yoururl\.com$/,
```

* __Function__: The function will be called with the origin as it's only parameter. The function should return a truthy or falsy value:
```javascript
allowOrigins: function(origin) {
    if (bad) {
        return false;
    }
    return true;
}
```

#### `auth: {Function|String}`

* __Function__: Called with the contents of the auth header:

```javascript
            auth: function(authorizationHeader) {
                if (!authorized(authorizationHeader)) {
                    return false;
                }
                return true;
            },
```

* __String__: the contents of the auth header will be checked against the string for an exact match (`===`):

```javascript
            auth: 'SOMEARBITRARYSTRINGTOCHECK',
```

#### `authHeader: {String}`

By default, `auth` will check the `authorization` header. If you want to use a custom header, `authHeader` will look for that header instead.

```javascript
            authHeader: 'X-MYSPECIAL-HEADER',
```

#### `check: {Function}`

The `check` function receives three parameters: `connectionInfo` which contains information about the connecting client, a success callback, and an error callback.

Alternatively, you can simply return a boolean to indicate whether or not the connection should be accepted.

Example using the callback:
```javascript
            check: function(connectionInfo, success, err) {
                // perform check here

                // Reject connection
                if (bad) {
    
                    // On failure, the callback can be called with 2 parameters:
                    // 1. Error code (optional)
                    // 2. Error Message (optional)
                    err(false, 400, 'Your error message');
                }

                // Allow the connection
                success();
            },
```

Example using return (must return a boolean):
```javascript
            check: function(connectionInfo) {
                // perform check here

                // Reject the connection
                if (bad) {
                    return false
                }

                // Allow the connection
                return true;
            },
```

`connectionInfo` is an object with the following keys: 
* `origin` {String} The value in the Origin header indicated by the client.
* `req` {[http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)} The client HTTP GET request.
* `secure` {Boolean} true if `req.connection.authorized` or `req.connection.encrypted` is set.

## A Word of Caution

If you're using `ws`, verify is called every couple of seconds while the Websocket is open. It is prudent to add as little overhead as possible (e.g., expensive database calls or the like should be avoided). 

However, if sessions should be time based and require re-authentication, the frequent checks could be advantageous since the socket connection can be rejected quickly.

If you're using `uWS` for your server, the verification check is much less frequent.

## How it works

Under the hood, gun-verify makes use of the [ws verifyClient](https://github.com/websockets/ws/blob/master/doc/ws.md) option with some convenience wrappers.

The alternative Websocket server, `uWS`, also supports gun-verify.