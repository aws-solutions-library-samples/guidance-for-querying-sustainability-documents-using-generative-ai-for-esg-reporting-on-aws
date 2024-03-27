# -*- coding: utf-8 -*-
"""
"""
import json
import unittest

import api_proxy


class TestAskQuestions(unittest.TestCase):
    def test_handler(self):
        f = open('./src/lambda/events/api_proxy.json')
        event = json.load(f)
        r = api_proxy.handler(event, {})
        print(r)


if __name__ == '__main__':
    unittest.main()
