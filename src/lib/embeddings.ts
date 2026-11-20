import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_NAME);
  }
  return extractorPromise;
}

export function productEmbeddingText(name: string, description: string): string {
  return `${name.trim()} ${description.trim()}`.trim();
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });
  const embedding = Array.from(output.data, (value) => Number(value));

  if (embedding.length !== 384) {
    throw new Error(`Expected a 384-dimensional embedding, received ${embedding.length}`);
  }

  return embedding;
}
