# safeclient.js - JS SAFE Client Library

**This project is alpha quality and the APIs may change without notice. Use with caution!**

This project, safeclient.js, provides a JS library for using the
[SAFE Launcher API](https://maidsafe.readme.io/docs/introduction). This is intentionally built only for the nodejs
platform and not for the browser because the author fundamentally disagrees with browsers accessing the SAFE launcher.
However if necessary this could use browserify to work in the browser. The size could even be brought down since both
dependencies of this project ([libsodium.js](https://github.com/jedisct1/libsodium.js) and
[superagent](https://github.com/visionmedia/superagent/)) are intentionally developed for in-browser use.

## Installation

Install with NPM:

    npm install safeclient --save

Require in your code:

    const safe = require('safeclient')

## Building

This project is built in TypeScript and has to be compiled before it can be used. Run:

    git clone https://github.com/cretz/safeclient.js.git
    cd safeclient.js
    npm install
    ./node_modules/.bin/typings install
    npm run compile

This will place the JS library entrypoint at `./lib/src/index.js`. The example can be
executed with:

    node ./examples/js/simple_read_write.js

The integration tests which do several feature tests can be executed via:

    npm run integration-test

## Usage

The API returns [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
for every invocation that can be asynchronous. It is written in TypeScript and the `.d.ts` files are available for
use if you are developing in TypeScript. All calls must have the SAFE launcher running.

Here is how to create a directory:

```javascript
const safe = require('safeclient')

// Load the existing conf from somewhere
let conf = {}
try { conf = safe.unmarshalConf(loadConfStringFromSomewhere()) } catch (e) {}

// Create the client
const client = new safe.Client(conf)

// Make sure it is authed
const myAppInfo = {
  app: {
    name: "My Application",
    id: "myapp.example.com",
    version: "0.1.0",
    vendor: "myname"
  }
}
client.ensureAuthed(client, myAppInfo).then(_ => {
  
  // Now that it is authed, we should save the conf for future use
  saveConfStringToSomewhere(safe.marshalConf(client.conf))
  
  // Create a directory
  return safe.nfs.createDir(client, { dirPath: '/mynewdir' }).then(_ => { console.log('Created!') })
  
}).catch(console.error)
```

### API

Note, some internal APIs are not documented here.

#### new safe.Client(conf)

Create a new `safe.Client` for use by other calls. The optional `conf` parameter is a structure with the following:

* `launcherBaseUrl` - The required URL of the launcher. Usually you should set this to http://localhost:8100/.
* `token` - Optional token string for authenticating with the API. This is commonly set with `safe.ensureAuthed`
  or `safe.unmarshalConf` instead of manually.
* `sharedKey` - Optional `Uint8Array` for the shared key. This is commonly set with `safe.ensureAuthed` or
  `safe.unmarshalConf` instead of manually.
* `nonce` - Optional `Uint8Array` for the shared nonce. This is commonly set with `safe.ensureAuthed` or
  `safe.unmarshalConf` instead of manually.

If `conf` is not passed in, it will be defaulted to an object with `launcherBaseUrl` set to http://localhost:8100/.
The `conf` many times needs to be saved/loaded between executions which can be done with
`safe.marshalConf`/`safe.unmarshalConf`.

#### safe.Client.do(req) => Promise

Make a SAFE launcher invocation on a client. Usually this is not called directly but as the result of other API calls.
The required `req` parameter is a request object with the following properties:

* `path` - The URL path (i.e. not including host info) to call
* `method` - The HTTP method to use
* `jsonBody` - The optional JSON object to send as the HTTP body
* `rawBody` - The optional raw string to send as the HTTP body. This is overridden by `jsonBody` if present.
* `query` - The optional object for query parameters. This is the same format accepted by the `querystring` nodejs
  package.
* `doNotEncrypt` - Optional boolean that, if present and true, does not encrypt the request or response.
* `jsonResponse` - Optional boolean that, if present and true, sets the response's `body` with a parsed JSON object f
  the raw response text.
* `doNotAuth` - Optional boolean that, if present and true, does not set the authentication header.

The result is a promise for [superagent](https://github.com/visionmedia/superagent/)`.Response`.

#### safe.Client.conf

The member property for the configuration in the same structure as the `safe.Client` constructor.

#### safe.Client.requestBuilder

The overridable member property for the two-parameter function that builds an HTTP request from a client request. The
first parameter is the client and the second is the same `req` object passed to `safe.Client.do()`. The result should
be a promise that returns a [superagent](https://github.com/visionmedia/superagent/).`Request`. By default this is set
to the default builder. This can be changed to something else which can delegate to the original call.

#### safe.Client.responseHandler

The overridable member property for the four-parameter function that transforms an HTTP response. The first parameter
is the client. The second parameter is the [superagent](https://github.com/visionmedia/superagent/)`.Response`. The
third parameter is a boolean saying whether to decrypt. The fourth parameter is a boolean saying whether the response
should be JSON parsed. The result is a promise of [superagent](https://github.com/visionmedia/superagent/)`.Response`
which is usually the same as passed in. By default this is set to the default handler. This can be changed to something
else which can delegate to the original call.

#### safe.Client.logger

The optional member property to log requests and responses. This property has the same function signature as
`console.log`.

#### safe.ApiError

This class is what the `safe.Client.do()` resulting promise is rejected with if the HTTP call fails. It contains a
`resp` property which is set to [superagent](https://github.com/visionmedia/superagent/)`.Response`. It has a
`toString()` function which returns the HTTP status code and the body content.

#### safe.marshalConf(conf) => string

Marshal the conf into a string for persisting. This is the same conf structure used in the `safe.Client`
constructor.

#### safe.unmarshalConf(str) => conf

Unmarshal the string (made by `safe.marshalConf()`) into the same conf structure used in the `safe.Client`
constructor.

#### safe.auth(client, info, privateKey) => Promise

Authenticate with the SAFE launcher. The `client` is a `safe.Client` instance. Most of the time this is not called
directly but is instead called by `safe.ensureAuthed()`. `info` is an object with the following properties:

* `app` - Application info which has the following:
  * `name` - String for the app name
  * `id` - String for the app ID
  * `version` - String for the app version
  * `vendor` - String for the app vendor
* `permissions` - Optional array of string permissions. The only acceptable permission now is `SAFE_DRIVE_ACCESS`
* `publicKey` - Optional base64'd public key to use for authentication. This is automatically set if `privateKey` is
  not provided to the function.
* `nonce` - Optional base64'd nonce to use for authentication. This is automatically set if `privateKey` is not
  provided to the function.

The `privateKey` is an optional parameter that is the base64'd private key to use for authentication. It will be
automatically generated (along with `info.publicKey` and `info.nonce`) if it is not provided.

The result of this call is a promise which, on success, contains an object with the following:

* `info` - The `info` passed in with possible updates made inside the function.
* `token` - The token that can be used for authenticated client calls.
* `sharedKey` - The Uint8Array for the shared key used for encryption/decryption.
* `nonce` - The Uint8Array for the nonce used for encryption/decryption.

See https://maidsafe.readme.io/docs/auth for more information.

#### safe.isValidToken(client) => Promise

Check if the token set in `client.conf.token` is still valid and registered with the SAFE launcher. The result is a
promise with a boolean of true if it is still registered and false if not. This is usually not called directly but is
instead called by `safe.ensureAuthed()`.

See https://maidsafe.readme.io/docs/is-token-valid for more information.

#### safe.ensureAuthed(client, info) => Promise

This basically makes sure the `client` is setup and ready to make calls. It essentially calls `safe.isValidToken()`
first and if it is not valid, it calls `safe.auth()` with the given `info` parameter. If `safe.auth()` is called, the
results are set inside of `client.conf` so they can be used by future calls.

The result is a promise with no meaningful value. Once this has been called, the `client.conf` should be saved with
`safe.marshalConf` so it can be reused to construct the client the next time.

#### safe.dns.getLongNames(client) => Promise

This gets all long names from DNS. The result is a promise with a string array.

See https://maidsafe.readme.io/docs/dns-list-long-names for more information.

#### safe.dns.getServices(client, longName) => Promise

Get the services for the given `longName`. The result is a promise with a string array.

See https://maidsafe.readme.io/docs/dns-list-services for more information.

#### safe.dns.getServiceDir(client, longName, service) => Promise

Get the directory for the given `service` and `longName`. The result is the same as `safe.nfs.getDir()`.

See https://maidsafe.readme.io/docs/dns-get-home-dir for more information.

#### safe.dns.getFile(client, info) => Promise

Get file contents from DNS info. The `info` parameter is an object with the following:

* `longName` - The DNS long name
* `service` - The DNS service
* `filePath` - The file path for the file to fetch
* `offset` - Optional integer offset. If not provided, it is assumed to be 0.
* `length` - Optional integer amount of bytes to fetch. If it is not provided, it is assumed to be the full length.

The result is a promise which contains an object with the following on success:

* `info` - Same file information that is present for each file in `files` for the result of `safe.nfs.getDir`
* `contentType` - The content type for the file (i.e. mime type)
* `body` - A nodejs `Buffer` for the contents

See https://maidsafe.readme.io/docs/dns-get-file-unauth for more information.

#### safe.dns.register(client, info) => Promise

Register a new DNS long name and service. The `info` parameter is an object with the following:

* `longName` - The new long name to register
* `serviceName` - The new service to register
* `serviceHomeDirPath` - The directory path to use for the service
* `isPathShared` - The optional boolean that if set to true means the directory path is shared

The result is a promise with no meaningful value.

See https://maidsafe.readme.io/docs/dns-register-service for more information.

#### safe.dns.createLongName(client, longName) => Promise

Register a new DNS long name by itself. The `longName` is the string name to register. The result is a promise with no
meaningful value.

See https://maidsafe.readme.io/docs/dns-create-long-name for more information.

#### safe.dns.addService(client, info) => Promise

Register a new service with an existing DNS long name. The `info` parameter is an object with the following:

* `longName` - The already registered long name
* `serviceName` - The new service to register
* `serviceHomeDirPath` - The directory path to use for the service
* `isPathShared` - The optional boolean that if set to true means the directory path is shared

The result is a promise with no meaningful value.

This command is not documented for the SAFE launcher.

#### safe.dns.deleteLongName(client, longName) => Promise

Delete a registered DNS long name. The `longName` is the string to delete. The result is a promise with no meaningful
value.

This command is not documented for the SAFE launcher.

#### safe.dns.deleteService(client, longName, service) => Promise

Delete a registered DNS service. The `longName` is the long name string and the `service` is the service string to
delete. The result is a promise with no meaningful
value.

This command is not documented for the SAFE launcher.

#### safe.nfs.createDir(client, info) => Promise

Create a directory. The `info` parameter is an object with the following:

* `dirPath` - The string path to create
* `isPrivate` - Optional boolean that if set to true will make this directory private
* `isVersioned` - Optional boolean that if set to true makes this directory versioned
* `metadata` - Optional string of metadata to store on the directory
* `isPathShared` - Optional boolean that if set to true makes this directory shared

The result is a promise with no meaningful value.

See https://maidsafe.readme.io/docs/nfs-create-directory for more information.

#### safe.nfs.getDir(client, info) => Promise

Get a directory listing. The `info` parameter is an object with the following:

* `dirPath` - The string path to fetch
* `isPathShared` - Optional boolean that if set to true means the directory is shared

The result is a promise with a directory information object which has the following:

* `info` - Information about the fetched directory. It is the same structure as each value in `subDirectories` below.
* `files` - Array of files in the directory. Each object in the array contains the following:
  * `name` - String name of the file
  * `size` - Numeric size of the file in bytes
  * `createdOn` - When the file was created as the number of milliseconds since epoch
  * `modifiedOn` - When the file was last modified as the number of milliseconds since epoch
  * `metadata` - String metadata on the file
* `subDirectories` - Array of child directories. Each object in the array contains the following:
  * `name` - String name of the directory
  * `isPrivate` - Whether the directory is private
  * `isVersioned` - Whether the directory is versioned
  * `createdOn` - When the directory was created as the number of milliseconds since epoch
  * `modifiedOn` - When the directory was last modified as the number of milliseconds since epoch
  * `metadata` - String metadata on the directory

See https://maidsafe.readme.io/docs/nfs-get-directory for more information.

#### safe.nfs.deleteDir(client, info) => Promise

Delete a directory. The `info` parameter is an object with the following:

* `dirPath` - String path to directory
* `isPathShared` - Optional boolean that if set means this directory is shared

The result is a promise with no meaningful value.

See https://maidsafe.readme.io/docs/nfs-delete-directory for more information.

#### safe.nfs.changeDir(client, info) => Promise

Change the directory name and/or metadata. The `info` parameter is an object with the following:

* `dirPath` - String path to directory
* `isPathShared` - Optional boolean that if set means this directory is shared
* `newInfo` - An object with at least one of the following:
  * `name` - The name to change to
  * `metadata` - The metadata to set

The result is a promise with no meaningful value.

This command is not documented for the SAFE launcher.

#### safe.nfs.moveDir(client, info) => Promise

**NOTE: this command is undocumented and is currently unstable**

#### safe.nfs.createFile(client, info) => Promise

Create an empty file. The `info` parameter is an object with the following:

* `filePath` - String path to file
* `isPathShared` - Optional boolean that means the path is shared
* `metadata` - Optional string metadata for the file

The result is a promise with no meaningful value.

See https://maidsafe.readme.io/docs/nfsfile for more information.

#### safe.nfs.moveFile(client, info) => Promise

**NOTE: this command is undocumented and is currently unstable**

#### safe.nfs.deleteFile(client, info) => Promise

Delete a file. the `info` parameter is an object with the following:

* `filePath` - String path to file
* `isPathShared` - Optional boolean that means the path is shared

The result is a promise with no meaningful value.

See https://maidsafe.readme.io/docs/nfs-delete-file for more information.

#### safe.nfs.changeFile(client, info) => Promise

Change the file name and/or metadata. The `info` parameter is an object with the following:

* `filePath` - String path to file
* `isPathShared` - Optional boolean that if set means this path is shared
* `newInfo` - An object with at least one of the following:
  * `name` - The name to change to
  * `metadata` - The metadata to set

The result is a promise with no meaningful value.

This command is not documented for the SAFE launcher.

#### safe.nfs.writeFile(client, info) => Promise

Write data to an existing file. The `info` parameter is an object with the following:

* `filePath` - String path to file
* `isPathShared` - Optional boolean that if set means this path is shared
* `contents` - A string or a buffer of the file contents
* `offset` - Optional numeric byte offset to start writing at. If not set it is defaulted to 0.

The result is a promise with no meaningful value.

See https://maidsafe.readme.io/docs/nfs-update-file-content for more information.

#### safe.nfs.getFile(client, info) => Promise

Read data from a file. The `info` parameter is an object with the following:

* `filePath` - String path to file
* `isPathShared` - Optional boolean that if set means this path is shared
* `offset` - Optional numeric byte offset to start reading at. If not set it is defaulted to 0.
* `length` - Optional numeric amount of bytes to read. If not set it is default to the full length.

The result is a promise with a nodejs `Buffer`.

See https://maidsafe.readme.io/docs/nfs-get-file for more information.

## License
   
The MIT License (MIT)

Copyright (c) 2016 Chad Retz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.