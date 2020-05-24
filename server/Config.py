class Config:

    # db variables
    host = None;
    port = None;
    user = None;
    password = None;
    db = None;
    # used to start up the server
    hostip = None;
    tokenlifetime = None;
    allowedhosts = [];
    # keys
    rsaprivatekey = None;
    rsapublickey = None;
    secretkey = None;

    def __init__(self, configJSON, cryptJSON):
        # setting db variables
        Config.host = configJSON['host'];
        Config.port = configJSON['port'];
        Config.user = configJSON['user'];
        Config.password = configJSON['password'];
        Config.db = configJSON['db'];
        # setting server variables
        Config.hostip = configJSON['hostip'];
        Config.tokenlifetime = configJSON['tokenlifetime'];
        Config.allowedhosts = configJSON['allowedhosts'];
        print(Config.allowedhosts);
        # setting keys
        Config.rsaprivatekey = cryptJSON['rsaprivatekey'];
        Config.rsapublickey = cryptJSON['rsapublickey'];
        Config.secretkey = cryptJSON['secretkey'];
