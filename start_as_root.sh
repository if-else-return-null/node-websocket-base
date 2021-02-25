

# this script is meant for starting the server in https mode when the
# cert/key files are only accesable by root. The basic idea is to use root to
# make an accesable copy of the files then switch to an unprivliged user
# start the server and have it delete the accesable copies after its read them in.

oktorun="false"

if [[ "$oktorun" != "true" ]]  ; then
    echo "MUST READ AND EDIT THIS SCRIPT BEFORE RUNNING"
    exit
fi
if [[ "$USER" != "root" ]]  ; then
    echo "MUST BE RUN AS ROOT"
    exit
fi



# the non root user that will run the server
otheruser="someuser"

# the location of the root accesable keys
rootcert="/path/to/rootonly/cert.pem"
rootkey="/path/to/rootonly/key.pem"

# where to store the temp files.
# should be the values of WS.config.https_cert and WS.config.https_key
# also WS.config.remove_cert_key should be true
tempcert="/path/for/temp/cert.pem"
tempkey="/path/for/temp/key.pem"

# copy and modify permissions
cp $rootcert $tempcert
cp $rootkey $tempkey

chown root:$otheruser $tempcert
chown root:$otheruser $tempkey

chmod 0770 $tempcert
chmod 0770 $tempkey

# start the server as lesser user
su $otheruser -c ./devstart.sh
#su $otheruser -c "export PATH=/usr/local/lib/node/stable/bin/:$PATH; ./devstart.sh"
