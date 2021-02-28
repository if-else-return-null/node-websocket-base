# this script is used to start the app while developing
# the code for ws_server.js is split up into seperate files in the ws folder.
# see catfiles.js for more info


#regenerate the server code
node catfiles.js

#start up with any cli options
node ws_server.js $1 $2 $3 $4
