"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Badge,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import PhoneForwardedIcon from "@mui/icons-material/PhoneForwarded";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import BusinessIcon from "@mui/icons-material/Business";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { getNavItemsForRole } from "@/lib/constants";
import { getAlertCount } from "@/actions/customers";
import type { Profile } from "@/lib/types";
import {
  DRAWER_WIDTH,
  SIDEBAR_BG,
  SIDEBAR_TEXT,
  SIDEBAR_TEXT_MUTED,
} from "./constants";

const ICONS: Record<string, React.ReactNode> = {
  Dashboard: <DashboardIcon />,
  "Import Customers": <UploadFileIcon />,
  "Master CRM": <PeopleIcon />,
  "Junior Sales Team": <ContactPhoneIcon />,
  "Senior Sales Team": <PhoneForwardedIcon />,
  "No Reply — Recycle": <Inventory2Icon />,
  Alerts: <NotificationsActiveIcon />,
  ISPs: <BusinessIcon />,
  Users: <ManageAccountsIcon />,
};

export default function Sidebar({
  profile,
  alertCount: initialAlertCount = 0,
  onNavigate,
}: {
  profile: Profile;
  alertCount?: number;
  onNavigate: (href: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [alertCount, setAlertCount] = useState(initialAlertCount);

  const visibleItems = getNavItemsForRole(profile.role);
  const showAlertsBadge = visibleItems.some((item) => item.href === "/alerts");

  useEffect(() => {
    setAlertCount(initialAlertCount);
  }, [initialAlertCount]);

  useEffect(() => {
    if (!showAlertsBadge) return;
    getAlertCount()
      .then(setAlertCount)
      .catch(() => setAlertCount(0));
  }, [showAlertsBadge, pathname]);

  useEffect(() => {
    visibleItems.forEach((item) => router.prefetch(item.href));
  }, [router, visibleItems]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          bgcolor: SIDEBAR_BG,
          borderRight: "none",
        },
      }}
    >
      <Box
        sx={{
          height: 64,
          display: "flex",
          alignItems: "center",
          px: 2.5,
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h6"
          noWrap
          fontWeight={700}
          sx={{ color: "#fff", letterSpacing: 0.5 }}
        >
          ISP Recovery CRM
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {visibleItems.map((item) => {
          const selected =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          const isAlerts = item.href === "/alerts";
          const icon = ICONS[item.label];

          return (
            <ListItemButton
              key={item.href}
              selected={selected}
              onClick={() => onNavigate(item.href)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                color: SIDEBAR_TEXT,
                "& .MuiListItemIcon-root": {
                  color: selected ? "#fff" : SIDEBAR_TEXT_MUTED,
                  minWidth: 40,
                },
                "&.Mui-selected": {
                  bgcolor: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  "& .MuiListItemIcon-root": { color: "#fff" },
                  "&:hover": { bgcolor: "rgba(255,255,255,0.18)" },
                },
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.08)",
                },
              }}
            >
              <ListItemIcon>
                {isAlerts && alertCount > 0 ? (
                  <Badge
                    badgeContent={alertCount}
                    color="error"
                    max={99}
                    sx={{
                      "& .MuiBadge-badge": {
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        minWidth: 18,
                        height: 18,
                      },
                    }}
                  >
                    {icon}
                  </Badge>
                ) : (
                  icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                  fontWeight: selected ? 600 : 400,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
}
