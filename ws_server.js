#!/usr/bin/env node

const fs = require('fs');
const WebSocket = require('ws');
var https = require('https');


// setup websocket object
let WS = {}
WS.args = process.argv
WS.is_subprocess = true
WS.user = process.env.USER
WS.os_platform = process.platform
WS.app_data_path
WS.show_help = false
WS.config = {
    server_port: 25444,
    server_ip: "0.0.0.0",
    server_https: false,
    https_cert: "/path/to/cert.pem",
    https_key: "/path/to/key.pem",
    remove_cert_key: false, // see start_as_root.sh for more info
    message_json: true,
    auth_attempt_limit: 5
}
WS.clients = {}
WS.new_client_id = 0
WS.banned = { list:[], info:{} }
WS.server = null

WS.saveConfig = function (){
    fs.writeFileSync(WS.app_data_path + "ws_config.json", JSON.stringify(WS.config,null,4) ) //
}

WS.showHelp = function () {
    console.log("help requested");
    process.exit(0)
}



WS.init = function(){
    // check if run as a sub-process
    if (!process.send) {
        WS.is_subprocess = false
        // check for config
        if (WS.os_platform === "win32"){
            // for windows we will convert to forward slashes like linux
            WS.app_data_path = process.env.APPDATA.replace(/\\/g, "/")}
        else {
            WS.app_data_path = process.env.HOME
        }
        // you should update this folder name for your app
        WS.app_data_path += "/.node-websocket-base/"

        if ( !fs.existsSync( WS.app_data_path ) ) {
            console.log("WS: Created user data folder", WS.app_data_path);
            fs.mkdirSync( WS.app_data_path, { } )
            WS.saveConfig()

        } else {
            if (fs.existsSync(WS.app_data_path + "ws_config.json")) {
                console.log('WS: Loading ws_config.json.');
                WS.config = JSON.parse( fs.readFileSync(WS.app_data_path + "ws_config.json",'utf8') )
            } else {
                console.log('WS: Loading ws_config.json.');
                WS.saveConfig()
            }

        }
        // check for commandline args then start the server
        WS.args.forEach((item, i) => {
            // show help for command line
            if (item === "--help" ) {
                WS.show_help = true
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
        if (WS.show_help === true ) {
            WS.showHelp()
        } else {
            WS.startServer()
        }



    } else {
        // if run as a subprocess setup messaging and request config
        process.on('message', (msg) => {
            console.log('WS: Message from parent', msg);
            if (msg.type === "config_info") {
                WS.config = msg.config
                WS.app_data_path = msg.app_data_path
                WS.startServer()
            }
            if (msg.type === "shutdown_server") {
                WS.stopServer()
            }
        });
        // request the config from parent before starting ws server
        process.send({type:"request_config"})

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
                if (WS.banned.info[id].time + WS.config.ban_interval > timenow) {
                    // remove from banlist
                }
            });

        }

    }, 30000);

    // handle websocket server errors
    WS.server.on('error', function error(err) {
        clearInterval(zombieInterval);
        handle.wssError(err)
    });
    // handle websocket server closing
    WS.server.on('close', function close() {
        clearInterval(zombieInterval);
        handle.wssClose()
    });
    WS.server.on('connection', function connection(ws, req) {
        ws.isAlive = true;
        ws.connnectTime = Date.now()
        ws.originIP = req.connection.remoteAddress
        ws.rlBucket = { time:connect_time,count:0 }
        ws.isAuthed = false
        // give an id and setup client in WS.clients
        ws.client_id = WS.new_client_id;
        WS.clients[WS.new_client_id] = { ws_ref: ws , id : WS.new_client_id  }
        WS.new_client_id += 1;

        ws.on('pong', heartbeat);
        ws.on('error', function error(err) {
            console.log("ws_client_error", err);

        });

        ws.on('close', function close() {

            // remove the client from ws
            delete  WS.clients[ws.client_id];
            handle.wsClientClose(ws.client_id)
        })

        ws.on('message', function incoming(message) {
            let packet = message
            try {
                if (WS.config.message_json === true){
                    packet = JSON.parse( message )
                }
                // check for auth needed
                if (ws.isAuthed === true){
                    handle.wsClientMessage(ws.client_id, packet)
                } else {
                    let auth_id = WS.makeBannedId(ws.originIP)
                    ws.isAuthed = handle.clientAuthorize(ws.client_id, packet)
                    if (ws.isAuthed !== true){
                        // failed auth attempt
                        if (!WS.banned.info[id]) { WS.banned.info[id] = { bantime:null, attempts:[] , static:false} }
                        WS.banned.info[id].attempts.push({time:Date.now(), data:packet})
                        // check if time to ban
                        if ( WS.banned.info[id].attempts.length > WS.config.auth_attempt_limit ) {
                            console.log( "WS-SECURITY: Client has been banned");
                            WS.banned.list.push(ws.originIP)
                            ws.close()
                        }
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



    // when the server is ready for clients
    if (WS.is_subprocess){
        process.send({type:"websocket_ready"})
    }

}

WS.stopServer = function () {
    console.log("'WS: server is stopping", WS.config);
    setTimeout(function(){process.exit();},1000)
}
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
    // verify auth acording to your logic
    // this function must return a booleen and should probobly be syncronous

    // to bypass auth just return true
    return true
}

WS.init()
