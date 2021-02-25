
// all the functions in handle are intended to modified for your specific use case
let handle = {}


handle.wssError = function (err){
    console.log("WS: Server error has occured",err);
}

handle.wssClose = function (){
    console.log("WS: server has closed");
}

handle.wsClientMessage = function (client_id, packet){
    console.log(`WS: Message from client_id ${ client_id }`, packet );
}

handle.wsClientClose = function (client_id){
    console.log(`WS: Client disconnected: id ${ client_id } `);
}


handle.clientAuthorize = function (client_id, packet) {
    console.log("WS: Verify client auth");
    // verify auth acording to your own logic
    // this function must return a booleen and should probobly be syncronous

    // to bypass auth just return true
    return true
}



// call this when your code is ready for the server to start up
WS.init()
