"""
Data Manager Module
Handles data loading, processing, and management for FRA beneficiaries
"""

import os
import json
import csv
import pandas as pd
from typing import Dict, List, Tuple
import logging
from datetime import datetime
import re

logger = logging.getLogger(__name__)

class DataManager:
    def __init__(self):
        """Initialize Data Manager"""
        self.data_dir = '../dataset_odisha'
        self.processed_data = {}
        self.districts_data = {}
        
        # District name mapping for consistency
        self.district_mapping = {
            'angul': 'Angul',
            'balasore': 'Balasore',
            'bargarh': 'Bargarh',
            'bhadrak': 'Bhadrak',
            'bolangir': 'Bolangir',
            'boudh': 'Boudh',
            'cuttack': 'Cuttack',
            'deogarh': 'Deogarh',
            'dhenkanal': 'Dhenkanal',
            'gajapati': 'Gajapati',
            'ganjam': 'Ganjam',
            'jagatsinghpur': 'Jagatsinghpur',
            'jajpur': 'Jajpur',
            'jharsuguda': 'Jharsuguda',
            'kalahandi': 'Kalahandi',
            'kandhamal': 'Kandhamal',
            'kenpara': 'Kendrapara',
            'kendrapara': 'Kendrapara',
            'keonjhar': 'Keonjhar',
            'khurda': 'Khurda',
            'koraput': 'Koraput',
            'malkangiri': 'Malkangiri',
            'mayurbhanj': 'Mayurbhanj',
            'nabarangpur': 'Nabarangpur',
            'nayagarh': 'Nayagarh',
            'nuapada': 'Nuapada',
            'puri': 'Puri',
            'rayagada': 'Rayagada',
            'sambalpur': 'Sambalpur',
            'sonepur': 'Subarnapur',
            'subarnapur': 'Subarnapur',
            'sundargarh': 'Sundargarh'
        }
    
    def initialize_data(self):
        """Initialize and load all district data"""
        try:
            self.load_district_data()
            self.process_beneficiary_data()
            logger.info("Data initialization completed successfully")
        except Exception as e:
            logger.error(f"Error initializing data: {str(e)}")
            raise
    
    def load_district_data(self):
        """Load data from PDF files for each district"""
        try:
            if not os.path.exists(self.data_dir):
                logger.warning(f"Data directory not found: {self.data_dir}")
                return
            
            pdf_files = [f for f in os.listdir(self.data_dir) if f.endswith('.pdf')]
            logger.info(f"Found {len(pdf_files)} PDF files to process")
            
            for pdf_file in pdf_files:
                district_name = self.extract_district_name(pdf_file)
                if district_name:
                    # For now, create mock data since we can't process PDFs directly
                    # In production, you would use OCR to extract actual data
                    self.districts_data[district_name] = self.generate_mock_beneficiary_data(district_name)
                    logger.info(f"Loaded data for district: {district_name}")
        
        except Exception as e:
            logger.error(f"Error loading district data: {str(e)}")
            raise
    
    def extract_district_name(self, filename: str) -> str:
        """Extract district name from filename"""
        try:
            # Remove file extension and common suffixes
            name = filename.lower().replace('.pdf', '')
            name = re.sub(r'(frabenef|beneficiaries|benef|list|_\d+|\s+\(\d+\))', '', name)
            name = name.strip('_').strip()
            
            # Map to standard district name
            return self.district_mapping.get(name, name.title())
            
        except Exception as e:
            logger.error(f"Error extracting district name from {filename}: {str(e)}")
            return None
    
    def generate_mock_beneficiary_data(self, district: str) -> List[Dict]:
        """Generate mock beneficiary data for demonstration"""
        try:
            import random
            random.seed(hash(district) % 1000)  # Consistent data for same district
            
            beneficiaries = []
            num_beneficiaries = random.randint(100, 1000)
            
            villages = self.get_sample_villages(district)
            claim_types = ['Individual Forest Rights', 'Community Forest Rights', 'Community Forest Resource Rights']
            
            for i in range(num_beneficiaries):
                beneficiary = {
                    'id': f"{district}_{i+1:04d}",
                    'name': f"Beneficiary {i+1}",
                    'father_name': f"Father {i+1}",
                    'village': random.choice(villages),
                    'district': district,
                    'claim_type': random.choice(claim_types),
                    'area_acres': round(random.uniform(0.5, 5.0), 2),
                    'survey_number': f"{random.randint(100, 999)}/{random.randint(1, 50)}",
                    'status': random.choice(['Approved', 'Pending', 'Under Review', 'Rejected']),
                    'approval_date': self.generate_random_date(),
                    'community_type': random.choice(['Scheduled Tribes', 'Other Traditional Forest Dwellers']),
                    'forest_type': random.choice(['Reserved Forest', 'Protected Forest', 'Community Forest'])
                }
                beneficiaries.append(beneficiary)
            
            return beneficiaries
            
        except Exception as e:
            logger.error(f"Error generating mock data for {district}: {str(e)}")
            return []
    
    def get_sample_villages(self, district: str) -> List[str]:
        """Get sample village names for a district"""
        base_villages = [
            'Rampur', 'Krishnapur', 'Gopalpur', 'Madhupur', 'Balaram',
            'Chandanpur', 'Haridwar', 'Banjari', 'Kumarpur', 'Jaganath',
            'Raghunath', 'Sankara', 'Dharampur', 'Jadupur', 'Mahendra'
        ]
        
        # Add district prefix to make unique
        return [f"{village} ({district})" for village in base_villages[:10]]
    
    def generate_random_date(self) -> str:
        """Generate random date for mock data"""
        try:
            import random
            from datetime import datetime, timedelta
            
            # Random date between 2010 and 2024
            start_date = datetime(2010, 1, 1)
            end_date = datetime(2024, 12, 31)
            
            random_date = start_date + timedelta(
                days=random.randint(0, (end_date - start_date).days)
            )
            
            return random_date.strftime('%d/%m/%Y')
            
        except:
            return '01/01/2020'
    
    def process_beneficiary_data(self):
        """Process and structure beneficiary data"""
        try:
            self.processed_data = {
                'total_beneficiaries': 0,
                'districts': {},
                'by_status': {},
                'by_claim_type': {},
                'by_community_type': {}
            }
            
            for district, beneficiaries in self.districts_data.items():
                self.processed_data['total_beneficiaries'] += len(beneficiaries)
                
                # District-wise statistics
                self.processed_data['districts'][district] = {
                    'total': len(beneficiaries),
                    'approved': len([b for b in beneficiaries if b['status'] == 'Approved']),
                    'pending': len([b for b in beneficiaries if b['status'] == 'Pending']),
                    'total_area': sum([b['area_acres'] for b in beneficiaries]),
                    'beneficiaries': beneficiaries
                }
                
                # Overall statistics
                for beneficiary in beneficiaries:
                    # By status
                    status = beneficiary['status']
                    self.processed_data['by_status'][status] = self.processed_data['by_status'].get(status, 0) + 1
                    
                    # By claim type
                    claim_type = beneficiary['claim_type']
                    self.processed_data['by_claim_type'][claim_type] = self.processed_data['by_claim_type'].get(claim_type, 0) + 1
                    
                    # By community type
                    community_type = beneficiary['community_type']
                    self.processed_data['by_community_type'][community_type] = self.processed_data['by_community_type'].get(community_type, 0) + 1
            
            logger.info(f"Processed data for {len(self.districts_data)} districts with {self.processed_data['total_beneficiaries']} total beneficiaries")
            
        except Exception as e:
            logger.error(f"Error processing beneficiary data: {str(e)}")
            raise
    
    def get_districts(self) -> List[str]:
        """Get list of available districts"""
        try:
            return list(self.districts_data.keys())
        except Exception as e:
            logger.error(f"Error getting districts: {str(e)}")
            return []
    
    def get_beneficiaries_by_district(self, district: str) -> List[Dict]:
        """Get beneficiaries for a specific district"""
        try:
            return self.districts_data.get(district, [])
        except Exception as e:
            logger.error(f"Error getting beneficiaries for {district}: {str(e)}")
            return []
    
    def get_overall_statistics(self) -> Dict:
        """Get overall FRA implementation statistics"""
        try:
            if not self.processed_data:
                self.process_beneficiary_data()
            
            stats = {
                'total_beneficiaries': self.processed_data['total_beneficiaries'],
                'total_districts': len(self.districts_data),
                'total_area_covered': sum([
                    district_data['total_area'] 
                    for district_data in self.processed_data['districts'].values()
                ]),
                'status_breakdown': self.processed_data['by_status'],
                'claim_type_breakdown': self.processed_data['by_claim_type'],
                'community_type_breakdown': self.processed_data['by_community_type'],
                'district_wise_summary': {
                    district: {
                        'total': data['total'],
                        'approved': data['approved'],
                        'pending': data['pending'],
                        'total_area': data['total_area']
                    }
                    for district, data in self.processed_data['districts'].items()
                },
                'last_updated': datetime.now().isoformat()
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting overall statistics: {str(e)}")
            return {}
    
    def search_beneficiaries(self, query: str, district: str = None) -> List[Dict]:
        """Search beneficiaries by name or other criteria"""
        try:
            results = []
            query_lower = query.lower()
            
            districts_to_search = [district] if district else self.districts_data.keys()
            
            for dist in districts_to_search:
                beneficiaries = self.districts_data.get(dist, [])
                for beneficiary in beneficiaries:
                    if (query_lower in beneficiary['name'].lower() or
                        query_lower in beneficiary['village'].lower() or
                        query_lower in beneficiary['survey_number'].lower()):
                        results.append(beneficiary)
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching beneficiaries: {str(e)}")
            return []
    
    def export_to_csv(self, district: str) -> str:
        """Export district data to CSV"""
        try:
            beneficiaries = self.get_beneficiaries_by_district(district)
            
            if not beneficiaries:
                raise ValueError(f"No data found for district: {district}")
            
            # Create CSV file
            filename = f"{district}_beneficiaries_{datetime.now().strftime('%Y%m%d')}.csv"
            filepath = os.path.join('data', filename)
            
            os.makedirs('data', exist_ok=True)
            
            with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
                if beneficiaries:
                    fieldnames = beneficiaries[0].keys()
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(beneficiaries)
            
            logger.info(f"Exported {len(beneficiaries)} records to {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error exporting to CSV: {str(e)}")
            raise
    
    def export_to_geojson(self, district: str) -> str:
        """Export district data to GeoJSON format"""
        try:
            from .gis_processor import GISProcessor
            
            beneficiaries = self.get_beneficiaries_by_district(district)
            gis_processor = GISProcessor()
            
            # Add coordinates to beneficiaries (mock coordinates for demo)
            district_info = gis_processor.get_district_info(district)
            
            if district_info and beneficiaries:
                center_coords = district_info['coordinates']
                
                # Add random coordinates around district center
                import random
                random.seed(hash(district) % 1000)
                
                for i, beneficiary in enumerate(beneficiaries):
                    # Random offset within district
                    lat_offset = random.uniform(-0.2, 0.2)
                    lng_offset = random.uniform(-0.2, 0.2)
                    
                    beneficiary['coordinates'] = {
                        'lat': center_coords['lat'] + lat_offset,
                        'lng': center_coords['lng'] + lng_offset
                    }
            
            # Export as GeoJSON
            filename = f"{district}_beneficiaries_{datetime.now().strftime('%Y%m%d')}.geojson"
            filepath = gis_processor.export_to_geojson(beneficiaries, filename.replace('.geojson', ''))
            
            return filepath
            
        except Exception as e:
            logger.error(f"Error exporting to GeoJSON: {str(e)}")
            raise
    
    def get_district_summary(self, district: str) -> Dict:
        """Get summary statistics for a specific district"""
        try:
            if district not in self.processed_data['districts']:
                return {}
            
            district_data = self.processed_data['districts'][district]
            beneficiaries = district_data['beneficiaries']
            
            # Calculate additional statistics
            villages = set([b['village'] for b in beneficiaries])
            claim_types = {}
            community_types = {}
            status_counts = {}
            
            for beneficiary in beneficiaries:
                # Claim types
                claim_type = beneficiary['claim_type']
                claim_types[claim_type] = claim_types.get(claim_type, 0) + 1
                
                # Community types
                community_type = beneficiary['community_type']
                community_types[community_type] = community_types.get(community_type, 0) + 1
                
                # Status
                status = beneficiary['status']
                status_counts[status] = status_counts.get(status, 0) + 1
            
            summary = {
                'district': district,
                'total_beneficiaries': district_data['total'],
                'total_villages': len(villages),
                'total_area_acres': district_data['total_area'],
                'approved_count': district_data['approved'],
                'pending_count': district_data['pending'],
                'approval_rate': (district_data['approved'] / district_data['total']) * 100 if district_data['total'] > 0 else 0,
                'claim_type_breakdown': claim_types,
                'community_type_breakdown': community_types,
                'status_breakdown': status_counts,
                'villages': list(villages),
                'last_updated': datetime.now().isoformat()
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting district summary for {district}: {str(e)}")
            return {}