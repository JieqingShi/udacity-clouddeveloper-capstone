export interface PredictionResponse {
    url: string;
    top5: Array<string>;
    prob5: Array<number>;
  }
  