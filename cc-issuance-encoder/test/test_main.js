var ccEncoding = require(__dirname + '/../issuanceEncoder')
var assert = require('assert')

var consumer = function (buff) {
  var curr = 0
  return function consume (len) {
    return buff.slice(curr, curr += len)
  }
}

var toBuffer = function (val) {
  val = val.toString(16)
  if (val.length % 2 == 1) {
    val = '0'+val
  }
  return new Buffer(val, 'hex')
}

describe('80 byte OP_RETURN', function() {

  var code
  var decoded
  var torrentHash = new Buffer('46b7e0d000d69330ac1caa48c6559763828762e1', 'hex')
  var sha2 = new Buffer('03ffdf3d6790a21c5fc97a62fe1abc5f66922d7dee3725261ce02e86f078d190', 'hex')
  var data = {
    amount: 15,
    divisibility: 2,
    protocol: 0x4343, // Error when start with 0
    version: 0x02,
    lockStatus: true,
    aggregationPolicy: 'aggregatable',
    payments: []
  }
  data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 15})

  it('Issuance OP_CODE 0x06 - No Metadata, can add rules', function (done) {
    this.timeout(0)

    code = ccEncoding.encode(data, 80)

    console.log(code.codeBuffer.toString('hex'), code.leftover)
    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('06'), consume(1))  //issuance OP_CODE
    assert.deepEqual(toBuffer('0f'), consume(1))  //issue amount
    assert.deepEqual(toBuffer('010f'), consume(2))  //payments
    assert.deepEqual(toBuffer('50'), consume(1))  //divisibility + lockstatus + reserved bits currently 0

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.amount, data.amount)
    assert.equal(decoded.divisibility, data.divisibility)
    assert.equal(decoded.lockStatus, data.lockStatus)
    assert.equal(decoded.protocol, data.protocol)
    assert.deepEqual(decoded.payments, data.payments)
    assert.deepEqual(decoded.multiSig, code.leftover)
    assert.equal(decoded.noRules, false)
    done()
  })


  it('Issuance OP_CODE 0x05 - No Metadata, cannot add rules', function (done) {
    this.timeout(0)

    data.noRules = true

    code = ccEncoding.encode(data, 80)
    console.log(code.codeBuffer.toString('hex'), code.leftover)

    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('05'), consume(1))  //issuance OP_CODE 
    assert.deepEqual(toBuffer('0f'), consume(1))  //issue amount
    assert.deepEqual(toBuffer('010f'), consume(2))  //payments
    assert.deepEqual(toBuffer('50'), consume(1))  //divisibility + lockstatus + reserved bits currently 0

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.amount, data.amount)
    assert.equal(decoded.divisibility, data.divisibility)
    assert.equal(decoded.lockStatus, data.lockStatus)
    assert.equal(decoded.protocol, data.protocol)
    assert.deepEqual(decoded.payments, data.payments)
    assert.deepEqual(decoded.multiSig, code.leftover)
    assert.equal(decoded.noRules, true)

    data.torrentHash = torrentHash
    done()
  })

  it('Issuance OP_CODE 0x04 - SHA1 Torrent Hash in OP_RETURN, No SHA256 of Metadata', function (done) {
    this.timeout(0)

    data.torrentHash = torrentHash

    code = ccEncoding.encode(data, 80)
    console.log(code.codeBuffer.toString('hex'), code.leftover)

    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('04'), consume(1))  //issuance OP_CODE
    assert.deepEqual(toBuffer('46b7e0d000d69330ac1caa48c6559763828762e1'), consume(20))   //torrent hash
    assert.deepEqual(toBuffer('0f'), consume(1))  //issue amount
    assert.deepEqual(toBuffer('010f'), consume(2))  //payments
    assert.deepEqual(toBuffer('50'), consume(1))  //divisibility + lockstatus + reserved bits currently 0

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.amount, data.amount)
    assert.equal(decoded.divisibility, data.divisibility)
    assert.equal(decoded.lockStatus, data.lockStatus)
    assert.equal(decoded.protocol, data.protocol)
    assert.equal(decoded.lockstatus, data.lockstatus)
    assert.deepEqual(decoded.payments, data.payments)
    assert.deepEqual(decoded.multiSig, code.leftover)
    assert.deepEqual(decoded.torrentHash, torrentHash)

    data.torrentHash = torrentHash
    done()
  })

  it('Issuance OP_CODE 0x01 - SHA1 Torrent Hash + SHA256 of metadata in 80 bytes', function (done) {
    this.timeout(0)

    //pushing payments to the limit.
    data.payments = []
    for (var i = 0 ; i < 11 ; i++) {
      data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1})
    }

    data.torrentHash = torrentHash
    data.sha2 = sha2

    code = ccEncoding.encode(data, 80)
    console.log(code.codeBuffer.toString('hex'), code.leftover)

    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('01'), consume(1))  //issuance OP_CODE
    assert.deepEqual(toBuffer('46b7e0d000d69330ac1caa48c6559763828762e1'), consume(20))   //torrent hash
    assert.deepEqual(toBuffer('03ffdf3d6790a21c5fc97a62fe1abc5f66922d7dee3725261ce02e86f078d190'), consume(32))   //metadata sha2
    assert.deepEqual(toBuffer('0f'), consume(1))  //issue amount
    for (var i = 0 ; i < data.payments.length ; i++) {
      assert.deepEqual(toBuffer('0101'), consume(2))    //payment
    }
    assert.deepEqual(toBuffer('50'), consume(1))  //divisibility + lockstatus + reserved bits currently 0

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.amount, data.amount)
    assert.equal(decoded.divisibility, data.divisibility)
    assert.equal(decoded.lockStatus, data.lockStatus)
    assert.equal(decoded.protocol, data.protocol)
    assert.equal(decoded.lockstatus, data.lockstatus)
    assert.deepEqual(decoded.payments, data.payments)
    assert.deepEqual(decoded.multiSig, code.leftover)
    assert.deepEqual(decoded.torrentHash, torrentHash)
    assert.deepEqual(decoded.sha2, sha2)

    data.torrentHash = torrentHash
    done()
  })

  it('Issuance OP_CODE 0x02 - SHA1 Torrent Hash in OP_RETURN, SHA256 of metadata in 1(2) multisig', function (done) {
    this.timeout(0)

    //After previous test, one more will exceed 80 byte.
    data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1})

    data.torrentHash = torrentHash
    data.sha2 = sha2

    code = ccEncoding.encode(data, 80)
    console.log(code.codeBuffer.toString('hex'), code.leftover)

    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('02'), consume(1))  //issuance OP_CODE
    assert.deepEqual(toBuffer('46b7e0d000d69330ac1caa48c6559763828762e1'), consume(20))   //torrent hash
    assert.deepEqual(toBuffer('0f'), consume(1))  //issue amount
    for (var i = 0 ; i < data.payments.length ; i++) {
      assert.deepEqual(toBuffer('0101'), consume(2))    //payment
    }
    assert.deepEqual(toBuffer('50'), consume(1))  //divisibility + lockstatus + reserved bits currently 0

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.amount, data.amount)
    assert.equal(decoded.divisibility, data.divisibility)
    assert.equal(decoded.lockStatus, data.lockStatus)
    assert.equal(decoded.protocol, data.protocol)
    assert.equal(decoded.lockstatus, data.lockstatus)
    assert.deepEqual(decoded.payments, data.payments)
    assert.equal(decoded.multiSig.length, 1)
    assert.equal(decoded.multiSig.length, code.leftover.length)
    assert.deepEqual(decoded.multiSig[0], { hashType: 'sha2', index: 1 })
    assert.deepEqual(code.leftover[0], sha2)
    assert.deepEqual(decoded.torrentHash, torrentHash)

    //had 1 too many bytes to keep SHA2 in 80 byte.
    //this means that we can push up to 31 more bytes to stay with the same OP_CODE (here we push 2 per instruction)
    for (var i = 0 ; i < 15 ; i++) {
      data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1})
    }

    code = ccEncoding.encode(data, 80)
    console.log(code.codeBuffer.toString('hex'), code.leftover)

    consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('02'), consume(1))  //issuance OP_CODE

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)
    assert.equal(decoded.multiSig.length, 1)
    assert.equal(decoded.multiSig.length, code.leftover.length)
    assert.deepEqual(decoded.multiSig[0], { hashType: 'sha2', index: 1 })
    assert.deepEqual(code.leftover[0], sha2)
    assert.deepEqual(decoded.torrentHash, torrentHash)

    done()
  })

  it('Issuance OP_CODE 0x03 - SHA1 Torrent Hash + SHA256 of metadata in 1(3) multisig', function (done) {
    this.timeout(0)

    //we reached limit in previous test, 1 more transfer instruction (2 bytes) should push torrent-hash out.
    data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1})

    data.torrentHash = torrentHash
    data.sha2 = sha2

    code = ccEncoding.encode(data, 80)
    console.log(code.codeBuffer.toString('hex'), code.leftover)

    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('03'), consume(1))  //issuance OP_CODE
    assert.deepEqual(toBuffer('0f'), consume(1))  //issue amount
    for (var i = 0 ; i < data.payments.length ; i++) {
      assert.deepEqual(toBuffer('0101'), consume(2))    //payment
    }
    assert.deepEqual(toBuffer('50'), consume(1))  //divisibility + lockstatus + reserved bits currently 0

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.amount, data.amount)
    assert.equal(decoded.divisibility, data.divisibility)
    assert.equal(decoded.lockStatus, data.lockStatus)
    assert.equal(decoded.protocol, data.protocol)
    assert.equal(decoded.lockstatus, data.lockstatus)
    assert.deepEqual(decoded.payments, data.payments)
    assert.equal(decoded.multiSig.length, 2)
    assert.equal(decoded.multiSig.length, code.leftover.length)
    assert.deepEqual(decoded.multiSig[0], { hashType: 'sha2', index: 1 })
    assert.deepEqual(decoded.multiSig[1], { hashType: 'torrentHash', index: 2 })
    assert.deepEqual(code.leftover[1], sha2)
    assert.deepEqual(code.leftover[0], torrentHash)

    data.torrentHash = torrentHash
    done()
  })

  describe('Catenis Colored Coins (C3) protocol', function () {
    const cid = Buffer.from('1220987b5972d717351b0a1d014d0486697dc6cf7ea427a4d69fc9242642055e1d65', 'hex');
    const data2 = {
      amount: 15,
      divisibility: 2,
      protocol: 0x4333,
      version: 0x02,
      lockStatus: true,
      aggregationPolicy: 'aggregatable',
      payments: []
    };
    data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 15});

    it('Issuance OP_CODE 0x06 - No metadata (no CID)', function (done) {
      this.timeout(0);

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      const consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length));
      assert.deepEqual(toBuffer('4333'), consume(2)); // C3 protocol
      assert.deepEqual(toBuffer('02'), consume(1));   // Version
      assert.deepEqual(toBuffer('06'), consume(1));   // Issuance OP_CODE
      assert.deepEqual(toBuffer('0f'), consume(1));   // Issued amount
      assert.deepEqual(toBuffer('010f'), consume(2)); // Payments
      assert.deepEqual(toBuffer('50'), consume(1));   // Divisibility + lock status + reserved bits currently 0

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.amount, data2.amount);
      assert.equal(decoded.divisibility, data2.divisibility);
      assert.equal(decoded.lockStatus, data2.lockStatus);
      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 0);
      assert.equal(decoded.multiSig.length, code.leftover.length);

      done();
    })

    it('Issuance OP_CODE 0x01 - Whole CID in null data output', function (done) {
      this.timeout(0);

      data2.amount = 32;  // Change amount to occupy 2 bytes so that number of remaining bytes in null data is odd
      data2.cid = cid;

      // Reset payments adding as many as possible to keep metadata (1-byte length + CID) in null data output
      data2.payments = [];
      for (let i = 0 ; i < 19 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      const consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length));
      assert.deepEqual(toBuffer('4333'), consume(2)); // Protocol
      assert.deepEqual(toBuffer('02'), consume(1));   // Version
      assert.deepEqual(toBuffer('01'), consume(1));   // Issuance OP_CODE
      assert.deepEqual(toBuffer(cid.byteLength), consume(1));    // Length of CID
      assert.deepEqual(cid, consume(cid.byteLength));   // CID
      assert.deepEqual(toBuffer('2200'), consume(2));   // Issued amount
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }
      assert.deepEqual(toBuffer('50'), consume(1));   // Divisibility + lock status + reserved bits currently 0

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.amount, data2.amount);
      assert.equal(decoded.divisibility, data2.divisibility);
      assert.equal(decoded.lockStatus, data2.lockStatus);
      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 0);
      assert.equal(decoded.multiSig.length, code.leftover.length);
      assert.deepEqual(decoded.cid, cid);

      done();
    })

    it('Issuance OP_CODE 0x02 - Start of CID in null data output, continuation in single key of multi-sig output (1 out of 2)', function (done) {
      this.timeout(0);

      data2.amount = 31;  // Change amount back to occupy a single byte

      // Add one more payment
      for (let i = 0 ; i < 1 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      const consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length));
      assert.deepEqual(toBuffer('4333'), consume(2)); // Protocol
      assert.deepEqual(toBuffer('02'), consume(1));   // Version
      assert.deepEqual(toBuffer('02'), consume(1));   // Issuance OP_CODE
      assert.deepEqual(toBuffer(cid.byteLength - 1), consume(1));    // Length of CID
      assert.deepEqual(cid.slice(0, cid.byteLength - 1), consume(cid.byteLength - 1));   // 1st part of CID
      assert.deepEqual(toBuffer(31), consume(1));   // Issued amount
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }
      assert.deepEqual(toBuffer('50'), consume(1));   // Divisibility + lock status + reserved bits currently 0

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.amount, data2.amount);
      assert.equal(decoded.divisibility, data2.divisibility);
      assert.equal(decoded.lockStatus, data2.lockStatus);
      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 1);
      assert.equal(decoded.multiSig.length, code.leftover.length);
      assert.deepEqual(decoded.multiSig[0], { hashType: 'cid', index: 1 });
      assert.deepEqual(code.leftover[0], Buffer.concat([toBuffer(1), cid.slice(-1)]));
      assert.deepEqual(decoded.cid, cid.slice(0, cid.byteLength - 1));

      done();
    })

    it('Issuance OP_CODE 0x03 - Start of CID in null data output, continuation in two keys of multi-sig output (1 out of 3)', function (done) {
      this.timeout(0);

      //data2.amount = 31;  // Change amount back to occupy a single byte

      // Reset payments
      data2.payments = [];
      for (let i = 0 ; i < 36 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      const consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length));
      assert.deepEqual(toBuffer('4333'), consume(2)); // Protocol
      assert.deepEqual(toBuffer('02'), consume(1));   // Version
      assert.deepEqual(toBuffer('03'), consume(1));   // Issuance OP_CODE
      assert.deepEqual(toBuffer(1), consume(1));    // Length of CID
      assert.deepEqual(cid.slice(0, 1), consume(1));   // 1st part of CID
      assert.deepEqual(toBuffer(31), consume(1));   // Issued amount
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }
      assert.deepEqual(toBuffer('50'), consume(1));   // Divisibility + lock status + reserved bits currently 0

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.amount, data2.amount);
      assert.equal(decoded.divisibility, data2.divisibility);
      assert.equal(decoded.lockStatus, data2.lockStatus);
      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 2);
      assert.equal(decoded.multiSig.length, code.leftover.length);
      assert.deepEqual(decoded.multiSig[0], { hashType: 'cid', index: 1 });
      assert.deepEqual(decoded.multiSig[1], { hashType: 'cid', index: 2 });
      assert.deepEqual(code.leftover[0], Buffer.concat([toBuffer(33), cid.slice(1, 32)]));
      assert.deepEqual(code.leftover[1], cid.slice(-2));
      assert.deepEqual(decoded.cid, cid.slice(0, 1));

      done();
    })

    it('Issuance OP_CODE 0x04 - Whole CID in single key of multi-sig output (1 out of 2) - Note: this should never happen since smallest size of CID is 34, which does not fit in a single multi-sig key', function (done) {
      this.timeout(0);

      // Simulate a shorter CID (which in practice should never happen)
      data2.cid = cid.slice(0, 31);

      //data2.amount = 31;  // Change amount back to occupy a single byte

      // Reset payments
      data2.payments = [];
      for (let i = 0 ; i < 37 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      const consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length));
      assert.deepEqual(toBuffer('4333'), consume(2)); // Protocol
      assert.deepEqual(toBuffer('02'), consume(1));   // Version
      assert.deepEqual(toBuffer('04'), consume(1));   // Issuance OP_CODE
      assert.deepEqual(toBuffer(31), consume(1));   // Issued amount
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }
      assert.deepEqual(toBuffer('50'), consume(1));   // Divisibility + lock status + reserved bits currently 0

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.amount, data2.amount);
      assert.equal(decoded.divisibility, data2.divisibility);
      assert.equal(decoded.lockStatus, data2.lockStatus);
      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 1);
      assert.equal(decoded.multiSig.length, code.leftover.length);
      assert.deepEqual(decoded.multiSig[0], { hashType: 'cid', index: 1 });
      assert.deepEqual(code.leftover[0], Buffer.concat([toBuffer(31), cid.slice(0, 31)]));
      assert.equal(decoded.cid, undefined);

      done();
    })

    it('Issuance OP_CODE 0x05 - Whole CID in two keys of multi-sig output (1 out of 3)', function (done) {
      this.timeout(0);

      // Reset CID back to normal
      data2.cid = cid;

      //data2.amount = 31;  // Change amount back to occupy a single byte

      // Reset payments
      data2.payments = [];
      for (let i = 0 ; i < 37 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      const consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length));
      assert.deepEqual(toBuffer('4333'), consume(2)); // Protocol
      assert.deepEqual(toBuffer('02'), consume(1));   // Version
      assert.deepEqual(toBuffer('05'), consume(1));   // Issuance OP_CODE
      assert.deepEqual(toBuffer(31), consume(1));   // Issued amount
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }
      assert.deepEqual(toBuffer('50'), consume(1));   // Divisibility + lock status + reserved bits currently 0

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.amount, data2.amount);
      assert.equal(decoded.divisibility, data2.divisibility);
      assert.equal(decoded.lockStatus, data2.lockStatus);
      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 2);
      assert.equal(decoded.multiSig.length, code.leftover.length);
      assert.deepEqual(decoded.multiSig[0], { hashType: 'cid', index: 1 });
      assert.deepEqual(decoded.multiSig[1], { hashType: 'cid', index: 2 });
      assert.deepEqual(code.leftover[0], Buffer.concat([toBuffer(34), cid.slice(0, 31)]));
      assert.deepEqual(code.leftover[1], cid.slice(-3));
      assert.equal(decoded.cid, undefined);

      done();
    })

    it('should fail if CID is too large and won\'t fit', function (done) {
      this.timeout(0);

      // Simulate a larger CID
      data2.cid = Buffer.alloc(64, 0x01);

      //data2.amount = 31;  // Change amount back to occupy a single byte

      // Reset payments
      data2.payments = [];
      for (let i = 0 ; i < 37 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      assert.throws(() => {
        ccEncoding.encode(data2, 80);
      }, new Error('CID too large to fit in transaction'));

      done();
    })
  })
})
