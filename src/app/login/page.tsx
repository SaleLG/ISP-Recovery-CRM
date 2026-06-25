"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Alert,
  FormControlLabel,
  Checkbox,
  Link as MuiLink,
  Box,
} from "@mui/material";
import Link from "next/link";
import { signIn } from "@/actions/auth";
import AuthPage from "@/components/auth/AuthPage";
import AuthTextField from "@/components/auth/AuthTextField";

const REMEMBER_EMAIL_KEY = "isp_crm_remember_email";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
    if (searchParams.get("reset") === "success") {
      setInfo("Password updated successfully. You can now sign in.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    const result = await signIn(email, password, rememberMe);
    if (result?.error) {
      setError(result.error);
      if (result.pending) {
        setInfo(
          "You can close this page. You will receive access once an admin approves your account."
        );
      }
      setLoading(false);
    }
  };

  return (
    <AuthPage subtitle="Sign In">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {info}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <AuthTextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <AuthTextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          sx={{ mb: 1 }}
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                size="small"
              />
            }
            label="Remember me"
          />
          <MuiLink
            component={Link}
            href="/forgot-password"
            variant="body2"
            underline="hover"
          >
            Forgot password?
          </MuiLink>
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          sx={{ mb: 2 }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </AuthPage>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
