"""QA-only CFF YAML parsing and validation; no product writes or network requests.

Unmodified CFF 1.2.0 schema: Citation File Format project, CC BY 4.0.
Source: https://github.com/citation-file-format/citation-file-format/blob/1.2.0/schema.json
License: https://github.com/citation-file-format/citation-file-format/blob/1.2.0/LICENSE
"""
import datetime
import hashlib
import json
from pathlib import Path
import sys

import jsonschema
import yaml

SCHEMA_HASH = '0b8d22140da702d766df318dcff3a91af2f39521298dcf36d76315fd99cc169b'


class UniqueSafeLoader(yaml.SafeLoader):
    pass


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError('Duplicate YAML key: ' + str(key))
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueSafeLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


def parse_and_validate(text):
    schema_file = Path(__file__).resolve().parents[1] / 'fixtures/cff-1.2.0.schema.json'
    # Git may check out this text fixture as CRLF on Windows. Normalize only
    # line endings before comparing with the official, unchanged LF schema.
    schema_bytes = schema_file.read_bytes().replace(b'\r\n', b'\n')
    if hashlib.sha256(schema_bytes).hexdigest() != SCHEMA_HASH:
        raise ValueError('Official CFF schema changed')
    value = yaml.load(text, Loader=UniqueSafeLoader)
    if not isinstance(value, dict):
        raise ValueError('CFF must be a YAML mapping')
    released = value.get('date-released')
    # PyYAML resolves unquoted YYYY-MM-DD to date. The CFF JSON schema expects
    # its ISO string representation; timestamps and arbitrary coercions fail.
    if type(released) is datetime.date:
        value['date-released'] = released.isoformat()
    schema = json.loads(schema_bytes)
    jsonschema.Draft7Validator.check_schema(schema)
    jsonschema.Draft7Validator(schema, format_checker=jsonschema.FormatChecker()).validate(value)
    return value


if __name__ == '__main__':
    try:
        text = sys.stdin.read() if sys.argv[1:] == ['--stdin'] else Path(sys.argv[1]).read_text(encoding='utf-8-sig')
        print(json.dumps(parse_and_validate(text), ensure_ascii=True))
    except Exception as error:
        print('CFF INVALID: ' + str(error), file=sys.stderr)
        sys.exit(1)
