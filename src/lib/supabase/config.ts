type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is required. Copy .env.example to .env.local and configure it.",
    );
  }

  if (!anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Copy .env.example to .env.local and configure it.",
    );
  }

  return {
    url,
    anonKey,
  };
}
