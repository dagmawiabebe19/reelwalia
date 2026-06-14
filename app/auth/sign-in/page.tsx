import { SignInPageClient } from "./sign-in-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — ReelWalia",
  description: "Sign in to ReelWalia to save progress and manage your subscription.",
};

export default function SignInPage() {
  return <SignInPageClient />;
}
