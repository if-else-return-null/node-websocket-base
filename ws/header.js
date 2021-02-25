
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
