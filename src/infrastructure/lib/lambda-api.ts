#!/usr/bin/env node
import { join } from 'path';

import * as cdk from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';

import {
    Code,
    Function as
    LambdaFunction,
    Runtime
} from 'aws-cdk-lib/aws-lambda';

import {
    LayerVersion,
    Architecture
} from 'aws-cdk-lib/aws-lambda';

import {
    PolicyStatement,
    Effect
} from 'aws-cdk-lib/aws-iam';

interface LambdaStackProps extends cdk.StackProps {
    dbTableInterface: ITable,
    suffix: string
}

export class LambdaAPIStack extends cdk.Stack {

    public readonly lambdaProxy: LambdaIntegration

    constructor(scope: Construct, id: string, props: LambdaStackProps) {
        super(scope, id, props);

        const lambdaLayers = new LayerVersion(this, 'LambdaLayer', {
            code: Code.fromAsset(join(__dirname, '..', '..', 'libs')),
            compatibleRuntimes: [Runtime.PYTHON_3_12]
        })

        const proxyHandler = new LambdaFunction(this, 'ProxyHandler', {
            functionName: `sust-api-proxy-${props.suffix}`,
            currentVersionOptions: {
              removalPolicy: cdk.RemovalPolicy.DESTROY
            },
            timeout: cdk.Duration.minutes(2),
            architecture: Architecture.ARM_64,
            runtime: Runtime.PYTHON_3_12,
            handler: 'api_proxy.handler',
            code: Code.fromAsset(join(__dirname, '..', '..', 'lambda', 'api')),
            layers: [lambdaLayers],
            environment: {
                TABLE_NAME: props.dbTableInterface.tableName,
                KENDRA_INDEX_ID: cdk.Fn.importValue('KendraIndexID')
            },
        })

        proxyHandler.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'bedrock:GetAgent',
                'bedrock:InvokeAgent',
                'bedrock:InvokeModel',
                'kendra:ListAccessControlConfigurations',
                'kendra:Query',
                'kendra:GetQuerySuggestions',
                'kendra:Retrieve',
                's3:ListBucket',
                's3:ListAllMyBuckets',
                's3:PutObject',
                's3:GetObject',
                's3:DeleteObject'
            ],
            resources: [
                `arn:aws:s3:::${cdk.Fn.importValue('S3AssetBucketName')}/corp-sust-reports/`,
                `arn:aws:s3:::${cdk.Fn.importValue('S3AssetBucketName')}/metadata/corp-sust-reports/`,
                `arn:aws:iam::${cdk.Fn.importValue('StackAccount')}:role/${cdk.Fn.importValue('KendraIndexRoleName')}`,
                `arn:aws:kendra:${cdk.Fn.importValue('StackRegion')}:${cdk.Fn.importValue('StackAccount')}:index/${cdk.Fn.importValue('KendraIndexID')}`,
                `arn:aws:bedrock:${cdk.Fn.importValue('StackRegion')}::foundation-model/anthropic.claude-v2`,
                `arn:aws:bedrock:${cdk.Fn.importValue('StackRegion')}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
                `arn:aws:bedrock:${cdk.Fn.importValue('StackRegion')}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
                `arn:aws:bedrock:${cdk.Fn.importValue('StackRegion')}::foundation-model/anthropic.claude-instant-v1`
            ]
        }))

        proxyHandler.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'dynamodb:PutItem',
            ],
            resources: [
                props.dbTableInterface.tableArn
            ]
        }))

        this.lambdaProxy = new LambdaIntegration(proxyHandler)

        NagSuppressions.addResourceSuppressions(
            [proxyHandler],
            [{
                id: 'AwsSolutions-IAM4',
                reason: 'Temporary reason for suppressing',
                appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
                ]
            }],
            true
        );

    }

}
