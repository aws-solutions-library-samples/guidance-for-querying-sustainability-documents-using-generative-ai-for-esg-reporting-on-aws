#!/usr/bin/env node
import { join } from 'path';

import * as cdk from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

import {
    Code,
    Function as
    LambdaFunction,
    Runtime
} from 'aws-cdk-lib/aws-lambda';

import {
    PolicyStatement,
    Effect
} from 'aws-cdk-lib/aws-iam';

import {
    Bucket,
    EventType
} from 'aws-cdk-lib/aws-s3';

interface LambdaStackProps extends cdk.StackProps {
    bucket: Bucket,
    suffix: string
}

export class LambdaEventStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: LambdaStackProps) {
        super(scope, id, props);

        const s3EventHandler = new LambdaFunction(this, 'S3TriggerHandler', {
            functionName: `sust-s3-event-${props.suffix}`,
            code: Code.fromAsset(join(__dirname, '..', '..', 'lambda', 's3_events')),
            handler: 'events.handler',
            runtime: Runtime.PYTHON_3_12,
            timeout: cdk.Duration.minutes(5),
            architecture: Architecture.ARM_64,
            environment: {
                S3_BUCKET_METADATA: `${cdk.Fn.importValue('S3AssetBucketName')}`
            },
        });

        const bk = Bucket.fromBucketName(this, 'interfaceBucket', props.bucket.bucketName)

        s3EventHandler.addEventSource(new S3EventSource(bk as Bucket, {
              events: [
                  EventType.OBJECT_CREATED
              ],
              filters: [{
                  prefix: 'corp-sust-reports/',
                  suffix: '.pdf',
              }]
        }))

        s3EventHandler.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                's3:ListBucket',
                's3:ListAllMyBuckets',
                's3:PutObject',
                's3:GetObject',
                's3:DeleteObject'
            ],
            resources: [
                `arn:aws:s3:::${cdk.Fn.importValue('S3AssetBucketName')}/corp-sust-reports/*`,
                `arn:aws:s3:::${cdk.Fn.importValue('S3AssetBucketName')}/metadata/corp-sust-reports/*`
            ]
        }))
    }
}
