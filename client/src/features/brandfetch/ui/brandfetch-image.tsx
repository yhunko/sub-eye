import { Avatar, AvatarImage, AvatarFallback } from "@/shared/components";
import {
  forwardRef,
  useId,
  ComponentRef,
  ComponentPropsWithoutRef,
} from "react";
import { Image as ImageIcon } from "lucide-react";
import { BrandfetchUtils } from "@/entities/brandfetch/lib/brandfetch-utils";
import { cn } from "@/shared/lib/classes-utils";

type BrandfetchImageProps = ComponentPropsWithoutRef<typeof Avatar> & {
  domain?: string | null;
};

export const BrandfetchImage = forwardRef<
  ComponentRef<typeof Avatar>,
  BrandfetchImageProps
>(({ domain, className, ...props }, ref) => {
  const id = useId();

  return (
    <Avatar ref={ref} className={cn("size-9", className)} {...props}>
      <AvatarImage
        src={domain ? BrandfetchUtils.getImageUrl(domain) : undefined}
        alt={`brand-logo-${id}`}
      />
      <AvatarFallback>
        <ImageIcon className={className} />
      </AvatarFallback>
    </Avatar>
  );
});

BrandfetchImage.displayName = "BrandfetchImage";
