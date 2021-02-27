
// all the functions in handle are intended to modified for your specific use case
let handle = {}


handle.wsServerError = function (err){
    console.log("WS: Server error has occured",err);
}

handle.wsServerClose = function (){
    console.log("WS: server has closed");
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



// call this when your code is ready for the server to start up
WS.init()


// below here just for testing
setTimeout(function(){
    //WS.stopServer()
    //process.exit();
},10000)
