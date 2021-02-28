#!/usr/bin/env node

const fs = require('fs');
const WebSocket = require('ws');
var https = require('https');


// setup websocket object
let WS = {}
WS.args = process.argv
WS.is_subprocess = true

WS.config_file = null
WS.show_help = false
WS.config = {
    server_port: 25444,
    server_ip: "0.0.0.0",
    server_https: false,
    https_cert: "/path/to/cert.pem",
    https_key: "/path/to/key.pem",
    remove_cert_key: false, // see start_as_root.sh for more info
    message_json: true,
    auth_attempt_limit: 5,
    ban_interval:1800000,
    max_rate_per_sec: 20,
    ban_on_rate_limit: true
}
WS.clients = {}
WS.new_client_id = 0
WS.banned = { list:[], info:{} }

WS.server = null

WS.loadComfig = function (){
    if (fs.existsSync(WS.config_file)) {
        console.log('WS: Loading config file.');
        WS.config = JSON.parse( fs.readFileSync(WS.config_file , 'utf8') )
    }
}

WS.showHelp = function () {
    console.table(WS.help.cli_options);
    //console.table(WS.help.config);
    for (let item in WS.help.config) {
        console.log(item );
        console.log(WS.help.config[item]);
        console.log("\n");
    }
    process.exit(0)
}



WS.init = function(){
    // check if run as a sub-process
    if (!process.send) {
        WS.is_subprocess = false

        // check for commandline args then start the server
        WS.args.forEach((item, i) => {
            // show help for command line
            if (item === "--help" ) {
                WS.show_help = true
            }
            if (item === "--config" ) {
                WS.config_file = WS.args[i+1]
            }
            // custom port
            if (item === "--port" ) {
                WS.config.server_port = WS.args[i+1]
            }
            // show the config window
            if (item === "--restrict" ) {
                WS.config.server_ip = "127.0.0.1"
            }
            if (item === "--https" ) {
                WS.config.server_https = true
            }
        });
        if (WS.config_file !== null){
            WS.loadComfig()
        }
        if (WS.show_help === true ) {
            WS.showHelp()
        } else {
            WS.startServer()
        }



    } else {
        // if run as a subprocess setup messaging and request config
        process.on('message', (msg) => {
            handle.parentMessage(msg)
            
        });
        // request the config from parent before starting ws server
        process.send({type:"request_config"})

    }


}

WS.help = {
    config:{
        server_port: "(Integer) defaults to 25444",
        server_ip: "(string)  defaults to 0.0.0.0 for network accesable,\n use 127.0.0.1 for localhost only",
        server_https: "(booleen) defaults to false. if true the server will use https mode",
        https_cert: "(string) absolute path to https certificate file",
        https_key: "(string) absolute path to https key file",
        remove_cert_key:  "(booleen) defaults to false. \n If true the server(in https mode) will delete the certificate and key file after reading them in.\n see start_as_root.sh for more info",
        message_json: "(booleen) defaults to true which will JSON.parse() each incoming message.\n Set this to false to leave the messages as the are",
        auth_attempt_limit: "(Integer) defaults to 5,\n number of failed auth attempts before an ip address is added to banned list",
        ban_interval:"(Integer) defaults to 1800000,\n length of time in milliseconds that an ip address will stay on the banned list",
        max_rate_per_sec: "(Integer) defaults to 20,\n maximum messages per second from a clinet",
        ban_on_rate_limit: "(booleen) defaults to true,\n ban clients who go over rate limit, if false just disconnect them"
    },
    cli_options:{
        "--help":"Show this help",
        "--config":"Specify a config file to use",
        "--port":"Specify a port to use",
        "--restrict":"Restrict connections to localhost only",
        "--https":"Start the server in https mode",

    }

}


WS.makeBannedId = function (ip) {
    return ip.replace(/\./g ,"_").replace(/:/g ,"_")
}


