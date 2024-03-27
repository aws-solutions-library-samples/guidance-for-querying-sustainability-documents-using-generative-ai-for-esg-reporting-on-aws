![pipeline](https://gitlab.aws.dev//sustainability-collab/genai-sus-autoreport/badges/main/pipeline.svg)

# Sustainability Q&A Service using Generative AI and AWS Bedrock

**Table of Contents**

- [Project Description](#project-description)
  - [Architeceture Diagram](#architeceture-diagram)
  - [AWS Services Used](#aws-services-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Build the Infrastructure](#build-the-infrastructure)
  - [Run the Service](#run-the-service)
- [Cleanup](#cleaup)

This project is built and maintained by [Marco Masciola](https://www.linkedin.com/in/marcomasciola/) and [Sundeep Ramachandran](https://www.linkedin.com/in/rsundeep/).

# Project Description

## Architeceture Diagram

![arch-diagram](./assets/figs/arch-diagram.png "Guidance Architecture Diagram")

## AWS Services Used

@todo: include

# Getting Started

## Prerequisites

Clone the repository:

```bash
$ git clone git@ssh.gitlab.aws.dev:sustainability-collab/genai-sus-autoreport.git
```

Set up python environment:

```bash
$ python -m venv genai-env
$ source genai-env/bin/activate
$ pip install -r requirements.txt
```

Install pre-commit hooks:

```bash
$ pre-commit install
```

Install Node depedencies:

```bash
$ npm install i -D
```

## Build the Infrastructure

### 1: Build the Lambda layers

```bash
pip install -r src/lambda/requirements.txt --target ./src/libs/python --platform manylinux2014_aarch64 --only-binary=:all: --python-version 3.12 --implementation cp --upgrade
```

### 2: Deploy infrastructure

```bash
cdk synth
cdk deploy --all --require-approval never
```

### 3: Retrieve from the stack resource names

Resource names are output durring the `cdk deploy` step.
But you can retreive resource names by runnining this command:

```bash
source resources.sh
```
* `S3AssetBucketName`
* `EndpointURL`
* `CognitoUserPoolID`
* `CognitoUserClientPoolID`
* `KendraIndexID`
* `KendraDataSourceID`

These resource ID's will be substituted in subsequent steps.

### 4: Create a user in AWS Cognito

Substitute the `CognitoUserPoolID` from the above step into the following command.
Define a `username` with one time `password` login credentials:

```bash
aws cognito-idp admin-create-user --user-pool-id <CognitoUserPoolID> --username <username> --temporary-password "<password>"
```

Make sure the password complexity meets the [policy requirements in auth.ts](src/infrastructure/bin/auth.ts#L48).

### 5: Activate a users in AWS Cognito

This step validates the user created in step 5:

```bash
aws cognito-idp admin-set-user-password --user-pool-id <CognitoUserPoolID> --username <username> --password "<password>" --permanent
```

The user status will transition from the 'pending' state to the 'confirmed' state.

### 6: Upload documents to S3 assets bucket

Substitute `<S3AssetBucketName>` from step 4 in the following command and execute it:

```bash
aws s3 cp ./assets/sust-reports/Comparison_of_IFRS_and_ESRS_1and_2.pdf s3://<S3AssetBucketName>/corp-sust-reports/
```

This will upload the sustainability report into the S3 assets bucket.
This triggers a Lambda event to create the metadata file in `s3://<S3AssetBucketName>/metadata/corp-sust-reports/`

### 7: Synchronize Kendra Data Sources

Next, we will synchronize AWS Kendra Data Source with the Kendra Index by running:

```bash
aws kendra start-data-source-sync-job --id <KendraDataSourceID> --index-id <KendraIndexID>
```

The job will enter the `SYNCHING_INDEXING` state and will completed in a minutes.
You can check the job status by executing:

```bash
aws kendra list-data-source-sync-jobs --id <KendraDataSourceID> --index-id <KendraIndexID>
```

You are ready to proceed to the next step when `Status` is in the `SUCCEEDED` state.

## Run the Service

### 1: Authenticate and Generate JSON Web Token

A JW token must be generated to authenticate users before running the Q&A service.
This token, which has a 1 hour expiration by default, is generated using the [authentication service included in this repository](./auth/auth-service.ts):

```bash
npx ts-node auth/auth-service.ts --pool=<CognitoUserPoolID> --client=<CognitoUserClientPoolID> --username=<username> --password='<password>'
```

The `password` field should be included in quotes.

### 2: Run the Service

Open the file [retriever.http](retriever.http) and update line 1 to include the API Gateway enpoint `<EndpointURL>`.
Line 2 [retriever.http](retriever.http) should include the JW token generate in the previous step.
On line 9 you can ask a sustainbility related question, such as:

* What is the IFRS standard for sustainability?
* How does IFRS S1 help investors with sustainability reporting?

# Cleanup

The infrastructure is destroyed using the following command:

```bash
cdk destroy --all
```

The following services must be manually destroyed in the AWS console since the CDK stack retains certain services for auditing and data retention purposes:

* [S3 access logs bucket](https://s3.console.aws.amazon.com/s3/home?) prefixed by `sust-assets-logs-*`
* [DynamoDB table](https://us-west-1.console.aws.amazon.com/dynamodbv2/home?#tables)
* [Amazon Cognito](https://us-west-2.console.aws.amazon.com/cognito/v2/idp/user-pools?) user pools
