"""
Decision Support System Module
Provides AI-powered eligibility assessment for FRA implementation
"""

import json
import pandas as pd
from typing import Dict, List, Tuple
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class DecisionSupportSystem:
    def __init__(self):
        """Initialize Decision Support System"""
        # FRA eligibility criteria
        self.criteria = {
            'residence_period': 75,  # years before 2005
            'forest_dwelling': True,
            'forest_dependence': True,
            'community_types': [
                'Scheduled Tribes',
                'Other Traditional Forest Dwellers',
                'Primitive Tribal Groups'
            ],
            'land_types': [
                'Forest Land',
                'Assigned Land',
                'Government Land in Forest Areas'
            ],
            'rights_types': [
                'Individual Forest Rights',
                'Community Forest Rights',
                'Community Forest Resource Rights'
            ]
        }
        
        # Eligibility weights for scoring
        self.weights = {
            'community_type': 0.25,
            'residence_period': 0.20,
            'forest_dependence': 0.20,
            'documentation': 0.15,
            'land_use': 0.10,
            'community_support': 0.10
        }
    
    def assess_eligibility(self, application_data: Dict) -> Dict:
        """Assess FRA eligibility for an application"""
        try:
            assessment = {
                'application_id': application_data.get('id', 'N/A'),
                'applicant_name': application_data.get('name', 'N/A'),
                'assessment_date': datetime.now().isoformat(),
                'scores': {},
                'overall_score': 0,
                'eligibility_status': 'Not Eligible',
                'recommendations': [],
                'missing_documents': [],
                'next_steps': []
            }
            
            # Assess each criterion
            assessment['scores']['community_type'] = self.assess_community_type(application_data)
            assessment['scores']['residence_period'] = self.assess_residence_period(application_data)
            assessment['scores']['forest_dependence'] = self.assess_forest_dependence(application_data)
            assessment['scores']['documentation'] = self.assess_documentation(application_data)
            assessment['scores']['land_use'] = self.assess_land_use(application_data)
            assessment['scores']['community_support'] = self.assess_community_support(application_data)
            
            # Calculate overall score
            overall_score = 0
            for criterion, score in assessment['scores'].items():
                overall_score += score * self.weights[criterion]
            
            assessment['overall_score'] = round(overall_score, 2)
            
            # Determine eligibility status
            if overall_score >= 80:
                assessment['eligibility_status'] = 'Highly Eligible'
            elif overall_score >= 60:
                assessment['eligibility_status'] = 'Eligible'
            elif overall_score >= 40:
                assessment['eligibility_status'] = 'Conditionally Eligible'
            else:
                assessment['eligibility_status'] = 'Not Eligible'
            
            # Generate recommendations
            assessment['recommendations'] = self.generate_recommendations(assessment)
            assessment['missing_documents'] = self.identify_missing_documents(application_data)
            assessment['next_steps'] = self.suggest_next_steps(assessment)
            
            return assessment
            
        except Exception as e:
            logger.error(f"Error assessing eligibility: {str(e)}")
            return {'error': str(e)}
    
    def assess_community_type(self, data: Dict) -> float:
        """Assess community type eligibility"""
        try:
            community_type = data.get('community_type', '').strip()
            
            if community_type in ['Scheduled Tribes', 'ST']:
                return 100.0
            elif community_type in ['Other Traditional Forest Dwellers', 'OTFD']:
                return 90.0
            elif community_type in ['Primitive Tribal Groups', 'PTG']:
                return 100.0
            elif 'tribal' in community_type.lower():
                return 85.0
            else:
                return 20.0
                
        except:
            return 0.0
    
    def assess_residence_period(self, data: Dict) -> float:
        """Assess residence period eligibility"""
        try:
            residence_since = data.get('residence_since', '')
            
            if isinstance(residence_since, str):
                try:
                    residence_year = int(residence_since.split('/')[-1])
                except:
                    residence_year = int(residence_since[:4])
            else:
                residence_year = int(residence_since)
            
            # Must be residing before 2005 (cut-off date)
            if residence_year <= 1930:  # 75 years before 2005
                return 100.0
            elif residence_year <= 1980:
                return 80.0
            elif residence_year <= 2005:
                return 60.0
            else:
                return 10.0
                
        except:
            return 30.0  # Default if data unavailable
    
    def assess_forest_dependence(self, data: Dict) -> float:
        """Assess forest dependence for livelihood"""
        try:
            primary_occupation = data.get('primary_occupation', '').lower()
            secondary_occupation = data.get('secondary_occupation', '').lower()
            forest_activities = data.get('forest_activities', [])
            
            score = 0
            
            # Primary occupation assessment
            forest_occupations = [
                'forest produce collection', 'agriculture in forest', 'cattle grazing',
                'honey collection', 'medicinal plants', 'bamboo collection',
                'tendu leaf collection', 'sal leaf collection'
            ]
            
            for occupation in forest_occupations:
                if occupation in primary_occupation:
                    score += 40
                    break
            
            # Secondary occupation
            for occupation in forest_occupations:
                if occupation in secondary_occupation:
                    score += 20
                    break
            
            # Forest activities
            if isinstance(forest_activities, list):
                score += min(len(forest_activities) * 10, 40)
            
            return min(score, 100.0)
            
        except:
            return 30.0
    
    def assess_documentation(self, data: Dict) -> float:
        """Assess completeness of documentation"""
        try:
            documents = data.get('documents', [])
            required_docs = [
                'residence_proof', 'community_certificate', 'land_records',
                'forest_dependence_proof', 'community_resolution'
            ]
            
            if isinstance(documents, list):
                available_docs = len(documents)
                score = (available_docs / len(required_docs)) * 100
            else:
                score = 50.0  # Default
            
            return min(score, 100.0)
            
        except:
            return 30.0
    
    def assess_land_use(self, data: Dict) -> float:
        """Assess land use pattern"""
        try:
            land_use = data.get('land_use', '').lower()
            land_type = data.get('land_type', '').lower()
            
            score = 0
            
            # Land use patterns
            if 'agriculture' in land_use:
                score += 40
            if 'grazing' in land_use:
                score += 30
            if 'settlement' in land_use:
                score += 30
            
            # Land type
            if 'forest' in land_type:
                score += 30
            elif 'government' in land_type:
                score += 20
            
            return min(score, 100.0)
            
        except:
            return 40.0
    
    def assess_community_support(self, data: Dict) -> float:
        """Assess community support and gram sabha resolution"""
        try:
            gram_sabha_resolution = data.get('gram_sabha_resolution', False)
            community_support = data.get('community_support_letters', 0)
            
            score = 0
            
            if gram_sabha_resolution:
                score += 70
            
            if isinstance(community_support, int):
                score += min(community_support * 10, 30)
            
            return min(score, 100.0)
            
        except:
            return 20.0
    
    def generate_recommendations(self, assessment: Dict) -> List[str]:
        """Generate recommendations based on assessment"""
        recommendations = []
        scores = assessment.get('scores', {})
        
        try:
            if scores.get('community_type', 0) < 80:
                recommendations.append(
                    "Verify community type with proper tribal/OTFD certificate"
                )
            
            if scores.get('residence_period', 0) < 60:
                recommendations.append(
                    "Collect additional evidence of residence before 2005"
                )
            
            if scores.get('forest_dependence', 0) < 60:
                recommendations.append(
                    "Document forest-based livelihood activities with evidence"
                )
            
            if scores.get('documentation', 0) < 70:
                recommendations.append(
                    "Complete documentation with all required certificates"
                )
            
            if scores.get('community_support', 0) < 70:
                recommendations.append(
                    "Obtain Gram Sabha resolution and community support letters"
                )
            
            # General recommendations
            if assessment.get('overall_score', 0) >= 60:
                recommendations.append(
                    "Application has good potential for approval"
                )
                recommendations.append(
                    "Submit to Forest Rights Committee for review"
                )
            else:
                recommendations.append(
                    "Strengthen application before submission"
                )
                recommendations.append(
                    "Seek assistance from NGOs or community leaders"
                )
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return ["Error generating recommendations"]
    
    def identify_missing_documents(self, data: Dict) -> List[str]:
        """Identify missing required documents"""
        missing = []
        
        try:
            documents = data.get('documents', [])
            required_docs = {
                'residence_proof': 'Residence proof (ration card, voter ID, etc.)',
                'community_certificate': 'Scheduled Tribe/OTFD certificate',
                'land_records': 'Land records and survey settlement',
                'forest_dependence_proof': 'Forest dependence evidence',
                'community_resolution': 'Gram Sabha resolution',
                'identity_proof': 'Identity proof documents',
                'photographs': 'Recent photographs',
                'land_sketch': 'Land sketch/map'
            }
            
            if isinstance(documents, list):
                available = [doc.lower() for doc in documents]
            else:
                available = []
            
            for doc_key, doc_name in required_docs.items():
                if not any(doc_key in avail or avail in doc_key for avail in available):
                    missing.append(doc_name)
            
            return missing
            
        except Exception as e:
            logger.error(f"Error identifying missing documents: {str(e)}")
            return []
    
    def suggest_next_steps(self, assessment: Dict) -> List[str]:
        """Suggest next steps based on assessment"""
        steps = []
        
        try:
            overall_score = assessment.get('overall_score', 0)
            status = assessment.get('eligibility_status', '')
            
            if overall_score >= 80:
                steps = [
                    "1. Submit application to Sub-Divisional Level Committee (SDLC)",
                    "2. Attend field verification if requested",
                    "3. Present case to District Level Committee (DLC)",
                    "4. Await final approval and title deed issuance"
                ]
            elif overall_score >= 60:
                steps = [
                    "1. Review and strengthen weak areas in application",
                    "2. Collect additional supporting documents",
                    "3. Submit to SDLC with complete documentation",
                    "4. Be prepared for field verification"
                ]
            elif overall_score >= 40:
                steps = [
                    "1. Address major gaps identified in assessment",
                    "2. Seek assistance from local NGOs or community workers",
                    "3. Collect missing critical documents",
                    "4. Re-submit when application is strengthened"
                ]
            else:
                steps = [
                    "1. Review FRA eligibility criteria carefully",
                    "2. Seek legal aid or NGO assistance",
                    "3. Consider alternative land rights schemes if eligible",
                    "4. Build stronger case with community support"
                ]
            
            return steps
            
        except Exception as e:
            logger.error(f"Error suggesting next steps: {str(e)}")
            return ["Consult with local authorities for guidance"]
    
    def batch_assessment(self, applications: List[Dict]) -> List[Dict]:
        """Perform batch assessment of multiple applications"""
        try:
            results = []
            
            for application in applications:
                try:
                    result = self.assess_eligibility(application)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Error assessing application {application.get('id', 'N/A')}: {str(e)}")
                    results.append({
                        'application_id': application.get('id', 'N/A'),
                        'error': str(e)
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch assessment: {str(e)}")
            return []
    
    def generate_summary_report(self, assessments: List[Dict]) -> Dict:
        """Generate summary report from multiple assessments"""
        try:
            total_applications = len(assessments)
            
            if total_applications == 0:
                return {'error': 'No assessments provided'}
            
            status_counts = {}
            score_distribution = {'0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0}
            avg_scores = {}
            
            # Analyze assessments
            total_score = 0
            criterion_totals = {}
            
            for assessment in assessments:
                if 'error' not in assessment:
                    # Status counts
                    status = assessment.get('eligibility_status', 'Unknown')
                    status_counts[status] = status_counts.get(status, 0) + 1
                    
                    # Score distribution
                    score = assessment.get('overall_score', 0)
                    total_score += score
                    
                    if score <= 20:
                        score_distribution['0-20'] += 1
                    elif score <= 40:
                        score_distribution['21-40'] += 1
                    elif score <= 60:
                        score_distribution['41-60'] += 1
                    elif score <= 80:
                        score_distribution['61-80'] += 1
                    else:
                        score_distribution['81-100'] += 1
                    
                    # Criterion scores
                    scores = assessment.get('scores', {})
                    for criterion, score in scores.items():
                        if criterion not in criterion_totals:
                            criterion_totals[criterion] = []
                        criterion_totals[criterion].append(score)
            
            # Calculate averages
            valid_assessments = total_applications - status_counts.get('error', 0)
            avg_overall_score = total_score / valid_assessments if valid_assessments > 0 else 0
            
            for criterion, scores in criterion_totals.items():
                avg_scores[criterion] = sum(scores) / len(scores) if scores else 0
            
            return {
                'total_applications': total_applications,
                'valid_assessments': valid_assessments,
                'status_distribution': status_counts,
                'score_distribution': score_distribution,
                'average_overall_score': round(avg_overall_score, 2),
                'average_criterion_scores': {k: round(v, 2) for k, v in avg_scores.items()},
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating summary report: {str(e)}")
            return {'error': str(e)}