var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;

// connect to Myo Connect
var myo = new WebSocket('ws://localhost:10138/myo/2');

// set up a server for clients to connect to
var wss = new WebSocketServer({ port: 9000 });

// keep track of armbands
var myos = {};

// helper for broadcasting
wss.broadcast = function(data) {
    for (var i in this.clients) this.clients[i].send(data, function(){});
};

myo.on('message', function(data) {
	// forward everything along to all connected clients
    wss.broadcast(data);


    //
    // now let's do some checking for events we need to
    // keep track of relating to armband status
    //

    var json = JSON.parse(data);
    if (json[0] != 'event') return;

    var msg = json[1];
    var event = msg.type;

    if (event == 'paired') {
    	if (!myos.hasOwnProperty(msg.myo))
    		myos[msg.myo] = {};

    	myos[msg.myo].paired = json;
    }

    if (event == 'connected') {
    	if (!myos.hasOwnProperty(msg.myo))
    		myos[msg.myo] = {};

    	myos[msg.myo].connected = json;
    }

    if (event == 'arm_synced') {
    	if (!myos.hasOwnProperty(msg.myo))
    		myos[msg.myo] = {};

    	myos[msg.myo].arm_synced = json;
    }

    if (event == 'arm_unsynced') {
        if (!myos.hasOwnProperty(msg.myo))
            delete myos[msg.myo].arm_synced;

    }

    if (event == 'disconnected') {
		if (myos.hasOwnProperty(msg.myo)) {
	    	delete myos[msg.myo].connected;
	    	delete myos[msg.myo].arm_synced;
		}
    }

    if (event == 'unpaired') {
		if (myos.hasOwnProperty(msg.myo))
    		delete myos[msg.myo];
    }

    if (event != 'orientation' && event != 'pose')
    	console.log(JSON.stringify(json));

});

wss.on('connection', function(ws) {

	for (var key in myos) {
		if (myos[key].hasOwnProperty('paired'))
			ws.send(JSON.stringify(myos[key].paired))

		if (myos[key].hasOwnProperty('connected'))
			ws.send(JSON.stringify(myos[key].connected))

		if (myos[key].hasOwnProperty('arm_synced'))
			ws.send(JSON.stringify(myos[key].arm_synced))
	}

    ws.on('message', function(data) {
        myo.send(data, function(){});
    });
});

