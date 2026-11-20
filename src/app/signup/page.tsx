"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signupError) {
        console.error("Supabase signup error:", signupError);
        setError(signupError.message);
        return;
      }

      if (!data.user) {
        const message = "Signup did not create a user.";
        console.error(message);
        setError(message);
        return;
      }

      if (!data.session) {
        setError("Check your email to confirm your account.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
      });

      if (profileError) {
        console.error("Supabase profile insert error:", profileError);
        setError(profileError.message);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (caughtError) {
      console.error("Unexpected signup error:", caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Signup failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Join LastCall</p>
        <h1>Create your account</h1>
        <p className="auth-description">Save more good products from going to waste.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              required
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-secondary auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
