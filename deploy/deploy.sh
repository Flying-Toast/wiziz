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

# Deploy
openssl aes-256-cbc -K $encrypted_85a0c774629c_key -iv $encrypted_85a0c774629c_iv -in private.key.enc -out ~/.ssh/private.key -d
echo "3072 SHA256:rjWI35wZvEfKkJ1MjPPPWVh38Gf7HvffrL+2UJFDWF8" >> ~/.ssh/known_hosts
scp sorcerio.tar.gz sorcer@47.90.255.213:~/sorcerio/
echo "Deployed."
