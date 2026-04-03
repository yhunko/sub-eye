import { Image as ImageIcon } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { BrandfetchUtils } from "@/entities/brandfetch/lib/brandfetch-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";

type BrandfetchImageProps = ComponentPropsWithoutRef<typeof Avatar> & {
  domain?: string | null;
  alt?: string;
  decorative?: boolean;
};

export const BrandfetchImage = forwardRef<
  ComponentRef<typeof Avatar>,
  BrandfetchImageProps
>(({ domain, className, alt, decorative, ...props }, ref) => {
  const isDecorative = decorative ?? !alt;
  const resolvedAlt = isDecorative
    ? ""
    : (alt ?? (domain ? `Logo for ${domain}` : "Brand logo"));

  return (
    <Avatar
      ref={ref}
      className={cn("size-9", className)}
      aria-hidden={isDecorative || undefined}
      {...props}
    >
      <AvatarImage
        src={domain ? BrandfetchUtils.getImageUrl(domain) : undefined}
        alt={resolvedAlt}
      />
      <AvatarFallback>
        <ImageIcon className="size-4" aria-hidden />
      </AvatarFallback>
    </Avatar>
  );
});

BrandfetchImage.displayName = "BrandfetchImage";
