from flask import Response, request;
from werkzeug.exceptions import abort, HTTPException;
from StatusCodes import StatusCodes;
from Config import Config;
import time;

# Middlewares are used for code that needs to run
#  for every call to an API, like authentication and such
class Middleware(object):

    # initialize Middleware 
    def __init__(self, app):
        self.app = app;

    # this code runs on every api call
    def __call__(self, environ, start_response):
        if environ['HTTP_ORIGIN'] in Config.allowedhosts:
            return self.app(environ, start_response);
        else:
            abort(Response('Forbidden', StatusCodes.FORBIDDEN));

# ---RESOURCES---
# https://pypi.org/project/jwt/
# ---RESOURCES---
