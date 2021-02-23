


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
