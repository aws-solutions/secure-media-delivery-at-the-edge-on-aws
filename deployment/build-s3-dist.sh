#!/bin/bash
#
#  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#
set -x
# Important: CDK global version number
cdk_version=2.81.0

# Check to see if the required parameters have been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Please provide the base source bucket name, trademark approved solution name and version where the lambda code will eventually reside."
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.0.0"
    exit 1
fi

export DIST_VERSION=$3
export DIST_OUTPUT_BUCKET=$1
export SOLUTION_ID=SO0195
export SOLUTION_NAME=$2
export SOLUTION_TRADEMARKEDNAME=$2

# Get reference for all important folders
template_dir="$PWD"
staging_dist_dir="$template_dir/staging"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"


[ "$DEBUG" == 'true' ] && set -x
set -e

echo "------------------------------------------------------------------------------"
echo "[Init] Remove any old dist files from previous runs"
echo "------------------------------------------------------------------------------"

echo "rm -rf $template_dist_dir"
rm -rf $template_dist_dir
echo "mkdir -p $template_dist_dir"
mkdir -p $template_dist_dir
echo "rm -rf $build_dist_dir"
rm -rf $build_dist_dir
echo "mkdir -p $build_dist_dir"
mkdir -p $build_dist_dir
echo "rm -rf $staging_dist_dir"
rm -rf $staging_dist_dir
echo "mkdir -p $staging_dist_dir"
mkdir -p $staging_dist_dir

echo "------------------------------------------------------------------------------"
echo "NPM Install in the source folder"
echo "------------------------------------------------------------------------------"

# Install the npm install in the source folder
echo "cd $source_dir"
cd $source_dir
echo "npm install"
npm install

mv solution.context.json.template solution.context.json


echo "cd "$source_dir""
cd "$source_dir"

chmod +x ./install_dependencies.sh && ./install_dependencies.sh

#replace assets_bucket_name
sed -i'' -e s#MY_ASSETS_BUCKET_NAME#$DIST_OUTPUT_BUCKET#g solution.context.json

# Run 'cdk synth' to generate raw solution outputs
node_modules/aws-cdk/bin/cdk synth --context solution_version=$DIST_VERSION --asset-metadata false --path-metadata false >$staging_dist_dir/secure-media-delivery-at-the-edge-on-aws.yaml


mv cdk.out/* $staging_dist_dir

#zipping the assets
i=1
cd $staging_dist_dir
echo "Searching for assets..."
for cdk_key in `ls  | grep '^asset'`; do
    wordtoremove="asset."
    item=${cdk_key//$wordtoremove/}
    asset_new_name="myasset_$i.zip"

    if [[ $item == *zip ]];
    then
        mv $cdk_key $asset_new_name
        current_asset_name=$item
    else
        cd $cdk_key
        echo "zipping $cdk_key to $asset_new_name"
        zip -qr $asset_new_name .
        cd ..
        mv $cdk_key/$asset_new_name $asset_new_name
        rm -rf $cdk_key
        current_asset_name=$item.zip
    fi

    sed -i'' -e "s#$current_asset_name#$SOLUTION_NAME/$DIST_VERSION/$asset_new_name#g" $staging_dist_dir/secure-media-delivery-at-the-edge-on-aws.yaml

    let "i+=1"

done


echo "Assets zipped"

############ End tweak template #############


# Remove unnecessary output files
echo "cd $staging_dist_dir"

cd $staging_dist_dir
ls

echo "------------------------------------------------------------------------------"
echo "[Packing] Template artifacts"
echo "------------------------------------------------------------------------------"

# Move outputs from staging to template_dist_dir
echo ls $staging_dist_dir/
ls $staging_dist_dir/
echo "Move outputs from staging to template_dist_dir"

echo "cp $template_dir/*.template $template_dist_dir/"
cp $staging_dist_dir/secure-media-delivery-at-the-edge-on-aws.yaml $template_dist_dir/secure-media-delivery-at-the-edge-on-aws.template

rm secure-media-delivery-at-the-edge-on-aws.yaml

echo cp $cdk synth --asset-metadata /*.zip $build_dist_dir/
cp $staging_dist_dir/*.zip $build_dist_dir/



