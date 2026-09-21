import re
import uuid

_GUID_PATTERN = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')

def getGUID() -> str:
    return str(uuid.uuid4())

def nullGUID() -> str:
    return ''.join(['0' for i in range(36)])

# strict format check; anything that is not a str is invalid
def isGUID(value) -> bool:
    return isinstance(value, str) and _GUID_PATTERN.match(value) is not None
