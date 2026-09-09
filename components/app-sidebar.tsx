"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Settings2Icon,
  CircleHelpIcon,
  BookOpenIcon,
  SearchIcon,
  LogOutIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const data = {
  user: {
    name: "Engr. Dr L.A Ajao",
    email: "l.a.ajao@futminna.edu.ng",
    avatar: "/profile.png",
  },
  navMain: [
    {
      title: "Portal",
      url: "/portal",
      icon: <BookOpenIcon />,
    },
    {
      title: "Student Lookup",
      url: "/results",
      icon: <SearchIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ],
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/portal" />}
            >
              <Image
                src="/ecotems-logo.png"
                alt="ECOTEMS Logo"
                width={30}
                height={30}
                className="rounded-full bg-white p-0.5"
              />
              <span className="text-base font-semibold">Engr. Dr L.A Ajao</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/5 text-sm"
          >
            <LogOutIcon className="w-4 h-4" />
            Log out
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
