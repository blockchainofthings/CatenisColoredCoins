var bitcoin = require('bitcoinjs-lib')
var bitcoinjsClassify = require('bitcoinjs-lib/src/classify')
var bs58check = require('bs58check')
var hash = require('crypto-hashing')
var debug = require('debug')('assetIdEncoder')
var UNLOCKEPADDING = {
  aggregatable: 0x2e37,
  hybrid: 0x2e6b,
  dispersed: 0x2e4e
}
var LOCKEPADDING = {
  aggregatable: 0x20ce,
  hybrid: 0x2102,
  dispersed: 0x20e4
}
var BTC_P2PKH = 0x00
var BTC_TESTNET_P2PKH = 0x6f
var BTC_P2SH = 0x05
var BTC_TESTNET_P2SH = 0xc4
var NETWORKVERSIONS = [BTC_P2PKH, BTC_TESTNET_P2PKH, BTC_P2SH, BTC_TESTNET_P2SH]
var POSTFIXBYTELENGTH = 2

var padLeadingZeros = function (hex, byteSize) {
  if (!byteSize) {
    byteSize = Math.ceil(hex.length / 2)
  }
  return (hex.length === byteSize * 2) ? hex : padLeadingZeros('0' + hex, byteSize)
}

var createIdFromTxidIndex = function (txid, index, padding, divisibility) {
  debug('createIdFromTxidIndex')
  debug('txid = ', txid, ', index = ', index)
  var str = txid + ':' + index
  return hashAndBase58CheckEncode(str, padding, divisibility)
}

var createIdFromPreviousOutputScriptPubKey = function (previousOutputHex, padding, divisibility) {
  var buffer = new Buffer(previousOutputHex, 'hex')
  debug('buffer = ', buffer)
  return hashAndBase58CheckEncode(buffer, padding, divisibility)
}

var createIdFromPubKeyHashInput = function (script, padding, divisibility, network) {
  debug('createIdFromPubKeyHashInput')
  var pubKeyHashOutput = bitcoin.payments.p2pkh({input: script, network: network}).output
  debug('pubKeyHashOutput = ', pubKeyHashOutput)
  return hashAndBase58CheckEncode(pubKeyHashOutput, padding, divisibility)
}

var createIdFromScriptHashInput = function (script, padding, divisibility, network) {
  debug('createIdFromScriptHashInput')
  var scriptHashOutput = bitcoin.payments.p2sh({input: script, network: network}).output
  debug('scriptHashOutput = ', scriptHashOutput)
  return hashAndBase58CheckEncode(scriptHashOutput, padding, divisibility)
}

var createIdFromWitness = function (witness, padding, divisibility, network) {
  debug('createIdFromWitness')
  var output
  try {
    output = bitcoin.payments.p2wpkh({ witness: witness, network: network }).output;
    debug('witnessPubKeyHashOutput = ', output)
  } catch (e) {}
  if (!output) {
    try {
      output = bitcoin.payments.p2wsh({ witness: witness, network: network }).output;
      debug('witnessScriptHashOutput = ', output)
    } catch (e) {}
  }

  if (!output) {
    debug('witness:', witness)
    throw new Error('Invalid witness')
  }

  return hashAndBase58CheckEncode(output, padding, divisibility)
}

var createIdFromWitnessScriptHashInput = function (script, padding, divisibility, network) {
  debug('createIdFromWitnessScriptHashInput')
  var witnessScriptHashOutput = bitcoin.payments.p2wsh({witness: script, network: network}).output
  debug('witnessScriptHashOutput = ', witnessScriptHashOutput)
  return hashAndBase58CheckEncode(witnessScriptHashOutput, padding, divisibility)
}

