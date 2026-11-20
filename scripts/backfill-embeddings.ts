import { createClient } from "@supabase/supabase-js";
import { generateEmbedding, productEmbeddingText } from "../src/lib/embeddings";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const { data: products, error } = await supabase
  .from("products")
  .select("id, name, description")
  .is("embedding", null);

if (error) {
  throw new Error(`Unable to load products for embedding backfill: ${error.message}`);
}

let completed = 0;

for (const product of products ?? []) {
  const text = productEmbeddingText(product.name ?? "", product.description ?? "");
  const embedding = await generateEmbedding(text);
  const { error: updateError } = await supabase
    .from("products")
    .update({ embedding })
    .eq("id", product.id);

  if (updateError) {
    throw new Error(
      `Unable to save embedding for product ${product.id}: ${updateError.message}`,
    );
  }

  completed += 1;
  console.log(`Backfilled ${completed}/${products?.length ?? 0}: ${product.id}`);
}

console.log(`Embedding backfill complete: ${completed} product(s) updated`);