WS.startServer = function () {
    console.log("WS: server is starting", WS.config);
    // determine type of server to start http/https
    if (WS.config.server_https === true) {
        console.log("WS: Server in https mode");
        // https
        const httpsServer = https.createServer({
            cert: fs.readFileSync(WS.config.https_cert),
            key: fs.readFileSync(WS.config.https_key)
        });
        httpsServer.listen({ port:WS.config.server_port , host:WS.config.server_ip }, function() {
            console.log(`WS: Server is listening on wss://${WS.config.server_ip}:${WS.config.server_port}`);
        });


        WS.server = new WebSocket.Server({ server:httpsServer , maxPayload:128 * 1024 /* 128 KB*/ });
        // remove the cert and key file if needed
        if (WS.config.remove_cert_key === true){ // see start_as_root.sh for more info
            if ( fs.existsSync( WS.config.https_cert ) ) {
                console.log("deleting cert.pem");
                fs.unlinkSync(WS.config.https_cert)
            }
            if ( fs.existsSync( WS.config.https_key ) ) {
                console.log("deleting key.pem");
                fs.unlinkSync( WS.config.https_key )
            }
        }



    } else {
        // http
        console.log("WS: Server in http mode");
        WS.server = new WebSocket.Server({ port:WS.config.server_port , host:WS.config.server_ip , maxPayload:128 * 1024 });
        console.log(`WS: Server is listening on ws://${WS.config.server_ip}:${WS.config.server_port}` );
    }

    function noop() {}

    function heartbeat() {

        this.isAlive = true;
    }


    const zombieInterval = setInterval(function ping() {
        if (WS.server !== null){
            // check for no reponsive clients
            WS.server.clients.forEach(function each(ws) {
                if (ws.isAlive === false) {
                    console.log("no heartbeat", ws.client_id)
                    ws.close();
                } else {
                    ws.isAlive = false;
                    ws.ping(noop);
                }
            });
            // check for banned list removals
            let timenow = Date.now()
            WS.banned.list.forEach((item, i) => {
                let id = WS.makeBannedId(item)
                if (WS.banned.info[id].bantime + WS.config.ban_interval < timenow && WS.banned.info[id].static === false) {
                    // remove from banlist
                    WS.banned.list.splice(i,1)
                    delete WS.banned.info[id]
                }
            });

        }

    }, 30000);
    WS.server.shouldHandle = function(req) {
        //console.log("shouldHandle CALLED", req.connection.remoteAddress);

        if (WS.banned.list.includes(req.connection.remoteAddress)) {
            console.log("WS: not handling banned client");
            return false
        }
        if (this.options.path) {
            const index = req.url.indexOf('?');
            const pathname = index !== -1 ? req.url.slice(0, index) : req.url;

            if (pathname !== this.options.path) return false;
        }

        return true;
}
    // handle websocket server errors
    WS.server.on('error', function error(err) {
        clearInterval(zombieInterval);
        handle.wsServerError(err)
    });
    // handle websocket server closing
    WS.server.on('close', function close() {
        clearInterval(zombieInterval);
        handle.wsServerClose()
    });
    WS.server.on('connection', function connection(ws, req) {
        ws.isAlive = true;
        ws.connnectTime = Date.now()
        ws.originIP = req.connection.remoteAddress
        ws.rlBucket = { time:ws.connnectTime,count:0 }
        ws.isAuthed = false
        // give an id and setup client in WS.clients
        ws.client_id = WS.new_client_id;
        WS.clients[WS.new_client_id] = { ws_ref: ws , id : WS.new_client_id  }
        WS.new_client_id += 1;

        ws.on('pong', heartbeat);
        ws.on('error', function error(err) {
            handle.wsClientError(ws.client_id, err)
        });

        ws.on('close', function close() {

            // remove the client from ws
            delete  WS.clients[ws.client_id];
            handle.wsClientClose(ws.client_id)
        })


        ws.on('message', function incoming(message) {
            let auth_id
            let packet = message
            // check for rate limit
            ws.rlBucket.count += 1
            if (ws.rlBucket.count > WS.config.max_rate_per_sec) {
                let timenow = Date.now()
                let secs = Math.floor( (timenow - ws.rlBucket.time) / 1000 )
                let avg = Math.floor( ws.rlBucket.count / secs  )
                console.log("rlout", timenow,secs,avg);
                if ( avg > WS.config.max_rate_per_sec ) {
                    // limit exceded
                    console.log( "WS-SECURITY: Client has exceded rate limit");
                    if (WS.config.ban_on_rate_limit === true) {
                        auth_id = WS.makeBannedId(ws.originIP)
                        if (!WS.banned.info[auth_id]) { WS.banned.info[auth_id] = { bantime:null, attempts:[] , static:false} }
                        WS.banned.list.push(ws.originIP)
                        WS.banned.info[auth_id].bantime = Date.now()
                    }
                    ws.close()
                } else {
                    //empty bucket
                    ws.rlBucket.time = timenow
                    ws.rlBucket.count = 0
                }

            }
            try {
                if (WS.config.message_json === true){
                    packet = JSON.parse( message )
                }
                // check for auth needed
                if (ws.isAuthed === true){
                    handle.wsClientMessage(ws.client_id, packet)
                } else {
                    // until a new client isAuthed all messages will go to clientAuthorize
                    auth_id = WS.makeBannedId(ws.originIP)
                    ws.isAuthed = handle.clientAuthorize(ws.client_id, packet)
                    if (ws.isAuthed !== true){
                        // failed auth attempt
                        if (!WS.banned.info[auth_id]) { WS.banned.info[auth_id] = { bantime:null, attempts:[] , static:false} }
                        WS.banned.info[auth_id].attempts.push({time:Date.now(), data:packet})
                        // check if time to ban
                        if ( WS.banned.info[auth_id].attempts.length > WS.config.auth_attempt_limit ) {
                            console.log( "WS-SECURITY: Client has been banned");
                            WS.banned.list.push(ws.originIP)
                            WS.banned.info[auth_id].bantime = Date.now()
                            ws.close()
                        }
                    } else {
                        console.log("WS client auth good");
                    }

                }


            } catch (e) {
                console.log( "WS-Error: Client message invalid\n",e);
                ws.close()
            } finally {
                // nothing to do here
            }

        })
    })



    // the server is ready for clients
    if (WS.is_subprocess){
        process.send({type:"websocket_ready"})
    }

}

