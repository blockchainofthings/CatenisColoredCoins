var flagMask = 0xe0
var encodingSchemeTable =
[
  {
    'flag': 0x20,
    'exponent': 4,
    'byteSize': 2,
    'mantis': 9
  },
  {
    'flag': 0x40,
    'exponent': 4,
    'byteSize': 3,
    'mantis': 17
  },
  {
    'flag': 0x60,
    'exponent': 4,
    'byteSize': 4,
    'mantis': 25
  },
  {
    'flag': 0x80,
    'exponent': 3,
    'byteSize': 5,
    'mantis': 34
  },
  {
    'flag': 0xa0,
    'exponent': 3,
    'byteSize': 6,
    'mantis': 42
  },
  {
    'flag': 0xc0,
    'exponent': 0,
    'byteSize': 7,
    'mantis': 54
  }
]

var flagLookup = {}
var mantisLookup = {}

for (var i = 0; i < encodingSchemeTable.length; i++) {
  var flagObject = encodingSchemeTable[i]
  flagLookup[flagObject.flag] = flagObject
}
var currentIndex = 0
var currentMantis = encodingSchemeTable[currentIndex].mantis
var endMantis = encodingSchemeTable[encodingSchemeTable.length - 1].mantis

for (var i = 1; i <= endMantis; i++) {
  if (i > currentMantis) {
    currentIndex++
    currentMantis = encodingSchemeTable[currentIndex].mantis
  }
  mantisLookup[i] = encodingSchemeTable[currentIndex]
}

var intToFloatArray = function (number, n) {
  n = n || 0
  return number % 10 ? [number, n] : intToFloatArray(number / 10, n + 1)
}

var padLeadingZeros = function (hex, byteSize) {
  return (hex.length === byteSize * 2) ? hex : padLeadingZeros('0' + hex, byteSize)
}

module.exports = {
  encode: function (number) {
    var buf
    if (number < 0) throw new Error('Number is out of bounds')
    if (number > Number.MAX_SAFE_INTEGER) throw new Error('Number is out of bounds')
    if (number < 32) {
      buf = new Buffer([number])
      return buf
    }
    var floatingNumberArray = intToFloatArray(number)
    while (true) {
      var encodingObject = mantisLookup[floatingNumberArray[0].toString(2).length]
      if (!encodingObject) throw new Error('Number is out of bounds')
      if ((Math.pow(2, encodingObject.exponent) - 1) >= floatingNumberArray[1]) break
      floatingNumberArray[0] *= 10
      floatingNumberArray[1] -= 1
    }
    var shiftedNumber = floatingNumberArray[0] * Math.pow(2, encodingObject.exponent)
    var numberString = padLeadingZeros(shiftedNumber.toString(16), encodingObject.byteSize)
    buf = new Buffer(numberString, 'hex')
    buf[0] = buf[0] | encodingObject.flag
    buf[buf.length - 1] = buf[buf.length - 1] | floatingNumberArray[1]

    return buf
  },

  decode: function (consume) {
    var flagByte = consume(1)[0]
    var flag = flagByte & flagMask
    if (flag === 0) return flagByte
    if (flag === 0xe0) flag = 0xc0
    var encodingObject = flagLookup[flag]
    var headOfNumber = new Buffer([flagByte & (~flag)])
    var tailOfNumber = consume(encodingObject.byteSize - 1)
    var fullNumber = Buffer.concat([headOfNumber, tailOfNumber])
    var number = parseInt(fullNumber.toString('hex'), 16)
    var exponentShift = Math.pow(2, encodingObject.exponent)
    var exponent = number % exponentShift
    var mantis = Math.floor(number / exponentShift)
    return mantis * Math.pow(10, exponent)
  }
}
