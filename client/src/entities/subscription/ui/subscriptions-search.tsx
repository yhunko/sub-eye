import { useDebouncedCallback } from "@mantine/hooks";
import { Search } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Spinner,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { subscriptionsQueryParsers } from "../model/query-parsers";

interface SubscriptionsSearchProps {
  placeholder?: string;
  className?: string;
  loading?: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

export const SubscriptionsSearch = ({
  placeholder,
  className,
  loading,
}: SubscriptionsSearchProps) => {
  const [{ search }, setFilters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });
  const [inputValue, setInputValue] = useState(search);

  const handleSearch = useDebouncedCallback(async (value: string) => {
    await setFilters({ search: value });
  }, SEARCH_DEBOUNCE_MS);

  return (
    <InputGroup className={cn("h-full w-full", className)}>
      <InputGroupInput
        type="search"
        placeholder={placeholder}
        value={inputValue}
        onChange={(event) => {
          const value = event.target.value;
          setInputValue(value);
          handleSearch(value);
        }}
      />
      <InputGroupAddon>{loading ? <Spinner /> : <Search />}</InputGroupAddon>
    </InputGroup>
  );
};
