"use client";

import { useState } from "react";
import { Search, Bell, Menu, User, Settings, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
                variant="secondary"
                size="icon"
                className="rounded-full h-9 w-9 overflow-hidden border border-gray-200"
              >
                <User className="h-5 w-5 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
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
          <div className="text-left hidden sm:block">
            <p className="text-xs md:text-sm font-medium leading-none">{user?.fullName}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
