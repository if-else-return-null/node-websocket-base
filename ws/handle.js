
// from this point you would define the all the logic, functions, data, etc that is
// need for your server to do its job. Whatever that might be.
// all the functions in the handle object are intended to modified for your specific use case
// Then call WS.init() when your code is ready for the server to start up


let handle = {}


handle.wsServerError = function (err){
    console.log("WS: Server error has occured",err);
    process.exit()
}

handle.wsServerClose = function (){
    console.log("WS: server has closed");
    process.exit()
}

handle.wsServerIsReady = function () {
    // do any other tasks for server startup
    if (WS.is_subprocess){
        process.send({type:"websocket_ready"})
    } else {
        console.log("WS: Websocket Ready")
    }
}

handle.wsNewClientConnect = function(client_id) {
    console.log(`WS: New client connected: id ${ client_id } `);
}

handle.wsClientMessage = function (client_id, packet){
    console.log(`WS: Message from client_id ${ client_id }`, packet );
}

handle.wsClientClose = function (client_id){
    console.log(`WS: Client disconnected: id ${ client_id } `);
}

handle.wsClientError = function (client_id, err){
    console.log(`WS: Client id ${ client_id } error`, err);
}

handle.clientAuthorize = function (client_id, packet) {
    console.log("WS: Verify client auth");
    // verify auth acording to your own logic
    // this function must return a booleen and should probobly be syncronous
    // simple example
    let key = "someSecretKey"
    if (packet.key && packet.key === key) {
        return true
    } else {
        return false
    }

    // to bypass auth just return true
    //return true
}


// setup any other messaging here
handle.parentMessage = function (msg){
    console.log('WS: Message from parent', msg);
    if (msg.type === "config_info") {
        // update any config info supplied by parent before starting server
        for (let item in msg.config ){
            WS.config[item] = msg.config[item]
        }
        WS.startServer()
    }
    if (msg.type === "shutdown_server") {
        WS.stopServer()
    }
}




WS.init()


// below here just for testing
setTimeout(function(){
    //WS.stopServer()
    //process.exit();
},10000)
