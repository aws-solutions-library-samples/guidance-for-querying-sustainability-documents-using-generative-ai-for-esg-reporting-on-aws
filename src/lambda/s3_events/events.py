#! /bin/bash
# -*- coding: utf-8 -*-
"""
"""
import json
import logging
import os

import boto3


if len(logging.getLogger().handlers) > 0:
    logging.getLogger().setLevel(logging.DEBUG)
else:
    logging.basicConfig(level=logging.DEBUG)


S3_BUCKET_METADATA = os.getenv('S3_BUCKET_METADATA')


def handler(event, context):
    """
    """
    logging.info('Starting S3 Trigger proxy handler')

    key = event['Records'][0]['s3']['object']['key']
    metadata, filename = key.split('/')
    path = 'metadata/{}.metadata.json'.format(key)

    logging.info('metadata: {}'.format(metadata))
    logging.info('filename: {}'.format(filename))

    data = {
        'Attributes': {
            'sust_category': metadata
        }
    }

    logging.info('Writting file to s3 client')
    logging.info('s3 destination:  {}'.format(S3_BUCKET_METADATA))
    logging.info('s3 patyh:  {}'.format(path))

    s3 = boto3.client('s3')
    s3.put_object(
        Body=json.dumps(data),
        Bucket=S3_BUCKET_METADATA,
        Key=path
    )

    logging.info('status: 200')

    return {
        'statusCode': 200,
        'body': json.dumps('Metadata uploaded successfully!')
    }
