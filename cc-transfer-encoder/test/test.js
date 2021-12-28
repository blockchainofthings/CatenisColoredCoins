var ccEncoding = require(__dirname + '/../transferEncoder')
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
  return Buffer.from(val, 'hex')
}

describe('Colored-Coins transfer Decoding', function () {
  it('should return the right decoding', function (done) {
    this.timeout(0)
    var torrentHash = Buffer.alloc(20)
    torrentHash.fill(0)
    torrentHash[3] = 0x23
    torrentHash[4] = 0x2f
    torrentHash[2] = 0xd3
    torrentHash[12] = 0xe3
    torrentHash[19] = 0xa3
    torrentHash[11] = 0x21
    var sha2 = Buffer.alloc(32)
    sha2.fill(0)
    sha2[0] = 0xf3
    sha2[1] = 0x2f
    sha2[12] = 0x23
    sha2[16] = 0xf3
    sha2[30] = 0x2f
    sha2[21] = 0x23
    sha2[11] = 0x2f
    var data = {
      protocol: 0x0302, // Error when start with 0
      version: 0x03
    }

    data.sha2 = sha2
    data.torrentHash = torrentHash

    data.payments = []
    data.payments.push({skip: false, range: false, percent: true, output: 12, amount: 3213213})
    var result = ccEncoding.encode(data, 40)
    console.log(result.codeBuffer.toString('hex'), result.leftover)
    console.log(ccEncoding.decode(result.codeBuffer))

    data.payments.push({skip: false, range: false, percent: true, output: 1, amount: 321321321})
    result = ccEncoding.encode(data, 40)
    console.log(result.codeBuffer.toString('hex'), result.leftover)
    console.log(ccEncoding.decode(result.codeBuffer))

    data.payments.push({skip: true, range: true, percent: true, output: 10, amount: 1})
    result = ccEncoding.encode(data, 40)
    console.log(result.codeBuffer.toString('hex'), result.leftover)
    console.log(ccEncoding.decode(result.codeBuffer))

    data.payments.push({skip: false, range: false, percent: true, output: 20, amount: 100000021000})
    result = ccEncoding.encode(data, 40)
    console.log(result.codeBuffer.toString('hex'), result.leftover)
    console.log(ccEncoding.decode(result.codeBuffer))

    data.payments.push({skip: false, range: false, percent: false, output: 0, amount: 1})
    data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 2})
    data.payments.push({skip: true, range: false, percent: false, output: 2, amount: 3})
    data.payments.push({skip: false, range: false, percent: false, output: 3, amount: 4})
    data.payments.push({skip: true, range: false, percent: false, output: 4, amount: 5})
    data.payments.push({skip: false, range: false, percent: false, output: 5, amount: 6})

    result = ccEncoding.encode(data, 40)
    console.log(result.codeBuffer.toString('hex'), result.leftover)
    console.log(ccEncoding.decode(result.codeBuffer))

    // check throws when pushing burn to a default transfer transaction
    assert.throws(function () {
      data.payments.push({skip: false, percent: false, amount: 7, burn: true})
      ccEncoding.encode(data, 40)
    }, /Needs output value/,
    'Should Throw Error')

    // now no error
    data.type = 'burn'
    result = ccEncoding.encode(data, 40)

    delete data.allowMeta
    data.payments = []
    data.payments.push({skip: false, range: false, percent: true, output: 12, amount: 3213213})
    result = ccEncoding.encode(data, 40)
    console.log(result.codeBuffer.toString('hex'), result.leftover)
    console.log(ccEncoding.decode(result.codeBuffer))
    done()
  })
})

