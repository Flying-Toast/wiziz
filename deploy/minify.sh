#!/bin/bash

# This script minifies clientside javascript using terser.

FAIL=0

if [[ ! $(which terser) ]]; then
	echo "terserjs is not installed"
	FAIL=1
fi

if [[ $FAIL == 1 ]]; then
	exit
fi

terser public/js/client.js --compress --mangle --enclose --output public/js/client.js
