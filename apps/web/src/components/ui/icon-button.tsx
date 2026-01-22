import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type IconButtonProps = React.ComponentProps<typeof Button>

function IconButton({
  className,
  size = "icon-sm",
  variant = "ghost",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <Button
      data-slot="icon-button"
      size={size}
      variant={variant}
      type={type}
      className={cn("shrink-0", className)}
      {...props}
    />
  )
}

export { IconButton }
