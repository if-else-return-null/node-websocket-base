#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
console.log("regenerating ws_server.js");

let WsFiles = ["header.js", "server.js"]

let start = "#!/usr/bin/env node\n"

fs.writeFileSync(path.join(__dirname, "ws_server.js" ) , start)
WsFiles.forEach((item, i) => {
    fs.appendFileSync(path.join(__dirname, "ws_server.js"), fs.readFileSync( path.join(__dirname, "ws" , item ),'utf8'));
});
