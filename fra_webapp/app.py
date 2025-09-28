#!/usr/bin/env python3
"""
FRA Atlas and WebGIS Decision Support System
Main Flask Application

This application provides:
1. AI-powered FRA Atlas with interactive mapping
2. OCR Portal for legacy document digitization
3. WebGIS Decision Support System for eligibility assessment
"""

from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import pandas as pd
from datetime import datetime
import logging
from werkzeug.utils import secure_filename

# Import custom modules
from backend.ocr_processor import OCRProcessor
from backend.gis_processor import GISProcessor
from backend.decision_support import DecisionSupportSystem
from backend.data_manager import DataManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = 'fra_atlas_secret_key_2025'
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize processors
ocr_processor = OCRProcessor()
gis_processor = GISProcessor()
decision_support = DecisionSupportSystem()
data_manager = DataManager()

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Main landing page - Government portal style"""
    return render_template('index.html')

@app.route('/atlas')
def atlas():
    """FRA Atlas - Interactive mapping portal"""
    # Load Mapbox token
    try:
        with open('../webgis_utilities/token.txt', 'r') as f:
            lines = f.read().strip().split('\n')
            # Find the public key (starts with 'pk.')
            mapbox_token = None
            for line in lines:
                line = line.strip()
                if line.startswith('pk.'):
                    mapbox_token = line
                    break
            
            # Fallback if no public key found
            if not mapbox_token:
                mapbox_token = lines[0].strip() if lines else 'pk.eyJ1IjoibjF6aGFsIiwiYSI6ImNtZjEweWx6YTA4MHcycnNpZWxhNnB0azQifQ.96gYt6yWCshqyVwye1P3Zw'
    except:
        mapbox_token = 'pk.eyJ1IjoibjF6aGFsIiwiYSI6ImNtZjEweWx6YTA4MHcycnNpZWxhNnB0azQifQ.96gYt6yWCshqyVwye1P3Zw'
    
    return render_template('atlas.html', mapbox_token=mapbox_token)

@app.route('/ocr')
def ocr_portal():
    """OCR Portal for legacy document processing"""
    return render_template('ocr.html')

@app.route('/dss')
def decision_support_system():
    """WebGIS Decision Support System"""
    return render_template('dss.html')

@app.route('/api/districts')
def get_districts():
    """Get list of districts with FRA data"""
    try:
        districts = data_manager.get_districts()
        return jsonify({'status': 'success', 'districts': districts})
    except Exception as e:
        logger.error(f"Error fetching districts: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/beneficiaries/<district>')
def get_beneficiaries(district):
    """Get beneficiaries data for a specific district"""
    try:
        beneficiaries = data_manager.get_beneficiaries_by_district(district)
        return jsonify({'status': 'success', 'data': beneficiaries})
    except Exception as e:
        logger.error(f"Error fetching beneficiaries for {district}: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/gis/potential-areas')
def get_potential_areas():
    """Get potential FRA areas based on forest cover and tribal population"""
    try:
        areas = gis_processor.identify_potential_areas()
        return jsonify({'status': 'success', 'data': areas})
    except Exception as e:
        logger.error(f"Error identifying potential areas: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload for OCR processing"""
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{timestamp}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Process with OCR
            extracted_data = ocr_processor.process_document(filepath)
            
            return jsonify({
                'status': 'success',
                'filename': filename,
                'extracted_data': extracted_data
            })
        else:
            return jsonify({'status': 'error', 'message': 'Invalid file type'}), 400
            
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/eligibility-check', methods=['POST'])
def check_eligibility():
    """Check FRA eligibility for a community/individual"""
    try:
        data = request.get_json()
        result = decision_support.assess_eligibility(data)
        return jsonify({'status': 'success', 'result': result})
    except Exception as e:
        logger.error(f"Error checking eligibility: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/stats')
def get_statistics():
    """Get overall FRA implementation statistics"""
    try:
        stats = data_manager.get_overall_statistics()
        return jsonify({'status': 'success', 'stats': stats})
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/export/<format>/<district>')
def export_data(format, district):
    """Export district data in specified format"""
    try:
        if format.lower() == 'csv':
            file_path = data_manager.export_to_csv(district)
            return send_file(file_path, as_attachment=True)
        elif format.lower() == 'geojson':
            file_path = data_manager.export_to_geojson(district)
            return send_file(file_path, as_attachment=True)
        else:
            return jsonify({'status': 'error', 'message': 'Unsupported format'}), 400
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    """404 error handler"""
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """500 error handler"""
    return render_template('500.html'), 500

if __name__ == '__main__':
    # Initialize data on startup
    try:
        data_manager.initialize_data()
        logger.info("Data initialization completed successfully")
    except Exception as e:
        logger.error(f"Error initializing data: {str(e)}")
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)