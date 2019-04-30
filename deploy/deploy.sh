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
echo "47.90.255.213 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDAvIQnJnIc40u3Dq96TiZ5O3EcANBFlNW0c3vQWFWb5W64jUwwG1sZRxI5n1jc3XGNtR9l/6oWdHfSo+HYBppTvzoTU3zOwaN3mkZ432XCfW0lmQZ2woyzfbMqsy5CCChaR0rNcS0/sreIKpqlRqKw05rAh26rA/bpBcgSjsxPfGjk+fTNUqP4FvZmjh+MxKBN/ZKAOgT+Hz79OhvZB2D7KbXvWw+T3ta8F6Kcg3m2l+y2TAJfLwTXKkpk+4ZjrnlpfEpysSqaX7oCYzJeYTwRICDMTRSUPC9/twvlnbwZRkKxQXsM2Sj9hGITxBgFKGfQC99lyYI+mxoDepMu+mWl" >> ~/.ssh/known_hosts
scp sorcerio.tar.gz sorcer@47.90.255.213:~/sorcerio/

echo "Deployed."
