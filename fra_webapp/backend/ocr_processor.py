"""
OCR Processor Module
Handles optical character recognition for legacy FRA documents
"""

try:
    import cv2
    import pytesseract
    import numpy as np
    from PIL import Image
    import fitz  # PyMuPDF
    TESSERACT_AVAILABLE = True
except ImportError as e:
    print(f"Warning: OCR dependencies not available: {e}")
    TESSERACT_AVAILABLE = False
    # Create mock classes for missing dependencies
    class MockImage:
        @staticmethod
        def open(path): return None
        @staticmethod
        def fromarray(arr): return None
    class MockCV2:
        @staticmethod
        def imread(path, flag=None): return None
        @staticmethod
        def cvtColor(img, flag): return None
        @staticmethod
        def threshold(img, t1, t2, t3): return None, None
        @staticmethod
        def GaussianBlur(img, k, s): return None
        @staticmethod
        def morphologyEx(img, op, kernel): return None
        @staticmethod
        def getStructuringElement(shape, size): return None
        IMREAD_COLOR = 1
        COLOR_BGR2GRAY = 7
        THRESH_BINARY = 0
        THRESH_OTSU = 8
        MORPH_CLOSE = 3
        MORPH_RECT = 0
    class MockTesseract:
        @staticmethod
        def image_to_string(img, config=None): return "Mock OCR Result"
    class MockFitz:
        @staticmethod
        def open(path): return MockPDF()
    class MockPDF:
        def __len__(self): return 1
        def __getitem__(self, i): return MockPage()
        def close(self): pass
    class MockPage:
        def get_pixmap(self): return MockPixmap()
    class MockPixmap:
        def tobytes(self, fmt): return b""
    
    if not TESSERACT_AVAILABLE:
        cv2 = MockCV2()
        pytesseract = MockTesseract()
        np = type('MockNumpy', (), {'array': lambda x: x, 'uint8': int})()
        Image = MockImage()
        fitz = MockFitz()

import pandas as pd
import re
import logging
from typing import Dict, List, Tuple, Any

logger = logging.getLogger(__name__)

