var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;

var myo = new WebSocket('ws://localhost:10138/myo/1');
var wss = new WebSocketServer({ port: 9000 });

var myos = {};

wss.broadcast = function(data) {
    for (var i in this.clients) this.clients[i].send(data, function(){});
};

myo.on('message', function(data) {
    wss.broadcast(data);

    var json = JSON.parse(data);
    if (json[0] != 'event') return;

    var msg = json[1];
    var event = msg.type;

    if (event == 'connected') {
    	if (!myos.hasOwnProperty(msg.myo))
    		myos[msg.myo] = {};

    	myos[msg.myo].connected = json;
    }

    if (event == 'arm_recognized') {
    	if (!myos.hasOwnProperty(msg.myo))
    		myos[msg.myo] = {};

    	myos[msg.myo].arm_recognized = json;
    }

    if (event == 'disconnected') {
		if (myos.hasOwnProperty(msg.myo))
    		delete myos[msg.myo];
    }

});

wss.on('connection', function(ws) {

	for (var key in myos) {
		if (myos[key].hasOwnProperty('connected'))
			ws.send(JSON.stringify(myos[key].connected))

		if (myos[key].hasOwnProperty('arm_recognized'))
			ws.send(JSON.stringify(myos[key].arm_recognized))
	}

    ws.on('message', function(data) {
        myo.send(data, function(){});
    });
});

