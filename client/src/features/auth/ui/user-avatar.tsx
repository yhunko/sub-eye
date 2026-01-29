import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
} from "@/shared/components";
import { useUser, SignedIn, SignedOut } from "@clerk/clerk-react";
import { UserIcon } from "lucide-react";

export const UserAvatar = () => {
  const { user, isLoaded } = useUser();

  const Fallback = (
    <AvatarFallback>
      <UserIcon />
    </AvatarFallback>
  );

  if (!isLoaded)
    return (
      <Avatar>
        <AvatarFallback>
          <Spinner />
        </AvatarFallback>
      </Avatar>
    );

  return (
    <>
      <SignedIn treatPendingAsSignedOut>
        <Avatar>
          <AvatarImage src={user?.imageUrl} />
          {Fallback}
        </Avatar>
      </SignedIn>
      <SignedOut>
        <Avatar>{Fallback}</Avatar>
      </SignedOut>
    </>
  );
};
