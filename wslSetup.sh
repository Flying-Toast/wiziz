#!/bin/bash

# This script is for setting up the Windows Subsystem for Linux (Ubuntu) to develop Wiziz.

echo "Setting up development environment. This may take a while..."

# install dependencies:
sudo apt-get update > /dev/null
sudo apt-get install man-db -y > /dev/null # Hangs on 'processing triggers for man-db' without this for some reason.
echo "installed man-db."
sudo apt-get install libssl-dev -y > /dev/null
echo "installed libssl."
sudo apt-get install libcrypto++-dev -y > /dev/null
echo "installed libcrypto."
sudo apt-get install gcc -y > /dev/null
echo "installed gcc."

# install D:
echo "source $(curl -fsS https://dlang.org/install.sh | bash -s dmd --activate)" >> ~/.bashrc
source ~/.bashrc

echo "Done!"
