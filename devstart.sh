# this script is used to start the app while developing
# the code for ws_server.js is split up into seperate files in the ws folder.
# see catfiles.js for more info

#grab any cli options
option1=$1
option2=$2
option3=$3
option4=$4

#regenerate the server code
node catfiles.js

#start up
node ws_server.js $option1 $option2 $option3 $option4
