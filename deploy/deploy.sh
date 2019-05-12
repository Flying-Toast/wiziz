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
openssl aes-256-cbc -K $encrypted_85a0c774629c_key -iv $encrypted_85a0c774629c_iv -in private.key.enc -out ~/.ssh/id_rsa -d
echo "192.81.210.68 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDAVTR51Ei/wsV2cv4A+KmT8I4P+530j2x2Urm4anUsy4Z3ammDuMCbw1xlR4pp7q4vo3hJP1U0k2OJfO7dznwg0OKjTMhds2wwTmOgUK+u+wva/P1SY8YrQFOKSf/TuTTPVDNAMOdVOY9/xzCdKgemMQ8u4P3jXHIf23dHMyDydONiFcf9CxqddXnATH6T6Imgusu4/zoC5Zy804WSf2r3RuKkGjSDaqPS4hhLIcZAHTGo4+7sZBiqmY3RoQwMaLeNCmehPjqY2PuS4xQd5aggKKD6mkp6mHzSDD8/e1ZcqXq0s3QAs/pjo4fvrClnoDF9lZyeZl358NDtgCHBfomV" >> ~/.ssh/known_hosts # generate with ssh-keyscan -t rsa ip_of_vps
scp sorcerio.tar.gz sorcerio@192.81.210.68:~/sorcerio/
# (TODO) delete old files on server, extract new package, delete sorcerio.tar.gz, and restart systemd service
echo "Deployed."
