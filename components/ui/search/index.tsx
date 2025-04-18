import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
  KeyboardEvent,
  JSX,
} from "react";
import XIcon from "@heroicons/react/solid/XIcon";
import SearchIcon from "@heroicons/react/solid/SearchIcon";
import useStore from "@store";
import { sendGoogleEvent } from "@utils/analytics";
import { StoreState } from "@store";

// eslint-disable-next-line no-unused-vars
type DebouncedFunction<T extends (...args: any[]) => any> = (
  // eslint-disable-next-line no-unused-vars
  ...args: Parameters<T>
) => void;

// eslint-disable-next-line no-unused-vars
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(this: any, ...args: Parameters<T>) {
    const context = this;

    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}

interface SearchState {
  searchTerm: string;
  // eslint-disable-next-line no-unused-vars
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
}

const sendSearchTermGA = (searchTerm: string): void => {
  sendGoogleEvent("search", {
    category: "search",
    label: searchTerm,
    search_term: searchTerm,
    value: searchTerm,
  });
};

export default function Search(): JSX.Element {
  const { searchTerm, setState } = useStore<SearchState>((state) => ({
    searchTerm: state.searchTerm,
    setState: state.setState,
  }));
  const [inputValue, setInputValue] = useState<string>(searchTerm);

  const searchEvents = useCallback((term: string): void => {
    if (term && term.length > 0) {
      sendSearchTermGA(term);
    }
  }, []);

  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  const debouncedChangeHandler = useMemo(
    () =>
      debounce((value: string) => {
        setState("searchTerm", value);
        sendSearchTermGA(value);
      }, 1500),
    [setState]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      debouncedChangeHandler(value);
    },
    [debouncedChangeHandler]
  );

  const handleKeyPress = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const value = e.currentTarget.value;
        sendSearchTermGA(value);
        setState("searchTerm", value);
      }
    },
    [setState]
  );

  const clearSearchTerm = useCallback((): void => {
    setState("searchTerm", "");
    setInputValue("");
  }, [setState]);

  return (
    <div className="w-full flex justify-center border border-bColor border-opacity-50 rounded-full px-4 mt-2">
      <div className="w-full flex justify-start items-center gap-2 rounded-full">
        <div className="h-10 flex justify-end items-center cursor-pointer">
          <SearchIcon
            className="h-5 w-5 text-blackCorp"
            onClick={() => searchEvents(searchTerm)}
            aria-label="Search"
          />
        </div>
        <input
          type="text"
          className="w-full border-0 placeholder:text-bColor text-[16px] rounded-tr-full rounded-br-full"
          placeholder="Què estàs buscant?"
          value={inputValue}
          onKeyDown={handleKeyPress}
          onChange={handleChange}
          autoComplete="off"
          aria-label="Search input"
        />
        {inputValue.length > 0 && (
          <div className="flex justify-end items-center cursor-pointer">
            <XIcon
              className="h-4 w-4 text-blackCorp"
              onClick={clearSearchTerm}
              aria-label="Clear search"
            />
          </div>
        )}
      </div>
    </div>
  );
}
