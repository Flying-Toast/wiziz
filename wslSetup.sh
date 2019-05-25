#!/bin/bash

# This script is for setting up the Windows Subsystem for Linux (Ubuntu) to develop Sorcerio.

echo "Setting up development environment. This may take a while..."

# install dependencies:
sudo apt-get update
sudo apt-get install man-db -y # Hangs on 'processing triggers for man-db' without this for some reason.
echo "installed man-db."
sudo apt-get install libssl-dev -y
echo "installed libssl."
sudo apt-get install libcrypto++-dev -y
echo "installed libcrypto."
sudo apt-get install gcc -y
echo "installed gcc."

# install D:
export OLD_PROMPT=$PS1
echo "source $(curl -fsS https://dlang.org/install.sh | bash -s dmd --activate)" >> ~/.bashrc
echo "PS1=\"$OLD_PROMPT\"" >> ~/.bashrc
source ~/.bashrc

echo "Done!"
