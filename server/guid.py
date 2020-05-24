import uuid;

def getGUID() -> str:
    return str(uuid.uuid4());

def nullGUID() -> str:
    return ''.join(['0' for i in range(36)]);
