const C3_PROTOCOL = 0x4333;   // Catenis Colored Coins (C3) protocol
const MULTISIG_KEY_DATA_SIZE = 32;  // Data size, in bytes, that can be stored per key in a multi-sig output
var TYPE_MASK = 0xf0
var TRANSFER_MASK = 0x10
var BURN_MASK = 0x20
var TRANSFER_OP_CODES = [
  new Buffer([0x10]), // All Hashes in OP_RETURN
                      // C3 protocol: whole multi-hash in null data output
  new Buffer([0x11]), // SHA2 in Pay-to-Script-Hash multi-sig output (1 out of 2)
                      // C3 protocol: start of multi-hash in null data output, continuation in single key of multi-sig output (1 out of 2)
  new Buffer([0x12]), // All Hashes in Pay-to-Script-Hash multi-sig outputs (1 out of 3)
                      // C3 protocol: start of multi-hash in null data output, continuation in two keys of multi-sig output (1 out of 3)
  new Buffer([0x13]), // Low security transaction no SHA2 for torrent data. SHA1 is always inside OP_RETURN in this case.
                      // C3 protocol: whole multi-hash in single key of multi-sig output (1 out of 2) - Note: this should never happen since smallest size of multi-hash is 34, which does not fit in a single multi-sig key
  new Buffer([0x14]), // Low security transaction no SHA2 for torrent data. SHA1 is always inside OP_RETURN in this case. also no rules inside the metadata (if there are any they will be in ignored)
                      // C3 protocol: whole multi-hash in two keys of multi-sig output (1 out of 3)
  new Buffer([0x15])  // No metadata or rules (no SHA1 or SHA2)
                      // C3 protocol: no metadata (no multi-hash)
]
var BURN_OP_CODES = [
  new Buffer([0x20]), // All Hashes in OP_RETURN
                      // C3 protocol: whole multi-hash in null data output
  new Buffer([0x21]), // SHA2 in Pay-to-Script-Hash multi-sig output (1 out of 2)
                      // C3 protocol: start of multi-hash in null data output, continuation in single key of multi-sig output (1 out of 2)
  new Buffer([0x22]), // All Hashes in Pay-to-Script-Hash multi-sig outputs (1 out of 3)
                      // C3 protocol: start of multi-hash in null data output, continuation in two keys of multi-sig output (1 out of 3)
  new Buffer([0x23]), // Low security transaction no SHA2 for torrent data. SHA1 is always inside OP_RETURN in this case.
                      // C3 protocol: whole multi-hash in single key of multi-sig output (1 out of 2) - Note: this should never happen since smallest size of multi-hash is 34, which does not fit in a single multi-sig key
  new Buffer([0x24]), // Low security transaction no SHA2 for torrent data. SHA1 is always inside OP_RETURN in this case. also no rules inside the metadata (if there are any they will be in ignored)
                      // C3 protocol: whole multi-hash in two keys of multi-sig output (1 out of 3)
  new Buffer([0x25])  // No metadata or rules (no SHA1 or SHA2)
                      // C3 protocol: no metadata (no multi-hash)
]

var transferPaymentEncoder = require('../cc-payment-encoder')
var burnPaymentEncoder = require('../cc-burn-payment-encoder')

var consumer = function (buff) {
  var curr = 0
  return function consume (len) {
    return buff.slice(curr, curr += len)
  }
}

var padLeadingZeros = function (hex, byteSize) {
  return (hex.length === byteSize * 2) ? hex : padLeadingZeros('0' + hex, byteSize)
}

