#! /bin/bash
# -*- coding: utf-8 -*-
"""
"""
import json
import logging
import os
import string

import boto3


REGION = os.getenv('AWS_REGION')
KENDRA_INDEX_ID = os.getenv('KENDRA_INDEX_ID')
TABLE_NAME = os.getenv('TABLE_NAME')


if len(logging.getLogger().handlers) > 0:
    logging.getLogger().setLevel(logging.DEBUG)
else:
    logging.basicConfig(level=logging.DEBUG)


FACET_PROMPT = string.Template("""
\n\nHuman: You are a bot that will help find the metadata for the question.
Your response is limited to the following two options: "corp-sust-report" and
"not-sure". If the question is related to a sustainability  framework like
TCFD, CSRD, GRI, SASB, IFRS or others, reply with "corp-sust-report".
---
QUESTION: ${query}

\n\nAssistant:""")


SUMMARY_PROMPT = string.Template("""
\n\nHuman: Answer the following question based on the context below.
---
QUESTION: ${query}
---
CONTEXT:
${context}

\n\nAssistant:""")


def _facet(payload):
    """
    """
    bedrock_client = boto3.client('bedrock-runtime', REGION)

    body = json.dumps({
        'prompt': FACET_PROMPT.substitute(query=payload['question']),
        'max_tokens_to_sample': payload['max_tokens'],
        'temperature': payload['temperature'],
        'stop_sequences': ['\n\nHuman:']
    })

    response = bedrock_client.invoke_model(
        body=body,
        modelId=payload['model']
    )
    response_body = json.loads(response.get('body').read())

    return (response_body.get('completion'))


def _kendra_rag(question, metadata):
    """
    """
    kendra_client = boto3.client('kendra', REGION)

    result = kendra_client.retrieve(
        QueryText=question,
        IndexId=KENDRA_INDEX_ID,
        AttributeFilter={'AndAllFilters':
                         [
                             {
                                 'EqualsTo': {
                                     'Key': 'sust_category',
                                     'Value': {'StringValue': metadata}
                                 }
                             }
                         ]
                         }
    )
    chunks = [r['Content'] for r in result['ResultItems']]
    joined_chunks = '\n'.join(chunks)
    return (joined_chunks)


def _summarize(payload, rag_context):
    """
    """
    bedrock_client = boto3.client('bedrock-runtime', REGION)

    prompt = SUMMARY_PROMPT.substitute(
        query=payload['question'],
        context=rag_context
    )

    body = json.dumps(
        {
            'prompt': prompt,
            'max_tokens_to_sample': payload['max_tokens'],
            'temperature': payload['temperature'],
            'stop_sequences': ['\n\nHuman:']
        }
    )

    response = bedrock_client.invoke_model(
        body=body,
        modelId=payload['model']
    )
    response_body = json.loads(response.get('body').read())
    return (response_body.get('completion'))


def _write_to_db(query, uuid, db_client: boto3.client):
    """
    """
    response = db_client.put_item(
        TableName=TABLE_NAME,
        Item={
            'uuid': {
                'S': uuid,
            },
            'query': {
                'S': query
            }
        }
    )
    return response


def post(payload, uuid, db_client):
    metadata = _facet(payload)
    context = _kendra_rag(payload['question'], metadata)
    summary = _summarize(payload, context)
    _ = _write_to_db(summary, uuid, db_client)
    logging.debug(metadata)
    return summary