WS.stopServer = function () {
    console.log("'WS: server is stopping", WS.config);
    setTimeout(function(){
        WS.server.close()
        //process.exit();
    },1000)
}

WS.sendToClient = function (id, packet) {
    if ( WS.clients[id] ) {
        WS.clients[id].ws_ref.send(JSON.stringify(packet))
    }
}

WS.sendToAllClients = function (packet, checkAuth = true) {
    for (let id in WS.clients) {
        if (checkAuth === false || WS.clients[id].ws_ref.isAuthed === true) {
            WS.clients[id].ws_ref.send(JSON.stringify(packet))
        }
    }
}

// all the functions in handle are intended to modified for your specific use case
let handle = {}


handle.wsServerError = function (err){
    console.log("WS: Server error has occured",err);
    process.exit()
}

handle.wsServerClose = function (){
    console.log("WS: server has closed");
    process.exit()
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


handle.parentMessage = function (msg){
    console.log('WS: Message from parent', msg);
    if (msg.type === "config_info") {
        //WS.config = msg.config
        for (let item in msg.config ){
            WS.config[item] = msg.config[item]
        }

        WS.startServer()
    }
    if (msg.type === "shutdown_server") {
        WS.stopServer()
    }
}





// call this when your code is ready for the server to start up
WS.init()


// below here just for testing
setTimeout(function(){
    //WS.stopServer()
    //process.exit();
},10000)
