# FRA Atlas - AI-Powered WebGIS Decision Support System

## Overview

The FRA Atlas is a comprehensive web application designed for **AI-powered Forest Rights Act (FRA) Atlas and WebGIS-based Decision Support System (DSS)** to facilitate integrated monitoring of Forest Rights Act implementation in Odisha, India. This system provides tools for visualization, digitization of legacy documents, and intelligent decision support for FRA eligibility assessment.

## Key Features

### 🗺️ Interactive Atlas Portal
- **Interactive Mapping**: Mapbox GL JS powered visualization of FRA beneficiaries and potential areas
- **Layered Visualization**: Multiple data layers including forest cover, beneficiary locations, and priority areas
- **Real-time Filtering**: Dynamic filtering by district, claim type, status, and community type
- **Search & Navigation**: Advanced search functionality with map navigation controls
- **Statistics Dashboard**: Real-time analytics and summary statistics

### 📄 OCR Document Processing
- **Legacy Document Digitization**: Convert PDF and image documents to structured digital records
- **Multi-format Support**: Process PDF, JPEG, PNG, and TIFF documents
- **Intelligent Text Extraction**: OCR with FRA-specific data pattern recognition
- **Data Validation & Editing**: Interactive editing interface for extracted data
- **Bulk Processing**: Process multiple documents simultaneously
- **Export Options**: Export to CSV, JSON, and Excel formats

### 🤖 Decision Support System (DSS)
- **Multi-criteria Assessment**: Comprehensive eligibility evaluation based on FRA guidelines
- **Step-by-step Wizard**: Intuitive form interface for data collection
- **AI-powered Analysis**: Intelligent scoring and recommendation engine
- **Document Upload**: Support for supporting documents and evidence
- **Detailed Reports**: Generate comprehensive assessment reports
- **Export Capabilities**: Save and export assessment results

### 🏛️ Government Portal Design
- **Official UI/UX**: Government portal styling matching Odisha government standards
- **Accessibility**: WCAG compliant design with keyboard navigation support
- **Responsive Design**: Mobile-friendly interface for field operations
- **Multi-language Support**: Ready for localization

## Technology Stack

### Backend
- **Framework**: Flask 2.3.3 (Python web framework)
- **OCR Engine**: pytesseract + OpenCV for document processing
- **Data Processing**: pandas, numpy for data manipulation
- **PDF Processing**: PyMuPDF for PDF document handling
- **Machine Learning**: scikit-learn for decision support algorithms
- **Geospatial**: geopy for geographic operations

### Frontend  
- **Mapping**: Mapbox GL JS v2.15.0 for interactive maps
- **UI Framework**: Bootstrap 5 with custom government styling
- **JavaScript**: ES6+ with modern web APIs
- **Charts**: Chart.js for data visualization
- **PDF Viewer**: PDF.js for document preview

### Data Storage
- **File-based**: JSON/CSV for demonstration (production-ready for database integration)
- **Local Storage**: Browser storage for user preferences and draft data
- **Export Formats**: CSV, JSON, Excel, PDF reports

## Project Structure

```
fra_webapp/
├── app.py                          # Main Flask application
├── requirements.txt                # Python dependencies
├── README.md                      # Project documentation
│
├── backend/                       # Backend processing modules
│   ├── __init__.py
│   ├── ocr_processor.py          # OCR document processing
│   ├── gis_processor.py          # GIS analysis and mapping
│   ├── decision_support.py       # DSS assessment engine
│   └── data_manager.py           # Data loading and management
│
├── templates/                     # HTML templates
│   ├── index.html                # Home page
│   ├── atlas.html                # Interactive mapping interface
│   ├── ocr.html                  # Document processing interface
│   └── dss.html                  # Decision support system
│
├── static/                        # Static assets
│   ├── css/
│   │   ├── style.css             # Main application styles
│   │   ├── atlas.css             # Atlas-specific styles
│   │   ├── ocr.css               # OCR module styles
│   │   └── dss.css               # DSS module styles
│   │
│   ├── js/
│   │   ├── main.js               # Main application JavaScript
│   │   ├── atlas.js              # Atlas mapping functionality
│   │   ├── ocr.js                # OCR processing interface
│   │   └── dss.js                # DSS assessment logic
│   │
│   └── images/                   # Images and icons
│
└── uploads/                       # File upload directory (created at runtime)
```

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- Tesseract OCR engine
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd fra_webapp
```

### 2. Install System Dependencies

#### On Windows:
```powershell
# Install Tesseract OCR
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Add tesseract to PATH

