const C3_PROTOCOL = 0x4333;   // Catenis Colored Coins (C3) protocol
var aggregationPolicies = [
  'aggregatable',
  'hybrid',
  'dispersed'
]
let c3AggregationPolicies;

function getAggregationPolicies(protocol) {
  if (protocol === C3_PROTOCOL) {
    if (!c3AggregationPolicies) {
      // Include non-fungible token aggregation policy for the Catenis Colored Coins (C3) protocol
      c3AggregationPolicies = aggregationPolicies.concat(['nonFungible']);
    }
    return c3AggregationPolicies;
  }

  return aggregationPolicies;
}

var padLeadingZeros = function (hex, byteSize) {
  return (hex.length === byteSize * 2) && hex || padLeadingZeros('0' + hex, byteSize)
}

module.exports = {
  encode: function (flags, protocol) {
    var divisibility = flags.divisibility || 0
    var lockStatus = flags.lockStatus || false
    var aggregationPolicy = flags.aggregationPolicy || getAggregationPolicies(protocol)[0]
    if (divisibility < 0 || divisibility > 7) throw new Error('Divisibility not in range')
    if ((aggregationPolicy = getAggregationPolicies(protocol).indexOf(aggregationPolicy)) < 0) throw new Error('Invalid aggregation policy')
    var result = divisibility << 1
    var lockStatusFlag = 0
    lockStatus && (lockStatusFlag = 1)
    result = result | lockStatusFlag
    result = result << 2
    result = result | aggregationPolicy
    result = result << 2
    result = padLeadingZeros(result.toString(16), 1)
    return Buffer.from(result, 'hex')
  },

  decode: function (consume, protocol) {
    var number = consume(1)[0]
    number = number >> 2  // least significant 2 bits unused
    var aggregationPolicy = getAggregationPolicies(protocol)[number & 0x3]
    number = number >> 2
    var lockStatus = !!(number & 1)
    number = number >> 1
    var divisibility = (number & 0x7)
    return {divisibility: divisibility, lockStatus: lockStatus, aggregationPolicy: aggregationPolicy}
  }
}
