#!/bin/bash

if [[ $TRAVIS != "true" ]]
then
	echo "Not in a travis CI environment. Exiting."
	exit
fi

# Configuration:

WIZIZ_DEPLOY_IP="108.26.225.227"
WIZIZ_SSH_USER="wiziz"
WIZIZ_SSH_PORT="31415"
# The directory (on the server) containing public/ and the executable (no trailing slash):
WIZIZ_DEPLOY_BASEPATH="/home/$WIZIZ_SSH_USER/wiziz-server"
# set this "true" if the build should be for ARMhf (e.g. raspberry pi):
WIZIZ_BUILD_ARM="true"


# cd into deploy, in case the script is called from the root project dir
cd deploy

# install terser for minify script
if [[ ! $(which terser) ]]
then
	npm install -g terser
	echo "Installed terser."
fi

# do a release build
WIZIZ_COMPILER="ldc2"

if [[ $WIZIZ_BUILD_ARM = "true" ]]
then
	# set up for cross compiling to arm
	echo "Setting up arm cross compiling."

	sudo apt-get update
	sudo apt-get install gcc-arm-linux-gnueabihf ninja-build -y
	export CC=arm-linux-gnueabihf-gcc
	DEPLOY_DIR=$(pwd)
	cd ~
	git clone https://github.com/pander86/raspberry_vibed
	cd raspberry_vibed/lib/arm/
	tar -xf libs.tar.xz
	rm -rf ldc-build-runtime.tmp/
	ldc-build-runtime --ninja --dFlags="-w;-mtriple=arm-linux-gnueabihf"
	mkdir -p ~/.local/bin
	echo "
#!/bin/bash
BASE_DIR=\"/home/\$USER/raspberry_vibed/lib/arm\"
LDC2RUNTIME_DIR=\"\$BASE_DIR/ldc-build-runtime.tmp\"
OPENSSL_DIR=\"\$BASE_DIR/openssl\"
ZLIB_DIR=\"\$BASE_DIR/zlib\"
ldc2 -mtriple=arm-linux-gnueabihf -gcc=arm-linux-gnueabihf-gcc -L=-L\${LDC2RUNTIME_DIR}/lib -L=-L\${OPENSSL_DIR}/lib -L=-L\${ZLIB_DIR}/lib \$@
" >> ~/.local/bin/ldc-pi
	chmod +x ~/.local/bin/ldc-pi
	cd $DEPLOY_DIR

	WIZIZ_COMPILER="ldc-pi"
	echo "Finished setting up arm cross compiling."
fi

cd ..
dub build -b release --compiler $WIZIZ_COMPILER
echo "Built."
cd deploy


# copy needed files to this directory (deploy/)
cp -r ../public ./
cp ../wiziz ./

# minify
./minify.sh
echo "Minified."

# package the build
tar -czf wiziz.tar.gz ./public/ ./wiziz
echo "Packaged."

# Deploy

openssl aes-256-cbc -K $encrypted_8e3c5413c411_key -iv $encrypted_8e3c5413c411_iv -in private.key.enc -out ~/.ssh/id_rsa -d
chmod 600 ~/.ssh/id_rsa
# generate with `ssh-keyscan -p {port} -t rsa {ip}`:
echo "[$WIZIZ_DEPLOY_IP]:$WIZIZ_SSH_PORT ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDIYKzslMEMzHzl+iNIt0zEjUqR3jc/SuOea/Wv3uv8d9sCbY/BNI0OjOU2e9NR49XcgaKm3139lz1fhKVkF9MYjCzhBsHEF5p/G+t4aG/7g3srX3GDXTnO+u5d9FoHpevAJjCpMGH1XebNAWwTxTi7jhHGPpNHBfUwnb37rRiBHPnSyqBDhrMOSlOC45ZdztYDrYliYXE8jBCL8/VUiJ1sue5PJmATWf18t0kVj6P8UCFUeYsWalxs1LKcpfjapishp6P+dgRdlVsjZb7N5s6LvYEKBBFpI01CvujiEQ6jHQqZXmqF+12VSyl/atqjyeKvNhmObT7zOTEh1eruHmIb" >> ~/.ssh/known_hosts

scp -P $WIZIZ_SSH_PORT wiziz.tar.gz $WIZIZ_SSH_USER@$WIZIZ_DEPLOY_IP:"$WIZIZ_DEPLOY_BASEPATH/"
ssh -p $WIZIZ_SSH_PORT $WIZIZ_SSH_USER@$WIZIZ_DEPLOY_IP "rm -rf $WIZIZ_DEPLOY_BASEPATH/wiziz $WIZIZ_DEPLOY_BASEPATH/public ; cd $WIZIZ_DEPLOY_BASEPATH ; tar -xf wiziz.tar.gz ; rm wiziz.tar.gz ; systemctl --user restart wiziz.service"
echo "Deployed."
