"use client"

import * as React from "react"
import Link from "next/link"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function Navbar() {
  return (
    <NavigationMenu className="w-full justify-center bg-transparent">
      <NavigationMenuList className="no-scrollbar w-full flex-nowrap items-center justify-end gap-2 overflow-x-auto bg-transparent px-2">
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent text-xs hover:bg-transparent data-[state=open]:bg-transparent sm:text-sm">
            For Travelers
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="w-60">
              <ListItem href="/buy" title="Get Insured">
                Buy coverage via bank transfer
              </ListItem>
              <ListItem href="/dashboard" title="My Policies">
                Check status & claim payouts
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent text-xs hover:bg-transparent data-[state=open]:bg-transparent sm:text-sm">
            For Investors
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="w-60">
              <ListItem href="/pool" title="Liquidity Pool">
                Fund the pool & earn yield
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            className={`${navigationMenuTriggerStyle()} bg-transparent text-xs hover:bg-transparent data-[state=open]:bg-transparent sm:text-sm`}
          >
            <Link href="/docs">Docs</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href}>
          <div className="flex flex-col gap-1 text-sm">
            <div className="leading-none font-medium">{title}</div>
            <div className="text-muted-foreground line-clamp-2">{children}</div>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
