#! /bin/sh
rm app.nw
zip -r app.zip .
zip -d app.zip .idea
zip -d app.zip doubanfm-desktop.iml
zip -d .gitignore
mv app.zip app.nw