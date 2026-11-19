type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

function readRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env.local and configure it.`);
  }
  return value;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  return {
    url: readRequired("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: readRequired("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