var createIdFromAddress = function (address, padding, divisibility, network) {
  debug('createIdFromAddress')
  var output
  if (address.length <= 35) {
    // Should be a base58 encoded bitcoin address used in P2PKH/P2SH outputs
    try {
      output = bitcoin.payments.p2pkh({ address: address, network: network }).output;
      debug('pubKeyHashOutput = ', output)
    } catch (e) {}
    if (!output) {
      try {
        output = bitcoin.payments.p2sh({ address: address, network: network }).output;
        debug('scriptHashOutput = ', output)
      } catch (e) {}
    }
  }
  else {
    // Should be a bech32 encoded bitcoin address used in native segregated witness P2WPKH/P2WSH outputs
    try {
      output = bitcoin.payments.p2wpkh({ address: address, network: network }).output;
      debug('witnessPubKeyHashOutput = ', output)
    } catch (e) {}
    if (!output) {
      try {
        output = bitcoin.payments.p2wsh({ address: address, network: network }).output;
        debug('witnessScriptHashOutput = ', output)
      } catch (e) {}
    }
  }

  if (!output) {
    throw new Error('Invalid bitcoin address')
  }

  return hashAndBase58CheckEncode(output, padding, divisibility)
}

var hashAndBase58CheckEncode = function (payloadToHash, padding, divisibility) {
  debug('hashAndBase58CheckEncode')
  debug('padding and divisibility = ' + padding.toString(16) + ', ' + divisibility)
  var hash256 = hash.sha256(payloadToHash)
  var hash160 = hash.ripemd160(hash256)
  debug('hash160 = ', hash160)
  padding = new Buffer(padLeadingZeros(padding.toString(16)), 'hex')
  divisibility = new Buffer(padLeadingZeros(divisibility.toString(16), POSTFIXBYTELENGTH), 'hex')
  var concatenation = Buffer.concat([padding, hash160, divisibility])
  return bs58check.encode(concatenation)
}

module.exports = function (bitcoinTransaction, network) {
  debug('bitcoinTransaction.txid = ', bitcoinTransaction.txid)
  if (!bitcoinTransaction.ccdata) throw new Error('Missing Colored Coin Metadata')
  if (bitcoinTransaction.ccdata[0].type !== 'issuance') throw new Error('Not An issuance transaction')
  if (typeof bitcoinTransaction.ccdata[0].lockStatus === 'undefined') throw new Error('Missing Lock Status data')
  var lockStatus = bitcoinTransaction.ccdata[0].lockStatus
  var aggregationPolicy = bitcoinTransaction.ccdata[0].aggregationPolicy || 'aggregatable'
  var divisibility = bitcoinTransaction.ccdata[0].divisibility || 0
  var firstInput = bitcoinTransaction.vin[0]
  var padding
  if (lockStatus) {
    padding = LOCKEPADDING[aggregationPolicy]
    return createIdFromTxidIndex(firstInput.txid, firstInput.vout, padding, divisibility)
  }

  padding = UNLOCKEPADDING[aggregationPolicy]
  if (firstInput.previousOutput && firstInput.previousOutput.hex) {
    return createIdFromPreviousOutputScriptPubKey(firstInput.previousOutput.hex, padding, divisibility)
  }

  if (firstInput.scriptSig && (firstInput.scriptSig.hex || firstInput.scriptSig.asm)) {
    var scriptSig = firstInput.scriptSig
    var script = scriptSig.hex ? Buffer.from(scriptSig.hex, 'hex') : bitcoin.script.fromASM(scriptSig.asm)
    debug('scriptSig = ', script.toString('hex'))
    var type = bitcoinjsClassify.input(script)
    if (type === bitcoinjsClassify.types.P2PKH) {
      return createIdFromPubKeyHashInput(script, padding, divisibility, network)
    }
    if (type === bitcoinjsClassify.types.P2SH) {
      return createIdFromScriptHashInput(script, padding, divisibility, network)
    }
  }

  if (firstInput.txinwitness) {
      return createIdFromWitness(firstInput.txinwitness.map(item => Buffer.from(item, 'hex')), padding, divisibility, network)
  }

  if (firstInput.address) {
    return createIdFromAddress(firstInput.address, padding, divisibility, network)
  }
}