var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;

var myo = new WebSocket('ws://localhost:10138/myo/1');
var wss = new WebSocketServer({ port: 9000 });

wss.broadcast = function(data) {
    for (var i in this.clients) this.clients[i].send(data, function(){});
};

wss.on('connection', function(ws) {
    ws.on('message', function(data) {
        myo.send(data, function(){});
    });
});

myo.on('message', function(data) {
    wss.broadcast(data);
});