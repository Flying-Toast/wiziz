#!/bin/bash

# This script is for setting up the Windows Subsystem for Linux (Ubuntu) to develop Sorcerio.

echo "Setting up development environment. This may take a while..."

# install dependencies:
sudo apt-get update
sudo apt-get install man-db -y
echo "installed man-db."
sudo apt-get install libssl-dev -y
echo "installed libssl."
sudo apt-get install libcrypto++-dev -y
echo "installed libcrypto."
sudo apt-get install gcc -y
echo "installed gcc."

# install D:
curl -fsS https://dlang.org/install.sh | bash -s dmd
source ~/dlang/dmd-*/activate
echo "source ~/dlang/dmd-*/activate" >> ~/.bashrc

echo "Done! (You shouldn't ever have to run this again)."
