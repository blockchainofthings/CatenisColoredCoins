var assetIdencoder = require('../cc-assetid-encoder')
var debug = require('debug')('../cc-get-assets-outputs')
var _ = require('lodash')

const C3_PROTOCOL = 0x4333;   // Catenis Colored Coins (C3) protocol

module.exports = function (raw_transaction, network) {
  var transaction_data = JSON.parse(JSON.stringify(raw_transaction))
  var ccdata = transaction_data.ccdata[0]
  var assets = []
  if (ccdata.type === 'issuance') {
    const assetInfo = {
      assetId: assetIdencoder(transaction_data, network),
      amount: ccdata.amount,
      issueTxid: transaction_data.txid,
      divisibility: ccdata.divisibility,
      lockStatus: ccdata.lockStatus,
      aggregationPolicy: ccdata.aggregationPolicy
    };
    if (ccdata.protocol === C3_PROTOCOL && assetInfo.aggregationPolicy === 'nonFungible') {
      // Issuing non-fungible tokens. Get IDs for the new tokens (note that the amount
      //  designates the number of tokens to issue), and reset the token index
      assetInfo.tokenIds = assetIdencoder(transaction_data, network, true);
      assetInfo.tokenIdx = 0;
    }
    transaction_data.vin[0].assets = transaction_data.vin[0].assets || []
    transaction_data.vin[0].assets.unshift(assetInfo)
  }

  var payments = ccdata.payments
  var overflow = !transfer(assets, payments, transaction_data)
  if (overflow) {
    // transfer failed. transfer all assets in inputs to last output, aggregate those possible
    assets.length = 0
    transferToLastOutput(assets, transaction_data.vin, transaction_data.vout.length - 1)
  }

  raw_transaction.overflow = overflow

  return assets
}

// returns true if succeeds to apply payments to the given assets array, false if runs into an invalid payment
function transfer (assets, payments, transaction_data) {
  debug('transfer')
  var _payments = convertRangePayments(_.cloneDeep(payments))
  var _inputs = _.cloneDeep(transaction_data.vin)
  var currentInputIndex = 0
  var currentAssetIndex = 0
  var payment
  var currentAsset
  var currentAmount
  var lastPaymentIndex   // aggregate only if paying the same payment
  for (var i = 0; i < _payments.length; i++) {
    payment = _payments[i]
    debug('payment = ', payment)
    if (!isPaymentSimple(payment)) {
      return false
    }

    if (payment.input >= transaction_data.vin.length) {
      return false
    }

    if (payment.output >= transaction_data.vout.length) {
      return false
    }

    if (!payment.amount) {
      debug('payment.amount === 0 before paying it, continue')
      continue
    }

    if (currentInputIndex < payment.input) {
      currentInputIndex = payment.input
      currentAssetIndex = 0
    }

    if (currentInputIndex >= _inputs.length || !_inputs[currentInputIndex].assets || currentAssetIndex >= _inputs[currentInputIndex].assets.length || !_inputs[currentInputIndex].assets[currentAssetIndex]) {
      debug('no asset in input #' + currentInputIndex + ' asset #' + currentAssetIndex + ', overflow')
      return false
    }

    currentAsset = _inputs[currentInputIndex].assets[currentAssetIndex]
    currentAmount = Math.min(payment.amount, currentAsset.amount)
    debug('paying ' + currentAmount + ' ' + currentAsset.assetId + ' from input #' + currentInputIndex + ' asset #' + currentAssetIndex + ' to output #' + payment.output)

    if (!payment.burn) {
      assets[payment.output] = assets[payment.output] || []
      debug('assets[' + payment.output + '] = ', assets[payment.output])
      if (lastPaymentIndex === i) {
        if (!assets[payment.output].length || assets[payment.output][assets[payment.output].length - 1].assetId !== currentAsset.assetId || currentAsset.aggregationPolicy !== 'aggregatable') {
          debug('tried to pay same payment with a separate asset, overflow')
          return false
        }
        debug('aggregating ' + currentAmount + ' of asset ' + currentAsset.assetId + ' from input #' + currentInputIndex + ' asset #' + currentAssetIndex + ' to output #' + payment.output)
        assets[payment.output][assets[payment.output].length - 1].amount += currentAmount
      } else {
        const assetInfo = {
          assetId: currentAsset.assetId,
          amount: currentAmount,
          issueTxid: currentAsset.issueTxid,
          divisibility: currentAsset.divisibility,
          lockStatus: currentAsset.lockStatus,
          aggregationPolicy: currentAsset.aggregationPolicy
        };

        if (currentAsset.tokenIds) {
          // Issuing non-fungible tokens. Amount designate number of tokens to issue.
          //  So transfer each token separately
          assetInfo.amount = 1;
          for (let counter = currentAmount; counter > 0; counter--) {
            assets[payment.output].push({
              ...assetInfo,
              tokenId: currentAsset.tokenIds[currentAsset.tokenIdx++]
            });
          }
        }
        else {
          if (currentAsset.tokenId) {
            assetInfo.tokenId = currentAsset.tokenId;
          }
          assets[payment.output].push(assetInfo);
        }
      }
    }
    currentAsset.amount -= currentAmount
    payment.amount -= currentAmount
    if (currentAsset.amount === 0) {
      currentAssetIndex++
      while (currentInputIndex < _inputs.length && currentAssetIndex > _inputs[currentInputIndex].assets.length - 1) {
        currentAssetIndex = 0
        currentInputIndex++
      }
    }

    debug('input #' + currentInputIndex + ', asset # ' + currentAssetIndex)

    lastPaymentIndex = i
    if (payment.amount) {
      debug('payment not completed, stay on current payment')
      i--
    }
  }

  // finished paying explicit payments, transfer all assets with remaining amount from inputs to last output. aggregate if possible.
  transferToLastOutput(assets, _inputs, transaction_data.vout.length - 1)

  return true
}

