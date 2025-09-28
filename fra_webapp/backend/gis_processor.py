"""
GIS Processor Module
Handles geospatial analysis for FRA implementation
"""

import json
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import logging
import os

logger = logging.getLogger(__name__)

class GISProcessor:
    def __init__(self):
        """Initialize GIS processor"""
        # Odisha district coordinates (approximate centers)
        self.district_coordinates = {
            'Angul': {'lat': 20.8480, 'lng': 85.1018},
            'Balasore': {'lat': 21.4934, 'lng': 86.9335},
            'Bargarh': {'lat': 21.3347, 'lng': 83.6190},
            'Bhadrak': {'lat': 21.0543, 'lng': 86.5118},
            'Bolangir': {'lat': 20.7117, 'lng': 83.4420},
            'Boudh': {'lat': 20.5365, 'lng': 84.3295},
            'Cuttack': {'lat': 20.4625, 'lng': 85.8828},
            'Deogarh': {'lat': 21.5353, 'lng': 84.7330},
            'Dhenkanal': {'lat': 20.6593, 'lng': 85.5985},
            'Gajapati': {'lat': 18.9167, 'lng': 84.1667},
            'Ganjam': {'lat': 19.3852, 'lng': 84.8803},
            'Jagatsinghpur': {'lat': 20.2543, 'lng': 86.1668},
            'Jajpur': {'lat': 20.8489, 'lng': 86.3262},
            'Jharsuguda': {'lat': 21.8618, 'lng': 84.0068},
            'Kalahandi': {'lat': 19.9137, 'lng': 83.1660},
            'Kandhamal': {'lat': 20.1347, 'lng': 84.1400},
            'Kendrapara': {'lat': 20.5014, 'lng': 86.4221},
            'Keonjhar': {'lat': 21.6297, 'lng': 85.5815},
            'Khurda': {'lat': 20.1826, 'lng': 85.6167},
            'Koraput': {'lat': 18.8120, 'lng': 82.7120},
            'Malkangiri': {'lat': 18.3478, 'lng': 81.8811},
            'Mayurbhanj': {'lat': 21.9288, 'lng': 86.7319},
            'Nabarangpur': {'lat': 19.2367, 'lng': 82.5492},
            'Nayagarh': {'lat': 20.1288, 'lng': 85.0963},
            'Nuapada': {'lat': 20.8090, 'lng': 82.5378},
            'Puri': {'lat': 19.7976, 'lng': 85.8245},
            'Rayagada': {'lat': 19.1697, 'lng': 83.4158},
            'Sambalpur': {'lat': 21.4669, 'lng': 83.9812},
            'Sonepur': {'lat': 20.8329, 'lng': 83.9137},
            'Sundargarh': {'lat': 22.1167, 'lng': 84.0333}
        }
        
        # Forest cover data (approximate percentages)
        self.forest_cover = {
            'Angul': 35.2, 'Balasore': 12.8, 'Bargarh': 18.5, 'Bhadrak': 8.2,
            'Bolangir': 28.7, 'Boudh': 45.8, 'Cuttack': 15.3, 'Deogarh': 52.1,
            'Dhenkanal': 42.6, 'Gajapati': 67.8, 'Ganjam': 24.3, 'Jagatsinghpur': 5.2,
            'Jajpur': 18.9, 'Jharsuguda': 38.4, 'Kalahandi': 48.9, 'Kandhamal': 74.2,
            'Kendrapara': 12.1, 'Keonjhar': 58.7, 'Khurda': 22.1, 'Koraput': 65.3,
            'Malkangiri': 71.6, 'Mayurbhanj': 68.4, 'Nabarangpur': 58.9, 'Nayagarh': 35.7,
            'Nuapada': 42.3, 'Puri': 8.9, 'Rayagada': 69.1, 'Sambalpur': 41.8,
            'Sonepur': 32.4, 'Sundargarh': 54.2
        }
        
        # Tribal population percentage (approximate)
        self.tribal_population = {
            'Angul': 12.3, 'Balasore': 11.2, 'Bargarh': 20.8, 'Bhadrak': 2.1,
            'Bolangir': 23.4, 'Boudh': 51.2, 'Cuttack': 5.8, 'Deogarh': 33.9,
            'Dhenkanal': 18.5, 'Gajapati': 54.3, 'Ganjam': 7.9, 'Jagatsinghpur': 3.2,
            'Jajpur': 5.7, 'Jharsuguda': 26.1, 'Kalahandi': 27.8, 'Kandhamal': 52.1,
            'Kendrapara': 2.8, 'Keonjhar': 44.5, 'Khurda': 7.1, 'Koraput': 50.2,
            'Malkangiri': 58.9, 'Mayurbhanj': 56.6, 'Nabarangpur': 65.8, 'Nayagarh': 12.4,
            'Nuapada': 35.2, 'Puri': 1.8, 'Rayagada': 56.4, 'Sambalpur': 46.2,
            'Sonepur': 24.7, 'Sundargarh': 50.7
        }
    
    def get_district_info(self, district_name: str) -> Dict:
        """Get comprehensive information about a district"""
        try:
            district_name = district_name.title()
            
            if district_name not in self.district_coordinates:
                # Try to find similar district name
                for dist in self.district_coordinates.keys():
                    if district_name.lower() in dist.lower() or dist.lower() in district_name.lower():
                        district_name = dist
                        break
            
            if district_name in self.district_coordinates:
                return {
                    'name': district_name,
                    'coordinates': self.district_coordinates[district_name],
                    'forest_cover_percent': self.forest_cover.get(district_name, 0),
                    'tribal_population_percent': self.tribal_population.get(district_name, 0),
                    'fra_priority_score': self.calculate_fra_priority(district_name)
                }
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error getting district info for {district_name}: {str(e)}")
            return None
    
    def calculate_fra_priority(self, district_name: str) -> float:
        """Calculate FRA implementation priority score"""
        try:
            forest_cover = self.forest_cover.get(district_name, 0)
            tribal_pop = self.tribal_population.get(district_name, 0)
            
            # Weighted priority score
            # Higher forest cover and tribal population = higher priority
            priority_score = (forest_cover * 0.6) + (tribal_pop * 0.4)
            
            return round(priority_score, 2)
            
        except Exception as e:
            logger.error(f"Error calculating priority for {district_name}: {str(e)}")
            return 0.0
    
    def identify_potential_areas(self) -> List[Dict]:
        """Identify potential areas for FRA implementation"""
        try:
            potential_areas = []
            
            for district, coords in self.district_coordinates.items():
                district_info = self.get_district_info(district)
                
                if district_info and district_info['fra_priority_score'] > 30:
                    # Generate potential village points around district center
                    villages = self.generate_village_points(district, coords, district_info)
                    potential_areas.extend(villages)
            
            return potential_areas
            
        except Exception as e:
            logger.error(f"Error identifying potential areas: {str(e)}")
            return []
    
    def generate_village_points(self, district: str, center_coords: Dict, district_info: Dict) -> List[Dict]:
        """Generate potential village points for FRA implementation"""
        try:
            villages = []
            priority_score = district_info['fra_priority_score']
            
            # Number of potential villages based on priority
            num_villages = max(3, int(priority_score / 10))
            
            # Generate random points around district center
            np.random.seed(hash(district) % 1000)  # Consistent random for same district
            
            for i in range(num_villages):
                # Random offset within ~50km radius
                lat_offset = np.random.uniform(-0.5, 0.5)
                lng_offset = np.random.uniform(-0.5, 0.5)
                
                village = {
                    'id': f"{district}_potential_{i+1}",
                    'name': f"Potential Area {i+1}",
                    'district': district,
                    'coordinates': {
                        'lat': center_coords['lat'] + lat_offset,
                        'lng': center_coords['lng'] + lng_offset
                    },
                    'type': 'potential',
                    'priority_score': priority_score,
                    'estimated_beneficiaries': np.random.randint(50, 500),
                    'forest_proximity': np.random.uniform(0.1, 2.0),  # km
                    'tribal_households': np.random.randint(20, 200)
                }
                
                villages.append(village)
            
            return villages
            
        except Exception as e:
            logger.error(f"Error generating village points for {district}: {str(e)}")
            return []
    
    def create_district_geojson(self, district_data: Dict) -> Dict:
        """Create GeoJSON for district visualization"""
        try:
            features = []
            
            for district, info in district_data.items():
                if 'coordinates' in info:
                    feature = {
                        'type': 'Feature',
                        'properties': {
                            'name': district,
                            'forest_cover': info.get('forest_cover_percent', 0),
                            'tribal_population': info.get('tribal_population_percent', 0),
                            'priority_score': info.get('fra_priority_score', 0),
                            'beneficiaries_count': info.get('beneficiaries_count', 0)
                        },
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [
                                info['coordinates']['lng'],
                                info['coordinates']['lat']
                            ]
                        }
                    }
                    features.append(feature)
            
            return {
                'type': 'FeatureCollection',
                'features': features
            }
            
        except Exception as e:
            logger.error(f"Error creating district GeoJSON: {str(e)}")
            return {'type': 'FeatureCollection', 'features': []}
    
    def analyze_coverage_gap(self, beneficiary_data: List[Dict]) -> Dict:
        """Analyze gaps in FRA coverage"""
        try:
            # Get districts with beneficiaries
            covered_districts = set()
            district_counts = {}
            
            for beneficiary in beneficiary_data:
                district = beneficiary.get('district', '').title()
                if district:
                    covered_districts.add(district)
                    district_counts[district] = district_counts.get(district, 0) + 1
            
            # Identify uncovered high-priority districts
            uncovered_priority = []
            low_coverage = []
            
            for district in self.district_coordinates.keys():
                priority_score = self.calculate_fra_priority(district)
                
                if district not in covered_districts and priority_score > 40:
                    uncovered_priority.append({
                        'district': district,
                        'priority_score': priority_score,
                        'coordinates': self.district_coordinates[district]
                    })
                elif district in district_counts and district_counts[district] < 100 and priority_score > 30:
                    low_coverage.append({
                        'district': district,
                        'beneficiaries_count': district_counts[district],
                        'priority_score': priority_score,
                        'coordinates': self.district_coordinates[district]
                    })
            
            return {
                'uncovered_priority_districts': uncovered_priority,
                'low_coverage_districts': low_coverage,
                'total_covered_districts': len(covered_districts),
                'coverage_percentage': (len(covered_districts) / len(self.district_coordinates)) * 100
            }
            
        except Exception as e:
            logger.error(f"Error analyzing coverage gap: {str(e)}")
            return {}
    
    def get_buffer_zones(self, coordinates: Dict, radius_km: float = 5) -> Dict:
        """Get buffer zone around coordinates"""
        try:
            # Simple buffer calculation (approximate)
            lat_offset = radius_km / 111.0  # Approx km per degree latitude
            lng_offset = radius_km / (111.0 * abs(np.cos(np.radians(coordinates['lat']))))
            
            return {
                'center': coordinates,
                'radius_km': radius_km,
                'bounds': {
                    'north': coordinates['lat'] + lat_offset,
                    'south': coordinates['lat'] - lat_offset,
                    'east': coordinates['lng'] + lng_offset,
                    'west': coordinates['lng'] - lng_offset
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating buffer zone: {str(e)}")
            return {'center': coordinates, 'radius_km': radius_km, 'bounds': {}}
    
    def export_to_geojson(self, data: List[Dict], filename: str) -> str:
        """Export data to GeoJSON file"""
        try:
            features = []
            
            for item in data:
                if 'coordinates' in item:
                    feature = {
                        'type': 'Feature',
                        'properties': {k: v for k, v in item.items() if k != 'coordinates'},
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [item['coordinates']['lng'], item['coordinates']['lat']]
                        }
                    }
                    features.append(feature)
            
            geojson = {
                'type': 'FeatureCollection',
                'features': features
            }
            
            # Save to file
            filepath = os.path.join('data', f"{filename}.geojson")
            os.makedirs('data', exist_ok=True)
            
            with open(filepath, 'w') as f:
                json.dump(geojson, f, indent=2)
            
            return filepath
            
        except Exception as e:
            logger.error(f"Error exporting to GeoJSON: {str(e)}")
            raise