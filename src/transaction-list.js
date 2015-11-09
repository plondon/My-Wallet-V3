'use strict';

var assert  = require('assert')
  , Helpers = require('./helpers')
  , API     = require('./api')
  , Tx      = require('./wallet-transaction')
  , Q       = require('q');

var DEFAULT_TX_LOAD = 50;

var TransactionList = function (context, loadNumber) {
  this._loadNumber    = loadNumber || DEFAULT_TX_LOAD;
  this._context       = Helpers.toArrayFormat(context || []);
  this._transactions  = [];
  this._childList     = [];
};

Object.defineProperties(TransactionList.prototype, {
  'context': {
    configurable: false,
    get: function () {
      return this._childList.reduce(function (prev, child) {
        return prev.concat(child.context);
      }, this._context);
    }
  },
  'transactions': {
    configurable: false,
    get: function () { return this._transactions; }
  },
  'txsFetched': {
    configurable: false,
    get: function () { return this._transactions.length; }
  },
  'loadNumber': {
    configurable: false,
    get: function () { return this._loadNumber; }
  }
});

TransactionList.prototype.fetchTxs = function (amount, refresh) {
  var txIndex = refresh ? 0 : this.txsFetched
    , amount  = amount || this.loadNumber
    , txListP = API.getHistory(this.context, null, txIndex, amount);
  var processTxs = (function (data) {
    if (refresh) { this.emptyTxs(); }
    var txs = data.txs.map(Tx.factory);
    Array.prototype.push.apply(this.transactions, txs);
    return txs.length;
  }).bind(this);
  return txListP.then(processTxs);
};

TransactionList.prototype.refreshTxs = function (amount) {
  return this.fetchTxs(amount, true);
};

TransactionList.prototype.emptyTxs = function () {
  this._transactions.splice(0);
  return this;
};

TransactionList.prototype.updateChildList = function (children) {
  children = Helpers.toArrayFormat(children).filter(function (child) {
    return child instanceof TransactionList;
  });
  this._childList.splice(0);
  Array.prototype.push.apply(this._childList, children);
  return this;
};

module.exports = TransactionList;