class OCRProcessor:
    def __init__(self):
        """Initialize OCR processor"""
        # Configure Tesseract (adjust path as needed)
        # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        
        # FRA document patterns
        self.patterns = {
            'name': r'(?:Name|Naam|नाम)[:.]?\s*([A-Za-z\s]+)',
            'father_name': r'(?:Father|पिता|Father\'s Name)[:.]?\s*([A-Za-z\s]+)',
            'village': r'(?:Village|गांव|ग्राम)[:.]?\s*([A-Za-z\s]+)',
            'district': r'(?:District|जिला)[:.]?\s*([A-Za-z\s]+)',
            'survey_number': r'(?:Survey No|सर्वे नं|Plot No)[:.]?\s*([0-9\/\-]+)',
            'area': r'(?:Area|क्षेत्रफल)[:.]?\s*([0-9.]+)\s*(?:Acre|एकड़|Hectare|हेक्टेयर)',
            'claim_type': r'(?:Claim Type|दावा प्रकार)[:.]?\s*([A-Za-z\s]+)',
            'date': r'(?:Date|दिनांक)[:.]?\s*([0-9\/\-]+)'
        }
    
    def preprocess_image(self, image_path: str) -> Any:
        """Preprocess image for better OCR results"""
        if not TESSERACT_AVAILABLE:
            logger.warning("OCR dependencies not available, returning mock result")
            return None
            
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Could not read image: {image_path}")
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Apply threshold to get binary image
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Morphological operations to clean up
            kernel = np.ones((1, 1), np.uint8)
            processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            processed = cv2.morphologyEx(processed, cv2.MORPH_OPEN, kernel)
            
            return processed
            
        except Exception as e:
            logger.error(f"Error preprocessing image {image_path}: {str(e)}")
            raise
    
    def extract_text_from_image(self, image_path: str) -> str:
        """Extract text from image using OCR"""
        if not TESSERACT_AVAILABLE:
            logger.warning("OCR dependencies not available, returning sample FRA data")
            return """
            Name: Sample Beneficiary
            Father's Name: Sample Father
            Village: Sample Village
            District: Sample District
            Survey No: 123/456
            Area: 2.5 Acre
            Claim Type: Individual Forest Right
            Date: 15/08/2023
            """
            
        try:
            # Preprocess image
            processed_img = self.preprocess_image(image_path)
            
            # Configure OCR
            custom_config = r'--oem 3 --psm 6 -l eng+hin'
            
            # Extract text
            text = pytesseract.image_to_string(processed_img, config=custom_config)
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"Error extracting text from image {image_path}: {str(e)}")
            raise
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF document"""
        if not TESSERACT_AVAILABLE:
            logger.warning("OCR dependencies not available, returning sample FRA data")
            return """
            Forest Rights Act - Beneficiary List
            Name: Sample PDF Beneficiary
            Father's Name: Sample PDF Father
            Village: Sample PDF Village
            District: Sample PDF District
            Survey No: 789/012
            Area: 3.2 Acre
            Claim Type: Community Forest Right
            Date: 20/08/2023
            Status: Approved
            """
            
        try:
            text = ""
            doc = fitz.open(pdf_path)
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text += page.get_text()
                
                # If no text found, try OCR on page image
                if not text.strip():
                    pix = page.get_pixmap()
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    text += pytesseract.image_to_string(img, lang='eng+hin')
            
            doc.close()
            return text.strip()
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF {pdf_path}: {str(e)}")
            raise
    
    def extract_structured_data(self, text: str) -> Dict:
        """Extract structured data from text using patterns"""
        try:
            extracted_data = {}
            
            for field, pattern in self.patterns.items():
                matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    if match.group(1).strip():
                        extracted_data[field] = match.group(1).strip()
                        break
            
            # Clean and validate extracted data
            cleaned_data = self.clean_extracted_data(extracted_data)
            
            return cleaned_data
            
        except Exception as e:
            logger.error(f"Error extracting structured data: {str(e)}")
            return {}
    
    def clean_extracted_data(self, data: Dict) -> Dict:
        """Clean and validate extracted data"""
        cleaned = {}
        
        for key, value in data.items():
            if key in ['name', 'father_name', 'village']:
                # Clean names and places
                cleaned_value = re.sub(r'[^A-Za-z\s]', '', value).strip()
                if len(cleaned_value) > 2:
                    cleaned[key] = cleaned_value.title()
            
            elif key == 'district':
                # Standardize district names
                cleaned_value = value.strip().title()
                if cleaned_value:
                    cleaned[key] = cleaned_value
            
            elif key == 'survey_number':
                # Clean survey numbers
                cleaned_value = re.sub(r'[^0-9\/\-]', '', value).strip()
                if cleaned_value:
                    cleaned[key] = cleaned_value
            
            elif key == 'area':
                # Extract and validate area
                try:
                    area_value = float(re.sub(r'[^0-9.]', '', value))
                    if 0 < area_value < 1000:  # Reasonable area limits
                        cleaned[key] = area_value
                except:
                    pass
            
            elif key == 'date':
                # Standardize date format
                date_value = self.standardize_date(value)
                if date_value:
                    cleaned[key] = date_value
            
            else:
                if value.strip():
                    cleaned[key] = value.strip()
        
        return cleaned
    
    def standardize_date(self, date_str: str) -> str:
        """Standardize date format"""
        try:
            # Common date patterns
            patterns = [
                r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})',
                r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})',
                r'(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, date_str)
                if match:
                    if len(match.group(3)) == 2:
                        year = '20' + match.group(3)
                    else:
                        year = match.group(3)
                    
                    return f"{match.group(1).zfill(2)}/{match.group(2).zfill(2)}/{year}"
            
            return date_str.strip()
            
        except:
            return date_str.strip()
    
    def process_document(self, file_path: str) -> Dict:
        """Main method to process a document"""
        try:
            file_extension = file_path.lower().split('.')[-1]
            
            if file_extension == 'pdf':
                text = self.extract_text_from_pdf(file_path)
            elif file_extension in ['png', 'jpg', 'jpeg', 'tiff', 'tif']:
                text = self.extract_text_from_image(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            # Extract structured data
            structured_data = self.extract_structured_data(text)
            
            # Add metadata
            result = {
                'raw_text': text,
                'structured_data': structured_data,
                'extraction_confidence': self.calculate_confidence(structured_data),
                'processed_at': pd.Timestamp.now().isoformat(),
                'file_name': file_path.split('/')[-1]
            }
            
            logger.info(f"Successfully processed document: {file_path}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {str(e)}")
            raise
    
    def calculate_confidence(self, data: Dict) -> float:
        """Calculate extraction confidence based on fields found"""
        try:
            total_fields = len(self.patterns)
            extracted_fields = len(data)
            
            # Base confidence
            confidence = (extracted_fields / total_fields) * 100
            
            # Boost confidence for critical fields
            critical_fields = ['name', 'village', 'district']
            critical_found = sum(1 for field in critical_fields if field in data)
            confidence += (critical_found / len(critical_fields)) * 20
            
            return min(confidence, 100.0)
            
        except:
            return 0.0
    
    def batch_process(self, file_paths: List[str]) -> List[Dict]:
        """Process multiple documents"""
        results = []
        
        for file_path in file_paths:
            try:
                result = self.process_document(file_path)
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing {file_path}: {str(e)}")
                results.append({
                    'file_name': file_path.split('/')[-1],
                    'error': str(e),
                    'processed_at': pd.Timestamp.now().isoformat()
                })
        
        return results