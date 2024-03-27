#!/usr/bin/env node
import { NagSuppressions } from 'cdk-nag';

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import { Construct } from 'constructs';


interface KendraIndexStackProps extends cdk.StackProps {
    suffix: string
}


export class KendraIndexStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: KendraIndexStackProps) {
        super(scope, id, props);

        const kendraIndexRole = new iam.Role(this, 'KendraIndexRole', {
            roleName: `sust-kendra-index-role-${props.suffix}`,
            assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
        });

        const kendraIndex = new kendra.CfnIndex(this, 'KendraIndex', {
            name: `sust-kendra-index-${props.suffix}`,
            edition: 'DEVELOPER_EDITION',
            roleArn: kendraIndexRole.roleArn,
            documentMetadataConfigurations: [{
                name: `sust_category`,
                type: 'STRING_VALUE',
                search: {
                  displayable: true,
                  facetable: true,
                  searchable: true,
                  sortable: true,
                },
              }],
        });

        kendraIndexRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: ['*'],  // ['arn:aws:logs:us-west-2:767398009910:log-group:/aws/kendra/*']
                actions: [
                    'cloudwatch:PutMetricData',  // "*"
                    'logs:DescribeLogGroup',
                    'logs:DescribeLogGroups',  // "*"
                    'logs:CreateLogGroup',  // "arn:aws:logs:us-west-2:767398009910:log-group:/aws/kendra/*"
                    'logs:DescribeLogStreams', // "arn:aws:logs:us-west-2:767398009910:log-group:/aws/kendra/*:log-stream:*"
                    'logs:CreateLogStream',  // "arn:aws:logs:us-west-2:767398009910:log-group:/aws/kendra/*:log-stream:*"
                    'logs:PutLogEvents' // "arn:aws:logs:us-west-2:767398009910:log-group:/aws/kendra/*:log-stream:*"
                ]
            })
        );

        new cdk.CfnOutput(this, 'KendraIndexID', {
            value: kendraIndex.attrId,
            exportName: 'KendraIndexID'
        });

        new cdk.CfnOutput(this, 'KendraIndexRoleName', {
            value: kendraIndexRole.roleName,
            exportName: 'KendraIndexRoleName'
        });

        new cdk.CfnOutput(this, 'KendraIndexARN', {
            value: kendraIndex.attrArn,
            exportName: 'KendraIndexARN'
        });

        // suppress
        const supress = [{
			id: 'AwsSolutions-IAM5',
			appliesTo: [
				'Resource::*'],
			reason: 'This policy is generated @aws-cdk/aws-sagemaker-alpha construct.'
		}];

        NagSuppressions.addResourceSuppressions(
            [kendraIndexRole],
			supress,
			true
        );


    }
}
