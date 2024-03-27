#!/bin/bash
aws cloudformation describe-stacks --stack-name BucketStack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "S3AssetBucketName", "value": .S3AssetBucketName}] | from_entries'
aws cloudformation describe-stacks --stack-name APIStack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "EndpointURL", "value": .EndpointURL}] | from_entries'
aws cloudformation describe-stacks --stack-name AuthStack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "CognitoUserPoolID", "value": .CognitoUserPoolID}] | from_entries'
aws cloudformation describe-stacks --stack-name AuthStack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "CognitoUserClientPoolID", "value": .CognitoUserClientPoolID}] | from_entries'
aws cloudformation describe-stacks --stack-name KendraIndexStack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "KendraIndexID", "value": .KendraIndexID}] | from_entries'
aws cloudformation describe-stacks --stack-name KendraDataSourceStack | jq -r '.Stacks[0].Outputs | map({ (.ExportName): .OutputValue }) | add | [{"key": "KendraDataSourceID", "value": .KendraDataSourceID}] | from_entries'
