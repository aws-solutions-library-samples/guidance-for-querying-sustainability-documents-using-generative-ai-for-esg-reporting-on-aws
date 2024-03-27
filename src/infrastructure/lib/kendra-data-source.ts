#!/usr/bin/env node
import { NagSuppressions } from 'cdk-nag';

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import { Construct } from 'constructs';


interface KendraDataSourceStackProps extends cdk.StackProps {
    suffix: string
}

export class KendraDataSourceStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: KendraDataSourceStackProps) {
        super(scope, id, props);

        const kendraDataSourceRole = new iam.Role(this, 'KendraDataSourceRole', {
            roleName: `sust-kendra-data-source-role-${props.suffix}`,
            assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
        });

        kendraDataSourceRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: [`arn:aws:s3:::${cdk.Fn.importValue('S3AssetBucketName')}/*`],
                actions: [
                    's3:GetObject'
                ]
            })
        );

        kendraDataSourceRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: [`arn:aws:s3:::${cdk.Fn.importValue('S3AssetBucketName')}`],
                actions: [
                    's3:ListBucket'
                ]
            })
        );

        kendraDataSourceRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: [`arn:aws:kendra:${cdk.Fn.importValue('StackRegion')}:${cdk.Fn.importValue('StackAccount')}:index/${cdk.Fn.importValue('KendraIndexID')}`],
                actions: [
                    'kendra:BatchPutDocument',
                    'kendra:BatchDeleteDocument'
                ]
            })
        );

        const kendraDataSource = new kendra.CfnDataSource(this, 'KendraDataSource', {
            indexId: cdk.Fn.importValue('KendraIndexID'),
            name: `sust-kendra-data-source-${props.suffix}`,
            type: 'S3',
            dataSourceConfiguration: {
                s3Configuration: {
                    bucketName: cdk.Fn.importValue('S3AssetBucketName')
                }
            },
            languageCode: 'en',
            roleArn: kendraDataSourceRole.roleArn
        });

        new cdk.CfnOutput(this, 'KendraDataSourceID', {
            exportName: 'KendraDataSourceID',
            value: kendraDataSource.attrId
        });

        const supress = [{
			id: 'AwsSolutions-IAM5',
			appliesTo: [
				'Resource::arn:aws:s3:::S3AssetBucketName/*'
            ],
			reason: 'This policy is generated @aws-cdk/aws-sagemaker-alpha construct.'
		}];

        NagSuppressions.addResourceSuppressions(
            [kendraDataSourceRole],
			supress,
			true
        );

    }
}
