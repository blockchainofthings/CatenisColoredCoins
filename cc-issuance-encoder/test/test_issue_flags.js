var ccEncoding = require(__dirname + '/../issueFlagsEncoder')
var assert = require('assert')

const C3_PROTOCOL = 0x4333;   // Catenis Colored Coins (C3) protocol

var consumer = function (buff) {
  var curr = 0
  return function consume (len) {
    return buff.slice(curr, curr += len)
  }
}

describe('Test issue flags encoder', function () {
  it('should return the right decoding', function (done) {
    this.timeout(0)
    var testCase = [
      {divisibility: 0, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 1, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 2, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 3, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 4, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 5, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 6, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 7, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 0, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 1, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 2, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 3, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 4, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 5, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 6, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 7, lockStatus: true, aggregationPolicy: 'aggregatable'},

      {divisibility: 0, lockStatus: false, aggregationPolicy: 'hybrid'},
      {divisibility: 1, lockStatus: false, aggregationPolicy: 'hybrid'},
      {divisibility: 2, lockStatus: false, aggregationPolicy: 'hybrid'},
      {divisibility: 3, lockStatus: false, aggregationPolicy: 'hybrid'},
      {divisibility: 4, lockStatus: false, aggregationPolicy: 'hybrid'},
      {divisibility: 5, lockStatus: false, aggregationPolicy: 'hybrid'},
      {divisibility: 6, lockStatus: false, aggregationPolicy: 'hybrid'},
      {divisibility: 7, lockStatus: false, aggregationPolicy: 'hybrid'},
      {divisibility: 0, lockStatus: true, aggregationPolicy: 'hybrid'},
      {divisibility: 1, lockStatus: true, aggregationPolicy: 'hybrid'},
      {divisibility: 2, lockStatus: true, aggregationPolicy: 'hybrid'},
      {divisibility: 3, lockStatus: true, aggregationPolicy: 'hybrid'},
      {divisibility: 4, lockStatus: true, aggregationPolicy: 'hybrid'},
      {divisibility: 5, lockStatus: true, aggregationPolicy: 'hybrid'},
      {divisibility: 6, lockStatus: true, aggregationPolicy: 'hybrid'},
      {divisibility: 7, lockStatus: true, aggregationPolicy: 'hybrid'},

      {divisibility: 0, lockStatus: false, aggregationPolicy: 'dispersed'},
      {divisibility: 1, lockStatus: false, aggregationPolicy: 'dispersed'},
      {divisibility: 2, lockStatus: false, aggregationPolicy: 'dispersed'},
      {divisibility: 3, lockStatus: false, aggregationPolicy: 'dispersed'},
      {divisibility: 4, lockStatus: false, aggregationPolicy: 'dispersed'},
      {divisibility: 5, lockStatus: false, aggregationPolicy: 'dispersed'},
      {divisibility: 6, lockStatus: false, aggregationPolicy: 'dispersed'},
      {divisibility: 7, lockStatus: false, aggregationPolicy: 'dispersed'},
      {divisibility: 0, lockStatus: true, aggregationPolicy: 'dispersed'},
      {divisibility: 1, lockStatus: true, aggregationPolicy: 'dispersed'},
      {divisibility: 2, lockStatus: true, aggregationPolicy: 'dispersed'},
      {divisibility: 3, lockStatus: true, aggregationPolicy: 'dispersed'},
      {divisibility: 4, lockStatus: true, aggregationPolicy: 'dispersed'},
      {divisibility: 5, lockStatus: true, aggregationPolicy: 'dispersed'},
      {divisibility: 6, lockStatus: true, aggregationPolicy: 'dispersed'},
      {divisibility: 7, lockStatus: true, aggregationPolicy: 'dispersed'},
    ]

    for (var i = 0; i < testCase.length; i++) {
      var code = ccEncoding.encode(testCase[i])
      var decode = ccEncoding.decode(consumer(code))
      assert.equal(decode.divisibility, testCase[i].divisibility, 'Divisibility encode has problems')
      assert.equal(decode.lockStatus, testCase[i].lockStatus, 'LockStatus encode has problems')
      assert.equal(decode.aggregationPolicy, testCase[i].aggregationPolicy, 'Aggregate policy has problems')
    }

    done()
  })

  it('should fail for wrong divisibility', function (done) {
    this.timeout(0)
    var testCase = [
      {divisibility: 8, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 8, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 82, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 21, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: -8, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: 0xff, lockStatus: false, aggregationPolicy: 'aggregatable'},
      {divisibility: 1000, lockStatus: true, aggregationPolicy: 'aggregatable'},
      {divisibility: -1, lockStatus: false, aggregationPolicy: 'aggregatable'}
    ]

    for (var i = 0; i < testCase.length; i++) {
      assert.throws(function () {
        ccEncoding.encode(testCase[i])
      }, new Error('Divisibility not in range')
      , 'Wrong fail')
    }

    done()
  })

  it('should fail for invalid aggregation policy', function (done) {
    this.timeout(0)
    var testCase = [
      //aggregatable typos are on purpose...
      {divisibility: 2, lockStatus: false, aggregationPolicy: 1},
      {divisibility: 3, lockStatus: true, aggregationPolicy: 2},
      {divisibility: 4, lockStatus: false, aggregationPolicy: 'AGGREGATABL'},
      {divisibility: 5, lockStatus: true, aggregationPolicy: 'aggregat'},
      {divisibility: 0, lockStatus: true, aggregationPolicy: 'nonFungible'}
    ]

    for (var i = 0; i < testCase.length; i++) {
      assert.throws(function () {
        ccEncoding.encode(testCase[i])
      }, 
      /Invalid aggregation policy/,
      'Wrong fail')
    }

    done()
  })

  describe('Catenis Colored Coins (C3) protocol', function () {
    it('should return the right decoding', function (done) {
      this.timeout(0);
      const testCase = [
        {divisibility: 0, lockStatus: false, aggregationPolicy: 'aggregatable'},
        {divisibility: 1, lockStatus: false, aggregationPolicy: 'aggregatable'},
        {divisibility: 2, lockStatus: false, aggregationPolicy: 'aggregatable'},
        {divisibility: 3, lockStatus: false, aggregationPolicy: 'aggregatable'},
        {divisibility: 4, lockStatus: false, aggregationPolicy: 'aggregatable'},
        {divisibility: 5, lockStatus: false, aggregationPolicy: 'aggregatable'},
        {divisibility: 6, lockStatus: false, aggregationPolicy: 'aggregatable'},
        {divisibility: 7, lockStatus: false, aggregationPolicy: 'aggregatable'},
        {divisibility: 0, lockStatus: true, aggregationPolicy: 'aggregatable'},
        {divisibility: 1, lockStatus: true, aggregationPolicy: 'aggregatable'},
        {divisibility: 2, lockStatus: true, aggregationPolicy: 'aggregatable'},
        {divisibility: 3, lockStatus: true, aggregationPolicy: 'aggregatable'},
        {divisibility: 4, lockStatus: true, aggregationPolicy: 'aggregatable'},
        {divisibility: 5, lockStatus: true, aggregationPolicy: 'aggregatable'},
        {divisibility: 6, lockStatus: true, aggregationPolicy: 'aggregatable'},
        {divisibility: 7, lockStatus: true, aggregationPolicy: 'aggregatable'},

        {divisibility: 0, lockStatus: false, aggregationPolicy: 'hybrid'},
        {divisibility: 1, lockStatus: false, aggregationPolicy: 'hybrid'},
        {divisibility: 2, lockStatus: false, aggregationPolicy: 'hybrid'},
        {divisibility: 3, lockStatus: false, aggregationPolicy: 'hybrid'},
        {divisibility: 4, lockStatus: false, aggregationPolicy: 'hybrid'},
        {divisibility: 5, lockStatus: false, aggregationPolicy: 'hybrid'},
        {divisibility: 6, lockStatus: false, aggregationPolicy: 'hybrid'},
        {divisibility: 7, lockStatus: false, aggregationPolicy: 'hybrid'},
        {divisibility: 0, lockStatus: true, aggregationPolicy: 'hybrid'},
        {divisibility: 1, lockStatus: true, aggregationPolicy: 'hybrid'},
        {divisibility: 2, lockStatus: true, aggregationPolicy: 'hybrid'},
        {divisibility: 3, lockStatus: true, aggregationPolicy: 'hybrid'},
        {divisibility: 4, lockStatus: true, aggregationPolicy: 'hybrid'},
        {divisibility: 5, lockStatus: true, aggregationPolicy: 'hybrid'},
        {divisibility: 6, lockStatus: true, aggregationPolicy: 'hybrid'},
        {divisibility: 7, lockStatus: true, aggregationPolicy: 'hybrid'},

        {divisibility: 0, lockStatus: false, aggregationPolicy: 'dispersed'},
        {divisibility: 1, lockStatus: false, aggregationPolicy: 'dispersed'},
        {divisibility: 2, lockStatus: false, aggregationPolicy: 'dispersed'},
        {divisibility: 3, lockStatus: false, aggregationPolicy: 'dispersed'},
        {divisibility: 4, lockStatus: false, aggregationPolicy: 'dispersed'},
        {divisibility: 5, lockStatus: false, aggregationPolicy: 'dispersed'},
        {divisibility: 6, lockStatus: false, aggregationPolicy: 'dispersed'},
        {divisibility: 7, lockStatus: false, aggregationPolicy: 'dispersed'},
        {divisibility: 0, lockStatus: true, aggregationPolicy: 'dispersed'},
        {divisibility: 1, lockStatus: true, aggregationPolicy: 'dispersed'},
        {divisibility: 2, lockStatus: true, aggregationPolicy: 'dispersed'},
        {divisibility: 3, lockStatus: true, aggregationPolicy: 'dispersed'},
        {divisibility: 4, lockStatus: true, aggregationPolicy: 'dispersed'},
        {divisibility: 5, lockStatus: true, aggregationPolicy: 'dispersed'},
        {divisibility: 6, lockStatus: true, aggregationPolicy: 'dispersed'},
        {divisibility: 7, lockStatus: true, aggregationPolicy: 'dispersed'},

        {divisibility: 0, lockStatus: false, aggregationPolicy: 'nonFungible'},
        {divisibility: 0, lockStatus: true, aggregationPolicy: 'nonFungible'}
      ];

      for (let i = 0; i < testCase.length; i++) {
        const code = ccEncoding.encode(testCase[i], C3_PROTOCOL);
        const decode = ccEncoding.decode(consumer(code), C3_PROTOCOL);
        assert.equal(decode.divisibility, testCase[i].divisibility, 'Divisibility encode has problems');
        assert.equal(decode.lockStatus, testCase[i].lockStatus, 'LockStatus encode has problems');
        assert.equal(decode.aggregationPolicy, testCase[i].aggregationPolicy, 'Aggregate policy has problems');
      }

      done();
    })
  })
})
