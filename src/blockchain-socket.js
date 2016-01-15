
var WebSocket = require('ws');

function BlockchainSocket() {
  this.wsUrl = 'wss://ws.blockchain.info/inv';
  this.headers = { 'Origin': 'https://blockchain.info' };
  this.socket;
  this.pingInterval;
  this.reconnect;
}

// hack to browserify websocket library
if (!(typeof window === 'undefined')) {
  WebSocket.prototype.on = function (event, callback) {
    this['on'+event] = callback;
  };
  WebSocket.prototype.once = function (event, callback) {
      var self = this;
    this['on'+event] = function () {
      callback.apply(callback, arguments);
      self['on'+event] = null;
    };
  };
  WebSocket.prototype.off = function (event, callback) {
    this['on'+event] = callback;
  };
}


BlockchainSocket.prototype.connect = function (onOpen, onMessage, onClose) {
  this.reconnect = function (continueFunc) {
    continueFunc = continueFunc || function () {};
    var open    = function () { onOpen(); continueFunc(); }
      , connect = this.connectOnce.bind(this, open, onMessage, onClose);

    // 2 = CLOSING, 3 = CLOSED (try to connect)
    if (!this.socket || this.socket.readyState >= 2) {
      connect();
    }
    // 0 = CONNECTING (try again in 10 ms)
    else if (this.socket.readyState === 0) {
      setTimeout(this.reconnect.bind(this, continueFunc), 10);
    }
    // 1 = OPEN (continue)
    else {
      continueFunc();
    }
  }.bind(this);

  if (!this.pingInterval) {
    var pingSocket = this.send.bind(this, '{"op":"ping_block"}');
    this.pingInterval = setInterval(pingSocket, 30000);
  }

  this.reconnect();
};

BlockchainSocket.prototype.connectOnce = function (onOpen, onMessage, onClose) {
  this.socket = new WebSocket(this.wsUrl, [], { headers: this.headers });
  this.socket.on('open', onOpen);
  this.socket.on('message', onMessage);
  this.socket.on('close', function () { onClose(); this.reconnect(); }.bind(this));
};

BlockchainSocket.prototype.send = function (message) {
  var send = function () { this.socket.send(message); }.bind(this);
  this.reconnect(send);
};

module.exports = BlockchainSocket;
