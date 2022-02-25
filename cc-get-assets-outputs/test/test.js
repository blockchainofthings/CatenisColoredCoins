/* eslint-env mocha */
var path = require('path')
var get_assets_outputs = require(path.join(__dirname, '../index.js'))
var assert = require('assert')
var bitcoin = require('bitcoinjs-lib')

const C3_PROTOCOL = 0x4333;   // Catenis Colored Coins (C3) protocol

var issuanceTx = {
  'vin': [
    {
      'assets': []
    },
    {
      'assets': []
    }
  ],
  'vout': [{},{},{}],
  'ccdata': [
    {
      'payments': [
        {
          'input': 0,
          'amount': 10,
          'output': 0,
          'range': false,
          'percent': false
        },
        {
          'input': 0,
          'amount': 6,
          'output': 0,
          'range': false,
          'percent': false
        },
        {
          'input': 0,
          'amount': 7,
          'output': 1,
          'range': false,
          'percent': false
        }
      ],
      'protocol': 0x4343,
      'version': 2,
      'type': 'issuance',
      'lockStatus': false,
      'aggregationPolicy': 'dispersed',
      'amount': 25,
      'multiSig': []
    }
  ]
}

var transferTx = {
  'vin': [
    {
      'assets': [
        {
          'assetId': 'A',
          'amount': 10,
          'issueTxid': 'aaa',
          'divisibility': 0,
          'lockStatus': false,
          'aggregationPolicy': 'aggregatable'
        },
        {
          'assetId': 'A',
          'amount': 5,
          'issueTxid': 'aaa',
          'divisibility': 0,
          'lockStatus': false,
          'aggregationPolicy': 'aggregatable'
        }
      ]
    },
    {
      'assets': [
        {
          'assetId': 'A',
          'amount': 6,
          'issueTxid': 'aaa',
          'divisibility': 0,
          'lockStatus': false,
          'aggregationPolicy': 'aggregatable'
        }
      ]
    }
  ],
  'vout': [{},{},{}],
  'ccdata': [
    {
      'payments': [
        {
          'input': 0,
          'amount': 10,
          'output': 0,
          'range': false,
          'percent': false
        },
        {
          'input': 0,
          'amount': 5,
          'output': 0,
          'range': false,
          'percent': false
        },
        {
          'input': 1,
          'amount': 4,
          'output': 2,
          'range': false,
          'percent': false
        }
      ],
      'protocol': 0x4343,
      'version': 1,
      'type': 'transfer',
      'multiSig': [
      ]
    }
  ]
}