// Convert range payments into regular (pay to output) payments
function convertRangePayments(payments) {
  const convertedPayments = [];

  payments.forEach(function (payment) {
    if (payment.range) {
      for (let idx = 0; idx <= payment.output; idx++) {
        convertedPayments.push({
          input: payment.input,
          range: false,
          percent: payment.percent,
          output: idx,
          amount: payment.amount
        });
      }
    }
    else {
      convertedPayments.push(payment);
    }
  });

  return convertedPayments;
}

// transfer all positive amount assets from inputs to last output. aggregate if possible.
function transferToLastOutput (assets, inputs, lastOutputIndex) {
  var assetsToTransfer = []
  inputs.forEach(function (input) {
    assetsToTransfer = _.concat(assetsToTransfer, input.assets)
  })
  var assetsIndexes = {}
  var lastOutputAssets = []
  assetsToTransfer.forEach(function (asset, index) {
    if (asset.aggregationPolicy === 'aggregatable' && (typeof assetsIndexes[asset.assetId] !== 'undefined')) {
      lastOutputAssets[assetsIndexes[asset.assetId]].amount += asset.amount
    } else if (asset.amount > 0) {
      if (typeof assetsIndexes[asset.assetId] === 'undefined') {
        assetsIndexes[asset.assetId] = lastOutputAssets.length
      }

      const assetInfo = {
        assetId: asset.assetId,
        amount: asset.amount,
        issueTxid: asset.issueTxid,
        divisibility: asset.divisibility,
        lockStatus: asset.lockStatus,
        aggregationPolicy: asset.aggregationPolicy
      };

      if (asset.tokenIds) {
        // Issuing non-fungible tokens. Amount designate number of tokens to issue.
        //  So transfer each token separately
        assetInfo.amount = 1;
        for (let counter = asset.amount; counter > 0; counter--) {
          lastOutputAssets.push({
            ...assetInfo,
            tokenId: asset.tokenIds[asset.tokenIdx++]
          });
        }
      }
      else {
        if (asset.tokenId) {
          assetInfo.tokenId = asset.tokenId;
        }
        lastOutputAssets.push(assetInfo);
      }
    }
  })

  assets[lastOutputIndex] = _.concat((assets[lastOutputIndex] || []), lastOutputAssets)
}

function isPaymentSimple (payment) {
  return (!payment.range && !payment.percent)
}
