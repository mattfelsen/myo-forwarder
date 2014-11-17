var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;

// connect to Myo Connect
var hub = new WebSocket('ws://localhost:10138/myo/2');

// set up a server for clients to connect to
var wss = new WebSocketServer({ port: 9000 });

// keep track of armbands
var myos = {};

// helper for broadcasting
wss.broadcast = function(data) {
    for (var i in this.clients) this.clients[i].send(data, function(){});
};

// helper for creating an empty object to store
// armband data if it doesn't exist yet
var initMyo = function(myoID) {
    if (!myos.hasOwnProperty(myoID))
        myos[myoID] = {};
}

hub.on('message', function(data) {
	// forward everything along to all connected clients
    wss.broadcast(data);

    // now let's do some checking for events we need to
    // keep track of relating to armband status

    var json = JSON.parse(data);
    if (json[0] != 'event') return;

    var msg = json[1];
    var event = msg.type;
    var myoID = msg.myo;

    initMyo(myoID);

    // events for which we should store some data

    if (event == 'paired') {
    	myos[msg.myo].paired = json;
    }
    
    if (event == 'connected') {
    	myos[msg.myo].connected = json;
    }
    
    if (event == 'arm_synced') {
    	myos[msg.myo].arm_synced = json;
    }

    // events for which we should delete some data

    if (event == 'arm_unsynced') {
        delete myos[myoID].arm_synced;
    }

    if (event == 'disconnected') {
        delete myos[myoID].arm_synced;
    	delete myos[myoID].connected;
    }

    if (event == 'unpaired') {
		delete myos[myoID];
    }

    if (event != 'orientation' && event != 'pose')
    	console.log(JSON.stringify(json));

});

wss.on('connection', function(ws) {

	for (var myoID in myos) {
		if (myos[myoID].hasOwnProperty('paired'))
			ws.send(JSON.stringify(myos[myoID].paired))

		if (myos[myoID].hasOwnProperty('connected'))
			ws.send(JSON.stringify(myos[myoID].connected))

		if (myos[myoID].hasOwnProperty('arm_synced'))
			ws.send(JSON.stringify(myos[myoID].arm_synced))
	}

    ws.on('message', function(data) {
        hub.send(data, function(){});
    });
});