it('Issuance - should transfer the correct amounts, split according to payments', function (done) {
  var res = get_assets_outputs(issuanceTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(Array.isArray(res[0]), true)
  assert.equal(res[0].length, 2)
  assert.equal(res[0][0].amount, 10)
  assert.equal(res[0][1].amount, 6)
  assert.equal(Array.isArray(res[1]), true)
  assert.equal(res[1].length, 1)
  assert.equal(res[1][0].amount, 7)
  assert.equal(Array.isArray(res[2]), true)
  assert.equal(res[2].length, 1)
  assert.equal(res[2][0].amount, 2)
  done()
})

it('Issuance - should transfer entire amount to last output when overflow in total amount in payments', function (done) {
  issuanceTx.ccdata[0].payments = [
    {
      'input': 0,
      'amount': 100,
      'output': 0,
      'range': false,
      'percent': false
    }
  ]
  var res = get_assets_outputs(issuanceTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(res[2].length, 1)
  assert.equal(res[2][0].amount, 25)
  assert.equal(issuanceTx.overflow, true)
  done()
})

it('Issuance - should transfer entire amount to last output there is overflow in total amount, even when first payments can be satisfied', function (done) {
  issuanceTx.ccdata[0].payments = [
    {
      'input': 0,
      'amount': 10,
      'output': 0,
      'range': false,
      'percent': false
    },
    {
      'input': 0,
      'amount': 90,
      'output': 0,
      'range': false,
      'percent': false
    }
  ]
  var res = get_assets_outputs(issuanceTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(res[0], null)
  assert.equal(res[1], null)
  assert.equal(res[2].length, 1)
  assert.equal(res[2][0].amount, 25)
  done()
})

it('Transfer - should transfer the correct amounts, split according to payments (even when asset is aggregatable)', function (done) {
  var res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(res[0].length, 2)
  assert.equal(res[0][0].amount, 10)
  assert.equal(res[0][1].amount, 5)
  assert.equal(res[2].length, 2)
  assert.equal(res[2][0].amount, 4)
  assert.equal(res[2][1].amount, 2)
  done()
})

it('Transfer - should transfer the entire amount to last output, when there is an overflow in total amount. If assets are aggregatable - should aggregate them together.', function (done) {
  transferTx.ccdata[0].payments = [
    {
      'input': 0,
      'amount': 100,
      'output': 0,
      'range': false,
      'percent': false
    }
  ]
  var res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(Array.isArray(res[2]), true)
  assert.equal(res[2].length, 1)
  assert.equal(res[2][0].amount, 21)
  assert.equal(issuanceTx.overflow, true)
  done()
})

it('Transfer - should transfer correct amounts, when there is an overflow to the same aggregatable assetId asset with a different input', function (done) {
  transferTx.ccdata[0].payments = [
    {
      'input': 0,
      'amount': 10,
      'output': 0,
      'range': false,
      'percent': false
    },
    {
      'input': 0,
      'amount': 10, // that's an overflow, but to the same aggregatable asset-id within the next input
      'output': 2,
      'range': false,
      'percent': false
    }
  ]
  var res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(Array.isArray(res[0]), true)
  assert.equal(res[0].length, 1)
  assert.equal(res[0][0].amount, 10)
  assert.equal(Array.isArray(res[2]), true)
  assert.equal(res[2].length, 2)
  assert.equal(res[2][0].amount, 10) // aggregate
  assert.equal(res[2][1].amount, 1)  // change - we keep it separated because we respect the payment
  done()
})

it('Transfer - should transfer correct amounts, when there is an overflow to the same aggregatable assetId asset within the same input', function (done) {
  transferTx.ccdata[0].payments = [
    {
      'input': 0,
      'amount': 13, // that's an overflow, but to the same aggregatable asset-id within the same input
      'output': 0,
      'range': false,
      'percent': false
    },
    {
      'input': 0,
      'amount': 2,
      'output': 2,
      'range': false,
      'percent': false
    },
    {
      'input': 1,
      'amount': 5,
      'output': 2,
      'range': false,
      'percent': false
    }
  ]
  var res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(Array.isArray(res[0]), true)
  assert.equal(res[0].length, 1)
  assert.equal(res[0][0].amount, 13)
  assert.equal(Array.isArray(res[2]), true)
  assert.equal(res[2].length, 3)
  assert.equal(res[2][0].amount, 2)
  assert.equal(res[2][1].amount, 5)
  assert.equal(res[2][2].amount, 1)  // change - we keep it separated because we respect the payment
  done()
})

it('Transfer - should transfer the entire amount to last output, when there is an overflow in total amount. If assets are NOT aggregatable - should keep them separated.', function (done) {
  transferTx.ccdata[0].payments = [
    {
      'input': 0,
      'amount': 100,
      'output': 0,
      'range': false,
      'percent': false
    }
  ]
  transferTx.vin.forEach(function (vin) {
    vin.assets.forEach(function (asset) {
      asset.aggregationPolicy = 'dispersed'
    })
  })
  var res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(Array.isArray(res[2]), true)
  assert.equal(res[2].length, 3)
  assert.equal(res[2][0].amount, 10)
  assert.equal(res[2][1].amount, 5)
  assert.equal(res[2][2].amount, 6)
  done()
})

it('Transfer - should transfer the entire amount to last output, when there is an overflow to another asset which is not aggregatable with the previous asset.', function (done) {
  transferTx.ccdata[0].payments = [
    {
      'input': 0,
      'amount': 13, // that's an overflow
      'output': 0,
      'range': false,
      'percent': false
    },
    {
      'input': 0,
      'amount': 2,
      'output': 2,
      'range': false,
      'percent': false
    },
    {
      'input': 1,
      'amount': 6,
      'output': 2,
      'range': false,
      'percent': false
    }
  ]
  var res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(transferTx.overflow, true)
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(Array.isArray(res[2]), true)
  assert.equal(res[2].length, 3)
  assert.equal(res[2][0].amount, 10)
  assert.equal(res[2][1].amount, 5)
  assert.equal(res[2][2].amount, 6)
  done()
})

it('Transfer - should not have overflow with payment with amount 0', function (done) {
  transferTx.ccdata[0].payments = [
    {
      'input': 0,
      'amount': 10,
      'output': 0,
      'range': false,
      'percent': false
    },
    {
      'input': 0,
      'amount': 5,
      'output': 2,
      'range': false,
      'percent': false
    },
    {
      'input': 1,
      'amount': 6,
      'output': 2,
      'range': false,
      'percent': false
    },
    {
      'input': 1,
      'amount': 0,
      'output': 2,
      'range': false,
      'percent': false
    }
  ]
  var res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(transferTx.overflow, false)
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(Array.isArray(res[0]), true)
  assert.equal(res[0].length, 1)
  assert.equal(res[0][0].amount, 10)
  assert.equal(Array.isArray(res[2]), true)
  assert.equal(res[2].length, 2)
  assert.equal(res[2][0].amount, 5)
  assert.equal(res[2][1].amount, 6)
  done()
})

it('Transfer - should transfer entire amount to last output when there is a payment to a non existing output', function (done) {
  transferTx.ccdata[0].payments = [
    {
      'input': 0,
      'amount': 10,
      'output': 0,
      'range': false,
      'percent': false
    },
    {
      'input': 0,
      'amount': 5,
      'output': 2,
      'range': false,
      'percent': false
    },
    {
      'input': 1,
      'amount': 6,
      'output': 2,
      'range': false,
      'percent': false
    },
    {
      'input': 1,
      'amount': 0,
      'output': 3,
      'range': false,
      'percent': false
    }
  ]
  var res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(transferTx.overflow, true)
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(Array.isArray(res[2]), true)
  assert.equal(res[2].length, 3)
  assert.equal(res[2][0].amount, 10)
  assert.equal(res[2][1].amount, 5)
  assert.equal(res[2][2].amount, 6)
  done()
})

it('Transfer - should transfer remaining amounts to last output', function (done) {
  var tx = {
    'vin': [
      {
        'assets': [
          {
            'assetId': 'A',
            'amount': 10,
            'issueTxid': 'aaa',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      },
      {
        'assets': [
          {
            'assetId': 'B',
            'amount': 5,
            'issueTxid': 'bbb',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      },
      {
        'assets': [
          {
            'assetId': 'C',
            'amount': 6,
            'issueTxid': 'ccc',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      }
    ],
    'vout': [{},{},{}],
    'ccdata': [
      {
        'payments': [
          {
            'input': 0,
            'amount': 0,
            'output': 0,
            'range': false,
            'percent': false
          },
          {
            'input': 1,
            'amount': 0,
            'output': 0,
            'range': false,
            'percent': false
          },
          {
            'input': 2,
            'amount': 4,
            'output': 0,
            'range': false,
            'percent': false
          }
        ],
        'protocol': 0x4343,
        'version': 1,
        'type': 'transfer',
        'multiSig': [
        ]
      }
    ]
  }
  var res = get_assets_outputs(tx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(tx.overflow, false)
  assert.equal(Array.isArray(res), true)
  assert.equal(res.length, 3)
  assert.equal(Array.isArray(res[0]), true)
  assert.equal(res[0].length, 1)
  assert.equal(res[0][0].amount, 4)
  assert.equal(Array.isArray(res[2]), true)
  assert.equal(res[2].length, 3)
  assert.equal(res[2][0].amount, 10)
  assert.equal(res[2][0].assetId, 'A')
  assert.equal(res[2][1].amount, 5)
  assert.equal(res[2][1].assetId, 'B')
  assert.equal(res[2][2].amount, 2)
  assert.equal(res[2][2].assetId, 'C')
  done()
})

it('Burn - should transfer and burn assets', function (done) {
  var burnTx = {
    'vin': [
      {
        'assets': [
          {
            'assetId': 'A',
            'amount': 6,
            'issueTxid': 'aaa',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      },
      {
        'assets': [
          {
            'assetId': 'B',
            'amount': 6,
            'issueTxid': 'bbb',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      },
      {
        'assets': [
          {
            'assetId': 'C',
            'amount': 6,
            'issueTxid': 'ccc',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      }
    ],
    'vout': [{},{},{}],
    'ccdata': [
      {
        'payments': [
          {
            'input': 0,
            'amount': 3,
            'output': 1,
            'range': false,
            'percent': false
          },
          {
            'input': 0,
            'amount': 2,
            'percent': false,
            'burn': true
          },
          {
            'input': 1,
            'amount': 3,
            'output': 0,
            'range': false,
            'percent': false
          },
          {
            'input': 1,
            'amount': 2,
            'burn': true,
            'percent': false
          }
        ],
        'protocol': 0x4343,
        'version': 1,
        'type': 'burn',
        'multiSig': [
        ]
      }
    ]
  }

  var res = get_assets_outputs(burnTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.deepEqual(res, [
    [
      {
        'assetId': 'B',
        'amount': 3,
        'issueTxid': 'bbb',
        'divisibility': 0,
        'lockStatus': false,
        'aggregationPolicy': 'aggregatable'      
      },
    ],
    [
      {
        'assetId': 'A',
        'amount': 3,
        'issueTxid': 'aaa',
        'divisibility': 0,
        'lockStatus': false,
        'aggregationPolicy': 'aggregatable'
      }
    ],
    [
      {
        'assetId': 'A',
        'amount': 1,
        'issueTxid': 'aaa',
        'divisibility': 0,
        'lockStatus': false,
        'aggregationPolicy': 'aggregatable'
      },
      {
        'assetId': 'B',
        'amount': 1,
        'issueTxid': 'bbb',
        'divisibility': 0,
        'lockStatus': false,
        'aggregationPolicy': 'aggregatable'      
      },
      {
        'assetId': 'C',
        'amount': 6,
        'issueTxid': 'ccc',
        'divisibility': 0,
        'lockStatus': false,
        'aggregationPolicy': 'aggregatable'
      }
    ]
  ])
  done()
})

it('Burn - should transfer all assets to last output when there is an overflow', function (done) {
  var burnTx = {
    'vin': [
      {
        'assets': [
          {
            'assetId': 'A',
            'amount': 6,
            'issueTxid': 'aaa',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      },
      {
        'assets': [
          {
            'assetId': 'B',
            'amount': 6,
            'issueTxid': 'bbb',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      }
    ],
    'vout': [{},{},{}],
    'ccdata': [
      {
        'payments': [
          {
            'input': 0,
            'amount': 3,
            'output': 1,
            'range': false,
            'percent': false
          },
          {
            'input': 0,
            'amount': 2,
            'percent': false,
            'burn': true
          },
          {
            'input': 0,
            'amount': 2,
            'output': 0,
            'range': false,
            'percent': false
          }
        ],
        'protocol': 0x4343,
        'version': 1,
        'type': 'burn',
        'multiSig': [
        ]
      }
    ]
  }

  var res = get_assets_outputs(burnTx, bitcoin.networks.testnet)
  console.log(JSON.stringify(res, null, 2))
  assert.equal(burnTx.overflow, true)
  assert.deepEqual(res[0], undefined)
  assert.deepEqual(res[1], undefined)
  assert.deepEqual(res[2],[
    {
      "assetId": "A",
      "amount": 6,
      "issueTxid": "aaa",
      "divisibility": 0,
      "lockStatus": false,
      "aggregationPolicy": "aggregatable"
    },
    {
      "assetId": "B",
      "amount": 6,
      "issueTxid": "bbb",
      "divisibility": 0,
      "lockStatus": false,
      "aggregationPolicy": "aggregatable"
    }
  ])
  done()
})

it('Transfer - should correctly process range payments', function (done) {
  // Reset transfer tx
  transferTx = {
    'vin': [
      {
        'assets': [
          {
            'assetId': 'A',
            'amount': 10,
            'issueTxid': 'aaa',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          },
          {
            'assetId': 'A',
            'amount': 5,
            'issueTxid': 'aaa',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      },
      {
        'assets': [
          {
            'assetId': 'A',
            'amount': 6,
            'issueTxid': 'aaa',
            'divisibility': 0,
            'lockStatus': false,
            'aggregationPolicy': 'aggregatable'
          }
        ]
      }
    ],
    'vout': [{},{},{},{},{},{}],
    'ccdata': [
      {
        'payments': [
          {
            'input': 0,
            'amount': 3,
            'output': 4,
            'range': true,
            'percent': false
          }
        ],
        'protocol': 0x4343,
        'version': 1,
        'type': 'transfer',
        'multiSig': [
        ]
      }
    ]
  };

  const res = get_assets_outputs(transferTx, bitcoin.networks.testnet);
  console.log(JSON.stringify(res, null, 2))

  for (let idx = 0; idx <= 4; idx++) {
    assert.deepEqual(res[idx],[
      {
        "assetId": "A",
        "amount": 3,
        "issueTxid": "aaa",
        "divisibility": 0,
        "lockStatus": false,
        "aggregationPolicy": "aggregatable"
      }
    ]);
  }
  assert.deepEqual(res[5],[
    {
      "assetId": "A",
      "amount": 6,
      "issueTxid": "aaa",
      "divisibility": 0,
      "lockStatus": false,
      "aggregationPolicy": "aggregatable"
    }
  ]);
  done();
})

describe('Issuance of non-fungible tokens', function () {
  it('should transfer a single token to a single output', function (done) {
    issuanceTx = {
      'vin': [{
        'txid': '0f45f38a8bcd8331877267e0f3f5f8a4b3c716165e40db4eee34d52759ad954f',
        'vout': 2
      }],
      'vout': [{},{},{}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'issuance',
          'lockStatus': true,
          'divisibility': 0,
          'aggregationPolicy': 'nonFungible',
          'amount': 1,
          'multiSig': []
        }
      ],
      txid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff'
    };

    const res = get_assets_outputs(issuanceTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        }
      ],
      ,   // Empty array entry
      []
    ]);

    done();
  })

  it('should transfer multiple tokens to different outputs (1 per output)', function (done) {
    issuanceTx = {
      'vin': [{
        'txid': '0f45f38a8bcd8331877267e0f3f5f8a4b3c716165e40db4eee34d52759ad954f',
        'vout': 2
      }],
      'vout': [{},{},{}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 1,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 2,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'issuance',
          'lockStatus': true,
          'divisibility': 0,
          'aggregationPolicy': 'nonFungible',
          'amount': 3,
          'multiSig': []
        }
      ],
      txid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff'
    };

    const res = get_assets_outputs(issuanceTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ]
    ]);

    done();
  })

  it('should transfer multiple tokens to different outputs (1+ per output)', function (done) {
    issuanceTx = {
      'vin': [{
        'txid': '0f45f38a8bcd8331877267e0f3f5f8a4b3c716165e40db4eee34d52759ad954f',
        'vout': 2
      }],
      'vout': [{},{},{}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 3,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 2,
              'output': 1,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 2,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'issuance',
          'lockStatus': true,
          'divisibility': 0,
          'aggregationPolicy': 'nonFungible',
          'amount': 6,
          'multiSig': []
        }
      ],
      txid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff'
    };

    const res = get_assets_outputs(issuanceTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1oDykd9'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1s2bHJK'
        }
      ]
    ]);

    done();
  })

  it('should transfer multiple tokens to different outputs with more than one payment to same output', function (done) {
    issuanceTx = {
      'vin': [{
        'txid': '0f45f38a8bcd8331877267e0f3f5f8a4b3c716165e40db4eee34d52759ad954f',
        'vout': 2
      }],
      'vout': [{},{},{}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 2,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 2,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'issuance',
          'lockStatus': true,
          'divisibility': 0,
          'aggregationPolicy': 'nonFungible',
          'amount': 4,
          'multiSig': []
        }
      ],
      txid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff'
    };

    const res = get_assets_outputs(issuanceTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ],
      ,   // Empty array entry
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
        }
      ]
    ]);

    done();
  })

  it('should transfer multiple tokens to single output with overflow', function (done) {
    issuanceTx = {
      'vin': [{
        'txid': '0f45f38a8bcd8331877267e0f3f5f8a4b3c716165e40db4eee34d52759ad954f',
        'vout': 2
      }],
      'vout': [{},{},{}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 2,
              'output': 1,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'issuance',
          'lockStatus': true,
          'divisibility': 0,
          'aggregationPolicy': 'nonFungible',
          'amount': 5,
          'multiSig': []
        }
      ],
      txid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff'
    };

    const res = get_assets_outputs(issuanceTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      ,   // Empty array entry
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1oDykd9'
        }
      ]
    ]);

    done();
  })

  it('should transfer multiple tokens to different outputs with overflow', function (done) {
    issuanceTx = {
      'vin': [{
        'txid': '0f45f38a8bcd8331877267e0f3f5f8a4b3c716165e40db4eee34d52759ad954f',
        'vout': 2
      }],
      'vout': [{},{},{}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 2,
              'output': 1,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'issuance',
          'lockStatus': true,
          'divisibility': 0,
          'aggregationPolicy': 'nonFungible',
          'amount': 5,
          'multiSig': []
        }
      ],
      txid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff'
    };

    const res = get_assets_outputs(issuanceTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1oDykd9'
        }
      ]
    ]);

    done();
  })
})

