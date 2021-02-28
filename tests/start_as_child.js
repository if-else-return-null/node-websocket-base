const { fork } = require('child_process');

worker = fork('ws_server.js');

worker.on('message', (msg) => {
    console.log('Message from WS Worker', msg);
    if (msg.type === "request_config") {
        worker.send({ type:"config_info", config:{} })
    }
});

worker.on('exit', (code,signal) => {
    console.log('WS Worker exited',code,signal );
    process.exit()
});


setTimeout(function(){ worker.send({ type:"shutdown_server" })},10000)
