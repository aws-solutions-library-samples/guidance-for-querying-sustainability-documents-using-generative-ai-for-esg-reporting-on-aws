#! /bin/bash
# -*- coding: utf-8 -*-
"""
"""
import boto3
import json
import logging
import os
import uuid

import bedrock_action as ba


if len(logging.getLogger().handlers) > 0:
    logging.getLogger().setLevel(logging.DEBUG)
else:
    logging.basicConfig(level=logging.DEBUG)


REGION = os.getenv('AWS_REGION')
KENDRA_INDEX_ID = os.getenv('KENDRA_INDEX_ID')

DB_CLIENT = boto3.client('dynamodb', region_name=REGION)


def handler(event, context):
    """
    """
    logging.info('Starting API proxy handler')
    logging.info('Event: {}'.format(event))
    logging.info('Context: {}'.format(context))

    id = str(uuid.uuid4())

    match event['httpMethod']:
        case 'GET':
            code = 200
            summary = 'GET method not implemented'
            logging.info('httpMethod: {}'.format(event['httpMethod']))
        case 'POST':
            body = json.loads(event['body'])
            logging.debug('POST Queury: {}'.format(body))
            summary = ba.post(body, id, DB_CLIENT)
            code = 200
            logging.info('httpMethod: {}'.format(event['httpMethod']))
        case _:
            code = 500
            logging.error('httpMethod: {}'.format(event['httpMethod']))
            logging.error('Uncaught API gateway method')

    response = {
        'statusCode': code,
        'body': json.dumps({
            'uuid': id,
            'boto3_version': boto3.__version__,
            'kendra_index_id': KENDRA_INDEX_ID,
            'answer': summary
        }),
        'headers': {
            'content-type': 'application/json'
        }
    }
    return response