module.exports = {
  encode: function (data, byteSize) {
    if (!data || typeof data.payments === 'undefined') {
      throw new Error('Missing Data')
    }
    var opcode
    var OP_CODES = data.type === 'burn' ? BURN_OP_CODES : TRANSFER_OP_CODES
    var paymentEncoder = data.type === 'burn' ? burnPaymentEncoder : transferPaymentEncoder
    var hash = new Buffer(0)
    var protocol = new Buffer(padLeadingZeros(data.protocol.toString(16), 2), 'hex')
    var version = new Buffer([data.version])
    var transferHeader = Buffer.concat([protocol, version])
    var payments = paymentEncoder.encodeBulk(data.payments)
    var issueByteSize = transferHeader.length + payments.length + 1

    if (issueByteSize > byteSize) throw new Error('Data code is bigger then the allowed byte size')

    if (data.protocol === C3_PROTOCOL) {
      // Special case for Catenis Colored Coins protocol
      const multiHashParts = [];

      if (data.multiHash) {
        const bytesLeft = byteSize - issueByteSize;
        // Includes leading 'length' byte
        let multiHashLeft = Buffer.concat([new Uint8Array([data.multiHash.length]), data.multiHash], data.multiHash.length + 1);
        let multiHashInNullData = false;

        if (bytesLeft >= 2) {
          // Fit at least part of multi-hash in null data output
          hash = multiHashLeft.slice(0, bytesLeft);

          if (hash.length < multiHashLeft.length) {
            // Not all multi-part fit in null data output. Adjust 'length' byte
            hash.writeInt8(hash.length - 1, 0);
          }

          // Save what is left of the multi-hash maintaining the leading 'length' byte
          multiHashLeft = multiHashLeft.slice(bytesLeft);

          if (multiHashLeft.length > 0) {
            multiHashLeft = Buffer.concat([new Uint8Array([multiHashLeft.length]), multiHashLeft]);
          }

          multiHashInNullData = true;
        }

        if (multiHashLeft.length > 0) {
          // Not the whole of multi-hash fit in null data output.
          //  Make sure that it will fit in multi-sig output
          if (multiHashLeft.length > MULTISIG_KEY_DATA_SIZE * 2) {
            throw new Error('Multi-hash too large to fit in transaction');
          }

          // Fit as much as possible of what is left of the multi-hash in first key of multi-sig output
          multiHashParts.push(multiHashLeft.slice(0, MULTISIG_KEY_DATA_SIZE));

          if (multiHashLeft.length > MULTISIG_KEY_DATA_SIZE) {
            // Fit the remainder in the second key of multi-sig output
            multiHashParts.push(multiHashLeft.slice(MULTISIG_KEY_DATA_SIZE));

            // A 1 of 3 multi-sig output shall be required to fit the multi-hash.
            //  Set op-code appropriately
            opcode = multiHashInNullData ? OP_CODES[2] : OP_CODES[4];
          }
          else {
            // A 1 of 2 multi-sig output shall be required to fit the multi-hash.
            //  Set op-code appropriately
            opcode = multiHashInNullData ? OP_CODES[1] : OP_CODES[3];
          }
        }
        else {
          // Indicate that the whole of multi-hash is in null data output
          opcode = OP_CODES[0];
        }
      }
      else {
        // No multi-hash (metadata)
        opcode = OP_CODES[5];
      }

      return {codeBuffer: Buffer.concat([transferHeader, opcode, hash, payments]), leftover: multiHashParts}
    }
    else {
      if (!data.sha2) {
        if (data.torrentHash) {
          opcode = data.noRules ? OP_CODES[4] : OP_CODES[3]
          if (issueByteSize + data.torrentHash.length > byteSize) throw new Error('Can\'t fit Torrent Hash in byte size')
          return {codeBuffer: Buffer.concat([transferHeader, opcode, data.torrentHash, payments]), leftover: []}
        }
        return {codeBuffer: Buffer.concat([transferHeader, OP_CODES[5], hash, payments]), leftover: []}
      }
      if (!data.torrentHash) throw new Error('Torrent Hash is missing')
      var leftover = [data.torrentHash, data.sha2]

      opcode = OP_CODES[2]
      issueByteSize = issueByteSize + data.torrentHash.length

      if (issueByteSize <= byteSize) {
        hash = Buffer.concat([hash, leftover.shift()])
        opcode = OP_CODES[1]
        issueByteSize = issueByteSize + data.sha2.length
      }
      if (issueByteSize <= byteSize) {
        hash = Buffer.concat([hash, leftover.shift()])
        opcode = OP_CODES[0]
      }

      return {codeBuffer: Buffer.concat([transferHeader, opcode, hash, payments]), leftover: leftover}
    }
  },

  decode: function (op_code_buffer) {
    var data = {}
    var consume = consumer(op_code_buffer)
    data.protocol = parseInt(consume(2).toString('hex'), 16)
    data.version = parseInt(consume(1).toString('hex'), 16)
    data.multiSig = []
    var opcode = consume(1)
    var paymentEncoder
    let OP_CODES;

    if ((opcode[0] & TYPE_MASK) === TRANSFER_MASK) {
      data.type = 'transfer';
      OP_CODES = TRANSFER_OP_CODES;
      paymentEncoder = transferPaymentEncoder
    } else if ((opcode[0] & TYPE_MASK) === BURN_MASK) {
      data.type = 'burn';
      OP_CODES = BURN_OP_CODES;
      paymentEncoder = burnPaymentEncoder
    } else {
      throw new Error('Unrecognized Code')
    }

    if (data.protocol === C3_PROTOCOL) {
      // Special case for Catenis Colored Coins protocol
      if (opcode.equals(OP_CODES[0])) {
        // Multi-hash only in null data output
        data.multiHash = consume(consume(1)[0]);
      }
      else if (opcode.equals(OP_CODES[1])) {
        // Multi-hash part in null data and part in first key of multi-sig output
        data.multiHash = consume(consume(1)[0]);
        data.multiSig.push({
          index: 1,
          hashType: 'multiHash'
        });
      }
      else if (opcode.equals(OP_CODES[2])) {
        // Multi-hash part in null data and part in both first and second keys of multi-sig output
        data.multiHash = consume(consume(1)[0]);
        data.multiSig.push({
          index: 1,
          hashType: 'multiHash'
        });
        data.multiSig.push({
          index: 2,
          hashType: 'multiHash'
        });
      }
      else if (opcode.equals(OP_CODES[3])) {
        // Multi-hash in first key of multi-sig output
        data.multiSig.push({
          index: 1,
          hashType: 'multiHash'
        });
      }
      else if (opcode.equals(OP_CODES[4])) {
        // Multi-hash in both first and second keys of multi-sig output
        data.multiSig.push({
          index: 1,
          hashType: 'multiHash'
        });
        data.multiSig.push({
          index: 2,
          hashType: 'multiHash'
        });
      }
      else if (!opcode.equals(OP_CODES[5])) {
        throw new Error('Unrecognized Code');
      }
    }
    else {
      if (opcode[0] === TRANSFER_OP_CODES[0][0] || opcode[0] === BURN_OP_CODES[0][0]) {
        data.torrentHash = consume(20)
        data.sha2 = consume(32)
      } else if (opcode[0] === TRANSFER_OP_CODES[1][0] || opcode[0] === BURN_OP_CODES[1][0]) {
        data.torrentHash = consume(20)
        data.multiSig.push({'index': 1, 'hashType': 'sha2'})
      } else if (opcode[0] === TRANSFER_OP_CODES[2][0] || opcode[0] === BURN_OP_CODES[2][0]) {
        data.multiSig.push({'index': 1, 'hashType': 'sha2'})
        data.multiSig.push({'index': 2, 'hashType': 'torrentHash'})
      } else if (opcode[0] === TRANSFER_OP_CODES[3][0] || opcode[0] === BURN_OP_CODES[3][0]) {
        data.torrentHash = consume(20)
        data.noRules = false
      } else if (opcode[0] === TRANSFER_OP_CODES[4][0] || opcode[0] === BURN_OP_CODES[4][0]) {
        data.torrentHash = consume(20)
        data.noRules = true
      } else if (opcode[0] === TRANSFER_OP_CODES[5][0] || opcode[0] === BURN_OP_CODES[5][0]) {
      } else {
        throw new Error('Unrecognized Code')
      }
    }

    data.payments = paymentEncoder.decodeBulk(consume)

    return data
  }
}
