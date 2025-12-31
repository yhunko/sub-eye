import { Avatar, AvatarImage, AvatarFallback } from "@/shared/components";
import * as React from "react";
import { FC, useId } from "react";
import { Image as ImageIcon } from "lucide-react";
import { BrandfetchUtils } from "@/entities/brandfetch/lib/brandfetch-utils";

type BrandfetchImageProps = {
  domain?: string | null;
  className?: string;
};

export const BrandfetchImage: FC<BrandfetchImageProps> = ({
  domain,
  className,
}) => {
  const id = useId();

  return (
    <Avatar className={className}>
      <AvatarImage
        src={domain ? BrandfetchUtils.getImageUrl(domain) : undefined}
        alt={`brand-logo-${id}`}
      />
      <AvatarFallback>
        <ImageIcon className={className} />
      </AvatarFallback>
    </Avatar>
  );
};