describe('80 byte OP_RETURN', function () {
  var code
  var decoded
  var torrentHash = Buffer.from('46b7e0d000d69330ac1caa48c6559763828762e1', 'hex')
  var sha2 = Buffer.from('03ffdf3d6790a21c5fc97a62fe1abc5f66922d7dee3725261ce02e86f078d190', 'hex')
  var data = {
    protocol: 0x4343,
    version: 0x02,
    payments: []
  }
  data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 31})

  it('Transfer OP_CODE 0x15 - No Metadata', function (done) {
    this.timeout(0)

    code = ccEncoding.encode(data, 80)    

    console.log(code.codeBuffer.toString('hex'), code.leftover)
    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('15'), consume(1))  //trasnfer OP_CODE
    assert.deepEqual(toBuffer('011f'), consume(2))  //payments

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.protocol, data.protocol)
    assert.deepEqual(decoded.payments, data.payments)
    assert.deepEqual(decoded.multiSig, code.leftover)
    done()
  })

  it('Transfer OP_CODE 0x14 - SHA1 Torrent hash in OP_RETURN, no SHA256 of metadata, no rules in metadata', function (done) {
    this.timeout(0)

    data.torrentHash = torrentHash
    data.noRules = true

    code = ccEncoding.encode(data, 80)    

    console.log(code.codeBuffer.toString('hex'), code.leftover)
    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('14'), consume(1))  //trasnfer OP_CODE
    assert.deepEqual(toBuffer('46b7e0d000d69330ac1caa48c6559763828762e1'), consume(20))   //torrent hash
    assert.deepEqual(toBuffer('011f'), consume(2))  //payments

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.protocol, data.protocol)
    assert.deepEqual(decoded.payments, data.payments)
    assert.deepEqual(decoded.multiSig, code.leftover)
    assert.deepEqual(decoded.torrentHash, torrentHash)
    done()
  })

  it('Transfer OP_CODE 0x13 - SHA1 Torrent hash in OP_RETURN, no SHA256 of metadata', function (done) {
    this.timeout(0)

    data.torrentHash = torrentHash
    delete data.noRules

    code = ccEncoding.encode(data, 80)    

    console.log(code.codeBuffer.toString('hex'), code.leftover)
    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('13'), consume(1))  //trasnfer OP_CODE
    assert.deepEqual(toBuffer('46b7e0d000d69330ac1caa48c6559763828762e1'), consume(20))   //torrent hash
    assert.deepEqual(toBuffer('011f'), consume(2))  //payments

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.protocol, data.protocol)
    assert.deepEqual(decoded.payments, data.payments)
    assert.deepEqual(decoded.multiSig, code.leftover)
    assert.deepEqual(decoded.torrentHash, torrentHash)
    done()
  })

  it('Transfer OP_CODE 0x10 - SHA1 Torrent hash + SHA256 of metadata in OP_RETURN', function (done) {
    this.timeout(0)

    //pushing payments to the limit.
    data.payments = []
    for (var i = 0 ; i < 12 ; i++) {
      data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1})
    }

    data.torrentHash = torrentHash
    data.sha2 = sha2

    code = ccEncoding.encode(data, 80)    

    console.log(code.codeBuffer.toString('hex'), code.leftover)
    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('10'), consume(1))  //trasnfer OP_CODE
    assert.deepEqual(toBuffer('46b7e0d000d69330ac1caa48c6559763828762e1'), consume(20))   //torrent hash
    assert.deepEqual(toBuffer('03ffdf3d6790a21c5fc97a62fe1abc5f66922d7dee3725261ce02e86f078d190'), consume(32))   //metadata sha2
    for (var i = 0 ; i < data.payments.length ; i++) {
      assert.deepEqual(toBuffer('0101'), consume(2))    //payment
    }

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.protocol, data.protocol)
    assert.deepEqual(decoded.payments, data.payments)
    assert.deepEqual(decoded.multiSig, code.leftover)
    assert.deepEqual(decoded.torrentHash, torrentHash)
    assert.deepEqual(decoded.sha2, sha2)
    done()
  })

  it('Transfer OP_CODE 0x11 - SHA1 Torrent hash in OP_RETURN, SHA256 in 1(2) multisig', function (done) {
    this.timeout(0)

    //1 more transfer instruction (2 bytes in this case) should push torrent hash out
    data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1})

    code = ccEncoding.encode(data, 80)    

    console.log(code.codeBuffer.toString('hex'), code.leftover)
    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('11'), consume(1))  //trasnfer OP_CODE
    assert.deepEqual(toBuffer('46b7e0d000d69330ac1caa48c6559763828762e1'), consume(20))   //torrent hash
    assert.deepEqual(toBuffer('0101'), consume(2))  //payments

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.protocol, data.protocol)
    assert.deepEqual(decoded.payments, data.payments)
    assert.equal(decoded.multiSig.length, 1)
    assert.equal(decoded.multiSig.length, code.leftover.length)
    assert.deepEqual(decoded.multiSig[0], { hashType: 'sha2', index: 1 })
    assert.deepEqual(code.leftover[0], sha2)
    assert.deepEqual(decoded.torrentHash, torrentHash)
    done()
  })

  it('Transfer OP_CODE 0x12 - SHA1 Torrent hash + SHA256 in 1(3) multisig', function (done) {
    this.timeout(0)

    //32 more bytes (16 of 2 bytes each in this case) should push torrent hash out
    for (var i = 0 ; i < 16 ; i++) {
      data.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1})
    }

    code = ccEncoding.encode(data, 80)    

    console.log(code.codeBuffer.toString('hex'), code.leftover)
    var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
    assert.deepEqual(toBuffer('4343'), consume(2))
    assert.deepEqual(toBuffer('02'), consume(1))  //version
    assert.deepEqual(toBuffer('12'), consume(1))  //trasnfer OP_CODE
    for (var i = 0 ; i < data.payments.length ; i++) {
      assert.deepEqual(toBuffer('0101'), consume(2))    //payment
    }

    decoded = ccEncoding.decode(code.codeBuffer)
    console.log(decoded)

    assert.equal(decoded.protocol, data.protocol)
    assert.deepEqual(decoded.payments, data.payments)
    assert.equal(decoded.multiSig.length, 2)
    assert.equal(decoded.multiSig.length, code.leftover.length)
    assert.deepEqual(decoded.multiSig[0], { hashType: 'sha2', index: 1 })
    assert.deepEqual(decoded.multiSig[1], { hashType: 'torrentHash', index: 2 })
    assert.deepEqual(code.leftover[1], sha2)
    assert.deepEqual(code.leftover[0], torrentHash)
    done()
  })


  describe('Catenis Colored Coins (C3) protocol', function () {
    const cid = Buffer.from('1220987b5972d717351b0a1d014d0486697dc6cf7ea427a4d69fc9242642055e1d65', 'hex');
    const data2 = {
      protocol: 0x4333,
      version: 0x02,
      payments: []
    };
    data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 31});

    it('Transfer OP_CODE 0x15 - No metadata (no CID)', function (done) {
      this.timeout(0)

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
      assert.deepEqual(toBuffer('4333'), consume(2))  // Protocol
      assert.deepEqual(toBuffer('02'), consume(1))    // Version
      assert.deepEqual(toBuffer('15'), consume(1))    // Trasnfer OP_CODE
      assert.deepEqual(toBuffer('011f'), consume(2))  // Payments

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 0);
      assert.equal(decoded.multiSig.length, code.leftover.length);

      done();
    })

    it('Transfer OP_CODE 0x10 - whole CID in null data output', function (done) {
      this.timeout(0)

      data2.cid = cid;

      // Reset payments adding as many as possible to keep metadata (1-byte length + CID) in null data output
      data2.payments = [];
      for (let i = 0 ; i < 20 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
      assert.deepEqual(toBuffer('4333'), consume(2))  // Protocol
      assert.deepEqual(toBuffer('02'), consume(1))    // Version
      assert.deepEqual(toBuffer('10'), consume(1))    // Trasnfer OP_CODE
      assert.deepEqual(toBuffer(cid.byteLength), consume(1));    // Length of CID
      assert.deepEqual(cid, consume(cid.byteLength));   // CID
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 0);
      assert.equal(decoded.multiSig.length, code.leftover.length);
      assert.deepEqual(decoded.cid, cid);

      done();
    })

    it('Transfer OP_CODE 0x11 - Start of CID in null data output, continuation in single key of multi-sig output (1 out of 2)', function (done) {
      this.timeout(0);

      // Add one more payment
      for (let i = 0; i < 1; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
      assert.deepEqual(toBuffer('4333'), consume(2))  // Protocol
      assert.deepEqual(toBuffer('02'), consume(1))    // Version
      assert.deepEqual(toBuffer('11'), consume(1))    // Trasnfer OP_CODE
      assert.deepEqual(toBuffer(cid.byteLength - 1), consume(1));    // Length of CID
      assert.deepEqual(cid.slice(0, cid.byteLength - 1), consume(cid.byteLength - 1));   // 1st part of CID
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 1);
      assert.equal(decoded.multiSig.length, code.leftover.length);
      assert.deepEqual(decoded.multiSig[0], { hashType: 'cid', index: 1 });
      assert.deepEqual(code.leftover[0], Buffer.concat([toBuffer(1), cid.slice(-1)]));
      assert.deepEqual(decoded.cid, cid.slice(0, cid.byteLength - 1));

      done();
    })

    it('Transfer OP_CODE 0x12 - Start of CID in null data output, continuation in two keys of multi-sig output (1 out of 3)', function (done) {
      this.timeout(0);

      // Reset payments
      data2.payments = [];
      for (let i = 0 ; i < 37 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
      assert.deepEqual(toBuffer('4333'), consume(2))  // Protocol
      assert.deepEqual(toBuffer('02'), consume(1))    // Version
      assert.deepEqual(toBuffer('12'), consume(1))    // Trasnfer OP_CODE
      assert.deepEqual(toBuffer(1), consume(1));    // Length of CID
      assert.deepEqual(cid.slice(0, 1), consume(1));   // 1st part of CID
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

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

    it('Transfer OP_CODE 0x13 - Whole CID in single key of multi-sig output (1 out of 2) - Note: this should never happen since smallest size of CID is 34, which does not fit in a single multi-sig key', function (done) {
      this.timeout(0);

      // Simulate a shorter CID (which in practice should never happen)
      data2.cid = cid.slice(0, 31);

      // Reset payments
      data2.payments = [];
      for (let i = 0 ; i < 38 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
      assert.deepEqual(toBuffer('4333'), consume(2))  // Protocol
      assert.deepEqual(toBuffer('02'), consume(1))    // Version
      assert.deepEqual(toBuffer('13'), consume(1))    // Trasnfer OP_CODE
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

      assert.equal(decoded.protocol, data2.protocol);
      assert.deepEqual(decoded.payments, data2.payments);
      assert.equal(decoded.multiSig.length, 1);
      assert.equal(decoded.multiSig.length, code.leftover.length);
      assert.deepEqual(decoded.multiSig[0], { hashType: 'cid', index: 1 });
      assert.deepEqual(code.leftover[0], Buffer.concat([toBuffer(31), cid.slice(0, 31)]));
      assert.equal(decoded.cid, undefined);

      done();
    })

    it('Transfer OP_CODE 0x14 - Whole CID in two keys of multi-sig output (1 out of 3)', function (done) {
      this.timeout(0);

      // Reset CID back to normal
      data2.cid = cid;

      // Reset payments
      data2.payments = [];
      for (let i = 0 ; i < 38 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      code = ccEncoding.encode(data2, 80);
      console.log(code.codeBuffer.toString('hex'), code.codeBuffer.byteLength, code.leftover);

      var consume = consumer(code.codeBuffer.slice(0, code.codeBuffer.length))
      assert.deepEqual(toBuffer('4333'), consume(2))  // Protocol
      assert.deepEqual(toBuffer('02'), consume(1))    // Version
      assert.deepEqual(toBuffer('14'), consume(1))    // Trasnfer OP_CODE
      for (var i = 0 ; i < data2.payments.length ; i++) {
        assert.deepEqual(toBuffer('0101'), consume(2));   // Payment
      }

      decoded = ccEncoding.decode(code.codeBuffer);
      console.log(decoded);

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

      // Reset payments
      data2.payments = [];
      for (let i = 0 ; i < 38 ; i++) {
        data2.payments.push({skip: false, range: false, percent: false, output: 1, amount: 1});
      }

      assert.throws(() => {
        ccEncoding.encode(data2, 80);
      }, new Error('CID too large to fit in transaction'));

      done();
    })
  })
})
