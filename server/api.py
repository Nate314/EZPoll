import hmac
from werkzeug.exceptions import HTTPException
from flask import Flask, request
from flask_restful import Api
from flask_cors import CORS

from Config import Config
from ControllerUser import ControllerUser
from ControllerSession import ControllerSession
from ControllerQuestion import ControllerQuestion
from ControllerResult import ControllerResult

def create_app():
    if not Config.internal_secret:
        raise RuntimeError('INTERNAL_API_SECRET must be set')

    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024
    # do not append "did you mean ..." route hints to 404 responses
    app.config['ERROR_404_HELP'] = False
    # only the client origin(s) may call this API from a browser
    CORS(app, origins = Config.allowed_origins)
    api = Api(app)

    # The API is internal: only the socket server calls it, and it must prove
    # that with the shared secret. This also protects the DELETE /result route.
    @app.before_request
    def require_internal_secret():
        if request.method == 'OPTIONS':
            return None
        supplied = request.headers.get('X-Internal-Secret', '')
        if not hmac.compare_digest(supplied.encode(), Config.internal_secret.encode()):
            return {'message': 'Unauthorized'}, 401
        return None

    # consistent JSON errors, never HTML or stack traces (also covers unknown routes)
    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        return {"message": e.description}, e.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(e):
        app.logger.exception("Unhandled error")
        return {"message": "Internal Server Error"}, 500

    # this is where all of the controllers and endpoints are matched up
    api.add_resource(ControllerUser, '/api/user/<string:user_guid>')
    api.add_resource(ControllerSession, '/api/session/<string:session_guid>')
    api.add_resource(ControllerQuestion, '/api/question/<string:question_guid>')
    api.add_resource(ControllerResult, '/api/result/<string:session_guid>')
    return app

app = create_app()

# Served in the container by gunicorn (see Dockerfile). Never run with
# Flask debug mode: it exposes an interactive debugger.
if __name__ == '__main__':
    app.run(debug = False, host = '127.0.0.1', port = 5000)
