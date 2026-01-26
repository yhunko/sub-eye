"use client";

import * as React from "react";
import { useDebouncedCallback } from "@mantine/hooks";
import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  Spinner,
} from "@/shared/components";
import { cn } from "@/shared/lib";
import { useQueryStates } from "nuqs";
import { subscriptionsQueryParsers } from "../lib/subscriptions-query";

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
  const [inputValue, setInputValue] = React.useState(search);

  const handleSearch = useDebouncedCallback(async () => {
    await setFilters({ search: inputValue });
  }, SEARCH_DEBOUNCE_MS);

  return (
    <InputGroup className={cn("h-full w-full", className)}>
      <InputGroupInput
        type="search"
        placeholder={placeholder}
        value={inputValue}
        onChange={(event) => {
          setInputValue(() => event.target.value);
          handleSearch();
        }}
      />
      <InputGroupAddon>{loading ? <Spinner /> : <Search />}</InputGroupAddon>
    </InputGroup>
  );
};