# Install Python dependencies
pip install -r requirements.txt
```

#### On Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-eng
pip install -r requirements.txt
```

#### On macOS:
```bash
brew install tesseract
pip install -r requirements.txt
```

### 3. Configure Mapbox Token
1. Get a free Mapbox access token from [Mapbox](https://www.mapbox.com/)
2. Update `webgis_utilities/token.txt` with your token
3. Or set the `MAPBOX_ACCESS_TOKEN` environment variable

### 4. Run the Application
```bash
python app.py
```

The application will start on `http://localhost:5000`

## Usage Guide

### Atlas Portal (`/atlas`)
1. **View Beneficiaries**: Explore FRA beneficiaries on the interactive map
2. **Apply Filters**: Use sidebar filters to narrow down data by district, status, etc.
3. **Search Locations**: Use the search bar to find specific beneficiaries or areas
4. **Export Data**: Download filtered data in various formats
5. **Layer Controls**: Toggle different map layers (forest cover, potential areas)

### OCR Portal (`/ocr`)
1. **Upload Documents**: Drag and drop or select PDF/image files
2. **Start Processing**: Click "Start Processing" to begin OCR extraction
3. **Review Results**: Examine extracted data in the results section
4. **Edit Data**: Click on table cells to edit extracted information
5. **Export Results**: Download processed data as CSV, JSON, or Excel

### Decision Support System (`/dss`)
1. **Community Information**: Fill in basic community details (Step 1)
2. **Geographic Details**: Provide location and area information (Step 2)
3. **Demographic Data**: Enter population and household details (Step 3)
4. **Forest Dependence**: Specify traditional rights and usage (Step 4)
5. **Document Upload**: Attach supporting documents (Step 5)
6. **Get Assessment**: Review eligibility results and recommendations

## API Endpoints

### Data APIs
- `GET /api/statistics` - Get summary statistics
- `GET /api/beneficiaries/<district>` - Get beneficiaries by district
- `GET /api/districts` - Get list of districts
- `GET /api/gis/potential-areas` - Get potential FRA areas

### Processing APIs
- `POST /api/ocr/process` - Process document with OCR
- `POST /api/dss/assess` - Submit DSS assessment
- `POST /api/dss/generate-report` - Generate assessment report

### Export APIs
- `GET /api/export/beneficiaries` - Export beneficiary data
- `GET /api/search` - Search across all data

## Configuration

### Environment Variables
```bash
FLASK_ENV=development          # development/production
MAPBOX_ACCESS_TOKEN=your_token # Mapbox access token
UPLOAD_FOLDER=uploads          # File upload directory
MAX_CONTENT_LENGTH=16777216    # Max file size (16MB)
```

### Application Settings
- **Debug Mode**: Set `FLASK_ENV=development` for development
- **File Upload Limits**: Configure `MAX_CONTENT_LENGTH` for upload size limits
- **OCR Language**: Default is English (`eng`), can be configured in `ocr_processor.py`

## Data Sources

The application uses Odisha FRA beneficiary data from the provided dataset:
- **District PDFs**: Located in `dataset_odisha/` directory
- **Guidelines**: FRA implementation guidelines in `guidelines/` directory
- **Reference Data**: Government portal styling references

## Deployment

### Production Deployment
1. **Set Environment**: `FLASK_ENV=production`
2. **Use WSGI Server**: Deploy with Gunicorn or uWSGI
3. **Database Integration**: Replace file-based storage with PostgreSQL/MySQL
4. **Security**: Configure HTTPS, CSRF protection, and authentication
5. **Monitoring**: Add logging and monitoring tools

### Docker Deployment
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit changes: `git commit -am 'Add new feature'`
5. Push to branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is developed for educational and governmental use. Please refer to the appropriate licensing terms for your use case.

## Support

For technical support or questions:
- Create an issue in the repository
- Refer to the documentation in the `guidelines/` directory
- Check the Flask and Mapbox documentation for framework-specific questions

## Acknowledgments

- **Government of Odisha** - For FRA implementation data and guidelines
- **Mapbox** - For mapping services and SDK
- **Flask Community** - For the excellent web framework
- **OpenCV & Tesseract** - For document processing capabilities

---

**Note**: This application is designed to support Forest Rights Act implementation monitoring. Please ensure compliance with local data protection and privacy regulations when deploying in production environments.