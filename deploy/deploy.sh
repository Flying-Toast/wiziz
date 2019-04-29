#!/bin/bash

# cd into deploy, in case the script is called from the root project dir
cd deploy

# install terser for minify script
if [[ ! $(which terser) ]]; then
	npm install -g terser
	echo "Installed terser."
fi

# do a release build
cd ..
dub build -b release --compiler ldc2
echo "Built."
cd deploy

# copy needed files to this directory (deploy/)
cp -r ../public ./
cp ../sorcerio ./

# minify
./minify.sh
echo "Minified."

# package the build
tar -czf sorcerio.tar.gz ./public/ ./sorcerio
echo "Packaged."

# TODO: scp it to the server and restart the server
