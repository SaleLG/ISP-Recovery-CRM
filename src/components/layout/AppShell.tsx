"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, LinearProgress } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";
import type { Profile } from "@/lib/types";

export default function AppShell({
  profile,
  alertCount = 0,
  children,
}: {
  profile: Profile;
  alertCount?: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar profile={profile} alertCount={alertCount} onNavigate={navigate} />
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          position: "relative",
        }}
      >
        {isPending && (
          <LinearProgress
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1200,
              height: 3,
            }}
          />
        )}
        <Header profile={profile} onNavigate={navigate} />
        <Box sx={{ flex: 1, p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
}
