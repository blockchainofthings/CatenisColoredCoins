const C3_PROTOCOL = 0x4333;   // Catenis Colored Coins (C3) protocol
const MULTISIG_KEY_DATA_SIZE = 32;  // Data size, in bytes, that can be stored per key in a multi-sig output
var OP_CODES = [
  Buffer.from([0x00]), // wild-card to be defined
  Buffer.from([0x01]), // All Hashes in OP_RETURN - Pay-to-PubkeyHash
                      // C3 protocol: whole CID in null data output
  Buffer.from([0x02]), // SHA2 in Pay-to-Script-Hash multi-sig output (1 out of 2)
                      // C3 protocol: start of CID in null data output, continuation in single key of multi-sig output (1 out of 2)
  Buffer.from([0x03]), // All Hashes in Pay-to-Script-Hash multi-sig outputs (1 out of 3)
                      // C3 protocol: start of CID in null data output, continuation in two keys of multi-sig output (1 out of 3)
  Buffer.from([0x04]), // Low security issue no SHA2 for torrent data. SHA1 is always inside OP_RETURN in this case.
                      // C3 protocol: whole CID in single key of multi-sig output (1 out of 2) - Note: this should never happen since smallest size of CID is 34, which does not fit in a single multi-sig key
  Buffer.from([0x05]), // No rules, no torrent, no meta data ( no one may add rules in the future, anyone can add metadata )
                      // C3 protocol: whole CID in two keys of multi-sig output (1 out of 3)
  Buffer.from([0x06])  // No meta data (anyone can add rules and/or metadata  in the future)
                      // C3 protocol: no metadata (no CID)
]
var sffc = require('../sffc-encoder')
var issueFlagsCodex = require('./issueFlagsEncoder.js')
var paymentCodex = require('../cc-payment-encoder')

var consumer = function (buff) {
  var curr = 0
  return function consume (len) {
    return buff.slice(curr, curr += len)
  }
}

var padLeadingZeros = function (hex, byteSize) {
  return (hex.length === byteSize * 2) ? hex : padLeadingZeros('0' + hex, byteSize)
}

var decodeAmountByVersion = function (version, consume, divisibility) {
  var decodedAmount = sffc.decode(consume)
  return (version == 0x01)? (decodedAmount / Math.pow(10, divisibility)) : decodedAmount
}

