# node-websocket-base

WebSocket server template for nodejs , electron and web apps



This repository is meant to be a starting point for implementing a websocket server
in your own apps. It is designed to be used either as a child process of your app or as standalone server in a terminal.

You can fork the repository, download the zip, or just copy the code you want into your project then edit as needed.




```
help = {
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


```
