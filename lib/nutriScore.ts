export interface NutritionalValues {
  energyKcal: number;
  sugars: number;
  saturatedFat: number;
  sodium: number; // in mg
  fruitsVegetablesNuts: number; // percentage (0-100)
  fiber: number;
  proteins: number;
  isBeverage?: boolean;
  isCheese?: boolean;
  isAddedFat?: boolean;
}

export function calculateNutriScore(values: NutritionalValues): string {
  // Convert kcal to kJ (1 kcal = 4.184 kJ)
  const energyKj = values.energyKcal * 4.184;

  // Negative points (N)
  let pointsEnergy = 0;
  if (values.isBeverage) {
    if (energyKj <= 0) pointsEnergy = 0;
    else if (energyKj <= 30) pointsEnergy = 1;
    else if (energyKj <= 60) pointsEnergy = 2;
    else if (energyKj <= 90) pointsEnergy = 3;
    else if (energyKj <= 120) pointsEnergy = 4;
    else if (energyKj <= 150) pointsEnergy = 5;
    else if (energyKj <= 180) pointsEnergy = 6;
    else if (energyKj <= 210) pointsEnergy = 7;
    else if (energyKj <= 240) pointsEnergy = 8;
    else if (energyKj <= 270) pointsEnergy = 9;
    else pointsEnergy = 10;
  } else {
    if (energyKj <= 335) pointsEnergy = 0;
    else if (energyKj <= 670) pointsEnergy = 1;
    else if (energyKj <= 1005) pointsEnergy = 2;
    else if (energyKj <= 1340) pointsEnergy = 3;
    else if (energyKj <= 1675) pointsEnergy = 4;
    else if (energyKj <= 2010) pointsEnergy = 5;
    else if (energyKj <= 2345) pointsEnergy = 6;
    else if (energyKj <= 2680) pointsEnergy = 7;
    else if (energyKj <= 3015) pointsEnergy = 8;
    else if (energyKj <= 3350) pointsEnergy = 9;
    else pointsEnergy = 10;
  }

  let pointsSugars = 0;
  if (values.isBeverage) {
    if (values.sugars <= 0) pointsSugars = 0;
    else if (values.sugars <= 1.5) pointsSugars = 1;
    else if (values.sugars <= 3) pointsSugars = 2;
    else if (values.sugars <= 4.5) pointsSugars = 3;
    else if (values.sugars <= 6) pointsSugars = 4;
    else if (values.sugars <= 7.5) pointsSugars = 5;
    else if (values.sugars <= 9) pointsSugars = 6;
    else if (values.sugars <= 10.5) pointsSugars = 7;
    else if (values.sugars <= 12) pointsSugars = 8;
    else if (values.sugars <= 13.5) pointsSugars = 9;
    else pointsSugars = 10;
  } else {
    if (values.sugars <= 4.5) pointsSugars = 0;
    else if (values.sugars <= 9) pointsSugars = 1;
    else if (values.sugars <= 13.5) pointsSugars = 2;
    else if (values.sugars <= 18) pointsSugars = 3;
    else if (values.sugars <= 22.5) pointsSugars = 4;
    else if (values.sugars <= 27) pointsSugars = 5;
    else if (values.sugars <= 31.5) pointsSugars = 6;
    else if (values.sugars <= 36) pointsSugars = 7;
    else if (values.sugars <= 40.5) pointsSugars = 8;
    else if (values.sugars <= 45) pointsSugars = 9;
    else pointsSugars = 10;
  }

  let pointsSatFat = 0;
  if (values.isAddedFat) {
    // For added fats, the score is based on the ratio of saturated fatty acids to total lipids
    // We'll simplify and use the standard solid food table if we don't have total lipids
    // Actually, let's just use the standard table for simplicity unless we have total fat.
    // Assuming standard table for now.
  }
  
  if (values.saturatedFat <= 1) pointsSatFat = 0;
  else if (values.saturatedFat <= 2) pointsSatFat = 1;
  else if (values.saturatedFat <= 3) pointsSatFat = 2;
  else if (values.saturatedFat <= 4) pointsSatFat = 3;
  else if (values.saturatedFat <= 5) pointsSatFat = 4;
  else if (values.saturatedFat <= 6) pointsSatFat = 5;
  else if (values.saturatedFat <= 7) pointsSatFat = 6;
  else if (values.saturatedFat <= 8) pointsSatFat = 7;
  else if (values.saturatedFat <= 9) pointsSatFat = 8;
  else if (values.saturatedFat <= 10) pointsSatFat = 9;
  else pointsSatFat = 10;

  let pointsSodium = 0;
  if (values.sodium <= 90) pointsSodium = 0;
  else if (values.sodium <= 180) pointsSodium = 1;
  else if (values.sodium <= 270) pointsSodium = 2;
  else if (values.sodium <= 360) pointsSodium = 3;
  else if (values.sodium <= 450) pointsSodium = 4;
  else if (values.sodium <= 540) pointsSodium = 5;
  else if (values.sodium <= 630) pointsSodium = 6;
  else if (values.sodium <= 720) pointsSodium = 7;
  else if (values.sodium <= 810) pointsSodium = 8;
  else if (values.sodium <= 900) pointsSodium = 9;
  else pointsSodium = 10;

  const negativePoints = pointsEnergy + pointsSugars + pointsSatFat + pointsSodium;

  // Positive points (P)
  let pointsFruits = 0;
  if (values.isBeverage) {
    if (values.fruitsVegetablesNuts <= 40) pointsFruits = 0;
    else if (values.fruitsVegetablesNuts <= 60) pointsFruits = 2;
    else if (values.fruitsVegetablesNuts <= 80) pointsFruits = 4;
    else pointsFruits = 10;
  } else {
    if (values.fruitsVegetablesNuts <= 40) pointsFruits = 0;
    else if (values.fruitsVegetablesNuts <= 60) pointsFruits = 1;
    else if (values.fruitsVegetablesNuts <= 80) pointsFruits = 2;
    else pointsFruits = 5;
  }

  let pointsFiber = 0;
  if (values.fiber <= 0.9) pointsFiber = 0;
  else if (values.fiber <= 1.9) pointsFiber = 1;
  else if (values.fiber <= 2.8) pointsFiber = 2;
  else if (values.fiber <= 3.7) pointsFiber = 3;
  else if (values.fiber <= 4.7) pointsFiber = 4;
  else pointsFiber = 5;

  let pointsProtein = 0;
  if (values.proteins <= 1.6) pointsProtein = 0;
  else if (values.proteins <= 3.2) pointsProtein = 1;
  else if (values.proteins <= 4.8) pointsProtein = 2;
  else if (values.proteins <= 6.4) pointsProtein = 3;
  else if (values.proteins <= 8.0) pointsProtein = 4;
  else pointsProtein = 5;

  // Final score calculation
  let finalScore = 0;
  if (values.isCheese) {
    finalScore = negativePoints - (pointsFruits + pointsFiber + pointsProtein);
  } else if (negativePoints >= 11 && pointsFruits < 5) {
    finalScore = negativePoints - (pointsFruits + pointsFiber);
  } else {
    finalScore = negativePoints - (pointsFruits + pointsFiber + pointsProtein);
  }

  // Map to A-E
  if (values.isBeverage) {
    if (values.energyKcal === 0 && values.sugars === 0) return 'A'; // Water
    if (finalScore <= 1) return 'B';
    if (finalScore <= 5) return 'C';
    if (finalScore <= 9) return 'D';
    return 'E';
  } else {
    if (finalScore <= -1) return 'A';
    if (finalScore <= 2) return 'B';
    if (finalScore <= 10) return 'C';
    if (finalScore <= 18) return 'D';
    return 'E';
  }
}