module.exports = {
  encode: function (data, byteSize) {
    if (!data) throw new Error('Missing Data')
    if (typeof data.amount === 'undefined') throw new Error('Missing amount')
    if (typeof data.lockStatus === 'undefined') throw new Error('Missing lockStatus')
    if (typeof data.divisibility === 'undefined') throw new Error('Missing divisibility')
    if (typeof data.aggregationPolicy === 'undefined') throw new Error('Missing aggregationPolicy')
    if (typeof data.protocol === 'undefined') throw new Error('Missing protocol')
    if (typeof data.version === 'undefined') throw new Error('Missing version')
    if (data.protocol === C3_PROTOCOL && data.aggregationPolicy === 'nonFungible' && data.divisibility !== 0) {
      throw new Error('Inconsistent divisibility for non-fungible');
    }
    var opcode
    var hash = Buffer.alloc(0)
    var protocol = Buffer.from(padLeadingZeros(data.protocol.toString(16), 2), 'hex')
    var version = Buffer.from([data.version])
    var issueHeader = Buffer.concat([protocol, version])
    var amount = sffc.encode(data.amount)
    var payments = Buffer.alloc(0)
    if (data.payments) payments = paymentCodex.encodeBulk(data.payments)
    var issueFlagsByte = issueFlagsCodex.encode(
        {divisibility: data.divisibility, lockStatus: data.lockStatus, aggregationPolicy: data.aggregationPolicy},
        data.protocol
    )
    var issueTail = Buffer.concat([amount, payments, issueFlagsByte])
    var issueByteSize = issueHeader.length + issueTail.length + 1

    if (issueByteSize > byteSize) throw new Error('Data code is bigger then the allowed byte size')


    if (data.protocol === C3_PROTOCOL) {
      // Special case for Catenis Colored Coins protocol
      const cidParts = [];

      if (data.cid) {
        const bytesLeft = byteSize - issueByteSize;
        // Includes leading 'length' byte
        let cidLeft = Buffer.concat([new Uint8Array([data.cid.length]), data.cid], data.cid.length + 1);
        let cidInNullData = false;

        if (bytesLeft >= 2) {
          // Fit at least part of CID in null data output
          hash = cidLeft.slice(0, bytesLeft);

          if (hash.length < cidLeft.length) {
            // Not all CID fit in null data output. Adjust 'length' byte
            hash.writeInt8(hash.length - 1, 0);
          }

          // Save what is left of the CID maintaining the leading 'length' byte
          cidLeft = cidLeft.slice(bytesLeft);

          if (cidLeft.length > 0) {
            cidLeft = Buffer.concat([new Uint8Array([cidLeft.length]), cidLeft]);
          }

          cidInNullData = true;
        }

        if (cidLeft.length > 0) {
          // Not the whole of CID fit in null data output.
          //  Make sure that it will fit in multi-sig output
          if (cidLeft.length > MULTISIG_KEY_DATA_SIZE * 2) {
            throw new Error('CID too large to fit in transaction');
          }

          // Fit as much as possible of what is left of the CID in first key of multi-sig output
          cidParts.push(cidLeft.slice(0, MULTISIG_KEY_DATA_SIZE));

          if (cidLeft.length > MULTISIG_KEY_DATA_SIZE) {
            // Fit the remainder in the second key of multi-sig output
            cidParts.push(cidLeft.slice(MULTISIG_KEY_DATA_SIZE));

            // A 1 of 3 multi-sig output shall be required to fit the CID.
            //  Set op-code appropriately
            opcode = cidInNullData ? OP_CODES[3] : OP_CODES[5];
          }
          else {
            // A 1 of 2 multi-sig output shall be required to fit the CID.
            //  Set op-code appropriately
            opcode = cidInNullData ? OP_CODES[2] : OP_CODES[4];
          }
        }
        else {
          // Indicate that the whole of CID is in null data output
          opcode = OP_CODES[1];
        }
      }
      else {
        // No CID (metadata)
        opcode = OP_CODES[6];
      }

      return {codeBuffer: Buffer.concat([issueHeader, opcode, hash, issueTail]), leftover: cidParts}
    }
    else {
      if (!data.sha2) {
        if (data.torrentHash) {
          if (issueByteSize + data.torrentHash.length > byteSize) throw new Error('Can\'t fit Torrent Hash in byte size')
          return {codeBuffer: Buffer.concat([issueHeader, OP_CODES[4], data.torrentHash, issueTail]), leftover: []}
        }
        opcode = data.noRules ? OP_CODES[5] : OP_CODES[6]
        return {codeBuffer: Buffer.concat([issueHeader, opcode, hash, issueTail]), leftover: []}
      }
      if (!data.torrentHash) throw new Error('Torrent Hash is missing')
      var leftover = [data.torrentHash, data.sha2]

      opcode = OP_CODES[3]
      issueByteSize = issueByteSize + data.torrentHash.length

      if (issueByteSize <= byteSize) {
        hash = Buffer.concat([hash, leftover.shift()])
        opcode = OP_CODES[2]
        issueByteSize = issueByteSize + data.sha2.length
      }
      if (issueByteSize <= byteSize) {
        hash = Buffer.concat([hash, leftover.shift()])
        opcode = OP_CODES[1]
      }

      return {codeBuffer: Buffer.concat([issueHeader, opcode, hash, issueTail]), leftover: leftover}
    }
  },

  decode: function (op_code_buffer) {
    var data = {}
    if (!Buffer.isBuffer(op_code_buffer)) {
      op_code_buffer = Buffer.from(op_code_buffer, 'hex')
    }

    // Exclude last byte (with issuance flags)
    var consume = consumer(op_code_buffer.slice(0, op_code_buffer.length - 1))
    data.protocol = parseInt(consume(2).toString('hex'), 16)

    // Process issuance flags separately
    var lastByte = op_code_buffer.slice(-1)
    var issueTail = issueFlagsCodex.decode(consumer(lastByte), data.protocol)
    data.divisibility = issueTail.divisibility
    data.lockStatus = issueTail.lockStatus
    data.aggregationPolicy = issueTail.aggregationPolicy

    data.version = parseInt(consume(1).toString('hex'), 16)
    data.multiSig = []
    var opcode = consume(1)
    data.type = 'issuance';

    if (data.protocol === C3_PROTOCOL) {
      // Special case for Catenis Colored Coins protocol
      if (opcode.equals(OP_CODES[1])) {
        // CID only in null data output
        data.cid = consume(consume(1)[0]);
      }
      else if (opcode.equals(OP_CODES[2])) {
        // CID part in null data and part in first key of multi-sig output
        data.cid = consume(consume(1)[0]);
        data.multiSig.push({
          index: 1,
          hashType: 'cid'
        });
      }
      else if (opcode.equals(OP_CODES[3])) {
        // CID part in null data and part in both first and second keys of multi-sig output
        data.cid = consume(consume(1)[0]);
        data.multiSig.push({
          index: 1,
          hashType: 'cid'
        });
        data.multiSig.push({
          index: 2,
          hashType: 'cid'
        });
      }
      else if (opcode.equals(OP_CODES[4])) {
        // CID in first key of multi-sig output
        data.multiSig.push({
          index: 1,
          hashType: 'cid'
        });
      }
      else if (opcode.equals(OP_CODES[5])) {
        // CID in both first and second keys of multi-sig output
        data.multiSig.push({
          index: 1,
          hashType: 'cid'
        });
        data.multiSig.push({
          index: 2,
          hashType: 'cid'
        });
      }
      else if (!opcode.equals(OP_CODES[6])) {
        throw new Error('Unrecognized Code');
      }
    }
    else {
      if (opcode[0] === OP_CODES[1][0]) {
        data.torrentHash = consume(20)
        data.sha2 = consume(32)
      } else if (opcode[0] === OP_CODES[2][0]) {
        data.torrentHash = consume(20)
        data.multiSig.push({'index': 1, 'hashType': 'sha2'})
      } else if (opcode[0] === OP_CODES[3][0]) {
        data.multiSig.push({'index': 1, 'hashType': 'sha2'})
        data.multiSig.push({'index': 2, 'hashType': 'torrentHash'})
      } else if (opcode[0] === OP_CODES[4][0]) {
        data.torrentHash = consume(20)
      } else if (opcode[0] === OP_CODES[5][0]) {
        data.noRules = true
      } else if (opcode[0] === OP_CODES[6][0]) {
        data.noRules = false
      } else {
        throw new Error('Unrecognized Code')
      }
    }

    data.amount = decodeAmountByVersion(data.version, consume, data.divisibility)
    data.payments = paymentCodex.decodeBulk(consume)

    return data
  }
}
