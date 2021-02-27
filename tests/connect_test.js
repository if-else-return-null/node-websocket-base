
const WebSocket = require('ws');

let port = 25444
let host = "127.0.0.1"
let ws = null

function connect(){
    ws = new WebSocket(`ws://${host}:${port}`);

    ws.on('open', function open() {
        console.log("connected to server");
        //ws.send(`{"type":"test-connext"}`);
    });

    ws.on('message', function incoming(data) {
        console.log("message from server",data);
    });

    ws.on('close', function close() {
        console.log("dis-connected from server");
        ws = null
    });
    ws.on('error', function error(err) {
        console.log("websocket error ",err);
    });

}

function disConnect(){
    if (ws !== null) {
        ws.close()
    }
}

//------------------------STDIN COMMANDS------------------------------------
// setup commands from stdin
let CMDS = {}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  //console.log(chunk);
  if (chunk[0] === "/") {
      console.log("command recived");
      let splitcmd = chunk.replace("/", "").trim().split(" ")
      console.log("split command ", splitcmd);
      if (CMDS[splitcmd[0]]) {
          if (splitcmd.length === 1){
               CMDS[splitcmd[0]]()
          } else {
              CMDS[splitcmd[0]](splitcmd[1])
          }

      } else {
          console.log("Invalid Command", splitcmd );
      }
  }
  else {
      // this potentially could be data requestd of the user by the system
      // if required you could handle that here
      console.log("Invalid command");
  }
});

CMDS.exit = function() {
    process.exit()
}

CMDS.conn = function() {
    connect()
}

CMDS.disconn = function() {
    disConnect()
}

CMDS.auth = function() {
    ws.send(`{"key":"someSecretKey"}`);
}

let flood = null
CMDS.flood = function(rate = 1000) {
    console.log(`flooding at ${rate} `);
    flood = setInterval(function(){
        if (ws !== null){
            ws.send(`{"flood":"useless data"}`);
        } else {
            console.log("flood is stopped");
            clearInterval(flood)
        }
    },rate)

}
