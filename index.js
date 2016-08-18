var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;

// connect to Myo Connect
var hub;
var connected = false;
var reconnectTimer = setInterval(checkReconnect, 500);
createWebSocket();

// set up a server for clients to connect to
var wss = new WebSocketServer({ port: 9000 });

// keep track of armbands
var myos = {};

// broadcast out EMG data at 60Hz instead of 200Hz
var emgTimer = setInterval(sendEMG, 1000 / 60);

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

function checkReconnect() {
    if (connected) return;

    console.log('Trying new connection...');
    try {
        createWebSocket();
    } catch (e) {
        console.log('WebSocket checkReconnect error', e);
    }
}

function createWebSocket() {
    hub = new WebSocket('ws://localhost:10138/myo/3');

    hub.on('open', function() {
        connected = true;
        console.log('WebSocket connection opened', hub.url);
    });

    hub.on('close', function() {
        connected = false;
        console.log('WebSocket connection closed');
    });

    hub.on('error', function(e) {
        connected = false;
        console.log('WebSocket connection error', e.code);
    });

    hub.on('message', function(data) {
        // let's do some checking for events we need to
        // keep track of relating to armband status

        var json = JSON.parse(data);

        var type = json[0];
        var msg = json[1];
        var event = msg.type;
        var myoID = msg.myo;

        initMyo(myoID);

        // forward everything along to all connected clients
        // skip EMG though, which is broadcast in a separate loop
        // to cap it at 60Hz
        if (event != 'emg')
            wss.broadcast(data);

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

        if (event == 'arm_recognized') {
            myos[msg.myo].arm_recognized = json;
        }

        if (event == 'emg') {
            myos[msg.myo].emg = json;
        }

        // events for which we should delete some data

        if (event == 'arm_lost') {
            delete myos[myoID].arm_recognized;
        }

        if (event == 'arm_unsynced') {
            delete myos[myoID].arm_synced;
        }

        if (event == 'disconnected') {
            delete myos[myoID].emg;
            delete myos[myoID].arm_recognized;
            delete myos[myoID].arm_synced;
            delete myos[myoID].connected;
        }

        if (event == 'unpaired') {
            delete myos[myoID];
        }

        if (type == 'event') {
            if (event != 'orientation' && event != 'emg')
                console.log(data);
        } else {
            console.log(data);
        }

    });
}

function sendEMG() {
    for (var myoID in myos) {
        if (myos[myoID].hasOwnProperty('emg'))
            wss.broadcast(JSON.stringify(myos[myoID].emg));
    }
}

wss.on('connection', function(ws) {

    for (var myoID in myos) {
        if (myos[myoID].hasOwnProperty('paired'))
            ws.send(JSON.stringify(myos[myoID].paired))

        if (myos[myoID].hasOwnProperty('connected'))
            ws.send(JSON.stringify(myos[myoID].connected))

        if (myos[myoID].hasOwnProperty('arm_synced'))
            ws.send(JSON.stringify(myos[myoID].arm_synced))

        if (myos[myoID].hasOwnProperty('arm_recognized'))
            ws.send(JSON.stringify(myos[myoID].arm_recognized))
    }

    ws.on('message', function(data) {
        hub.send(data, function(){});
    });

});
