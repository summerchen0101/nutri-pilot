export type ManualFoodAnalysisConfidence = 'high' | 'medium' | 'low';

export type ManualFoodAnalysisResult = {
  name: string;
  quantity_g: number;
  quantity_description: string;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number | null;
  sodium_mg: number | null;
  confidence: ManualFoodAnalysisConfidence;
  note: string | null;
};
