import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
} from "@/shared/components";
import { useUser, SignedIn, SignedOut } from "@clerk/clerk-react";
import { UserIcon } from "lucide-react";
import { FC, ComponentProps } from "react";

type UserAvatarProps = ComponentProps<typeof Avatar>;
export const UserAvatar: FC<UserAvatarProps> = (props) => {
  const { user, isLoaded } = useUser();

  const Fallback = (
    <AvatarFallback>
      <UserIcon />
    </AvatarFallback>
  );

  if (!isLoaded)
    return (
      <Avatar {...props}>
        <AvatarFallback>
          <Spinner />
        </AvatarFallback>
      </Avatar>
    );

  return (
    <>
      <SignedIn treatPendingAsSignedOut>
        <Avatar {...props}>
          <AvatarImage src={user?.imageUrl} />
          {Fallback}
        </Avatar>
      </SignedIn>
      <SignedOut>
        <Avatar {...props}>{Fallback}</Avatar>
      </SignedOut>
    </>
  );
};
