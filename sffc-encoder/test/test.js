var balz = require(__dirname + '/../sffcEncoder')
var assert = require('assert')
var fullRunLength = 1000000
var maxNumber = 9007199254740991
var samples = [
  1,
  1200032,
  1232,
  1002000000,
  928867423145164,
  132300400000,
  1323004030000,
  32300400400,
  2300400002,
  100000000000,
  100001000000,
  110000000010000,
  1768474864449384,
  7684748644493848,
  1111111111111111,
  1222222222222222,
  1333333333333333,
  3333333333232323,
  2343241324231432,
  9007199254740991,
  4823750656226800
]

var consumer = function (buff) {
  var curr = 0
  return function consume (len) {
    return buff.slice(curr, curr += len)
  }
}

describe('One byte encoding', function () {
  it('should return the right encoding for numbers 0-31', function (done) {
    this.timeout(0)
    var labz_code
    for (var i = 0; i < 32; i++) {
      labz_code = balz.encode(i)
      var buf = new Buffer([i])
      assert.equal(labz_code.length, 1, 'Wrong encoding length')
      assert.equal(labz_code.toString('hex'), buf.toString('hex'), 'Wrong encoding')
    }
    done()
  })
})

describe('Encode/Decode', function (done) {
  it('should decode encoded numbers correctly for all numbers between 0 to ' + fullRunLength, function (done) {
    this.timeout(0)
    for (var i = 0; i < fullRunLength; i++) {
      var labz_code = balz.encode(i)
      assert.equal(balz.decode(consumer(labz_code)), i, 'Wrong encode/decode fullRunLength')
    }
    done()
  })
  it('should decode encoded numbers correctly for sample run', function (done) {
    this.timeout(0)
    for (var i = 0; i < samples.length; i++) {
      var labz_code = balz.encode(samples[i])
      assert.equal(balz.decode(consumer(labz_code)), samples[i], 'Wrong encode/decode sample')
    }
    done()
  })
  it('should decode encoded numbers correctly for ' + fullRunLength + ' random numbers in the allowed range', function (done) {
    this.timeout(0)
    for (var i = 0; i < fullRunLength; i++) {
      var number = Math.floor(Math.random() * maxNumber) + 1
      var labz_code = balz.encode(number)
      assert.equal(balz.decode(consumer(labz_code)), number, 'Wrong encode/decode random')
    }
    done()
  })
})

describe('Should return errors', function (done) {
  it('Should throw errors', function (done) {
    this.timeout(0)
    samples = [9007199254740992, 10000000000000000000, -132, -1231]
    for (var i = 0; i < samples.length; i++) {
      assert.throws(function () {
        balz.encode(samples[i])
      }
      , 'Number is out of bounds'
      , 'Out of bound number should throw new error')
    }
    done()
  })
})
