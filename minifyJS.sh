#!/bin/bash

if [[ ! $(which terser) ]]; then
	echo "terserjs is not installed"
	exit
fi

if [[ $1 == "--clean" ]]; then
	git checkout -- public/js/client.js
	echo "Un-minified public/js/client.js. It is now okay to commit to git."
else
	terser public/js/client.js --compress --mangle ---mangle-props keep_quoted --enclose --output public/js/client.js
	printf "Minified public/js/client.js. \033[1;31mRemember to not check it in!\033[0m\n"
fi