describe('Transfer of non-fungible tokens', function () {
  it('should transfer a single token (input with single token) to a single output', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        }
      ],
      ,   // Empty array entry
      []
    ]);

    done();
  })

  it('should transfer a single token (input with more than one token) to a single output with overflow', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        }
      ],
      ,   // Empty array entry
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        }
      ]
    ]);

    done();
  })

  it('should transfer multiple tokens (from a single input) to a single output', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        }
      ],
      ,   // Empty array entry
      []
    ]);

    done();
  })

  it('should transfer multiple tokens (from a single input) to a single output with overflow', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        }
      ],
      ,   // Empty array entry
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ]
    ]);

    done();
  })

  it('should transfer multiple tokens (from a single input) with a single payments entry', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 3,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ],
      ,   // Empty array entry
      []
    ]);

    done();
  })

  it('should transfer multiple tokens (from more than one input) with a single payments entry', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
            }
          ]
        },
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 4,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
        }
      ],
      ,   // Empty array entry
      []
    ]);

    done();
  })

  it('should overflow trying to transfer multiple tokens (from a single input) with a single payments entry (amount > num token in input)', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 3,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      ,   // Empty array entry
      ,   // Empty array entry
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        }
      ]
    ]);

    done();
  })

  it('should transfer multiple tokens (from a single input) to more than one output with as little payments entries as possible', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1oDykd9'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1s2bHJK'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 3,
              'output': 1,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 2,
              'output': 1,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1oDykd9'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1s2bHJK'
        }
      ],
      []
    ]);

    done();
  })

  it('should transfer multiple tokens (from a single input) to more than one output with as little payments entries as possible with overflow', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1oDykd9'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1s2bHJK'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC219WTgV'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 3,
              'output': 1,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 2,
              'output': 1,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1oDykd9'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1s2bHJK'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC219WTgV'
        }
      ]
    ]);

    done();
  })

  it('should transfer multiple tokens (from more than one input) to a single output', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            }
          ]
        },
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ],
      ,   // Empty array entry
      []
    ]);

    done();
  })

  it('should transfer multiple tokens (from more than one input) to a single output with overflow', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            }
          ]
        },
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 1,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ],
      ,   // Empty array entry
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1fYfiE1'
        }
      ]
    ]);

    done();
  })

  it('should transfer multiple tokens (from more than one input) to more than one output', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            }
          ]
        },
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 1,
              'amount': 1,
              'output': 1,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        },
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ],
      []
    ]);

    done();
  })

  it('should transfer multiple tokens (from more than one input) to more than one output with overflow', function (done) {
    transferTx = {
      'vin': [
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
            },
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
            }
          ]
        },
        {
          assets: [
            {
              assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
              amount: 1,
              issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
              lockStatus: true,
              divisibility: 0,
              aggregationPolicy: 'nonFungible',
              tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
            }
          ]
        }
      ],
      'vout': [{}, {}, {}],
      'ccdata': [
        {
          'payments': [
            {
              'input': 0,
              'amount': 1,
              'output': 0,
              'range': false,
              'percent': false
            },
            {
              'input': 1,
              'amount': 1,
              'output': 1,
              'range': false,
              'percent': false
            }
          ],
          'protocol': C3_PROTOCOL,
          'version': 2,
          'type': 'transfer'
        }
      ],
      txid: '60e27611871954dae4e4e53570712b73fcfcae08b30d50e9e3d02f63aa444bff'
    };

    const res = get_assets_outputs(transferTx, bitcoin.networks.testnet)
    console.log(JSON.stringify(res, null, 2))
    assert.deepEqual(res, [
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1K4DLji'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1bFs2is'
        }
      ],
      [
        {
          assetId: 'LnAR9VJaHTtHQPeMaPTVWvKo6nLmBGoZH5z92v',
          amount: 1,
          issueTxid: '841f14f80b3f9f0b0d9f353c7ec2d517121ed948542bd0a0f1c080c29141eaff',
          lockStatus: true,
          divisibility: 0,
          aggregationPolicy: 'nonFungible',
          tokenId: 'Tk97fk8Rg27toQW68faxhnDuYeFEoLC1Tuiw2M'
        }
      ]
    ]);

    done();
  })
})