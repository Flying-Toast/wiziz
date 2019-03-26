#!/bin/bash

# Minifies clientside javascript.
# This shouldn't really need to be used too often, it is just here for making releases.
#
# When called with no arguments, it minifies the all of the clientside javascript, overwriting the files with the minified versions.
# The `--clean` argument un-minifies/resets the clientside javascript by checking it out from git.

if [[ ! $(which terser) ]]; then
	echo "terserjs is not installed"
	exit
fi

if [[ $1 == "--clean" ]]; then
	git checkout -- public/js/client.js
	echo "Un-minified public/js/client.js. It is now okay to commit to git."
else
	terser public/js/client.js --compress --mangle --enclose --output public/js/client.js
	printf "Minified public/js/client.js. \033[1;31mRemember to not check it in!\033[0m\n"
fi
