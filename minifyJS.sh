#!/bin/bash

if [[ ! $(which terser) ]]; then
	echo "terserjs is not installed"
	exit
fi

terser public/js/client.js --compress --mangle ---mangle-props keep_quoted -enclose --output public/js/client.js

echo "minified public/js/client.js. Remember not to check it in!"
