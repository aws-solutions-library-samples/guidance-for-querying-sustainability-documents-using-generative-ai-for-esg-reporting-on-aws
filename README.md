# Guidance for Querying Sustainability Documents Using Generative AI for ESG Reporting on AWS

**Table of Contents**

- [Project Description](#project-description)
  - [Architecture Diagram](#architeceture-diagram)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Build the Infrastructure](#build-the-infrastructure)
  - [Run the Service](#run-the-service)
- [Cleanup](#cleaup)

## Overview

[This Guidance demonstrates](https://aws.amazon.com/solutions/guidance/querying-sustainability-documents-using-generative-ai-for-esg-reporting-on-aws/) how to implement a Retrieval-Augmented Generation (RAG) process for your authoritative knowledge base, specifically addressing environmental, social, and governance (ESG) requirements. 
It combines the capabilities of Amazon Kendra and a large language model (LLM) on Amazon Bedrock—a fully managed service offering a choice of high-performing foundation models.
This guidance uses the [AWS Cloud Development Kit (AWS CDK)](https://aws.amazon.com/cdk/) to deploy infrastruvture assets to build their sustainability large language model knowledge base and.
Designed to provide rapid insights from dense sustainability documents like corporate reports, regulatory filings, and standards, this guidance streamlines navigation of diverse ESG information. 
This allows you to rapidly analyze extensive text data, summarize key insights, and draw conclusions for your ESG reporting needs.

![example-deploy](./assets/figs/video.gif)

This project is built and maintained by [Marco Masciola](https://www.linkedin.com/in/marcomasciola/) and [Sundeep Ramachandran](https://www.linkedin.com/in/rsundeep/).

## Capabilities and Key Benefits

The following list covers current capabilities as of today:

* Accepts a PDF file in any format to create a knowledge base using [Amazon Kendra](https://aws.amazon.com/kendra/)
* Easily switch [Amazon Bedrock foundation models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html) at runtime
* **Automated** infrastructure deployment using AWS CDk to reduce manual tasks and errors during deployment
* Built using serverless architecture to provide high **Scalability** and high availability, durability, and resilience
* OLicensed under Apache License Version 2.0 as an open source project
* Knowledge base can be triggered on a triggered 
* Authentication and authorization provided through [Amazon Cognito](https://aws.amazon.com/cognito/)

## Architecture Diagram

![arch-diagram](./assets/figs/arch-diagram.png "Guidance Architecture Diagram")

## Cost

This section is for a high-level cost estimate. Think of a likely straightforward scenario with reasonable assumptions based on the problem the Guidance is trying to solve. If applicable, provide an in-depth cost breakdown table in this section.
Start this section with the following boilerplate text:
You are responsible for the cost of the AWS services used while running this Guidance. As of  , the cost for running this Guidance with the default settings in the <Default AWS Region (Most likely will be US East (N. Virginia)) > is approximately $<n.nn> per month for processing (  records ).
Replace this amount with the approximate cost for running your Guidance in the default Region. This estimate should be per month and for processing/serving resonable number of requests/entities.
Suggest you keep this boilerplate text:
We recommend creating a Budget through AWS Cost Explorer to help manage costs. Prices are subject to change. For full details, refer to the pricing webpage for each AWS service used in this Guidance.

# Getting Started

This Guidance uses aws-cdk. 
If you are using aws-cdk for first time, please perform the be sure to bootstrap your environment. 
In case you are using aws-cdk for the first time, you can refer to the [Getting started with AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) guide. 

## Prerequisites

Third-party tools (If applicable)
List any installable third-party tools required for deployment.

Clone the repository:

```bash
git clone git@ssh.gitlab.aws.dev:sustainability-collab/genai-sus-autoreport.git
```

Set up python environment:

```bash
python -m venv .genai-env
source .genai-env/bin/activate
pip install -r requirements.txt
```

Install pre-commit hooks:

```bash
pre-commit install
```

Install Node dependencies:

```bash
npm install i -D
```

## Build the Infrastructure

#### 1 - Build the Lambda layers

```bash
pip install -r src/lambda/requirements.txt --target ./src/libs/python --platform manylinux2014_aarch64 --only-binary=:all: --python-version 3.12 --implementation cp --upgrade
```

#### 2 - Deploy infrastructure

```bash
cdk bootstrap
cdk synth
cdk deploy --all --require-approval never
```

#### 3 - Retrieve from the stack resource names

Resource names are output during the `cdk deploy` step.
But you can retrieve resource names by running this command:

```bash
source resource.sh

```
* `S3AssetBucketName`
* `EndpointURL`
* `CognitoUserPoolID`
* `CognitoUserClientPoolID`
* `KendraIndexID`
* `KendraDataSourceID`

These resource ID's will be substituted in subsequent steps.

#### 4 - Create a user in AWS Cognito

Substitute the `CognitoUserPoolID` from the above step into the following command.
Define a `username` with one time `password` login credentials:

```bash
aws cognito-idp admin-create-user --user-pool-id <CognitoUserPoolID> --username <username> --temporary-password "<password>"
```

Make sure the password complexity meets the [policy requirements in auth.ts](src/infrastructure/bin/auth.ts#L48).

#### 5 - Activate a users in AWS Cognito

This step validates the user created in step 5:

```bash
aws cognito-idp admin-set-user-password --user-pool-id <CognitoUserPoolID> --username <username> --password "<password>" --permanent
```

The user status will transition from the 'pending' state to the 'confirmed' state.

#### 6 - Upload sustainability document to S3 assets bucket

Download the [IFRS Sustainability Standards and ESRS reconciliation](https://www.efrag.org/Assets/Download?assetUrl=%2Fsites%2Fwebpublishing%2FSiteAssets%2F22%2520Appendix%2520V%2520Comparison%2520of%2520IFRS%2520and%2520ESRS%25201%2520and%25202.pdf) table PDF document and save it to the folder `./assets/sust-resports`.
The downloaded file name should have `Comparison_of_IFRS_and_ESRS_1and_2.pdf`.
Nest, substitute `<S3AssetBucketName>` from step 4 in the following command and execute it:

```bash
aws s3 cp ./assets/sust-reports/Comparison_of_IFRS_and_ESRS_1and_2.pdf s3://<S3AssetBucketName>/corp-sust-reports/
```

This will upload the sustainability report into the S3 assets bucket.
This triggers a Lambda event to create the metadata file in `s3://<S3AssetBucketName>/metadata/corp-sust-reports/`

#### 7 - Synchronize Kendra Data Sources

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

#### 1 - Authenticate and Generate JSON Web Token

A JW token must be generated to authenticate users before running the Q&A service.
This token, which has a 1 hour expiration by default, is generated using the [authentication service included in this repository](./auth/auth-service.ts):

```bash
npx ts-node auth/auth-service.ts --pool=<CognitoUserPoolID> --client=<CognitoUserClientPoolID> --username=<username> --password='<password>'
```

The `password` field should be included in quotes.

#### 2 - Run the Service

Open the file [retriever.http](retriever.http) and update line 1 to include the API Gateway endpoint `<EndpointURL>`.
Line 2 [retriever.http](retriever.http) should include the JW token generate in the previous step.
On line 9 you can ask a sustainability related question, such as:
 
* What is the IFRS standard for sustainability?
* How does IFRS S1 help investors with sustainability reporting?

Then click on the "Send Request" text above line 4 to submit the query. 


# Cleanup

The infrastructure is destroyed using the following command:

```bash
cdk destroy --all
```

The following services must be manually destroyed in the AWS console since the CDK stack retains certain services for auditing and data retention purposes:

* [S3 access logs bucket](https://s3.console.aws.amazon.com/s3/home?) prefixed by `sust-assets-logs-*`
* [DynamoDB table](https://us-west-1.console.aws.amazon.com/dynamodbv2/home?#tables)
* [Amazon Cognito](https://us-west-2.console.aws.amazon.com/cognito/v2/idp/user-pools?) user pools
