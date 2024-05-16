#!/usr/bin/env node
import 'source-map-support/register';
import {v4 as uuidv4} from 'uuid';

import { AwsSolutionsChecks } from 'cdk-nag';

import * as cdk from 'aws-cdk-lib';

import { APIStack } from '../lib/apigateway';
import { AuthStack  } from '../lib/auth';
import { BucketStack } from '../lib/buckets';
import { DynamoDBStack } from '../lib/db';
import { KendraDataSourceStack } from '../lib/kendra-data-source';
import { KendraIndexStack } from '../lib/kendra-index';
import { LambdaAPIStack } from '../lib/lambda-api';
import { LambdaEventStack } from '../lib/lambda-event';

import { supressStatements } from './utils'

let uuid = uuidv4().substring(0,8);;
const desc = 'Guidance for querying sustainability documents using generative ai for esg reporting on aws (SO9429)'


const app = new cdk.App();

const bucketStack = new BucketStack(app, 'BucketStack', {
    suffix: uuid,
    description: desc
});

const kendraIndexStack = new KendraIndexStack(app, 'KendraIndexStack', {
    suffix: uuid,
    description: desc
});

const kendraDataSourceStack = new KendraDataSourceStack(app, 'KendraDataSourceStack', {
    suffix: uuid,
    description: desc
});

const dbStack = new DynamoDBStack(app, 'DynamoDBStack', {
    suffix: uuid,
    description: desc
});

const lambdaEvent = new LambdaEventStack(app, 'LambdaTriggerStack', {
    bucket: bucketStack.bucket,
    suffix: uuid,
    description: desc
});

const lambdaAPIStack = new LambdaAPIStack(app, 'LambdaStack', {
    dbTableInterface: dbStack.tableInterface,
    suffix: uuid,
    description: desc
});

const authStack = new AuthStack(app, 'AuthStack', {
    suffix: uuid,
    description: desc
});

const apiStack = new APIStack(app, 'APIStack', {
    apiLambdaProxy: lambdaAPIStack.lambdaProxy,
    userPool: authStack.userPool,
    suffix: uuid,
    description: desc
});

kendraDataSourceStack.node.addDependency(bucketStack);
kendraDataSourceStack.node.addDependency(kendraIndexStack);
cdk.Aspects.of(app).add(new AwsSolutionsChecks());

supressStatements(bucketStack, lambdaEvent)
