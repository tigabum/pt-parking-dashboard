"use client";

import { useState } from "react";
import { Search, Bell, Menu, User, Settings, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/app/context/auth-context";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/utils";

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <header className="h-20 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 gap-4">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Sidebar</SheetTitle>
            </SheetHeader>
            <Sidebar onItemClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        {/* <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            placeholder="Search for anything..."
            className="pl-10 rounded-full bg-secondary/50"
          />
        </div> */}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell size={20} />
        </Button>

        <div className="ml-2 pl-4 border-l border-gray-200 flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="h-10 w-10 border border-gray-200">
                  <AvatarImage
                    src={getImageUrl(user?.profileImage)}
                    alt={user?.fullName}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {user?.fullName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-2 rounded shadow-2xl border-slate-100"
            >
              <DropdownMenuLabel className="font-bold text-slate-400 uppercase text-[10px] px-2 py-1.5 tracking-widest">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/settings")}
                className="rounded-lg font-bold text-slate-600 focus:bg-slate-50 cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-slate-50" />
              <DropdownMenuItem
                className="text-red-500 focus:text-red-600 focus:bg-red-50 rounded-lg font-bold cursor-pointer"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="text-left hidden sm:block space-y-0.5">
            <p className="text-xs md:text-sm font-bold text-slate-900 leading-tight truncate max-w-[150px]">
              {user?.fullName}
            </p>
            <div className="flex flex-col">
              <p className="text-[9px] md:text-[10px] text-slate-400 font-bold leading-none">
                {user?.email}
              </p>
              {user?.phoneNumber && (
                <p className="text-[9px] md:text-[10px] text-primary/70 font-black mt-0.5 leading-none">
                  {user.phoneNumber}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
