import { FC, ReactNode } from "react";

type PopoverConfirmationContentProps = {
  description: string;
  CancelButton: ReactNode;
  ConfirmButton: ReactNode;
};

export const PopoverConfirmationContent: FC<
  PopoverConfirmationContentProps
> = ({ description, CancelButton, ConfirmButton }) => {
  return (
    <div className="space-y-3">
      <p className="text-sm">{description}</p>
      <div className="flex justify-end gap-2">
        {CancelButton}
        {ConfirmButton}
      </div>
    </div>
  );
};
