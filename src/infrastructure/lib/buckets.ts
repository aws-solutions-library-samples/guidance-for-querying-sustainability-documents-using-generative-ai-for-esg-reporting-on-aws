#!/usr/bin/env node
import { join } from 'path';

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import {
    Bucket,
    BlockPublicAccess
} from 'aws-cdk-lib/aws-s3';

import {
    BucketDeployment,
    Source
} from 'aws-cdk-lib/aws-s3-deployment';


interface BucketStackProps extends cdk.StackProps {
    suffix: string
}

export class BucketStack extends cdk.Stack {

    public readonly assetBucketArn: string;
    public readonly bucket: Bucket;

    constructor(scope: Construct, id: string, props: BucketStackProps) {
        super(scope, id, props);

        const s3expiration = new cdk.CfnParameter(this, 's3expiration', {
            default: 90,
            minValue: 1,
            maxValue: 365,
            type: 'Number'
        })

        const accessLogsBucket = new Bucket(this, 'AccessLogsBucket', {
            bucketName: `sust-assets-logs-${props.suffix}`,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true
        });

        const assetBucket = new Bucket(this, 'AssetBucket', {
            bucketName: `sust-assets-${props.suffix}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            serverAccessLogsBucket: accessLogsBucket,
            serverAccessLogsPrefix: 'logs',
            enforceSSL: true,
            lifecycleRules: [{
                expiration: cdk.Duration.days(s3expiration.valueAsNumber)
            }]
        });

        this.assetBucketArn = assetBucket.bucketArn;
        this.bucket = assetBucket;

        const deployment = new BucketDeployment(this, 'SustReports', {
            sources: [Source.asset(join(__dirname, '..', '..', '..', 'assets', 'notes'))],
            destinationBucket: assetBucket,
            destinationKeyPrefix: 'corp-sust-reports'
        });

        new cdk.CfnOutput(this, 'AssetBucketName', {
            value: assetBucket.bucketName,
            exportName: 'S3AssetBucketName'
        });

        new cdk.CfnOutput(this, 'StackAccount', {
            exportName: 'StackAccount',
            value: this.account
        });

        new cdk.CfnOutput(this, 'StackRegion', {
            exportName: 'StackRegion',
            value: this.region
        });
    }
}
