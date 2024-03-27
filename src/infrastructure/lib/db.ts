#!/usr/bin/env node
import { NagSuppressions } from 'cdk-nag';

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import {
    AttributeType,
    ITable,
    Table
} from 'aws-cdk-lib/aws-dynamodb';


interface DynamoDBStackProps extends cdk.StackProps {
    suffix: string
}


export class DynamoDBStack extends cdk.Stack {

    public readonly tableInterface: ITable

    constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
        super(scope, id, props);

        this.tableInterface = new Table(this, 'RetriverTable', {
            tableName: `sust-db-table-${props.suffix}`,
            partitionKey: {
                name: 'uuid',
                type: AttributeType.STRING
            }
        });

        NagSuppressions.addResourceSuppressions(
            [this.tableInterface],
            [{
                id: 'AwsSolutions-DDB3',
                reason: 'Temporary reason for suppressing'
            }],
            true
        );
    }
}
