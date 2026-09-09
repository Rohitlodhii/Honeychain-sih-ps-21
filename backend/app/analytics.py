"""
HoneyChain AI/IoT Analytics Module
Explainable rule-threshold engine for hive health and productivity analysis.
Based on real apiculture science ranges and thresholds.
"""

from typing import Dict, Any, Tuple, Optional, List
from dataclasses import dataclass


@dataclass
class HiveHealthDiagnosis:
    """Hive health assessment result."""
    status: str  # HEALTHY, WATCH, HIGH_RISK
    confidence: float  # 0.0-1.0
    reasons: List[str]  # Human-readable explanations
    metrics: Dict[str, Any]  # Underlying values used for diagnosis


class ApicultureAnalytics:
    """
    Rule-based analytics for hive health and honey quality.
    
    References:
    - Brood nest temperature: 33–36°C (optimal bee development)
    - Hive humidity: 50–65% (prevents wax moth, maintains honey moisture)
    - Worker bee acoustic signature: ~180–260 Hz fundamental (health indicator)
    - Honey moisture: ~20% max (BIS/Codex standard, prevents fermentation)
    """

    # Apiculture thresholds
    TEMP_MIN_OPTIMAL = 33.0
    TEMP_MAX_OPTIMAL = 36.0
    TEMP_CRITICAL_LOW = 28.0
    TEMP_CRITICAL_HIGH = 40.0

    HUMIDITY_MIN_OPTIMAL = 50.0
    HUMIDITY_MAX_OPTIMAL = 65.0
    HUMIDITY_CRITICAL_LOW = 40.0
    HUMIDITY_CRITICAL_HIGH = 75.0

    SOUND_MIN_HEALTHY = 180  # Hz
    SOUND_MAX_HEALTHY = 260  # Hz
    SOUND_ANOMALY_RANGE = 25  # Hz above/below healthy range triggers watch

    MOISTURE_MAX_ACCEPTABLE = 20.0  # Percent (BIS/Codex)
    MOISTURE_CAUTION = 18.0

    WEIGHT_GAIN_HEALTHY_MIN = 0.5  # kg per week minimum (indicates foraging success)

    @staticmethod
    def analyze_hive_health(
        temperature_c: float,
        humidity_pct: float,
        sound_hz: Optional[float] = None,
        weight_kg: Optional[float] = None,
        weight_baseline_kg: Optional[float] = None,
    ) -> HiveHealthDiagnosis:
        """
        Analyze hive health from sensor readings.
        
        Args:
            temperature_c: Brood nest temperature in Celsius
            humidity_pct: Hive humidity percentage
            sound_hz: Worker bee acoustic frequency (optional)
            weight_kg: Current hive weight
            weight_baseline_kg: Baseline weight for trend analysis (optional)
        
        Returns:
            HiveHealthDiagnosis with status, confidence, reasons, and raw metrics.
        """
        reasons = []
        issues = []
        metrics = {
            "temperature": temperature_c,
            "humidity": humidity_pct,
            "sound": sound_hz,
            "weight": weight_kg,
        }

        # Temperature analysis
        if ApicultureAnalytics.TEMP_MIN_OPTIMAL <= temperature_c <= ApicultureAnalytics.TEMP_MAX_OPTIMAL:
            reasons.append(f"✓ Brood nest temperature {temperature_c}°C is optimal (33–36°C range)")
        elif ApicultureAnalytics.TEMP_CRITICAL_LOW <= temperature_c < ApicultureAnalytics.TEMP_MIN_OPTIMAL:
            issues.append(f"⚠ Brood temperature {temperature_c}°C is below optimal. Bees may struggle to incubate. Check insulation or activity.")
        elif ApicultureAnalytics.TEMP_MAX_OPTIMAL < temperature_c <= ApicultureAnalytics.TEMP_CRITICAL_HIGH:
            issues.append(f"⚠ Brood temperature {temperature_c}°C is elevated. Larvae at risk. Ensure hive has shade/ventilation.")
        else:
            issues.append(f"🔴 Brood temperature {temperature_c}°C is critical. Immediate intervention needed.")

        # Humidity analysis
        if ApicultureAnalytics.HUMIDITY_MIN_OPTIMAL <= humidity_pct <= ApicultureAnalytics.HUMIDITY_MAX_OPTIMAL:
            reasons.append(f"✓ Humidity {humidity_pct}% is optimal (50–65% range)")
        elif ApicultureAnalytics.HUMIDITY_CRITICAL_LOW <= humidity_pct < ApicultureAnalytics.HUMIDITY_MIN_OPTIMAL:
            issues.append(f"⚠ Humidity {humidity_pct}% is low. Risk of wax moth. Monitor for pests.")
        elif ApicultureAnalytics.HUMIDITY_MAX_OPTIMAL < humidity_pct <= ApicultureAnalytics.HUMIDITY_CRITICAL_HIGH:
            issues.append(f"⚠ Humidity {humidity_pct}% is high. Risk of mold/fungus. Increase ventilation.")
        else:
            issues.append(f"🔴 Humidity {humidity_pct}% is extreme. Ventilation check required immediately.")

        # Sound (acoustic) analysis
        if sound_hz is not None:
            if ApicultureAnalytics.SOUND_MIN_HEALTHY <= sound_hz <= ApicultureAnalytics.SOUND_MAX_HEALTHY:
                reasons.append(f"✓ Worker bee acoustic signature {sound_hz} Hz indicates normal activity")
            else:
                deviation = min(
                    abs(sound_hz - ApicultureAnalytics.SOUND_MIN_HEALTHY),
                    abs(sound_hz - ApicultureAnalytics.SOUND_MAX_HEALTHY),
                )
                if deviation > ApicultureAnalytics.SOUND_ANOMALY_RANGE:
                    issues.append(
                        f"🔴 Acoustic anomaly: {sound_hz} Hz (normal 180–260 Hz). "
                        f"Possible disease, starvation, or queen issue. Investigate immediately."
                    )
                else:
                    issues.append(f"⚠ Acoustic signature {sound_hz} Hz is slightly off. Monitor closely.")

        # Weight/productivity trend
        if weight_baseline_kg is not None and weight_kg is not None:
            weight_gain = weight_kg - weight_baseline_kg
            if weight_gain >= ApicultureAnalytics.WEIGHT_GAIN_HEALTHY_MIN:
                reasons.append(f"✓ Hive weight gained {weight_gain:.1f} kg (foraging success)")
            else:
                issues.append(
                    f"⚠ Hive weight gain only {weight_gain:.1f} kg in period. "
                    f"Possible forage shortage or internal hive issue."
                )

        # Determine overall status
        if len(issues) == 0:
            status = "HEALTHY"
            confidence = 0.95
        elif any("🔴" in issue for issue in issues):
            status = "HIGH_RISK"
            confidence = 0.9
        else:
            status = "WATCH"
            confidence = 0.85

        return HiveHealthDiagnosis(
            status=status,
            confidence=confidence,
            reasons=reasons + issues,
            metrics=metrics,
        )

    @staticmethod
    def predict_productivity(
        historical_weights: List[float],
        historical_dates: List[str],
    ) -> Dict[str, Any]:
        """
        Estimate honey yield from weight-gain trend over time.
        
        Args:
            historical_weights: List of weight measurements (kg) in chronological order
            historical_dates: List of dates/timestamps corresponding to weights
        
        Returns:
            {
                "yield_estimate_kg": float,
                "trend": "increasing" | "stable" | "decreasing",
                "confidence": float,
                "next_harvest_days": int,
                "recommendation": str,
            }
        """
        if len(historical_weights) < 2:
            return {
                "yield_estimate_kg": 0.0,
                "trend": "insufficient_data",
                "confidence": 0.0,
                "next_harvest_days": None,
                "recommendation": "Collect at least 2 weight measurements over time.",
            }

        # Simple linear trend: gain per measurement period
        weight_deltas = [historical_weights[i] - historical_weights[i - 1] for i in range(1, len(historical_weights))]
        avg_delta = sum(weight_deltas) / len(weight_deltas)

        # Determine trend
        if avg_delta > 0.3:  # Strong gain
            trend = "increasing"
        elif avg_delta < -0.1:  # Loss
            trend = "decreasing"
        else:
            trend = "stable"

        # Estimate: if trend is positive, project forward 4-6 weeks
        if trend == "increasing":
            weekly_gain = avg_delta * 7 / (len(historical_weights) - 1)  # Rough weekly estimate
            yield_estimate = weekly_gain * 5.5  # Project 5.5 weeks
            next_harvest_days = int(50 / max(weekly_gain, 0.1))  # Days to 50kg surplus
            confidence = 0.7
            recommendation = f"Hive is building honey reserves. Estimated harvest in {next_harvest_days} days."
        elif trend == "stable":
            yield_estimate = 0.0
            next_harvest_days = None
            confidence = 0.6
            recommendation = "Hive weight is stable. Forage conditions may be steady-state. Monitor for changes."
        else:
            yield_estimate = -avg_delta * 3  # Negative yield (consumption)
            next_harvest_days = None
            confidence = 0.5
            recommendation = "Hive is losing weight. Possible starvation or resource stress. Provide supplemental feed if needed."

        return {
            "yield_estimate_kg": max(0, yield_estimate),
            "trend": trend,
            "confidence": confidence,
            "next_harvest_days": next_harvest_days,
            "recommendation": recommendation,
        }

    @staticmethod
    def score_purity(
        moisture_pct: float,
        color_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Field screening for honey purity using moisture and sensory notes.
        
        NOTE: This is a SCREENING tool, not a lab replacement. BIS/Codex requires
        lab HMF, pollen, and c13/c12 ratio for certification. This function flags
        borderline moisture samples for lab confirmation.
        
        Args:
            moisture_pct: Honey moisture content (percent)
            color_notes: Optional color descriptor (e.g., "golden", "dark", "crystallized")
        
        Returns:
            {
                "purity_score": float (0-100),
                "status": "PASS" | "CAUTION" | "REJECT",
                "moisture_compliant": bool,
                "recommendation": str,
                "requires_lab_confirmation": bool,
            }
        """
        score = 100.0
        issues = []
        requires_lab = False

        # Moisture-based screening
        if moisture_pct <= ApicultureAnalytics.MOISTURE_CAUTION:
            issues.append(f"✓ Moisture {moisture_pct}% is excellent (≤18%)")
        elif moisture_pct <= ApicultureAnalytics.MOISTURE_MAX_ACCEPTABLE:
            issues.append(f"⚠ Moisture {moisture_pct}% is within spec (≤20% BIS/Codex) but on high side.")
            score -= 10
            requires_lab = True  # Flag for lab confirmation
        else:
            issues.append(f"🔴 Moisture {moisture_pct}% exceeds BIS/Codex 20% limit. High fermentation risk. DO NOT SELL.")
            score = 0
            requires_lab = True

        # Determine status
        if score >= 90:
            status = "PASS"
            recommendation = "Honey meets initial purity screening. Ready for market (pending optional lab confirmation)."
        elif score >= 50:
            status = "CAUTION"
            recommendation = "Honey borderline. Lab HMF/pollen analysis recommended before sale."
            requires_lab = True
        else:
            status = "REJECT"
            recommendation = "Honey fails field screening. Do not sell. Investigate honey processing/storage."

        return {
            "purity_score": score,
            "status": status,
            "moisture_compliant": moisture_pct <= ApicultureAnalytics.MOISTURE_MAX_ACCEPTABLE,
            "recommendation": recommendation,
            "requires_lab_confirmation": requires_lab,
            "details": " ".join(issues),
        }

