#!/bin/bash

# cd into deploy, in case the script is called from the root project dir
cd deploy

# install terser for minify script
if [[ ! $(which terser) && $TRAVIS = "true" ]]
then
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
SORCERIO_DEPLOY_IP="108.26.225.227"
SORCERIO_SSH_USER="sorcerio"
SORCERIO_SSH_PORT="31415"
# The directory containing public/ and the executable (no trailing slash):
SORCERIO_DEPLOY_BASEPATH="/home/$SORCERIO_SSH_USER/sorcerio-server"

if [[ $TRAVIS = "true" ]]
then
	openssl aes-256-cbc -K $encrypted_85a0c774629c_key -iv $encrypted_85a0c774629c_iv -in private.key.enc -out ~/.ssh/id_rsa -d
	# generate with `ssh-keyscan -p {port} -t rsa {ip}`:
	echo "[108.26.225.227]:31415 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDIYKzslMEMzHzl+iNIt0zEjUqR3jc/SuOea/Wv3uv8d9sCbY/BNI0OjOU2e9NR49XcgaKm3139lz1fhKVkF9MYjCzhBsHEF5p/G+t4aG/7g3srX3GDXTnO+u5d9FoHpevAJjCpMGH1XebNAWwTxTi7jhHGPpNHBfUwnb37rRiBHPnSyqBDhrMOSlOC45ZdztYDrYliYXE8jBCL8/VUiJ1sue5PJmATWf18t0kVj6P8UCFUeYsWalxs1LKcpfjapishp6P+dgRdlVsjZb7N5s6LvYEKBBFpI01CvujiEQ6jHQqZXmqF+12VSyl/atqjyeKvNhmObT7zOTEh1eruHmIb" >> ~/.ssh/known_hosts
fi

scp -P $SORCERIO_SSH_PORT sorcerio.tar.gz $SORCERIO_SSH_USER@$SORCERIO_DEPLOY_IP:"$SORCERIO_DEPLOY_BASEPATH/"
ssh -p $SORCERIO_SSH_PORT $SORCERIO_SSH_USER@$SORCERIO_DEPLOY_IP "rm -rf $SORCERIO_DEPLOY_BASEPATH/sorcerio $SORCERIO_DEPLOY_BASEPATH/public ; cd $SORCERIO_DEPLOY_BASEPATH ; tar -xf sorcerio.tar.gz ; rm sorcerio.tar.gz ; systemctl --user restart sorcerio.service"
echo "Deployed."
