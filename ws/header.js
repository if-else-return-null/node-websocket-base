
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
        ban_interval:"(Integer) defaults to 1800000,\n length of time in milliseconds that an ip address will stay on the banned list"
    },
    cli_options:{
        "--help":"Show this help",
        "--config":"Specify a config file to use",
        "--port":"Specify a port to use",
        "--restrict":"Restrict connections to localhost only",
        "--https":"Start the server in https mode",

    }

}
