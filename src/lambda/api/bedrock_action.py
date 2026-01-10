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
You are a bot that will help find the metadata for the question.
Your response is limited to the following two options: "corp-sust-reports" and
"not-sure". If the question is related to a sustainability  framework like
TCFD, CSRD, GRI, SASB, IFRS or others, reply with "corp-sust-reports".
---
QUESTION: 
${query}
""")


SUMMARY_PROMPT = string.Template("""
Answer the following question based on the context below.
---
QUESTION: 
${query}
---
CONTEXT:
${context}
""")


def _facet(payload):
    """
    """
    bedrock_client = boto3.client('bedrock-runtime', REGION)

    body = json.dumps({
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': payload['max_tokens'],
        'temperature': payload['temperature'],
        'top_p': 0.5,
        'messages': [{
            'role': 'user',
            'content': [{
                'type': 'text', 
                'text': FACET_PROMPT.substitute(query=payload['question']),
            }]
        }],
    })

    response = bedrock_client.invoke_model(
        body=body,
        modelId=payload['model'],
        accept='application/json',
        contentType='application/json'
    )
    response_body = json.loads(response.get('body').read())
    return response_body['content'][0]['text']


def _kendra_rag(question, metadata):
    """
    """
    kendra_client = boto3.client('kendra', REGION)

    result = kendra_client.retrieve(
        QueryText=question,
        IndexId=KENDRA_INDEX_ID
    )

    payload = {"context": []}
    for r in result['ResultItems']:
        d = {
            "document_file_name": r["DocumentTitle"],
            "document_file_location": r["DocumentId"],
            "citation_page": [
                d["Value"]["LongValue"] 
                for d in r["DocumentAttributes"] 
                if d["Key"] == "_excerpt_page_number"
            ][0],   
            "summary": r["Content"]
        }
        payload["context"].append(d)    
    
    return json.dumps(payload)


def _summarize(payload, rag_context):
    """
    """
    bedrock_client = boto3.client('bedrock-runtime', REGION)

    prompt = SUMMARY_PROMPT.substitute(
        query=payload['question'],
        context=rag_context
    )

    body = json.dumps({
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': 3000,
        'temperature': 0.5,
        'top_p': 0.5,
        'messages': [{
            'role': 'user',
            'content': [{
                'type': 'text', 
                'text': prompt
            }]
        }],
    })

    response = bedrock_client.invoke_model(
        body=body,
        modelId=payload['model'],
        accept='application/json',
        contentType='application/json'
    )

    response_body = json.loads(response.get('body').read())
    return response_body['content'][0]['text']


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
    return summary
