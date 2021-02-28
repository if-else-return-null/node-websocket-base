#!/usr/bin/env node
// this script is to be used during development and will regenerate the ws_server.js file
// by concating the files in the ws folder according to the order of the WSFiles array
// it basically allows you to write the code for your server app in multiple files.

const fs = require('fs')
const path = require('path')
console.log("regenerating ws_server.js");

// update this array according to your needs
let WsFiles = ["header.js", "server.js", "handle.js"]

let start = "#!/usr/bin/env node\n"

fs.writeFileSync(path.join(__dirname, "ws_server.js" ) , start)
WsFiles.forEach((item, i) => {
    fs.appendFileSync(path.join(__dirname, "ws_server.js"), fs.readFileSync( path.join(__dirname, "ws" , item ),'utf8'));
});
