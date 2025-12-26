"""
ML Service - Amazon Chronos Time-Series Predictions
Flask application entry point
"""

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests from Express backend

# Configuration
app.config['PORT'] = int(os.getenv('PORT', 5000))
app.config['MODEL_NAME'] = os.getenv('MODEL_NAME', 'amazon/chronos-t5-small')

# Global model instance (lazy loading)
chronos_model = None


def get_model():
    """
    Get or initialize the Chronos model instance.
    Uses lazy loading to avoid loading model until first request.
    """
    global chronos_model
    if chronos_model is None:
        logger.info(f"Loading Chronos model: {app.config['MODEL_NAME']}")
        from models.chronos_model import ChronosModel
        chronos_model = ChronosModel(model_name=app.config['MODEL_NAME'])
        logger.info("Model loaded successfully")
    return chronos_model


@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint

    Returns:
        JSON response with service status
    """
    return jsonify({
        'status': 'ok',
        'model': app.config['MODEL_NAME'],
        'version': '1.0.0'
    })


@app.route('/', methods=['GET'])
def index():
    """
    Root endpoint with service information
    """
    return jsonify({
        'service': 'NextWorth ML Service',
        'description': 'Time-series prediction service using Amazon Chronos',
        'endpoints': {
            'health': '/health',
            'predict': '/api/predict (POST)'
        }
    })


# Register API routes
from routes.prediction import prediction_bp
app.register_blueprint(prediction_bp, url_prefix='/api')


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal error: {error}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = app.config['PORT']
    debug = os.getenv('FLASK_ENV') == 'development'

    logger.info(f"Starting ML Service on port {port}")
    logger.info(f"Model: {app.config['MODEL_NAME']}")
    logger.info(f"Debug mode: {debug}")

    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
