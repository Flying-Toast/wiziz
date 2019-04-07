#!/bin/bash

# Minifies clientside javascript+html.
# This shouldn't really need to be used too often, it is just here for making releases.
#
# When called with no arguments, it minifies the all of the clientside javascript+html, overwriting the files with the minified versions.
# The `--clean` argument un-minifies/resets the clientside javascript+html by checking it out from git.

FAIL=0

if [[ ! $(which terser) ]]; then
	echo "terserjs is not installed"
	FAIL=1
fi

if [[ ! $(which html-minifier) ]]; then
	echo "html-minifier is not installed"
	FAIL=1
fi

if [[ $FAIL == 1 ]]; then
	exit
fi

if [[ $1 == "--clean" ]]; then
	git checkout -- public/js/client.js
	git checkout -- public/index.html
	echo "Un-minified. It is now okay to commit to git."
else
	terser public/js/client.js --compress --mangle --enclose --output public/js/client.js
	echo $(html-minifier --collapse-boolean-attributes --html5 --minify-css --remove-comments public/index.html) > public/index.html
	printf "Minified. \033[1;31mRemember to not check minified files in!\033[0m\n"
fi
