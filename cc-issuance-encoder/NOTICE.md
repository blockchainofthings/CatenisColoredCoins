# Notice of reuse

This directory contains source code that has been originally created by a third party and has been incorporated into
this Blockchain of Things' project. Please notice that the code may have been changed to server the specific needs of
the current project.

The current source code has been spawn from commit `092c40e` of this public git [repository](https://github.com/Colored-Coins/Issuance-Encoder.git)
where the original source code is maintained.

The following is the integral contents of the source code's original README file.

# Issuance-Encoder
[![Build Status](https://travis-ci.org/Colored-Coins/Issuance-Encoder.svg?branch=master)](https://travis-ci.org/Colored-Coins/Issuance-Encoder) [![Coverage Status](https://coveralls.io/repos/Colored-Coins/Issuance-Encoder/badge.svg?branch=master)](https://coveralls.io/r/Colored-Coins/Issuance-Encoder?branch=master) [![npm version](https://badge.fury.io/js/cc-issuance-encoder.svg)](http://badge.fury.io/js/cc-issuance-encoder) [![Slack Status](http://slack.coloredcoins.org/badge.svg)](http://slack.coloredcoins.org)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Issuance-Encoder provides the encode/decode functions between a Colored Coins issuance Object to buffer

### Installation

```sh
$ npm install cc-issuance-encoder
```


### Encode

Params:



```js


```

Returns a new Buffer holding the encoded issuance.

##### Example:

```js
var issuanceEncoder = require('cc-issuance-encoder')


```

### Decode

Params:

- consume - takes a consumable buffer (You can use [buffer-consumer] like in the example to create one)

Returns a Colored Coins payment Object

##### Example:

```js
var issuanceEncoder = require('cc-issuance-encoder')

```

### Testing

In order to test you need to install [mocha] globaly on your machine

```sh
$ cd /"module-path"/cc-issuance-Encoder
$ mocha
```


License
----

[Apache-2.0](http://www.apache.org/licenses/LICENSE-2.0)


[mocha]:https://www.npmjs.com/package/mocha
[buffer-consumer]:https://www.npmjs.com/package/buffer-consumer