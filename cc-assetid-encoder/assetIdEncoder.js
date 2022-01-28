var bitcoin = require('bitcoinjs-lib')
var bitcoinjsClassify = require('bitcoinjs-lib/src/classify')
var bs58check = require('bs58check')
var hash = require('crypto-hashing')
var debug = require('debug')('assetIdEncoder')
const C3_PROTOCOL = 0x4333;   // Catenis Colored Coins (C3) protocol
var UNLOCKEPADDING = {
  aggregatable: 0x2e37,
  hybrid: 0x2e6b,
  dispersed: 0x2e4e,
  nonFungible: 0x2e90
}
var LOCKEPADDING = {
  aggregatable: 0x20ce,
  hybrid: 0x2102,
  dispersed: 0x20e4,
  nonFungible: 0x2127
}
let c3UnlockedPadding;
let c3LockedPadding;
const TOKENPADDING = 0x2cd4;
var BTC_P2PKH = 0x00
var BTC_TESTNET_P2PKH = 0x6f
var BTC_P2SH = 0x05
var BTC_TESTNET_P2SH = 0xc4
var NETWORKVERSIONS = [BTC_P2PKH, BTC_TESTNET_P2PKH, BTC_P2SH, BTC_TESTNET_P2SH]
var SUFFIXBYTELENGTH = 2

function getPadding(lockStatus, protocol) {
  if (lockStatus) {
    if (protocol === C3_PROTOCOL) {
      if (!c3LockedPadding) {
        c3LockedPadding = {...LOCKEPADDING, nonFungible: 0x2127};
      }
      return c3LockedPadding;
    }
    return LOCKEPADDING;
  }
  else {
    if (protocol === C3_PROTOCOL) {
      if (!c3UnlockedPadding) {
        c3UnlockedPadding = {...UNLOCKEPADDING, nonFungible: 0x2e90};
      }
      return c3UnlockedPadding;
    }
    return UNLOCKEPADDING;
  }
}

var padLeadingZeros = function (hex, byteSize) {
  if (!byteSize) {
    byteSize = Math.ceil(hex.length / 2)
  }
  return (hex.length === byteSize * 2) ? hex : padLeadingZeros('0' + hex, byteSize)
}

var createIdFromTxidIndex = function (txid, index, padding, suffix) {
  debug('createIdFromTxidIndex')
  debug('txid = ', txid, ', index = ', index)
  var str = txid + ':' + index
  return hashAndBase58CheckEncode(str, padding, suffix)
}

var createIdFromPreviousOutputScriptPubKey = function (previousOutputHex, padding, suffix) {
  var buffer = Buffer.from(previousOutputHex, 'hex')
  debug('buffer = ', buffer)
  return hashAndBase58CheckEncode(buffer, padding, suffix)
}

var createIdFromPubKeyHashInput = function (script, padding, suffix, network) {
  debug('createIdFromPubKeyHashInput')
  var pubKeyHashOutput = bitcoin.payments.p2pkh({input: script, network: network}).output
  debug('pubKeyHashOutput = ', pubKeyHashOutput)
  return hashAndBase58CheckEncode(pubKeyHashOutput, padding, suffix)
}

var createIdFromScriptHashInput = function (script, padding, suffix, network) {
  debug('createIdFromScriptHashInput')
  var scriptHashOutput = bitcoin.payments.p2sh({input: script, network: network}).output
  debug('scriptHashOutput = ', scriptHashOutput)
  return hashAndBase58CheckEncode(scriptHashOutput, padding, suffix)
}

var createIdFromWitness = function (witness, padding, suffix, network) {
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

  return hashAndBase58CheckEncode(output, padding, suffix)
}

var createIdFromAddress = function (address, padding, suffix, network) {
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

  return hashAndBase58CheckEncode(output, padding, suffix)
}

var hashAndBase58CheckEncode = function (payloadToHash, padding, suffix) {
  debug('hashAndBase58CheckEncode')
  debug('padding and suffix = ' + padding.toString(16) + ', ' + suffix)
  var hash256 = hash.sha256(payloadToHash)
  var hash160 = hash.ripemd160(hash256)
  debug('hash160 = ', hash160)
  padding = Buffer.from(padLeadingZeros(padding.toString(16)), 'hex')
  suffix = Buffer.from(padLeadingZeros(suffix.toString(16), SUFFIXBYTELENGTH), 'hex')
  var concatenation = Buffer.concat([padding, hash160, suffix])
  return bs58check.encode(concatenation)
}

module.exports = function (bitcoinTransaction, network, tokenIds = false) {
  debug('bitcoinTransaction.txid = ', bitcoinTransaction.txid)
  if (!bitcoinTransaction.ccdata) throw new Error('Missing Colored Coin Metadata')
  if (bitcoinTransaction.ccdata[0].type !== 'issuance') throw new Error('Not An issuance transaction')
  if (typeof bitcoinTransaction.ccdata[0].lockStatus === 'undefined') throw new Error('Missing Lock Status data')
  var lockStatus = bitcoinTransaction.ccdata[0].lockStatus
  var aggregationPolicy = bitcoinTransaction.ccdata[0].aggregationPolicy || 'aggregatable'
  var divisibility = bitcoinTransaction.ccdata[0].divisibility || 0
  var firstInput = bitcoinTransaction.vin[0]

  let padding;
  let suffix;

  function generateId() {
    if (lockStatus) {
      return createIdFromTxidIndex(firstInput.txid, firstInput.vout, padding, suffix)
    }

    if (firstInput.previousOutput && firstInput.previousOutput.hex) {
      return createIdFromPreviousOutputScriptPubKey(firstInput.previousOutput.hex, padding, suffix)
    }

    if (firstInput.txinwitness) {
      return createIdFromWitness(firstInput.txinwitness.map(item => Buffer.from(item, 'hex')), padding, suffix, network)
    }

    if (firstInput.scriptSig && (firstInput.scriptSig.hex || firstInput.scriptSig.asm)) {
      var scriptSig = firstInput.scriptSig
      var script = scriptSig.hex ? Buffer.from(scriptSig.hex, 'hex') : bitcoin.script.fromASM(scriptSig.asm)
      debug('scriptSig = ', script.toString('hex'))
      var type = bitcoinjsClassify.input(script)
      if (type === bitcoinjsClassify.types.P2PKH) {
        return createIdFromPubKeyHashInput(script, padding, suffix, network)
      }
      if (type === bitcoinjsClassify.types.P2SH) {
        return createIdFromScriptHashInput(script, padding, suffix, network)
      }
    }

    if (firstInput.address) {
      return createIdFromAddress(firstInput.address, padding, suffix, network)
    }
  }

  if (tokenIds) {
    // Been asked to generate non-fungible token IDs instead of asset ID
    if (bitcoinTransaction.ccdata[0].protocol === C3_PROTOCOL && aggregationPolicy === 'nonFungible') {
      // Prepare to generate the token IDs. Note that the amount
      //  designates the number of IDs to generate
      padding = TOKENPADDING;
      suffix = lockStatus ? 0x8000 : 0;
      lockStatus = true;  // Set lock status so generated token IDs are always unique
      const count = suffix + bitcoinTransaction.ccdata[0].amount;
      const ids = [];

      for (; suffix < count; suffix++) {
        ids.push(generateId());
      }

      return ids;
    }
  }
  else {
    // Generate asset ID
    padding = getPadding(lockStatus, bitcoinTransaction.ccdata[0].protocol)[aggregationPolicy];
    suffix = divisibility;

    return generateId();
  }
}