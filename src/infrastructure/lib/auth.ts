#!/usr/bin/env node
import { NagSuppressions } from 'cdk-nag';

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
    UserPool,
    UserPoolClient,
    AdvancedSecurityMode
} from 'aws-cdk-lib/aws-cognito';

interface AuthStackProps extends cdk.StackProps {
    suffix: string
}

export class AuthStack extends cdk.Stack {

    public userPool: UserPool;
    private userPoolClient: UserPoolClient;

    constructor(scope: Construct, id: string, props: AuthStackProps) {
        super(scope, id, props);

        this.setUserPool(props.suffix);
        this.setUserPoolClient();

        NagSuppressions.addResourceSuppressions(
            [this.userPool],
            [
                {
                    id: 'AwsSolutions-COG2',
                    reason: 'Temporary reason for suppressing'
                }
            ],
            true
        );
    }

    private setUserPool(suffix: string) {
        this.userPool = new UserPool(this, 'UserPool', {
            userPoolName: `sust-user-pool-${suffix}`,
            selfSignUpEnabled: true,
            advancedSecurityMode: AdvancedSecurityMode.ENFORCED,
            signInAliases: {
                username: true,
                email: true
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
            }
        });

        new cdk.CfnOutput(this, 'UserPoolID', {
            value: this.userPool.userPoolId,
            exportName: 'CognitoUserPoolID'
        })
    };

    private setUserPoolClient() {
        this.userPoolClient = this.userPool.addClient('UserPoolClient', {
            authFlows: {
                adminUserPassword: true,
                custom: true,
                userPassword: true,
                userSrp: true
            }
        });

        new cdk.CfnOutput(this, 'UserPoolClientID', {
            value: this.userPoolClient.userPoolClientId,
            exportName: 'CognitoUserClientPoolID'
        })
    }






}
