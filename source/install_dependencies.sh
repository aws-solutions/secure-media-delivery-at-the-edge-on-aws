#!/bin/bash
#
echo "Install node dependencies"
npm install

echo "Install NodeJs ws_secure_media_delivery layer dependencies for AWS Lambda"
npm install --prefix lambda/layers/aws_secure_media_delivery_nodejs/nodejs

echo "Install NodeJs AdmZip layer dependencies for AWS Lambda"
npm install --prefix lambda/layers/admzip/nodejs

