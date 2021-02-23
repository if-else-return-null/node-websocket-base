#!/usr/bin/env node

const fs = require('fs');
//const { fork } = require('child_process');
const WebSocket = require('ws');
var https = require('https');


let args = process.argv

let config = {
    serverRestrict: false,
    server_port: 25444,
    server_ip: "0.0.0.0",
    server_https: false
}


const user = process.env.USER
const os_platform = process.platform
let app_data_path
let wss = null
// check if run as a sub-process
let _is_subprocess = true

if (!process.send) {
    _is_subprocess = false
    // check for config
    if (os_platform === "win32"){
        // for windows we will convert to forward slashes like linux
        app_data_path = process.env.APPDATA.replace(/\\/g, "/")}
    else {
        app_data_path = process.env.HOME
    }
    // you should update this folder name for your app
    app_data_path += "/.node-websocket-base/"

    if ( !fs.existsSync( app_data_path ) ) {
        console.log("WS: Created user data folder", app_data_path);
        fs.mkdirSync( app_data_path, { } )
        saveConfig()

    } else {
        if (fs.existsSync(app_data_path + "ws_config.json")) {
            console.log('WS: Loading ws_config.json.');
            config = JSON.parse( fs.readFileSync(app_data_path + "ws_config.json",'utf8') )
        } else {
            console.log('WS: Loading ws_config.json.');
            saveConfig()
        }

    }



}

function saveConfig(){
    fs.writeFileSync(app_data_path + "ws_config.json", JSON.stringify(config,null,4) ) //
}



// if run as a subprocess setup messaging and request config
if (_is_subprocess) {
    process.on('message', (msg) => {
        console.log('WS: Message from parent', msg);
        if (msg.type === "config_info") {
            config = msg.config
            app_data_path = msg.app_data_path
            startServer()
        }
        if (msg.type === "shutdown_server") {
            stopServer()
        }
    });
    // request the config from parent before starting ws server
    process.send({type:"request_config"})

} else {
    // check for commandline args then start the server
    let _show_help = false
    args.forEach((item, i) => {
        // show help for command line
        if (item === "-help" ) {
            _show_help = true
        }
        // custom port
        if (item === "--port" ) {
            config.server_port = args[i+1]
        }
        // show the config window
        if (item === "--restrict" ) {
            config.serverRestrict = true
            config.server_ip = "127.0.0.1"
        }
        if (item === "--https" ) {
            config.server_https = true
        }
    });
    if (_show_help === true ) {
        showHelp()
    } else {
        startServer()
    }

}



function startServer() {
    console.log("WS: server is starting", config);
    // determine type of server to start http/https
    if (config.server_https === true) {
        console.log("WS: Server in https mode");
        // https
        const httpsServer = https.createServer({
            cert: fs.readFileSync('cert.pem'),
            key: fs.readFileSync('key.pem')
        });
        httpsServer.listen({ port:config.server_port , host:config.server_ip }, function() {
            console.log(`WS: Server is listening on wss://${config.server_ip}:${config.server_port}`);
        });


        wss = new WebSocket.Server({ server:httpsServer , maxPayload:128 * 1024 /* 128 KB*/ });




    } else {
        // http
        console.log("WS: Server in http mode");
        wss = new WebSocket.Server({ port:config.server_port , host:config.server_ip , maxPayload:128 * 1024 });
        console.log(`WS: Server is listening on ws://${config.server_ip}:${config.server_port}` );
    }


/*
// remove the cert and key file if present
if ( fs.existsSync( "cert.pem" ) ) {
    console.log("deleting cert.pem");
    fs.unlinkSync("cert.pem")
}

if ( fs.existsSync( "key.pem" ) ) {
    console.log("deleting key.pem");
    fs.unlinkSync("key.pem")
}
*/
    // when the server is ready for clients
    if (_is_subprocess){
        process.send({type:"websocket_ready"})
    }

}

function stopServer() {
    console.log("'WS: server is stopping", config);
    setTimeout(function(){process.exit();},1000)
}
