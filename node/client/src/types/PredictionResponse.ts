export interface PredictionResponse {
    url: string;
    top1: Array<string>;
    prob: Array<number>;
  }
  