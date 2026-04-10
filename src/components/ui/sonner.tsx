"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#1D1D1F] group-[.toaster]:border-[#E5E5E7] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[#86868B]",
          actionButton:
            "group-[.toast]:bg-corporate group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#F5F5F7] group-[.toast]:text-[#86868B]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
